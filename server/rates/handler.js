// HTTP layer for /api/rates. Two kinds of callers:
//   - the app (signed-in user): sends the Firebase login token in the "Authorization: Bearer ..." header
//   - the scheduler (cron-job.org etc.): sends the automation key, either as ?key=... or as the Bearer token
// The logic itself lives in service.js.

import { timingSafeEqual } from 'node:crypto';
import { UserError } from './service.js';
import { SetupError, setupStatus } from './store.js';

const same = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

/** The page text delivered by the owner's phone (raw HTML / text, or JSON like {"text": "..."}). */
function bodyText(req) {
  const b = req.body;
  if (b == null) return '';
  if (Buffer.isBuffer(b)) return b.toString('utf8');
  if (typeof b === 'string') {
    if (b.trimStart().startsWith('{')) { try { const o = JSON.parse(b); return String(o.text || o.html || o.body || ''); } catch { /* it is the page itself */ } }
    return b;
  }
  if (typeof b === 'object') return String(b.text || b.html || b.body || '');
  return '';
}

function readBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') { try { return JSON.parse(b); } catch { return {}; } }
  return b;
}

/** deps(): async () => ({ service, auth }) where auth.verifyIdToken(token) -> { uid } */
export function makeHandler(deps) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const send = (code, obj) => res.status(code).json(obj);
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const body = req.method === 'POST' ? readBody(req) : {};
      const action = String(url.searchParams.get('action') || body.action || '');

      if (action === 'ping') return send(200, { ok: true, setup: setupStatus() });

      const { service, auth } = await deps();

      // ---- who is calling?
      const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      const queryKey = url.searchParams.get('key') || '';
      const key = await service.cronKey();
      let who = null;
      if ((queryKey && same(queryKey, key)) || (bearer && same(bearer, key))) who = { kind: 'cron' };
      else if (bearer) {
        try { const t = await auth.verifyIdToken(bearer); who = { kind: 'user', uid: t.uid }; } catch { who = null; }
      }
      if (!who) return send(401, { ok: false, code: 'AUTH', error: 'Please sign in again.' });

      // ---- the scheduler may only run the scheduled update
      if (who.kind === 'cron') {
        const slot = url.searchParams.get('slot') || 'auto';
        if (action === 'ingest') {
          // the owner's own phone/computer fetched the NCDEX page and hands it over; same checks as a server fetch
          if (req.method !== 'POST') return send(405, { ok: false, code: 'BAD', error: 'Send the page with POST.' });
          const html = bodyText(req).slice(0, 4000000);
          if (html.trim().length < 200) return send(200, { ok: false, skipped: false, reason: 'Nothing (or too little) was received.' });
          const out = await service.run({ slot, trigger: 'cron', force: url.searchParams.get('force') === '1', html, via: 'phone' });
          return send(200, summarise(out));
        }
        if (action !== 'run') return send(403, { ok: false, code: 'AUTH', error: 'The automation key can only run updates.' });
        const out = await service.run({ slot, trigger: 'cron', force: url.searchParams.get('force') === '1' });
        return send(200, summarise(out));
      }

      switch (action) {
        case 'status': return send(200, { ok: true, ...(await service.status()) });
        case 'config': return send(200, { ok: true, config: await service.setConfig(body.config || {}) });
        case 'diagnose': return send(200, await service.diagnose());
        case 'run': return send(200, await service.run({ slot: body.slot || 'auto', trigger: 'user', force: true }));
        case 'paste': return send(200, service.paste(body.text));
        case 'commit': return send(200, await service.commit({ slot: body.slot || 'auto', picks: body.picks, source: body.source === 'paste' ? 'paste' : 'manual', boardTime: body.boardTime || null }));
        case 'list': return send(200, { ok: true, updates: await service.listUpdates(Number(body.limit || url.searchParams.get('limit') || 20)) });
        case 'sent': return send(200, await service.markSent(body.id, body.channel || 'whatsapp'));
        case 'subscribe': return send(200, await service.subscribe({ subscription: body.subscription, label: body.label }));
        case 'unsubscribe': return send(200, await service.unsubscribe(body.endpoint));
        case 'test-push': return send(200, await service.testPush());
        default: return send(400, { ok: false, code: 'BAD', error: 'Unknown action.' });
      }
    } catch (e) {
      if (e instanceof SetupError) return send(503, { ok: false, code: 'SETUP', error: e.message, missing: e.missing, setup: setupStatus() });
      if (e instanceof UserError) return send(200, { ok: false, code: 'USER', error: e.message });
      return send(500, { ok: false, code: 'ERROR', error: String((e && e.message) || e) });
    }
  };
}

// the scheduler only needs a small answer
function summarise(out) {
  if (!out) return { ok: false };
  return {
    ok: !!out.ok, skipped: !!out.skipped, already: !!out.already, reason: out.reason || null,
    id: out.update ? out.update.id : null, status: out.update ? out.update.status : null,
  };
}

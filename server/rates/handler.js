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

/** The page text sent from the owner's own browser (plain text / HTML, or JSON like {"text": "..."}). */
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
    let feedText = false; // the feed address can answer in one plain line (easy for Grok to read)
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const body = req.method === 'POST' ? readBody(req) : {};
      const action = String(url.searchParams.get('action') || body.action || '');

      // the "send this page" button runs inside the NCDEX page, so the browser asks permission first (CORS)
      if (action === 'ingest') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') { res.status(204); return typeof res.end === 'function' ? res.end() : res.json({}); }
      }

      if (action === 'ping') return send(200, { ok: true, setup: setupStatus() });

      const { service, auth } = await deps();

      // ---- the feed: Grok (or any other source) sends the numbers; it has a key of its own that can do nothing else
      if (action === 'feed') {
        const asText = url.searchParams.get('format') === 'text';
        feedText = asText;
        const sendText = (code, text) => {
          res.status(code); res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return typeof res.send === 'function' ? res.send(text) : res.end(text);
        };
        const reply = (code, obj, line) => (asText ? sendText(code, line) : send(code, obj));
        const given = url.searchParams.get('key') || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
        const ua = String(req.headers['user-agent'] || '').slice(0, 100);
        if (!given || !same(given, await service.feedKey())) {
          if (service.noteWrongKey) await service.noteWrongKey({ ua }); // so the page can say "something called with a wrong key"
          return reply(401, { ok: false, code: 'AUTH', error: 'Wrong or missing key.' }, 'ERROR: wrong or missing key.');
        }
        if (url.searchParams.get('test') === '1') { // "does this address work?" without saving anything
          const line = 'OK: the feed address works and the key is accepted. Nothing was saved.';
          if (service.logEvent) await service.logEvent({ kind: 'feed', result: 'test', ok: true, message: 'Address check: the address and the key are right. Nothing was saved.', ua });
          return reply(200, { ok: true, test: true, message: line }, line);
        }
        const values = {};
        for (const [k, v] of url.searchParams) if (!['action', 'key', 'format', 'slot', 'force', 'test'].includes(k)) values[k.toLowerCase()] = v;
        if (body && typeof body === 'object' && !Buffer.isBuffer(body)) for (const [k, v] of Object.entries(body)) if (!['action', 'key'].includes(k)) values[k.toLowerCase()] = v;
        const out = await service.feed({ slot: url.searchParams.get('slot') || 'auto', values, force: url.searchParams.get('force') === '1', meta: { ua } });
        return reply(200, { ...summarise(out), message: feedLine(out) }, feedLine(out));
      }

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
          // the owner's own browser (which passed NCDEX's browser check) sends the text of the page it is showing;
          // same checks as a server fetch (today's board time, numbers must add up)
          if (req.method !== 'POST') return send(405, { ok: false, code: 'BAD', error: 'Send the page with POST.', message: '⚠️ Send the page with POST.' });
          const html = bodyText(req).slice(0, 4000000);
          if (html.trim().length < 200) return send(200, { ok: false, reason: 'Nothing (or too little) was received.', message: '⚠️ Nothing (or too little) was received from the page. Open the NCDEX Live Quotes page first.' });
          const out = await service.run({ slot, trigger: 'user', force: true, html, via: 'browser' });
          return send(200, { ...summarise(out), message: ingestMessage(out) });
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
        case 'activity': return send(200, await service.activity());
        case 'regen-feed-key': return send(200, await service.regenFeedKey());
        case 'movement': return send(200, await service.setMovement({ id: body.id, mode: body.mode, values: body.values, label: body.label }));
        case 'list': return send(200, { ok: true, updates: await service.listUpdates(Number(body.limit || url.searchParams.get('limit') || 20)) });
        case 'sent': return send(200, await service.markSent(body.id, body.channel || 'whatsapp'));
        case 'subscribe': return send(200, await service.subscribe({ subscription: body.subscription, label: body.label }));
        case 'unsubscribe': return send(200, await service.unsubscribe(body.endpoint));
        case 'test-push': return send(200, await service.testPush());
        default: return send(400, { ok: false, code: 'BAD', error: 'Unknown action.' });
      }
    } catch (e) {
      if (feedText) {
        res.status(e instanceof SetupError ? 503 : e instanceof UserError ? 200 : 500);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        const line = `ERROR: ${String((e && e.message) || e).slice(0, 300)}`;
        return typeof res.send === 'function' ? res.send(line) : res.end(line);
      }
      if (e instanceof SetupError) return send(503, { ok: false, code: 'SETUP', error: e.message, missing: e.missing, setup: setupStatus() });
      if (e instanceof UserError) return send(200, { ok: false, code: 'USER', error: e.message });
      return send(500, { ok: false, code: 'ERROR', error: String((e && e.message) || e) });
    }
  };
}

// the one line Grok reads back
function feedLine(out) {
  if (!out) return 'ERROR: not accepted.';
  if (out.ok && out.already) return 'OK: this update was already saved.';
  if (out.ok && out.skipped) return `OK: skipped. ${out.reason}`;
  if (out.ok && out.update) return `OK: saved. ${out.update.summary || out.update.id}`;
  const hint = out.kind === 'stale' || out.kind === 'no_time' ? ' Refresh the NCDEX page, read the "As on" time again and open the address once more.'
    : out.kind === 'bad_numbers' ? ' Read those numbers again from the NCDEX board and open the address once more.' : '';
  return `ERROR: ${out.reason || 'not accepted.'}${hint}`;
}

// a plain sentence for the person who pressed the "send this page" button
function ingestMessage(out) {
  if (!out) return '⚠️ Not accepted.';
  if (out.ok && out.update && out.update.status === 'ready') return `✅ Update ready in your Rates Desk: ${out.update.summary || out.update.id}`;
  return `⚠️ ${out.reason || 'The page was not accepted.'}${out.kind === 'stale' || out.kind === 'no_time' ? ' Refresh the NCDEX page and try again.' : ''}`;
}

// the scheduler only needs a small answer
function summarise(out) {
  if (!out) return { ok: false };
  return {
    ok: !!out.ok, skipped: !!out.skipped, already: !!out.already, reason: out.reason || null, code: out.code || out.kind || null,
    id: out.update ? out.update.id : null, status: out.update ? out.update.status : null,
  };
}

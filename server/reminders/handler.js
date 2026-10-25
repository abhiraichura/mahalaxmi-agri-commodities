// HTTP layer for /api/reminders.
//   action=cron   the daily scheduler (Vercel Cron, or cron-job.org with the same key as the Rates scheduler)
//   other actions the signed-in owner (check / run-now / status / test)
// A call from the scheduler can only run the check; it gets back counts, never any contract data.

import { timingSafeEqual } from 'node:crypto';
import { SetupError, setupStatus } from '../rates/store.js';

const same = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};
function readBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') { try { return JSON.parse(b); } catch { return {}; } }
  return b;
}

/** deps(): async () => ({ reminders, auth, cronKey: async () => string|null, env }) */
export function makeHandler(deps) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const send = (code, obj) => res.status(code).json(obj);
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const body = req.method === 'POST' ? readBody(req) : {};
      const action = String(url.searchParams.get('action') || body.action || '');
      if (action === 'ping') return send(200, { ok: true, setup: setupStatus() });

      const { reminders, auth, cronKey, env = process.env } = await deps();
      const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      const ua = String(req.headers['user-agent'] || '');

      // ---- the scheduler
      if (action === 'cron') {
        const secret = env.CRON_SECRET;
        const key = (await cronKey()) || '';
        const viaSecret = !!secret && !!bearer && same(bearer, secret);
        const viaVercel = !secret && /^vercel-cron\//i.test(ua);           // Vercel's own scheduler (when CRON_SECRET is not set)
        const viaKey = !!key && ((url.searchParams.get('key') && same(url.searchParams.get('key'), key)) || (bearer && same(bearer, key)));
        if (!viaSecret && !viaVercel && !viaKey) return send(401, { ok: false, code: 'AUTH', error: 'Not allowed.' });
        const r = await reminders.run({ trigger: 'cron' });
        return send(200, { ok: true, skipped: r.skipped || null, checked: r.checked, due: r.due, sent: r.sent, failed: r.failed });
      }

      // ---- the owner
      let uid = null;
      if (bearer) { try { uid = (await auth.verifyIdToken(bearer)).uid; } catch { uid = null; } }
      if (!uid) return send(401, { ok: false, code: 'AUTH', error: 'Please sign in again.' });
      switch (action) {
        case 'check': return send(200, await reminders.run({ trigger: 'app' }));
        case 'run-now': return send(200, await reminders.run({ trigger: 'you', force: true }));
        case 'status': return send(200, await reminders.status());
        case 'test': return send(200, await reminders.test());
        default: return send(400, { ok: false, code: 'BAD', error: 'Unknown action.' });
      }
    } catch (e) {
      if (e instanceof SetupError) return send(503, { ok: false, code: 'SETUP', error: e.message, missing: e.missing, setup: setupStatus() });
      return send(500, { ok: false, code: 'ERROR', error: String((e && e.message) || e) });
    }
  };
}

// The Rates Desk logic: get the board -> check it is live -> build the message -> save -> notify.
// Used by the scheduled run (cron) and by the buttons in the app.

import { istParts, hourLabel, monthName, MONTH_INDEX } from './ist.js';
import { fetchBoardHtml, judgeBoard } from './fetchBoard.js';
import { parseBoard } from './parse.js';
import {
  SLOTS, DISPLAY, buildMessage, computeMovement, messageKeys, slotFor, DEFAULT_CONFIG,
} from './message.js';
import { sendTelegram } from './telegram.js';
import { newSecret } from './store.js';

export class UserError extends Error {
  constructor(msg) { super(msg); this.name = 'UserError'; }
}

const pad2 = (n) => String(n).padStart(2, '0');
const num = (x) => {
  if (x === null || x === undefined || x === '') return null;
  const v = Number(String(x).replace(/[₹,\s]/g, ''));
  return Number.isFinite(v) ? v : null;
};

export function createService({
  store, push, fetchBoard = fetchBoardHtml, telegram = sendTelegram, clock = () => new Date(), env = process.env,
}) {
  async function cronKey() {
    if (env.RATES_CRON_KEY) return env.RATES_CRON_KEY;
    const s = await store.getSecrets();
    if (s.cronKey) return s.cronKey;
    const k = newSecret();
    await store.setSecrets({ cronKey: k });
    return k;
  }

  function resolveSlot(slot, parts, trigger) {
    if (slot === undefined || slot === null || slot === 'auto') return slotFor(parts, trigger === 'cron' ? 29 : 59);
    if (slot === 'adhoc') return null;
    const n = Number(slot);
    return SLOTS.includes(n) ? n : null;
  }
  const slotKeyOf = (hour, parts) => (hour != null ? String(hour) : `x${pad2(parts.hour)}${pad2(parts.minute)}`);

  async function getBoard({ now = clock(), cfg, html = null } = {}) {
    cfg = cfg || await store.getConfig();
    if (html != null) {
      // the board was delivered by the owner's own phone/computer: same checks, no server fetch
      const j = judgeBoard(String(html), { now, maxAgeMin: cfg.maxBoardAgeMin, requireBoardTime: cfg.requireBoardTime !== false });
      return { ...j, log: [{ url: 'sent by your phone', status: 200, bytes: String(html).length }] };
    }
    const got = await fetchBoard();
    if (!got.ok) return { ok: false, kind: got.blocked ? 'blocked' : 'unreachable', reason: got.reason, log: got.log };
    const j = judgeBoard(got.html, { now, maxAgeMin: cfg.maxBoardAgeMin, requireBoardTime: cfg.requireBoardTime !== false });
    return { ...j, log: got.log };
  }

  /** Builds + saves one update (message, reading for movement). */
  async function prepare({ parts, now, slotHour, picks, source, trigger, boardTimeText, warnings = [], cfg }) {
    const keys = messageKeys(cfg);
    for (const k of keys) if (!picks[k]) throw new UserError(`${DISPLAY[k]} rate is missing.`);
    const slotKey = slotKeyOf(slotHour, parts);
    const id = `${parts.dateKey}_${slotKey}`;
    const atMs = now.getTime();

    let movement;
    try {
      const day = await store.getDay(parts.dateKey);
      movement = computeMovement({ picks, readings: day.readings || {}, atMs, keys, excludeSlot: slotHour });
    } catch {
      movement = { mode: 'unavailable' };
    }
    const msg = buildMessage({ slot: slotHour, parts, picks, movement, config: cfg });

    const reading = { atMs, slot: slotHour, picks: {} };
    for (const k of Object.keys(picks)) reading.picks[k] = { ltp: picks[k].ltp, expiry: picks[k].expiry };
    try { await store.putReading(parts.dateKey, slotKey, reading); } catch { /* the message can still be used */ }

    const doc = {
      id, date: parts.dateKey, slot: slotKey, slotHour: slotHour ?? null,
      title: msg.title, text: msg.text, summary: msg.summary,
      status: 'ready', source, trigger, createdAtMs: atMs,
      boardTime: boardTimeText || null, picks, movement, warnings,
      error: null, reason: null,
    };
    await store.putUpdate(id, doc);
    return doc;
  }

  async function notify(doc, payload) {
    try {
      const r = await push.sendAll(payload);
      await store.putUpdate(doc.id, { pushed: { ...r, atMs: clock().getTime() } });
      return r;
    } catch (e) {
      return { error: String((e && e.message) || e) };
    }
  }

  async function failUpdate({ parts, slotHour, now, status, reason, kind, diag, trigger, notifyUser }) {
    const slotKey = slotKeyOf(slotHour, parts);
    const id = `${parts.dateKey}_${slotKey}`;
    const doc = {
      id, date: parts.dateKey, slot: slotKey, slotHour: slotHour ?? null, status, reason, kind: kind || null,
      createdAtMs: now.getTime(), trigger, diag: diag || null,
    };
    if (notifyUser && status === 'skipped') doc.skipNotified = true; // a holiday is announced once, not at every retry
    await store.putUpdate(id, doc);
    if (notifyUser) {
      const label = slotHour != null ? hourLabel(slotHour) : 'Rates';
      await notify(doc, {
        title: status === 'skipped' ? `ℹ️ ${label}: NCDEX board not updated today` : `⚠️ ${label} rates need you`,
        body: status === 'skipped' ? reason : `${reason} Tap to paste the board or type the numbers.`,
        url: `/rates?fix=${slotKey}`,
        tag: `rates-fix-${slotKey}`,
      });
    }
    return doc;
  }

  return {
    cronKey,

    async status() {
      const [config, subs, key, vapid] = await Promise.all([store.getConfig(), store.listSubs(), cronKey(), push.publicKey()]);
      const parts = istParts(clock());
      return {
        config, subscribers: subs.length, cronKey: key, vapidPublicKey: vapid,
        telegram: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
        slots: SLOTS, nowIst: { dateKey: parts.dateKey, hour: parts.hour, minute: parts.minute, weekday: parts.weekday },
      };
    },

    async setConfig(patch) {
      const out = {};
      if (typeof patch.includeTurmeric === 'boolean') out.includeTurmeric = patch.includeTurmeric;
      if (typeof patch.requireBoardTime === 'boolean') out.requireBoardTime = patch.requireBoardTime;
      if (typeof patch.phoneDelivery === 'boolean') out.phoneDelivery = patch.phoneDelivery;
      const age = num(patch.maxBoardAgeMin);
      if (age !== null) out.maxBoardAgeMin = Math.min(240, Math.max(5, Math.round(age)));
      if (patch.company && typeof patch.company === 'object') {
        const c = {};
        for (const f of ['name', 'tagline', 'place', 'phones']) if (typeof patch.company[f] === 'string' && patch.company[f].trim()) c[f] = patch.company[f].trim().slice(0, 120);
        if (Object.keys(c).length) out.company = c;
      }
      if (Object.keys(out).length) await store.setConfig(out);
      return store.getConfig();
    },

    /** Check the NCDEX connection without saving anything. */
    async diagnose() {
      const cfg = await store.getConfig();
      const now = clock();
      const got = await getBoard({ now, cfg });
      return {
        ok: !!got.ok, reason: got.reason || null, kind: got.kind || null, log: got.log || [],
        region: env.VERCEL_REGION || null,
        diag: got.diag || null,
        picks: got.board ? got.board.picks : {},
      };
    },

    /** Reads pasted board text (nothing is saved). */
    paste(text) {
      if (!text || String(text).trim().length < 30) throw new UserError('Paste the board text first.');
      const now = clock();
      const b = parseBoard(text, { now });
      const ageMin = b.boardTime ? Math.round((now.getTime() - b.boardTime.epoch) / 60000) : null;
      return {
        ok: b.errors.length === 0, errors: b.errors, warnings: b.warnings, picks: b.picks,
        boardTime: b.boardTime ? b.boardTime.label : null, ageMin,
      };
    },

    /**
     * Fetch from NCDEX, verify, and prepare the update for a slot.
     * trigger: 'cron' (scheduled) or 'user' (button)
     */
    async run({ slot = 'auto', trigger = 'user', force = false, html = null, via = null } = {}) {
      const now = clock();
      const parts = istParts(now);
      const slotHour = resolveSlot(slot, parts, trigger);

      if (trigger === 'cron') {
        if (slotHour == null) return { ok: true, skipped: true, reason: 'Not a scheduled update time.' };
        if (parts.weekday === 0 || parts.weekday === 6) return { ok: true, skipped: true, reason: 'Weekend: NCDEX is closed.' };
      }
      const slotKey = slotKeyOf(slotHour, parts);
      const id = `${parts.dateKey}_${slotKey}`;

      const existing = await store.getUpdate(id);
      if (existing && existing.status === 'ready' && !force) return { ok: true, already: true, update: existing };
      if (trigger === 'cron' && !(await store.claim(id, { nowMs: now.getTime() }))) {
        return { ok: true, skipped: true, reason: 'Another run is already in progress.' };
      }

      const cfg = await store.getConfig();
      const got = await getBoard({ now, cfg, html });

      if (!got.ok) {
        const skip = got.kind === 'not_today';
        // when the owner's phone also delivers the board, the "needs you" alert waits for the 8-minute retry
        const holdAlert = !skip && trigger === 'cron' && cfg.phoneDelivery === true && slotHour != null && parts.minute < 6;
        const doc = await failUpdate({
          parts, slotHour, now, status: skip ? 'skipped' : 'failed', reason: got.reason, kind: got.kind, diag: got.diag || { log: got.log },
          trigger, notifyUser: trigger === 'cron' && !holdAlert && (!skip || (slotHour === SLOTS[0] && !(existing && existing.skipNotified))),
        });
        return { ok: false, reason: got.reason, kind: got.kind, update: doc, diag: got.diag || null, log: got.log || [] };
      }

      const doc = await prepare({
        parts, now, slotHour, picks: got.board.picks, source: via === 'phone' ? 'phone' : 'ncdex', trigger,
        boardTimeText: got.diag.boardTime, warnings: got.board.warnings, cfg,
      });

      if (trigger === 'cron') {
        const label = slotHour != null ? hourLabel(slotHour) : 'Rates';
        await notify(doc, { title: `📊 ${label} update ready`, body: `${doc.summary}\nTap to send on WhatsApp`, url: `/rates?u=${doc.id}`, tag: `rates-${doc.slot}` });
        const tg = await telegram(doc.text, { env });
        if (!tg.skipped) await store.putUpdate(doc.id, { telegram: { ok: !!tg.ok, atMs: clock().getTime() } });
      }
      return { ok: true, update: await store.getUpdate(doc.id) };
    },

    /** Prepare an update from numbers the user typed or from a pasted board (already reviewed on screen). */
    async commit({ slot = 'auto', picks: input, source = 'manual', boardTime = null } = {}) {
      const now = clock();
      const parts = istParts(now);
      const cfg = await store.getConfig();
      const slotHour = resolveSlot(slot, parts, 'user');
      const picks = {};
      for (const k of ['jeera', 'dhaniya', 'turmeric']) {
        const p = input && input[k];
        if (!p) continue;
        const ltp = num(p.ltp), prev = num(p.prevClose);
        if (!(prev > 0)) throw new UserError(`${DISPLAY[k]}: previous close is needed.`);
        const price = ltp > 0 ? ltp : null;
        let change = num(p.change);
        if (change === null) { if (price === null) throw new UserError(`${DISPLAY[k]}: enter the last price (LTP).`); change = Math.round((price - prev) * 100) / 100; }
        const last = price !== null ? price : Math.round((prev + change) * 100) / 100;
        if (Math.abs(last - prev) > prev * 0.25) throw new UserError(`${DISPLAY[k]}: the price and previous close are more than 25% apart. Please check the numbers.`);
        let pct = num(p.changePct);
        if (pct === null) pct = Math.round((change / prev) * 10000) / 100;
        if (change < 0 && pct > 0) pct = -pct;
        // expiry: a full date from the board, or a 3-letter month typed by hand
        let expiry = typeof p.expiry === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(p.expiry) ? p.expiry : null;
        let label = typeof p.expiryLabel === 'string' ? p.expiryLabel.trim().slice(0, 3) : '';
        if (!expiry) {
          const mi = MONTH_INDEX[label.toLowerCase()];
          if (mi === undefined) throw new UserError(`${DISPLAY[k]}: expiry month is needed (for example Oct).`);
          const y = mi < parts.month - 7 ? parts.year + 1 : parts.year;
          expiry = `${y}-${pad2(mi + 1)}-01`;
        }
        label = monthName(Number(expiry.slice(5, 7)) - 1);
        picks[k] = {
          key: k, expiry, expiryLabel: label, open: num(p.open) ?? prev, prevClose: prev, ltp: last, change, changePct: pct,
          oi: num(p.oi), ltpSource: price !== null ? 'typed' : 'derived', warnings: [],
        };
      }
      const doc = await prepare({ parts, now, slotHour, picks, source, trigger: 'user', boardTimeText: boardTime, cfg });
      return { ok: true, update: doc };
    },

    async listUpdates(limit = 20) { return store.listUpdates(Math.min(60, Math.max(1, limit))); },

    async markSent(id, channel = 'whatsapp') {
      if (!id) throw new UserError('Missing update id.');
      await store.putUpdate(id, { sent: { [channel]: clock().getTime() } });
      return { ok: true };
    },

    async subscribe({ subscription, label }) {
      if (!subscription || typeof subscription.endpoint !== 'string' || !/^https:\/\//.test(subscription.endpoint)
        || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) throw new UserError('This device sent an invalid notification subscription.');
      const id = await store.addSub({ subscription, label: String(label || '').slice(0, 80), createdAtMs: clock().getTime() });
      return { ok: true, id };
    },

    async unsubscribe(endpoint) {
      const subs = await store.listSubs();
      const mine = subs.filter((s) => s.subscription && s.subscription.endpoint === endpoint);
      for (const s of mine) await store.removeSub(s.id);
      return { ok: true, removed: mine.length };
    },

    async testPush() {
      const r = await push.sendAll({ title: '✅ Rates Desk notifications work', body: 'You will get a message like this when each rate update is ready.', url: '/rates', tag: 'rates-test' });
      return { ok: true, ...r };
    },
  };
}

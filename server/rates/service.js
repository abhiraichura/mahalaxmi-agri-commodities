// The Rates Desk logic: get the board -> check it is live -> build the message -> save -> notify.
// Used by the scheduled run (cron) and by the buttons in the app.

import { istParts, hourLabel, monthName, MONTH_INDEX, istToEpoch } from './ist.js';
import { fetchBoardHtml, judgeBoard } from './fetchBoard.js';
import { parseBoard, parseBoardTime } from './parse.js';
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

/** "Oct 16 2026 10:02 AM", "As on Friday, Oct 16 2026 10:02 AM", "2026-10-16 10:02", "16-Oct-2026 10:02 AM", "16/10/2026 10:02" -> board time (IST) */
export function parseAsOf(raw) {
  const t = String(raw || '').replace(/\+/g, ' ').replace(/(\d)T(\d)/, '$1 $2').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const viaBoard = parseBoardTime(/^as\s+on/i.test(t) ? t : `As on ${t}`);
  if (viaBoard) {
    const clock = /(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?/.exec(t.replace(/^.*?\d{4}\s+/, ''));
    const h = clock ? Number(clock[1]) : 0; const mn = clock ? Number(clock[2]) : 0;
    if (clock && (mn > 59 || h > 23 || (clock[3] && (h < 1 || h > 12)))) return null; // 25:01 or 14:00 PM is not a time
    return viaBoard;
  }
  let y, mi, d, hh, mm, ap;
  let m = /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/.exec(t);
  if (m) { y = +m[1]; mi = +m[2] - 1; d = +m[3]; hh = +m[4]; mm = +m[5]; ap = m[6]; }
  if (!m) {
    m = /(\d{1,2})[-\s/]([A-Za-z]{3})[a-z]*[-\s/,]+(\d{4})\s+(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/.exec(t);
    if (m) { d = +m[1]; mi = MONTH_INDEX[m[2].toLowerCase()]; y = +m[3]; hh = +m[4]; mm = +m[5]; ap = m[6]; }
  }
  if (!m) {
    m = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/.exec(t);
    if (m) { d = +m[1]; mi = +m[2] - 1; y = +m[3]; hh = +m[4]; mm = +m[5]; ap = m[6]; }
  }
  if (!m || mi === undefined || mi < 0 || mi > 11 || hh > 23 || mm > 59) return null;
  if (ap) { const a = ap.toLowerCase(); if (a === 'pm' && hh < 12) hh += 12; if (a === 'am' && hh === 12) hh = 0; }
  const dateKey = `${y}-${pad2(mi + 1)}-${pad2(d)}`;
  const minutes = hh * 60 + mm;
  const h12 = hh % 12 || 12;
  return { dateKey, minutes, epoch: istToEpoch(dateKey, minutes), text: t, label: `${d} ${monthName(mi)} ${h12}:${pad2(mm)} ${hh >= 12 ? 'PM' : 'AM'}` };
}

/**
 * Numbers sent by the feed (Grok): { jeera: LTP, jeera_prev, jeera_chg, jeera_pct, jeera_open, jeera_oi, jeera_exp, dhaniya... }
 * Every row must add up (previous close + change = LTP, change % = change / previous close), otherwise it is refused.
 */
export function feedPicks(values, keys, parts) {
  const picks = {}; const errors = [];
  for (const k of keys) {
    const N = DISPLAY[k];
    const ltp = num(values[k] ?? values[`${k}_ltp`]);
    const prev = num(values[`${k}_prev`] ?? values[`${k}_close`]);
    let chg = num(values[`${k}_chg`] ?? values[`${k}_change`]);
    let pct = num(values[`${k}_pct`] ?? values[`${k}_changepct`]);
    const open = num(values[`${k}_open`]);
    const oi = num(values[`${k}_oi`]);
    const exp = String(values[`${k}_exp`] ?? values[`${k}_expiry`] ?? '').trim();
    if (!(ltp > 0)) { errors.push(`${N}: last price (LTP) is missing`); continue; }
    if (!(prev > 0)) { errors.push(`${N}: previous close is missing`); continue; }
    if (chg === null) chg = Math.round((ltp - prev) * 100) / 100;
    else if (Math.abs(prev + chg - ltp) > 0.51) { errors.push(`${N}: LTP ${ltp}, previous close ${prev} and change ${chg} do not add up (previous close + change = ${Math.round((prev + chg) * 100) / 100})`); continue; }
    if (Math.abs(ltp - prev) > prev * 0.25) { errors.push(`${N}: price and previous close are more than 25% apart`); continue; }
    const calc = Math.abs(chg) / prev * 100;
    if (pct !== null && Math.abs(calc - Math.abs(pct)) > 0.011) { errors.push(`${N}: change % ${pct} does not match change ${chg} on previous close ${prev} (expected about ${calc.toFixed(2)})`); continue; }
    pct = Math.round(calc * 100) / 100 * (chg < 0 ? -1 : 1);
    if (chg === 0) pct = 0;
    // expiry: a full date, or a month name
    let expiry = null; let label = '';
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(exp);
    if (m) { expiry = exp; label = monthName(Number(m[2]) - 1); }
    else if ((m = /^(\d{1,2})[-\s/]([A-Za-z]{3})[a-z]*[-\s/](\d{2,4})$/.exec(exp))) {
      const mi = MONTH_INDEX[m[2].toLowerCase()];
      if (mi !== undefined) { const yy = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]); expiry = `${yy}-${pad2(mi + 1)}-${pad2(Number(m[1]))}`; label = monthName(mi); }
    } else if ((m = /^([A-Za-z]{3})[a-z]*$/.exec(exp)) && MONTH_INDEX[m[1].toLowerCase()] !== undefined) {
      const mi = MONTH_INDEX[m[1].toLowerCase()];
      const yy = mi < parts.month - 2 ? parts.year + 1 : parts.year; // a month more than one behind us means next year
      expiry = `${yy}-${pad2(mi + 1)}-01`; label = monthName(mi);
    }
    if (!expiry) { errors.push(`${N}: expiry month is missing (for example Oct)`); continue; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(expiry) && !expiry.endsWith('-01') && expiry < parts.dateKey) { errors.push(`${N}: expiry ${expiry} has already passed; use the nearest running contract`); continue; }
    picks[k] = {
      key: k, expiry, expiryLabel: label, open: open ?? prev, prevClose: prev, ltp, change: chg, changePct: pct,
      oi, ltpSource: 'feed', warnings: [],
    };
  }
  return { picks, errors };
}

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

  // the feed (Grok) has a key of its own, so it can be changed without touching the scheduler's key
  async function feedKey() {
    if (env.RATES_FEED_KEY) return env.RATES_FEED_KEY;
    const s = await store.getSecrets();
    if (s.feedKey) return s.feedKey;
    const k = newSecret();
    await store.setSecrets({ feedKey: k });
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
      // the board text was sent from the owner's own browser: same checks, no server fetch
      const j = judgeBoard(String(html), { now, maxAgeMin: cfg.maxBoardAgeMin, requireBoardTime: cfg.requireBoardTime !== false });
      return { ...j, log: [{ url: 'sent from your browser', status: 200, bytes: String(html).length }] };
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
    const movementAuto = movement;
    // the default can be "do not show this section"; the automatic numbers are still kept so it can be switched on later
    if (cfg.showMovement === false) movement = { mode: 'off', label: movement.label, values: movement.values || {} };
    const msg = buildMessage({ slot: slotHour, parts, picks, movement, config: cfg });

    const reading = { atMs, slot: slotHour, picks: {} };
    for (const k of Object.keys(picks)) reading.picks[k] = { ltp: picks[k].ltp, expiry: picks[k].expiry };
    try { await store.putReading(parts.dateKey, slotKey, reading); } catch { /* the message can still be used */ }

    const doc = {
      id, date: parts.dateKey, slot: slotKey, slotHour: slotHour ?? null,
      title: msg.title, text: msg.text, summary: msg.summary,
      status: 'ready', source, trigger, createdAtMs: atMs,
      boardTime: boardTimeText || null, picks, movement, movementAuto, movementEdited: false, keys: msg.keys, warnings,
      error: null, reason: null, kind: null,
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
    feedKey,

    async regenFeedKey() {
      const k = newSecret();
      await store.setSecrets({ feedKey: k });
      return { ok: true, feedKey: k };
    },

    async status() {
      const [config, subs, key, vapid, fKey] = await Promise.all([store.getConfig(), store.listSubs(), cronKey(), push.publicKey(), feedKey()]);
      const parts = istParts(clock());
      return {
        config, subscribers: subs.length, cronKey: key, feedKey: fKey, vapidPublicKey: vapid,
        telegram: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
        slots: SLOTS, nowIst: { dateKey: parts.dateKey, hour: parts.hour, minute: parts.minute, weekday: parts.weekday },
      };
    },

    async setConfig(patch) {
      const out = {};
      if (typeof patch.includeTurmeric === 'boolean') out.includeTurmeric = patch.includeTurmeric;
      if (typeof patch.requireBoardTime === 'boolean') out.requireBoardTime = patch.requireBoardTime;
      if (typeof patch.showMovement === 'boolean') out.showMovement = patch.showMovement;
      if (patch.rateSource === 'feed' || patch.rateSource === 'server') out.rateSource = patch.rateSource;
      const wait = num(patch.feedWaitMin);
      if (wait !== null) out.feedWaitMin = Math.min(30, Math.max(3, Math.round(wait)));
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
      // when the rates come from the feed (Grok), the scheduler only checks that they arrived
      if (trigger === 'cron') {
        const cfg0 = await store.getConfig();
        if (cfg0.rateSource === 'feed') {
          if (existing) return { ok: true, skipped: true, reason: existing.reason || 'Already handled.', update: existing };
          const waited = parts.minutesOfDay - slotHour * 60;
          const limit = Math.min(30, Math.max(3, Math.round(Number(cfg0.feedWaitMin) || 10)));
          if (waited < limit) return { ok: true, skipped: true, reason: `Waiting for the feed (${waited} of ${limit} minutes).` };
          const reason = `${hourLabel(slotHour)} rates have not arrived from your feed after ${waited} minutes.`;
          const doc = await failUpdate({ parts, slotHour, now, status: 'failed', reason, kind: 'late', diag: null, trigger, notifyUser: true });
          return { ok: false, reason, kind: 'late', update: doc };
        }
      }
      if (trigger === 'cron' && !(await store.claim(id, { nowMs: now.getTime() }))) {
        return { ok: true, skipped: true, reason: 'Another run is already in progress.' };
      }

      const cfg = await store.getConfig();
      const got = await getBoard({ now, cfg, html });

      if (!got.ok) {
        const skip = got.kind === 'not_today';
        // a failed attempt by the user must never damage an update that is already ready
        if (trigger !== 'cron' && existing && existing.status === 'ready') {
          return { ok: false, reason: got.reason, kind: got.kind, update: existing, diag: got.diag || null, log: got.log || [] };
        }
        const doc = await failUpdate({
          parts, slotHour, now, status: skip ? 'skipped' : 'failed', reason: got.reason, kind: got.kind, diag: got.diag || { log: got.log },
          trigger, notifyUser: trigger === 'cron' && (!skip || (slotHour === SLOTS[0] && !(existing && existing.skipNotified))),
        });
        return { ok: false, reason: got.reason, kind: got.kind, update: doc, diag: got.diag || null, log: got.log || [] };
      }

      const doc = await prepare({
        parts, now, slotHour, picks: got.board.picks, source: via === 'browser' ? 'browser' : 'ncdex', trigger,
        boardTimeText: got.diag.boardTime, warnings: got.board.warnings, cfg,
      });

      if (trigger === 'cron' || via === 'browser') {
        const label = slotHour != null ? hourLabel(slotHour) : 'Rates';
        await notify(doc, { title: `📊 ${label} update ready`, body: `${doc.summary}\nTap to send on WhatsApp`, url: `/rates?u=${doc.id}`, tag: `rates-${doc.slot}` });
        const tg = await telegram(doc.text, { env });
        if (!tg.skipped) await store.putUpdate(doc.id, { telegram: { ok: !!tg.ok, atMs: clock().getTime() } });
      }
      return { ok: true, update: await store.getUpdate(doc.id) };
    },

    /**
     * The numbers sent by the feed (Grok, or anything else that can open a web address).
     * values: { asof, jeera, jeera_prev, jeera_chg, jeera_pct, jeera_open, jeera_oi, jeera_exp, dhaniya... }
     */
    async feed({ values = {}, slot = 'auto', force = false } = {}) {
      const now = clock();
      const parts = istParts(now);
      const cfg = await store.getConfig();
      const slotHour = resolveSlot(slot, parts, 'user');
      const slotKey = slotKeyOf(slotHour, parts);
      const id = `${parts.dateKey}_${slotKey}`;
      const existing = await store.getUpdate(id);
      if (existing && existing.status === 'ready' && !force) return { ok: true, already: true, update: existing };

      const refuse = async (kind, reason, status = 'failed') => {
        // a refused attempt must never damage an update that is already ready
        if (existing && existing.status === 'ready') return { ok: false, reason, kind, update: existing };
        const skip = status === 'skipped';
        const doc = await failUpdate({
          parts, slotHour, now, status, reason, kind, diag: { feed: Object.keys(values).sort() }, trigger: 'feed',
          notifyUser: !skip || (slotHour === SLOTS[0] && !(existing && existing.skipNotified)),
        });
        return skip ? { ok: true, skipped: true, reason, kind, update: doc } : { ok: false, reason, kind, update: doc };
      };

      // 1. is it today's, fresh board?
      const bt = parseAsOf(values.asof);
      const ageMin = bt ? Math.round((now.getTime() - bt.epoch) / 60000) : null;
      if (!bt && String(values.asof || '').trim()) return refuse('no_time', `The board time "${String(values.asof).slice(0, 40)}" could not be understood. Send it as it is written on the NCDEX board, for example Oct 16 2026 10:02 AM.`);
      if (!bt && cfg.requireBoardTime !== false) return refuse('no_time', 'The board time ("As on ...") was not sent, so freshness cannot be verified.');
      if (bt && bt.dateKey !== parts.dateKey) return refuse('not_today', `The board shows ${bt.label}, which is not today. NCDEX may be closed (holiday).`, 'skipped');
      if (bt && (ageMin > cfg.maxBoardAgeMin || ageMin < -5)) return refuse('stale', `The board time is ${bt.label} (${ageMin} min old), so these numbers are not live.`);

      // 2. do the numbers add up?
      const keys = messageKeys(cfg);
      const { picks, errors } = feedPicks(values, keys, parts);
      if (errors.length) return refuse('bad_numbers', `Numbers not accepted: ${errors.join('; ')}.`);

      const doc = await prepare({
        parts, now, slotHour, picks, source: 'feed', trigger: 'feed',
        boardTimeText: bt ? bt.label : null, warnings: bt ? [] : ['board time not sent'], cfg,
      });
      const label = slotHour != null ? hourLabel(slotHour) : 'Rates';
      await notify(doc, { title: `📊 ${label} update ready`, body: `${doc.summary}\nTap to send on WhatsApp`, url: `/rates?u=${doc.id}`, tag: `rates-${doc.slot}` });
      const tg = await telegram(doc.text, { env });
      if (!tg.skipped) await store.putUpdate(doc.id, { telegram: { ok: !!tg.ok, atMs: clock().getTime() } });
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

    /**
     * Change the "Movement Since Previous Update" section of one ready update.
     *   mode 'auto'   - back to the automatic numbers
     *   mode 'manual' - the owner's own numbers (rupees, + or -) and an optional "compared with" label
     *   mode 'off'    - leave the section out of the message
     */
    async setMovement({ id, mode, values = {}, label = '' } = {}) {
      if (!id) throw new UserError('Missing update id.');
      const doc = await store.getUpdate(id);
      if (!doc || doc.status !== 'ready' || !doc.picks) throw new UserError('This update is not ready, so its movement cannot be changed.');
      if (!['auto', 'manual', 'off'].includes(mode)) throw new UserError('Unknown movement choice.');
      const cfg = await store.getConfig();
      const keys = Array.isArray(doc.keys) && doc.keys.length ? doc.keys : (String(doc.text || '').includes('*Turmeric ') ? ['jeera', 'dhaniya', 'turmeric'] : ['jeera', 'dhaniya']);
      const auto = doc.movementAuto || doc.movement || { mode: 'unavailable' };
      let movement;
      if (mode === 'auto') {
        movement = auto;
      } else if (mode === 'off') {
        movement = { mode: 'off', label: auto.label || 'previous update', values: auto.values || {} };
      } else {
        const v = {};
        for (const k of keys) {
          const n = num(values && values[k]);
          if (n === null) throw new UserError(`${DISPLAY[k]}: enter the movement in rupees (for example 40 or -25).`);
          if (Math.abs(n) > doc.picks[k].ltp * 0.25) throw new UserError(`${DISPLAY[k]}: that movement is more than 25% of the price. Please check the number.`);
          v[k] = Math.round(n);
        }
        movement = { mode: 'manual', label: String(label || '').trim().slice(0, 24) || auto.label || 'previous update', values: v };
      }
      const msg = buildMessage({
        slot: doc.slotHour, parts: istParts(new Date(doc.createdAtMs)), picks: doc.picks, movement,
        config: { ...cfg, includeTurmeric: keys.includes('turmeric') },
      });
      await store.putUpdate(id, { text: msg.text, movement, movementAuto: auto, movementEdited: mode !== 'auto', keys: msg.keys });
      return { ok: true, update: await store.getUpdate(id) };
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

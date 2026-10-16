// Builds the client message in the exact format of the Grok prompt, plus the movement numbers.

import { fmtDate, fmtTime, hourLabel } from './ist.js';
import { NAMES_HI, outlook } from './hindi.js';

export const SLOTS = [10, 12, 14, 16, 17];
export const SLOT_TITLES = {
  10: 'NCDEX SPICE MARKET OPEN UPDATE',
  12: 'NCDEX SPICE MARKET MID MORNING UPDATE',
  14: 'NCDEX SPICE MARKET AFTERNOON UPDATE',
  16: 'NCDEX SPICE MARKET PRE-CLOSE UPDATE',
  17: 'NCDEX SPICE MARKET CLOSING UPDATE',
};
export const DISPLAY = { jeera: 'Jeera', dhaniya: 'Dhaniya', turmeric: 'Turmeric' };

/** which commodities appear in the message */
export function messageKeys(cfg) {
  return ['jeera', 'dhaniya'].concat(cfg && cfg.includeTurmeric ? ['turmeric'] : []);
}

export const DEFAULT_CONFIG = {
  includeTurmeric: false, // the Grok template shows Jeera and Dhaniya only
  maxBoardAgeMin: 30,
  requireBoardTime: true, // send only when the NCDEX board shows today's time
  showMovement: true, // new updates include the 'Movement Since Previous Update' section (it can still be edited or hidden per update)
  rateSource: 'server', // 'server' = the server reads NCDEX itself, 'feed' = the rates are sent to the app (for example by Grok) and the scheduler only checks that they arrived
  feedWaitMin: 10, // feed mode: alert when nothing has arrived this many minutes after the update time
  company: {
    name: 'MAHALAXMI AGRI COMMODITIES',
    tagline: 'Commodity Broker & Commission Agent',
    place: 'Rajkot, Gujarat',
    phones: '90330 00032 | 99099 71301',
  },
};

export const inr = (n) => Number(n).toLocaleString('en-IN');
const MINUS = '−';
const icon = (v) => (v > 0 ? '🟩' : v < 0 ? '🟥' : '➖');

const num = (abs) => (Number.isInteger(abs) ? inr(abs) : inr(Number(abs.toFixed(2))));
/** "+165" / "−12" / "0" */
export function fmtSigned(v) {
  const abs = Math.abs(v);
  if (v > 0) return `+${num(abs)}`;
  if (v < 0) return `${MINUS}${num(abs)}`;
  return '0';
}
/** "+₹40" / "−₹20" / "₹0" (movement line) */
export function fmtMove(v) {
  if (v > 0) return `+₹${inr(v)}`;
  if (v < 0) return `${MINUS}₹${inr(Math.abs(v))}`;
  return '₹0';
}
export function fmtPct(p) {
  const abs = Math.abs(p).toFixed(2);
  if (p > 0) return `${abs}%`;
  if (p < 0) return `${MINUS}${abs}%`;
  return '0.00%';
}

/** The slot a moment belongs to: the scheduled hour if we are within `windowMin` minutes after it. */
export function slotFor(parts, windowMin = 59) {
  for (const h of [...SLOTS].reverse()) {
    const d = parts.minutesOfDay - h * 60;
    if (d >= 0 && d <= windowMin) return h;
  }
  return null;
}

/**
 * Movement since the previous update of the day.
 * readings: { [key]: { atMs, slot, picks: { jeera: { ltp, expiry } ... } } }  (today's earlier updates)
 * Falls back to the board change against the previous close when there is no earlier update.
 */
export function computeMovement({ picks, readings, atMs, keys, excludeSlot = null }) {
  // only the scheduled updates (10, 12, 2, 4, 5) are used as the "previous update"; test or ad-hoc readings are not
  const earlier = Object.values(readings || {})
    .filter((r) => r && r.atMs < atMs && r.picks && SLOTS.includes(Number(r.slot)) && String(r.slot) !== String(excludeSlot))
    .sort((a, b) => b.atMs - a.atMs);
  const ref = earlier.find((r) => keys.every((k) => r.picks[k] && String(r.picks[k].expiry).slice(0, 7) === String(picks[k].expiry).slice(0, 7) && r.picks[k].ltp > 0));
  if (ref) {
    const values = {};
    for (const k of keys) values[k] = Math.round(picks[k].ltp - ref.picks[k].ltp);
    const label = hourLabel(Number(ref.slot));
    return { mode: 'since', label, values };
  }
  const values = {};
  for (const k of keys) values[k] = Math.round(picks[k].change);
  return { mode: 'prevclose', label: 'prev close', values };
}

/**
 * -> { title, text, keys, summary }
 */
export function buildMessage({ slot, parts, picks, movement, config = DEFAULT_CONFIG }) {
  const cfg = { ...DEFAULT_CONFIG, ...config, company: { ...DEFAULT_CONFIG.company, ...(config.company || {}) } };
  const keys = messageKeys(cfg);
  const title = SLOT_TITLES[slot] || 'NCDEX SPICE MARKET UPDATE';

  const rateLines = keys.map((k) => {
    const p = picks[k];
    const chg = Math.round(p.change * 100) / 100;
    return `*${DISPLAY[k]} ${p.expiryLabel}* — ₹${inr(p.ltp)} | ${icon(chg)} ${fmtSigned(chg)} (${fmtPct(p.changePct)}) | OI ${p.oi == null ? '—' : inr(p.oi)}`;
  });

  // movement.mode: 'since' | 'prevclose' (worked out by the app), 'manual' (typed by the owner), 'off' (section hidden), 'unavailable'
  const shown = movement.mode !== 'off';
  let movementLine = '';
  if (movement.mode === 'unavailable') {
    movementLine = 'Movement unavailable (history not reachable)';
  } else if (shown) {
    movementLine = keys.map((k) => `${icon(movement.values[k])} ${DISPLAY[k]} ${fmtMove(movement.values[k])}`).join(' | ')
      + ` (vs ${movement.label})`;
  }
  const movementBlock = shown ? ['*Movement Since Previous Update*', movementLine, ''] : [];

  // the Hindi outlook follows the same numbers; with the section hidden it uses the board's own change vs yesterday's close
  const outlookMode = movement.mode === 'manual' ? (/prev|close|कल/i.test(movement.label || '') ? 'prevclose' : 'since')
    : movement.mode === 'off' ? 'prevclose' : movement.mode;
  const seed = `${parts.dateKey}|${slot}`;
  const outlooks = keys.map((k, i) => {
    const p = picks[k];
    const o = outlook({
      key: k,
      movement: movement.mode === 'unavailable' ? 0 : movement.mode === 'off' ? Math.round(p.change) : movement.values[k],
      mode: outlookMode,
      boardChange: p.change,
      ltp: p.ltp,
      seed,
      index: i,
    });
    const ic = icon(Math.round(p.change));
    return `${ic} **${k.toUpperCase()} – ${o.status}**  \n${o.text}`;
  });

  const c = cfg.company;
  const text = [
    `🙏 **${c.name}**`,
    '',
    `🌾 ${title}`,
    `📅 *${fmtDate(parts)} | ⏰ ${fmtTime(parts)}*`,
    '',
    '📊 **COMMODITY RATES**',
    ...rateLines,
    '',
    ...movementBlock,
    '📈 **QUICK OUTLOOK**',
    ...outlooks,
    '',
    `🏢 **${c.name}**  `,
    `${c.tagline}  `,
    `📍 ${c.place}  `,
    `📞 ${c.phones}`,
    '',
    '🤝 For Latest Rates, Market Updates & Business Enquiries, Contact Us.',
    '⚠️ Disclaimer: Market information only. Not a Buy/Sell recommendation.',
  ].join('\n');

  const summary = keys.map((k) => `${DISPLAY[k]} ${picks[k].expiryLabel} ₹${inr(picks[k].ltp)} ${icon(picks[k].change)} ${fmtSigned(Math.round(picks[k].change * 100) / 100)}`).join(' · ');
  return { title, text, keys, summary, hindiNames: keys.map((k) => NAMES_HI[k]) };
}

// Reads the NCDEX "Live Quotes" board from either
//   - the page's HTML (fetched by the server), or
//   - plain text the user copied from the page and pasted into the app.
//
// The board's exact HTML is not under our control, so this reader does NOT depend on column positions.
// It looks for each commodity, then for each expiry date under it, and reads the numbers of that row using
// facts that are always true on the board:
//   previous close + change = last traded price
//   change % = change / previous close
// Anything it cannot prove is reported as a warning, and a row that cannot be read is an error
// (the app then asks you to paste the board text or type the numbers, instead of guessing).

import { MONTH_INDEX, istParts, istToEpoch, monthName } from './ist.js';

const SYMBOL_RULES = [
  [/^JEERAUNJHA$/i, 'jeera'],
  [/^JEERA$/i, 'jeera'],
  [/^DHANIYA$/i, 'dhaniya'],
  [/^CORIANDER$/i, 'dhaniya'],
  [/^TMCFGRNZM$/i, 'turmeric'],
  [/^TURMERIC$/i, 'turmeric'],
];
export const SYMBOL_NAMES = { jeera: 'JEERAUNJHA', dhaniya: 'DHANIYA', turmeric: 'TMCFGRNZM' };

const KNOWN_CAPS = new Set(['FUTCOM', 'FUTIDX', 'OPTFUT', 'ATP', 'LTP', 'OI', 'NA', 'FUT', 'AM', 'PM', 'IST', 'MT', 'KG', 'QTL']);
const LABELS = new Set([
  'open', 'close', 'prev', 'previous', 'ltp', 'last', 'change', 'chg', 'oi', 'interest', 'high', 'low', 'atp',
  'volume', 'vol', 'best', 'buy', 'sell', 'spot', 'price', 'bid', 'ask', 'qty', 'quantity', 'date', 'time',
  'expiry', 'symbol', 'instrument', 'type', 'avg', 'value', 'lot', 'lots', 'traded', 'trade', 'trades', 'turnover',
]);

const MONTH_RE = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

function monthIdx(word) {
  return MONTH_INDEX[String(word).slice(0, 3).toLowerCase()];
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&minus;/gi, '-').replace(/&#8722;/g, '-').replace(/&#x2212;/gi, '-')
    .replace(/&#8377;|&#x20b9;|&rupee;/gi, ' ')
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(Number(n)); } catch { return ' '; } })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => { try { return String.fromCodePoint(parseInt(n, 16)); } catch { return ' '; } });
}

/** HTML -> readable text (cells and rows become separators); plain text is passed through. */
export function toText(input) {
  let s = String(input ?? '');
  if (/<\s*(?:html|body|table|tr|td|th|div|span|p)\b/i.test(s)) {
    s = s
      .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(?:td|th)\s*>/gi, ' \t ')
      .replace(/<\/(?:tr|p|div|li|h[1-6]|table|thead|tbody|section)\s*>/gi, ' \n ')
      .replace(/<br\s*\/?>/gi, ' \n ')
      .replace(/<[^>]+>/g, ' ');
    s = decodeEntities(s);
  }
  return s;
}

/** "As on Wednesday, Oct 14 2026 10:05 AM" -> { dateKey, minutes, epoch, text } */
export function parseBoardTime(text) {
  const re = new RegExp(`As\\s+on\\s+(?:[A-Za-z]+,?\\s+)?(${MONTH_RE})[a-z]*\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})\\s+(\\d{1,2}):(\\d{2})(?::\\d{2})?\\s*([AaPp][Mm])?`, 'i');
  const m = re.exec(text);
  if (!m) return null;
  const mi = monthIdx(m[1]);
  if (mi === undefined) return null;
  let h = Number(m[4]);
  const ap = (m[6] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  const minutes = h * 60 + Number(m[5]);
  const dateKey = `${m[3]}-${String(mi + 1).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`;
  const h12 = h % 12 || 12;
  const label = `${Number(m[2])} ${monthName(mi)} ${h12}:${String(Number(m[5])).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  return { dateKey, minutes, epoch: istToEpoch(dateKey, minutes), text: m[0].trim(), label };
}

function pad2(n) { return String(n).padStart(2, '0'); }

/** Marks expiry dates, hides the other dates/times, separates glued brackets. */
function prepare(text) {
  let s = text
    .replace(/ /g, ' ')
    .replace(/[−–—]/g, (c) => (c === '−' ? '-' : c)) // real minus -> "-"
    .replace(/[₹]/g, ' ')
    .replace(/[▲↑▴△]\s*(?=\d)/g, '+')
    .replace(/[▼↓▾▽]\s*(?=\d)/g, '-');

  // expiry date: 19-Oct-2026, 19 Oct 2026, 19/Oct/26
  // (the day must not be the tail of another number such as "25,614.70 Oct 13")
  const expRe = new RegExp(`(?<![\\d.,])(\\d{1,2})[-\\s/](${MONTH_RE})[a-z]*(?:[-\\s/,]+(\\d{4})|[-/](\\d{2}))(?!\\d)`, 'gi');
  s = s.replace(expRe, (all, d, mon, y4, y2) => {
    const mi = monthIdx(mon);
    if (mi === undefined) return all;
    const yy = y4 ? Number(y4) : 2000 + Number(y2);
    return ` \u0001${yy}-${pad2(mi + 1)}-${pad2(Number(d))}\u0001 `;
  });
  // other dates (spot price date, "As on" line): Oct 13 2026 | 13/10/2026
  s = s.replace(new RegExp(`\\b(?:[A-Za-z]+,?\\s+)?${MONTH_RE}[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4}\\b`, 'gi'), ' ');
  s = s.replace(/\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b/g, ' ');
  // times
  s = s.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp]\.?[Mm]\.?)?/g, ' ');
  // glued "165.00(0.64)" and spaced "( 0.64 )"
  s = s.replace(/(\d)\(/g, '$1 (').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\|/g, ' ');
  return s;
}

function classify(raw) {
  const t = raw.trim();
  if (!t) return null;
  let m = /^\u0001(\d{4}-\d{2}-\d{2})\u0001$/.exec(t);
  if (m) return { kind: 'expiry', iso: m[1] };

  const bare = t.replace(/^[("'\[]+|[)"'\].,;:]+$/g, '');
  for (const [re, key] of SYMBOL_RULES) if (re.test(bare)) return { kind: 'symbol', key };

  // number: optional sign, digits with commas, optional decimals, optional % ; wrapped in brackets => percentage
  const wrapped = /^\(.*\)$/.test(t);
  const core = t.replace(/^\(+|\)+$/g, '').replace(/%$/, '');
  const pctMark = wrapped || /%$/.test(t);
  m = /^([+-]?)(\d{1,3}(?:,\d{2,3})*|\d+)(\.\d+)?$/.exec(core);
  if (m) {
    const v = Number((m[2] + (m[3] || '')).replace(/,/g, ''));
    return {
      kind: 'num', v, neg: m[1] === '-', signed: m[1] !== '', hasDec: !!m[3], hasComma: m[2].includes(','), pct: pctMark,
      raw: t,
    };
  }

  const word = bare.replace(/[^A-Za-z0-9]/g, '');
  if (!word) return null;
  const lower = word.toLowerCase();
  if (LABELS.has(lower)) return { kind: 'label', name: lower };
  if (/^[A-Z][A-Z0-9]{4,}$/.test(word) && /[A-Z]/.test(word) && !KNOWN_CAPS.has(word)) return { kind: 'other', caps: true };
  if (/^[A-Za-z]{5,}$/.test(word)) return { kind: 'other', caps: false };
  return null;
}

const approx = (a, b, tol) => Math.abs(a - b) <= tol;

const NOISE_WORDS = new Set([...KNOWN_CAPS].map((w) => w.toLowerCase()).concat(['futures', 'future', 'options', 'option', 'opt', 'inr', 'rs']));

/** A word that could be part of a product name ("Guar", "Seed", "Pepper", "(Farmer"), i.e. not a column label. */
function isNameWord(raw) {
  const w = String(raw).replace(/^[("'\[]+|[)"'\].,;:]+$/g, '');
  if (!/[A-Za-z]{2,}/.test(w)) return false;
  const lower = w.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  return !!lower && !LABELS.has(lower) && !NOISE_WORDS.has(lower);
}

/**
 * Whose row does the next expiry date belong to?  Decided only from the words printed since the previous number:
 *  - our commodity's name/symbol right before the date (at most 3 qualifier words after it, like "(Farmer Polished)")
 *  - some other product name ("Pepper", "Guar seed", ...) => not ours, so its numbers are never used
 *  - nothing but column labels => same commodity as the row above (names printed once per commodity)
 * This also stops a commodity name in a filter drop-down from claiming the first row of the table.
 */
function decideSymbol(lead, previous) {
  for (let i = lead.length - 1; i >= 0; i--) {
    if (lead[i].type === 'sym') return lead.length - 1 - i <= 3 ? lead[i].key : null;
  }
  return lead.length ? null : previous;
}


/** Reads one row (the tokens between one expiry date and the next). */
function decodeRow(items) {
  const warnings = [];

  // ---- labelled layout ("Open 25,635.00  Close 25,640.00  Change 165.00 (0.64) ... OI 1,395")
  const lab = { open: null, prev: null, change: null, pct: null, oi: null, ltp: null };
  let prevFlag = false;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind !== 'label') continue;
    const next = items[i + 1];
    const nextNum = next && next.kind === 'num' ? next : null;
    if (it.name === 'prev' || it.name === 'previous') { prevFlag = true; continue; }
    if (it.name === 'open' && next && next.kind === 'label' && next.name === 'interest') {
      const n2 = items[i + 2];
      if (n2 && n2.kind === 'num') lab.oi = n2;
      continue;
    }
    if (it.name === 'oi' && nextNum) lab.oi = nextNum;
    else if (it.name === 'open' && nextNum) lab.open = nextNum;
    else if (it.name === 'close' && nextNum) { lab.prev = nextNum; prevFlag = false; }
    else if ((it.name === 'ltp' || it.name === 'last') && nextNum) lab.ltp = nextNum;
    else if ((it.name === 'change' || it.name === 'chg') && nextNum) {
      lab.change = nextNum;
      const n2 = items[i + 2];
      if (n2 && n2.kind === 'num' && n2.pct) lab.pct = n2;
    }
  }
  const nums = items.filter(i => i.kind === 'num');

  const priceItems = nums.filter(n => n.hasDec && !n.pct);
  let open = null, prevClose = null, change = null, pct = null, oiItem = null;

  if (lab.prev && lab.change) {
    prevClose = lab.prev.v;
    change = lab.change.neg ? -lab.change.v : lab.change.v;
    pct = lab.pct ? lab.pct.v : null;
    open = lab.open ? lab.open.v : null;
    oiItem = lab.oi;
  } else {
    // ---- positional layout: find the "change (percent)" pair first
    let ci = -1;
    for (let i = 0; i < nums.length - 1; i++) {
      if (!nums[i].pct && nums[i + 1].pct) { ci = i; break; }
    }
    if (ci < 0) {
      // percent shown in its own column without brackets: look for a decimal pair that agrees with a price
      for (let i = 0; i < nums.length - 1; i++) {
        const a = nums[i], b = nums[i + 1];
        if (!a.hasDec || !b.hasDec || b.v >= 25 || a.v >= 5000) continue;
        const ok = nums.some(p => p !== a && p !== b && p.hasDec && p.v > 0 && approx(Math.abs(a.v) / p.v * 100, b.v, 0.0061));
        if (ok) { ci = i; nums[i + 1] = { ...b, pct: true }; break; }
      }
    }
    if (ci < 0) return { error: 'change and change % not found in this row' };
    const cItem = nums[ci], pItem = nums[ci + 1];
    change = cItem.neg ? -cItem.v : cItem.v;
    pct = pItem.v;
    // the previous close is the price whose change % matches; the nearest one before the change cell is tried first
    const cands = priceItems.filter(p => p !== cItem && p.v > 0 && Math.abs(change) <= p.v * 0.25);
    const order = [...cands].sort((a, b) => Math.abs(nums.indexOf(a) - ci) - Math.abs(nums.indexOf(b) - ci));
    const before = order.filter(p => nums.indexOf(p) < ci);
    const after = order.filter(p => nums.indexOf(p) > ci);
    const matches = (p) => approx(Math.abs(change) / p.v * 100, pItem.v, 0.0061);
    // a previous close is confirmed when "previous close + change" also appears on the row (that is the LTP)
    const strong = order.filter(p => matches(p) && priceItems.some(q => q !== p && approx(q.v, p.v + change, 0.51)));
    const hit = strong[0] || before.find(matches) || after.find(matches);
    if (hit) prevClose = hit.v;
    else if (before[0]) { prevClose = before[0].v; warnings.push('previous close could not be confirmed against change %'); }
    else return { error: 'previous close not found in this row' };
    // open is the first price printed in the row (it comes before low / LTP / high / close)
    open = priceItems.length ? priceItems[0].v : null;
    // OI: last whole number that is not a year, not a percentage
    const ints = nums.filter(n => !n.hasDec && !n.pct && !(n.v >= 1990 && n.v <= 2100 && !n.hasComma));
    oiItem = ints.length ? ints[ints.length - 1] : null;
  }

  if (prevClose == null || change == null) return { error: 'previous close / change not found' };

  // last traded price: the board value that equals previous close + change; otherwise derived
  const derived = Math.round((prevClose + change) * 100) / 100;
  let ltp = null, ltpSource = 'derived';
  const ltpCands = lab.ltp ? [lab.ltp] : priceItems;
  const found = ltpCands.find(p => approx(p.v, derived, 0.51));
  if (found) { ltp = found.v; ltpSource = 'board'; }
  else {
    ltp = derived;
    if (lab.ltp) warnings.push(`board LTP ${lab.ltp.v} does not match previous close + change; used ${derived}`);
  }

  // percentage sign follows the change
  let changePct = pct == null ? Math.round(Math.abs(change) / prevClose * 10000) / 100 : Math.abs(pct);
  if (change < 0) changePct = -changePct;

  // sanity
  if (Math.abs(change) > prevClose * 0.2) warnings.push('change is more than 20% - please check');
  if (open != null && Math.abs(open - prevClose) > prevClose * 0.2) { warnings.push('open price looks odd - ignored'); open = null; }
  if (open == null) open = prevClose;
  if (!oiItem) warnings.push('open interest not found');

  return {
    row: { open, prevClose, ltp, change, changePct, oi: oiItem ? oiItem.v : null, ltpSource },
    warnings,
  };
}

/**
 * parseBoard(input, { now })
 * -> { boardTime, picks:{jeera,dhaniya,turmeric}, contracts:{...}, errors:[], warnings:[], stats }
 */
export function parseBoard(input, { now = new Date() } = {}) {
  const text0 = toText(input);
  const boardTime = parseBoardTime(text0);
  const text = prepare(text0);
  const today = istParts(now).dateKey;

  const tokens = text.split(/\s+/).filter(Boolean);
  let sym = null;      // commodity of the row being read (kept for layouts that print the name only once)
  let cur = null;
  let lead = [];       // words seen since the last number: they decide whose row the next expiry date starts
  const segments = [];
  const flush = () => { if (cur) { segments.push(cur); cur = null; } };

  for (const raw of tokens) {
    if (cur && /^(?:CE|PE|CALL|PUT)$/i.test(raw)) { cur.option = true; continue; }
    const c = classify(raw);
    if (!c) { if (isNameWord(raw)) lead.push({ type: 'name' }); continue; }
    if (c.kind === 'symbol') { flush(); lead.push({ type: 'sym', key: c.key }); continue; }
    if (c.kind === 'expiry') {
      flush();
      sym = decideSymbol(lead, sym);
      lead = [];
      cur = sym ? { sym, iso: c.iso, items: [] } : null;
      continue;
    }
    if (c.kind === 'other') {
      if (isNameWord(raw)) lead.push({ type: 'name' });
      if (c.caps) { flush(); sym = null; continue; } // another commodity (GUARGUM5, CASTOR ...)
      // a plain word: ends a finished row (footer text), otherwise ignore
      if (cur && cur.items.filter(i => i.kind === 'num').length >= 8) flush();
      continue;
    }
    if (c.kind === 'num') lead = [];
    if (cur) cur.items.push(c);
  }
  flush();

  const contracts = { jeera: [], dhaniya: [], turmeric: [] };
  const errors = [];
  const warnings = [];
  for (const seg of segments) {
    if (seg.option) continue; // option rows (CE / PE) are not futures
    if (!seg.items.some(i => i.kind === 'num')) continue; // filter drop-downs and headings have no numbers
    const dec = decodeRow(seg.items);
    if (dec.error) { contracts[seg.sym].push({ expiry: seg.iso, error: dec.error }); continue; }
    contracts[seg.sym].push({ expiry: seg.iso, ...dec.row, warnings: dec.warnings });
  }

  const picks = {};
  for (const key of ['jeera', 'dhaniya', 'turmeric']) {
    const list = contracts[key].slice().sort((a, b) => a.expiry.localeCompare(b.expiry));
    const live = list.filter(c => c.expiry >= today);
    const target = live[0];
    if (!target) {
      errors.push(`${SYMBOL_NAMES[key]}: no running contract found on the board`);
      continue;
    }
    if (target.error) {
      errors.push(`${SYMBOL_NAMES[key]} ${target.expiry}: ${target.error}`);
      continue;
    }
    const mi = Number(target.expiry.slice(5, 7)) - 1;
    picks[key] = {
      key, symbol: SYMBOL_NAMES[key], expiry: target.expiry, expiryLabel: monthName(mi),
      open: target.open, prevClose: target.prevClose, ltp: target.ltp, change: target.change, changePct: target.changePct,
      oi: target.oi, ltpSource: target.ltpSource, warnings: target.warnings || [],
    };
    for (const w of picks[key].warnings) warnings.push(`${SYMBOL_NAMES[key]}: ${w}`);
  }

  return {
    boardTime,
    picks,
    contracts,
    errors,
    warnings,
    stats: { textLength: text0.length, segments: segments.length },
  };
}

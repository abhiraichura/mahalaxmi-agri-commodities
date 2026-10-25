// The reminder rules for a contract: when is loading due, when is payment due, and which reminder is due today.
//
// Plain functions, no database and no network, so the SAME rules are used by the server (which sends the notifications)
// and by the screens (which show what is next). Dates are "YYYY-MM-DD" text in Indian time. Days are calendar days.
//
// What a contract needs for the reminders (all optional, the screens fill them in):
//   date              the contract date (loading time counts from here)
//   loadingDays       "loading within N days"            (or the old text in loadingCondition is read)
//   loadingDeadline   the exact last loading day         (wins over loadingDays when both are there)
//   paymentDaysMin/Max "payment N to M days after loading" (or the old text in paymentTerms is read)
//   loadedOn          the day the goods were really loaded (set by you)
//   paymentReceivedOn the day the payment was confirmed    (set by you)
//   snooze            { kind: 'loading' | 'payment', until: 'YYYY-MM-DD', note }  "the buyer said Friday"
//   remindersOff      true = no reminders for this contract
//
// The reminder promise:
//   loading : half-way to the deadline, one day before, on the deadline, then (if still not loaded) a few gentle nudges
//   payment : first day of the payment window, last day of the window, then a few gentle nudges until you confirm payment
//   a "snooze" silences that part until the date you were promised, and a reminder comes on that very day

const DAY_MS = 86400000;

// ---------- dates (all "YYYY-MM-DD")
export const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}/.test(k) && !Number.isNaN(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)));
export const cleanKey = (k) => (isKey(k) ? k.slice(0, 10) : null);
const utc = (k) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
export function addDays(key, n) {
  const d = new Date(utc(key) + n * DAY_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
/** whole days from a to b (b later = positive) */
export const diffDays = (a, b) => Math.round((utc(b) - utc(a)) / DAY_MS);
/** today's date in India */
export function todayIST(now = new Date()) {
  return new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** "Tue 28 Oct" */
export function fmtDay(key) {
  if (!isKey(key)) return '';
  const d = new Date(utc(key));
  return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
}
/** "28 Oct 2026" */
export function fmtDayYear(key) {
  if (!isKey(key)) return '';
  return `${+key.slice(8, 10)} ${MON[+key.slice(5, 7) - 1]} ${key.slice(0, 4)}`;
}
/** "today" / "tomorrow" / "yesterday" / "in 3 days" / "3 days ago" */
export function relDay(key, today) {
  const n = diffDays(today, key);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

// ---------- reading the old free text ("Goods to be loaded within one week", "3 to 4 days payment with 1% discount after delivery")
const WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  'twenty one': 21, 'twenty-one': 21, thirty: 30, 'forty five': 45, 'forty-five': 45, sixty: 60,
};
const NUM = '\\b(\\d{1,3}|' + Object.keys(WORDS).sort((a, b) => b.length - a.length).join('|') + ')';
const toNum = (s) => (/^\d/.test(s) ? Number(s) : WORDS[s.toLowerCase()]);

/** "within 10 days" -> 10, "within one week" -> 7, "10 to 15 days" -> 15 (the last day counts). null when it cannot be read. */
export function parseLoadingDays(text) {
  const t = String(text || '').toLowerCase().replace(/\s+/g, ' ');
  if (!t) return null;
  let m = new RegExp(`${NUM}\\s*(?:to|-|–|or)\\s*${NUM}\\s*days?`).exec(t);
  if (m) return bound(Math.max(toNum(m[1]), toNum(m[2])), 1, 180);
  m = new RegExp(`${NUM}\\s*(?:to|-|–|or)\\s*${NUM}\\s*weeks?`).exec(t);
  if (m) return bound(Math.max(toNum(m[1]), toNum(m[2])) * 7, 1, 180);
  m = new RegExp(`${NUM}\\s*days?`).exec(t);
  if (m) return bound(toNum(m[1]), 1, 180);
  m = new RegExp(`${NUM}\\s*weeks?`).exec(t);
  if (m) return bound(toNum(m[1]) * 7, 1, 180);
  if (/\b(a|one)\s+week\b|\bweek\b/.test(t)) return 7;
  if (/fortnight/.test(t)) return 14;
  m = new RegExp(`${NUM}\\s*months?`).exec(t);
  if (m) return bound(toNum(m[1]) * 30, 1, 180);
  if (/\b(a|one)\s+month\b|\bmonth\b/.test(t)) return 30;
  return null;
}

/** "3 to 4 days payment with 1% discount" -> {min:3,max:4}; "within 7 days" -> {min:7,max:7}; "ready payment" -> {min:1,max:1} */
export function parsePaymentDays(text) {
  const t = String(text || '').toLowerCase().replace(/\s+/g, ' ');
  if (!t) return null;
  let m = new RegExp(`${NUM}\\s*(?:to|-|–|or)\\s*${NUM}\\s*days?`).exec(t);
  if (m) { const a = toNum(m[1]); const b = toNum(m[2]); return { min: bound(Math.min(a, b), 0, 180), max: bound(Math.max(a, b), 0, 180) }; }
  m = new RegExp(`${NUM}\\s*days?`).exec(t);
  if (m) { const a = bound(toNum(m[1]), 0, 180); return { min: a, max: a }; }
  m = new RegExp(`${NUM}\\s*weeks?`).exec(t);
  if (m) { const a = bound(toNum(m[1]) * 7, 0, 180); return { min: a, max: a }; }
  if (/\b(a|one)\s+week\b/.test(t)) return { min: 7, max: 7 };
  if (/ready|immediate|same day|on delivery|against delivery|cash/.test(t)) return { min: 1, max: 1 };
  return null;
}
function bound(n, lo, hi) { return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : null; }
const posInt = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && v !== '' && v != null ? n : null; };

// ---------- what a contract's terms mean in dates
/** { date, loadingDays, deadline, half, eve, pay: {min,max}|null, source: {loading, payment} } */
export function termsOf(c) {
  const date = cleanKey(c.date);
  const out = { date, loadingDays: null, deadline: null, half: null, eve: null, pay: null, source: { loading: null, payment: null } };
  if (!date) return out;

  const boxDays = posInt(c.loadingDays);
  const typedDeadline = cleanKey(c.loadingDeadline);
  const textDays = parseLoadingDays(c.loadingCondition);
  if (typedDeadline && diffDays(date, typedDeadline) > 0) {
    out.deadline = typedDeadline; out.source.loading = 'deadline';
  } else if (boxDays && boxDays > 0) {
    out.deadline = addDays(date, boxDays); out.source.loading = 'days';
  } else if (textDays) {
    out.deadline = addDays(date, textDays); out.source.loading = 'text';
  }
  if (out.deadline) {
    const total = diffDays(date, out.deadline);
    out.loadingDays = total;
    const eve = addDays(out.deadline, -1);
    out.eve = diffDays(date, eve) >= 1 ? eve : null;
    const half = addDays(date, Math.floor(total / 2));
    // half-way only makes sense when it falls clearly between the contract date and the day before the deadline
    out.half = total >= 4 && out.eve && diffDays(date, half) >= 1 && diffDays(half, out.eve) >= 1 ? half : null;
  }

  const bMin = posInt(c.paymentDaysMin);
  const bMax = posInt(c.paymentDaysMax);
  if (bMin != null || bMax != null) {
    const min = bMin != null ? bMin : bMax;
    const max = bMax != null ? Math.max(bMax, min) : min;
    out.pay = { min, max }; out.source.payment = 'days';
  } else {
    const p = parsePaymentDays(c.paymentTerms);
    if (p) { out.pay = p; out.source.payment = 'text'; }
  }
  return out;
}

// ---------- where a contract stands
/** the cadence of the gentle nudges after a due date: days 1, 2, 3, then every third day up to day 15 */
export function nudgeDay(n) { return n >= 1 && (n <= 3 || (n <= 15 && (n - 3) % 3 === 0)); }

/**
 * Everything the screens need to know about one contract.
 *   stage      'draft' | 'cancelled' | 'to_load' | 'awaiting_payment' | 'paid'
 *   loading    { deadline, half, eve, daysLeft, overdueDays, state: 'none' | 'upcoming' | 'today' | 'overdue' | 'loaded', loadedOn }
 *   payment    { from, to, daysToDue, overdueDays, state: 'none' | 'not_started' | 'window' | 'last_day' | 'overdue' | 'received', receivedOn }
 *   ask        what to ask you today: null | 'loading' | 'payment' | 'promised_loading' | 'promised_payment'
 *   next       { kind, date, label } the next date that matters
 */
export function planFor(c, today) {
  const t = termsOf(c);
  const status = c.status || 'confirmed';
  const loadedOn = cleanKey(c.loadedOn);
  const receivedOn = cleanKey(c.paymentReceivedOn);
  const stage = status === 'draft' ? 'draft' : status === 'cancelled' ? 'cancelled'
    : (status === 'completed' || receivedOn) ? 'paid' : loadedOn ? 'awaiting_payment' : 'to_load';

  // ----- loading
  const loading = { deadline: t.deadline, half: t.half, eve: t.eve, daysLeft: null, overdueDays: 0, state: 'none', loadedOn };
  if (loadedOn) loading.state = 'loaded';
  else if (t.deadline && stage === 'to_load') {
    const left = diffDays(today, t.deadline);
    loading.daysLeft = left;
    if (left > 0) loading.state = 'upcoming';
    else if (left === 0) loading.state = 'today';
    else { loading.state = 'overdue'; loading.overdueDays = -left; }
  }

  // ----- payment
  const payment = { from: null, to: null, daysToDue: null, overdueDays: 0, state: 'none', receivedOn };
  if (receivedOn || stage === 'paid') payment.state = 'received';
  else if (loadedOn && t.pay && stage === 'awaiting_payment') {
    payment.from = addDays(loadedOn, t.pay.min);
    payment.to = addDays(loadedOn, t.pay.max);
    const toEnd = diffDays(today, payment.to);
    const toStart = diffDays(today, payment.from);
    payment.daysToDue = toEnd;
    if (toStart > 0) payment.state = 'not_started';
    else if (toEnd > 0) payment.state = 'window';
    else if (toEnd === 0) payment.state = 'last_day';
    else { payment.state = 'overdue'; payment.overdueDays = -toEnd; }
  } else if (loadedOn && stage === 'awaiting_payment') payment.state = 'none';

  // ----- snooze ("the buyer said Friday")
  const snooze = c.snooze && cleanKey(c.snooze.until) && (c.snooze.kind === 'loading' || c.snooze.kind === 'payment') ? c.snooze : null;
  const snoozedKind = snooze && diffDays(today, cleanKey(snooze.until)) > 0 ? snooze.kind : null; // still waiting for that day
  const promisedToday = snooze && cleanKey(snooze.until) === today ? snooze.kind : null;

  // ----- what to ask you today
  let ask = null;
  const eligible = status === 'confirmed' && !c.remindersOff;
  if (stage === 'to_load') {
    if (promisedToday === 'loading') ask = 'promised_loading';
    else if (snoozedKind !== 'loading' && (loading.state === 'overdue' || loading.state === 'today' || (loading.state === 'upcoming' && loading.daysLeft === 1))) ask = 'loading';
  } else if (stage === 'awaiting_payment') {
    if (promisedToday === 'payment') ask = 'promised_payment';
    else if (snoozedKind !== 'payment' && (payment.state === 'window' || payment.state === 'last_day' || payment.state === 'overdue')) ask = 'payment';
  }

  // ----- the next date that matters
  let next = null;
  if (stage === 'to_load' && t.deadline) {
    const cand = [[t.half, 'half', 'Loading check'], [t.eve, 'eve', 'Loaded yet?'], [t.deadline, 'deadline', 'Loading deadline']].filter(([d]) => d && diffDays(today, d) >= 0);
    if (cand.length) next = { kind: cand[0][1], date: cand[0][0], label: cand[0][2] };
    else if (loading.state === 'overdue') next = { kind: 'overdue_loading', date: today, label: `Loading ${loading.overdueDays} day${loading.overdueDays === 1 ? '' : 's'} overdue` };
  } else if (stage === 'awaiting_payment' && payment.from) {
    if (payment.state === 'not_started') next = { kind: 'payment_open', date: payment.from, label: 'Payment window opens' };
    else if (payment.state === 'window') next = { kind: 'payment_last', date: payment.to, label: 'Payment due by' };
    else if (payment.state === 'last_day') next = { kind: 'payment_last', date: payment.to, label: 'Payment due today' };
    else next = { kind: 'overdue_payment', date: today, label: `Payment ${payment.overdueDays} day${payment.overdueDays === 1 ? '' : 's'} overdue` };
  }
  if (snooze && cleanKey(snooze.until) && (snoozedKind || promisedToday) && next) next = { kind: 'promised', date: cleanKey(snooze.until), label: snooze.kind === 'loading' ? 'Promised loading' : 'Promised payment' };

  const attention = ask && (loading.state === 'overdue' || payment.state === 'overdue') ? 'overdue'
    : ask ? 'today' : next && diffDays(today, next.date) <= 3 ? 'soon' : 'none';

  return { eligible, stage, terms: t, loading, payment, snooze, ask, next, attention };
}

// ---------- words for the notification and the cards
const nm = (p) => String((p && (p.legalName || p.name)) || 'Party').trim();
const qtyText = (c) => `${c.quantity ? `${Number(c.quantity).toLocaleString('en-IN')} ${c.quantityUnit || ''}`.trim() : ''}`;
export function dealLine(c) {
  const prod = (c.product && c.product.name) || '';
  return [qtyText(c), prod].filter(Boolean).join(' ');
}
const tag = (c) => `Contract ${c.contractNo || ''}`.trim();

/**
 * The reminders that are due today for one contract (before checking which were already sent).
 * -> [{ key, kind, date, title, body, url, tag, priority }]
 */
export function dueReminders(c, today) {
  const p = planFor(c, today);
  if (!p.eligible) return [];
  const out = [];
  const url = (ask) => `/contracts/${c.id}?ask=${ask}`;
  const who = `${nm(c.seller)} → ${nm(c.buyer)}`;
  const deal = dealLine(c);
  const push = (kind, date, title, body, ask, priority) => out.push({ key: `${c.id}__${kind}__${date}`, kind, date, title, body, url: url(ask), tag: `c-${String(c.id).slice(0, 20)}-${kind}`, priority, contractId: c.id });
  const snooze = p.snooze;
  const snoozedLoading = snooze && snooze.kind === 'loading' && diffDays(today, cleanKey(snooze.until)) > 0;
  const snoozedPayment = snooze && snooze.kind === 'payment' && diffDays(today, cleanKey(snooze.until)) > 0;

  if (p.stage === 'to_load') {
    const t = p.terms;
    if (snooze && snooze.kind === 'loading' && cleanKey(snooze.until) === today) {
      push('promised_loading', today, `📌 ${tag(c)} · loading promised for today`, `${snooze.note ? `${snooze.note}. ` : ''}${nm(c.seller)} promised to load today. Is it loaded?\n${deal} · ${who}`, 'loading', 1);
    } else if (t.deadline && !snoozedLoading) {
      const total = t.loadingDays;
      if (t.half && diffDays(t.half, today) >= 0 && diffDays(t.half, today) <= 1 && diffDays(today, t.eve) > 0) {
        const done = diffDays(t.date, today);
        push('loading_half', t.half, `🚚 ${tag(c)} · loading check`, `Half the loading time is gone (day ${done} of ${total}). Loading deadline: ${fmtDay(t.deadline)}.\n${deal} · ${who}`, 'loading', 3);
      }
      if (t.eve && today === t.eve) {
        push('loading_eve', t.eve, `🚚 ${tag(c)} · loaded yet?`, `Loading deadline is tomorrow (${fmtDay(t.deadline)}). Tap to say: loaded or not.\n${deal} · ${who}`, 'loading', 2);
      }
      if (today === t.deadline) {
        push('loading_due', t.deadline, `⏰ ${tag(c)} · loading deadline today`, `Today is the last day to load. Is it loaded?\n${deal} · ${who}`, 'loading', 1);
      }
      const over = diffDays(t.deadline, today);
      if (over >= 1 && nudgeDay(over)) {
        push('loading_overdue', today, `⚠️ ${tag(c)} · loading ${over} day${over === 1 ? '' : 's'} overdue`, `The loading deadline was ${fmtDay(t.deadline)}. Is it loaded now? If not, note when the seller promised.\n${deal} · ${who}`, 'loading', 1);
      }
    }
  }

  if (p.stage === 'awaiting_payment' && p.payment.from) {
    const pay = p.payment;
    if (snooze && snooze.kind === 'payment' && cleanKey(snooze.until) === today) {
      push('promised_payment', today, `📌 ${tag(c)} · payment promised for today`, `${snooze.note ? `${snooze.note}. ` : ''}${nm(c.buyer)} promised to pay today. Ask for the payment update.\n${deal} · ${who}`, 'payment', 1);
    } else if (!snoozedPayment) {
      const loaded = fmtDay(p.loading.loadedOn);
      if (pay.from !== pay.to && diffDays(pay.from, today) >= 0 && diffDays(pay.from, today) <= 1 && diffDays(today, pay.to) > 0) {
        push('payment_open', pay.from, `💰 ${tag(c)} · payment window opens`, `Loaded on ${loaded}. ${nm(c.buyer)} should pay between ${fmtDay(pay.from)} and ${fmtDay(pay.to)}. Ask for the payment update.\n${deal} · ${who}`, 'payment', 2);
      }
      if (today === pay.to) {
        push('payment_last', pay.to, `💰 ${tag(c)} · ${pay.from === pay.to ? 'payment due today' : 'last day for payment'}`, `Loaded on ${loaded}. Ask ${nm(c.buyer)} for the payment update.\n${deal} · ${who}`, 'payment', 1);
      }
      const over = diffDays(pay.to, today);
      if (over >= 1 && nudgeDay(over)) {
        push('payment_overdue', today, `⚠️ ${tag(c)} · payment ${over} day${over === 1 ? '' : 's'} overdue`, `Payment was due by ${fmtDay(pay.to)}. Ask ${nm(c.buyer)} for the payment update.\n${deal} · ${who}`, 'payment', 1);
      }
    }
  }
  return out;
}

/**
 * What the Today screen lists: contracts that need you now, and what is coming in the next `days` days.
 * -> { needs: [{ contract, plan, ask }], soon: [{ contract, plan, date, label }] }
 */
export function todaySummary(contracts, today, days = 7) {
  const needs = []; const soon = [];
  for (const c of contracts) {
    const p = planFor(c, today);
    if (!p.eligible) continue;
    if (p.ask) {
      const over = p.ask === 'loading' ? p.loading.overdueDays : p.ask === 'payment' ? p.payment.overdueDays : 0;
      if (over > 60) continue; // very old: the contracts list shows them, the Today list stays readable
      needs.push({ contract: c, plan: p, ask: p.ask, over });
    } else if (p.next && diffDays(today, p.next.date) >= 0 && diffDays(today, p.next.date) <= days) {
      soon.push({ contract: c, plan: p, date: p.next.date, label: p.next.label });
    }
  }
  const rank = (n) => (n.ask.startsWith('promised') ? 0 : n.over > 0 ? 1 : 2);
  needs.sort((a, b) => rank(a) - rank(b) || b.over - a.over || String(a.contract.contractNo).localeCompare(String(b.contract.contractNo), undefined, { numeric: true }));
  soon.sort((a, b) => a.date.localeCompare(b.date));
  return { needs, soon };
}

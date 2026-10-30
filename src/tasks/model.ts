// src/tasks/model.ts
// Tasks: the shape stored in Firestore ("daily_todos", the same collection the old planner used, so old tasks still show),
// plus the small pure helpers (dates, repeats, typing a task in one line, grouping) that the screens share.

export type Priority = 'low' | 'medium' | 'high';
export type Repeat = '' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface CheckItem { id: string; text: string; done: boolean }
export interface TaskLink { type: 'contract' | 'party'; id: string; label: string }

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  /** yyyy-mm-dd the task is for; '' = no date */
  day: string;
  /** optional HH:mm */
  time?: string;
  details?: string;
  checklist?: CheckItem[];
  repeat?: Repeat;
  /** every occurrence of a repeating task shares one series id */
  series?: string;
  link?: TaskLink | null;
  doneAt?: string;
  createdMs?: number;
}

export const REPEAT_LABEL: Record<Exclude<Repeat, ''>, string> = {
  daily: 'Every day', weekdays: 'Every weekday (Mon to Fri)', weekly: 'Every week', monthly: 'Every month', quarterly: 'Every 3 months', yearly: 'Every year',
};

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const isPriority = (v: unknown): v is Priority => v === 'low' || v === 'medium' || v === 'high';
const REPEATS = ['daily', 'weekdays', 'weekly', 'monthly', 'quarterly', 'yearly'];

/** one Firestore document -> a Task that is safe to use (old documents have only text/completed/priority/day) */
export function normalizeTask(id: string, d: Record<string, unknown>): Task {
  const created = d.createdAt as { toMillis?: () => number; seconds?: number } | undefined;
  const link = d.link as Partial<TaskLink> | null | undefined;
  return {
    id,
    text: str(d.text),
    completed: !!d.completed,
    priority: isPriority(d.priority) ? d.priority : 'medium',
    day: /^\d{4}-\d{2}-\d{2}$/.test(str(d.day)) ? str(d.day) : '',
    ...(/^\d{2}:\d{2}$/.test(str(d.time)) ? { time: str(d.time) } : {}),
    ...(str(d.details) ? { details: str(d.details) } : {}),
    ...(Array.isArray(d.checklist) ? { checklist: (d.checklist as Partial<CheckItem>[]).filter(c => c && str(c.text)).map((c, i) => ({ id: str(c.id) || `c${i}`, text: str(c.text), done: !!c.done })) } : {}),
    ...(REPEATS.includes(str(d.repeat)) ? { repeat: str(d.repeat) as Repeat } : {}),
    ...(str(d.series) ? { series: str(d.series) } : {}),
    link: link && (link.type === 'contract' || link.type === 'party') && str(link.id) ? { type: link.type, id: str(link.id), label: str(link.label) } : null,
    ...(str(d.doneAt) ? { doneAt: str(d.doneAt) } : {}),
    createdMs: created?.toMillis ? created.toMillis() : created?.seconds ? created.seconds * 1000 : undefined,
  };
}

/** the fields we write (never undefined: Firestore refuses it) */
export function taskFields(t: Partial<Task>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (t.text !== undefined) o.text = t.text.trim();
  if (t.completed !== undefined) o.completed = t.completed;
  if (t.priority !== undefined) o.priority = t.priority;
  if (t.day !== undefined) o.day = t.day;
  if (t.time !== undefined) o.time = t.time || '';
  if (t.details !== undefined) o.details = t.details;
  if (t.checklist !== undefined) o.checklist = t.checklist.map(c => ({ id: c.id, text: c.text, done: c.done }));
  if (t.repeat !== undefined) o.repeat = t.repeat || '';
  if (t.series !== undefined) o.series = t.series || '';
  if (t.link !== undefined) o.link = t.link ? { type: t.link.type, id: t.link.id, label: t.link.label } : null;
  if (t.doneAt !== undefined) o.doneAt = t.doneAt || '';
  return o;
}

/* ---------------------------------------------------------------- dates (plain yyyy-mm-dd strings, India calendar) */

const p2 = (n: number) => String(n).padStart(2, '0');
export const isoOf = (y: number, m1: number, d: number) => `${y}-${p2(m1)}-${p2(d)}`;
const parts = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return { y, m, d }; };
const utc = (iso: string) => { const { y, m, d } = parts(iso); return Date.UTC(y, m - 1, d); };
const fromUtc = (ms: number) => { const t = new Date(ms); return isoOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
export const addDays = (iso: string, n: number) => fromUtc(utc(iso) + n * 86400000);
export const daysBetween = (from: string, to: string) => Math.round((utc(to) - utc(from)) / 86400000);
/** 0 = Sunday */
export const weekday = (iso: string) => new Date(utc(iso)).getUTCDay();
const lastDayOf = (y: number, m1: number) => new Date(Date.UTC(y, m1, 0)).getUTCDate();

export function addMonths(iso: string, n: number, keepDay?: number): string {
  const { y, m, d } = parts(iso);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12), nm = (total % 12) + 1;
  return isoOf(ny, nm, Math.min(keepDay ?? d, lastDayOf(ny, nm)));
}

/** the next date of a repeating task after `from`; never earlier than `notBefore` (a task finished very late does not pile up old copies) */
export function nextDay(from: string, repeat: Repeat, notBefore: string, keepDay?: number): string {
  const step = (d: string): string => {
    switch (repeat) {
      case 'daily': return addDays(d, 1);
      case 'weekdays': { let n = addDays(d, 1); while (weekday(n) === 0 || weekday(n) === 6) n = addDays(n, 1); return n; }
      case 'weekly': return addDays(d, 7);
      case 'monthly': return addMonths(d, 1, keepDay);
      case 'quarterly': return addMonths(d, 3, keepDay);
      case 'yearly': return addMonths(d, 12, keepDay);
      default: return d;
    }
  };
  if (!repeat) return from;
  let n = step(from);
  for (let guard = 0; n < notBefore && guard < 800; guard++) n = step(n);
  return n;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Thu 29 Oct" */
export function dayText(iso: string): string {
  if (!iso) return 'No date';
  const { m, d } = parts(iso);
  return `${DAY_NAMES[weekday(iso)]} ${d} ${MONTH_NAMES[m - 1]}`;
}

/** "Today", "Tomorrow", "Yesterday", "Overdue 3 days" etc. */
export function dueText(day: string, today: string): { text: string; tone: 'red' | 'amber' | 'blue' | 'gray' } {
  if (!day) return { text: 'No date', tone: 'gray' };
  const n = daysBetween(today, day);
  if (n === 0) return { text: 'Today', tone: 'amber' };
  if (n === 1) return { text: 'Tomorrow', tone: 'blue' };
  if (n === -1) return { text: 'Yesterday', tone: 'red' };
  if (n < 0) return { text: `${-n} days overdue`, tone: 'red' };
  if (n < 7) return { text: DAY_NAMES[weekday(day)], tone: 'blue' };
  return { text: dayText(day), tone: 'gray' };
}

/* ---------------------------------------------------------------- typing a whole task in one line */

export interface Quick { text: string; day?: string; priority?: Priority; repeat?: Repeat; time?: string }

/** "Call Patel about payment tomorrow !!" -> text, date, priority. "Send GST papers every month 20 nov" works too. */
export function parseQuick(input: string, today: string): Quick {
  let s = ` ${input.trim()} `;
  const out: Quick = { text: '' };
  /** find the first match; the callback may return false to leave it in the text */
  const take = (re: RegExp, f: (m: RegExpExecArray) => void | false) => { const m = re.exec(s); if (m && f(m) !== false) s = s.replace(m[0], ' '); };

  take(/\s!(?:!|high)\b|\s!!+/i, () => { out.priority = 'high'; });
  if (!out.priority) take(/\s!(?:low)\b/i, () => { out.priority = 'low'; });
  if (!out.priority) take(/\s!(?:med|medium)\b/i, () => { out.priority = 'medium'; });
  take(/\severy\s+(day|weekday|week|month|quarter|year)s?\b|\s(daily|weekly|monthly|quarterly|yearly)\b/i, m => {
    const w = (m[1] || m[2]).toLowerCase();
    out.repeat = (w === 'day' || w === 'daily' ? 'daily' : w === 'weekday' ? 'weekdays' : w === 'week' || w === 'weekly' ? 'weekly' : w === 'month' || w === 'monthly' ? 'monthly' : w === 'quarter' || w === 'quarterly' ? 'quarterly' : 'yearly');
  });
  take(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, m => {
    let h = Number(m[1]) % 12; if (/pm/i.test(m[3])) h += 12;
    out.time = `${p2(h)}:${m[2] || '00'}`;
  });
  take(/\sin\s+(\d{1,3})\s+days?\b/i, m => { out.day = addDays(today, Number(m[1])); });
  if (!out.day) take(/\s(today|tonight)\b/i, () => { out.day = today; });
  if (!out.day) take(/\s(tomorrow|tmrw|tmr)\b/i, () => { out.day = addDays(today, 1); });
  if (!out.day) take(/\snext\s+week\b/i, () => { out.day = addDays(today, 7); });
  if (!out.day) take(new RegExp(`\\s(?:on\\s+)?(${WEEKDAYS.join('|')})(?:day|sday|nesday|rsday|urday)?\\b`, 'i'), m => {
    const target = WEEKDAYS.indexOf(m[1].toLowerCase());
    out.day = addDays(today, ((target - weekday(today) + 7) % 7) || 7);
  });
  if (!out.day) take(/\s(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/, m => {
    const d = Number(m[1]), mo = Number(m[2]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    let y = m[3] ? Number(m[3]) : parts(today).y; if (y < 100) y += 2000;
    if (d > lastDayOf(y, mo)) return false; // 31/02 is not a date
    let iso = isoOf(y, mo, d);
    if (!m[3] && iso < today) iso = isoOf(y + 1, mo, Math.min(d, lastDayOf(y + 1, mo)));
    out.day = iso;
  });
  if (!out.day) take(new RegExp(`\\s(?:on\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS.join('|')})[a-z]*\\b`, 'i'), m => {
    const d = Number(m[1]), mo = MONTHS.indexOf(m[2].toLowerCase()) + 1;
    if (d < 1 || d > 31) return false;
    let y = parts(today).y; let iso = isoOf(y, mo, Math.min(d, lastDayOf(y, mo)));
    if (iso < today) { y++; iso = isoOf(y, mo, Math.min(d, lastDayOf(y, mo))); }
    out.day = iso;
  });
  const text = s.replace(/\s{2,}/g, ' ').replace(/^[\s,;:-]+|[\s,;:-]+$/g, '').trim();
  out.text = text || input.trim();
  return out;
}

/* ---------------------------------------------------------------- grouping for the screens */

export const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** open tasks first by date, then time, then priority, then oldest */
export function byUrgency(a: Task, b: Task): number {
  const da = a.day || '9999-99-99', db = b.day || '9999-99-99';
  return da.localeCompare(db) || (a.time || '99:99').localeCompare(b.time || '99:99') || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.createdMs || 0) - (b.createdMs || 0);
}

export interface Buckets { overdue: Task[]; today: Task[]; upcoming: Task[]; someday: Task[]; done: Task[] }

export function bucketTasks(tasks: Task[], today: string): Buckets {
  const b: Buckets = { overdue: [], today: [], upcoming: [], someday: [], done: [] };
  for (const t of tasks) {
    if (t.completed) b.done.push(t);
    else if (!t.day) b.someday.push(t);
    else if (t.day < today) b.overdue.push(t);
    else if (t.day === today) b.today.push(t);
    else b.upcoming.push(t);
  }
  for (const k of ['overdue', 'today', 'upcoming', 'someday'] as const) b[k].sort(byUrgency);
  b.done.sort((a, c) => (c.doneAt || '').localeCompare(a.doneAt || '') || (c.day || '').localeCompare(a.day || ''));
  return b;
}

/** the steps ticked off, e.g. "2/4" */
export function checkProgress(t: Pick<Task, 'checklist'>): { done: number; total: number } | null {
  const c = t.checklist || [];
  return c.length ? { done: c.filter(x => x.done).length, total: c.length } : null;
}

/** Common tasks an agri broker repeats every month (the day-of-month is when it is due). */
export const COMMON_REMINDERS: { key: string; text: string; repeat: Repeat; dom: number; priority: Priority; details: string }[] = [
  { key: 'gstr1', text: 'File GSTR-1 (outward supplies)', repeat: 'monthly', dom: 11, priority: 'high', details: 'Due by the 11th of every month (monthly filers).' },
  { key: 'gstr3b', text: 'File GSTR-3B and pay GST', repeat: 'monthly', dom: 20, priority: 'high', details: 'Due by the 20th of every month (monthly filers).' },
  { key: 'tds', text: 'Pay TDS deducted last month', repeat: 'monthly', dom: 7, priority: 'medium', details: 'TDS deducted in a month is due by the 7th of the next month.' },
  { key: 'bills', text: 'Make last month\'s brokerage bills and send them', repeat: 'monthly', dom: 2, priority: 'high', details: 'Money > Brokerage bills > pick last month > select all > make files.' },
  { key: 'chase', text: 'Ask for brokerage payments that are still pending', repeat: 'monthly', dom: 15, priority: 'medium', details: 'Open Brokerage bills and filter Pending.' },
  { key: 'backup', text: 'Download a backup of contracts and parties', repeat: 'monthly', dom: 28, priority: 'low', details: 'Keep a copy of your contracts and parties somewhere safe.' },
];

/** the next date on or after `today` with this day of the month */
export function nextDom(today: string, dom: number): string {
  const { y, m } = parts(today);
  const here = isoOf(y, m, Math.min(dom, lastDayOf(y, m)));
  return here >= today ? here : addMonths(isoOf(y, m, 1), 1, dom);
}

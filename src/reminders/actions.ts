// What happens to a contract when you answer a reminder. Each function returns the fields to save with updateContract().
import { v4 as uuid } from 'uuid';
import { Contract, TimelineEvent } from '../types';
import { addDays, fmtDay, fmtDayYear, termsOf } from '../../server/reminders/plan.js';

const ev = (type: TimelineEvent['type'], date: string, text: string): TimelineEvent => ({ id: uuid(), type, date, text, at: Date.now() });
const withEvent = (c: Contract, e: TimelineEvent) => [...(c.timeline || []), e];
const party = (p: { legalName?: string; name?: string } | undefined) => (p && (p.legalName || p.name)) || 'Party';

/** "Yes, it is loaded" on the given day. Clears any postponement. */
export function loadedUpdate(c: Contract, date: string): Partial<Contract> {
  return { loadedOn: date, snooze: null, timeline: withEvent(c, ev('loaded', date, `Loaded on ${fmtDayYear(date)} (confirmed by you)`)) };
}

/** "Not yet", with the day the seller promised (or none). */
export function notLoadedUpdate(c: Contract, today: string, promised: string | null, note = ''): Partial<Contract> {
  const text = promised
    ? `Not loaded yet on ${fmtDay(today)}. ${party(c.seller)} promised ${fmtDay(promised)}${note ? ` (${note})` : ''}`
    : `Not loaded yet on ${fmtDay(today)}${note ? ` (${note})` : ''}`;
  return {
    snooze: promised ? { kind: 'loading', until: promised, note: note || '' } : null,
    timeline: withEvent(c, ev('not_loaded', today, text)),
  };
}

/** "Payment received" on the given day. Optionally closes the contract. */
export function paidUpdate(c: Contract, date: string, close: boolean): Partial<Contract> {
  const out: Partial<Contract> = { paymentReceivedOn: date, snooze: null, timeline: withEvent(c, ev('paid', date, `Payment confirmed on ${fmtDayYear(date)}`)) };
  if (close) out.status = 'completed';
  return out;
}

/** "Not paid yet", with the day the buyer promised (or none). */
export function notPaidUpdate(c: Contract, today: string, promised: string | null, note = ''): Partial<Contract> {
  const text = promised
    ? `Payment not received on ${fmtDay(today)}. ${party(c.buyer)} promised ${fmtDay(promised)}${note ? ` (${note})` : ''}`
    : `Payment not received on ${fmtDay(today)}${note ? ` (${note})` : ''}`;
  return {
    snooze: promised ? { kind: 'payment', until: promised, note: note || '' } : null,
    timeline: withEvent(c, ev('not_paid', today, text)),
  };
}

/** Take back "loaded" (a wrong tap). */
export function undoLoaded(c: Contract, today: string): Partial<Contract> {
  return { loadedOn: null, paymentReceivedOn: null, snooze: null, timeline: withEvent(c, ev('undo', today, 'Loading date removed')) };
}
/** Take back "payment received". */
export function undoPaid(c: Contract, today: string): Partial<Contract> {
  const out: Partial<Contract> = { paymentReceivedOn: null, timeline: withEvent(c, ev('undo', today, 'Payment confirmation removed')) };
  if (c.status === 'completed') out.status = 'confirmed';
  return out;
}

export function addNote(c: Contract, today: string, text: string): Partial<Contract> {
  return { timeline: withEvent(c, ev('note', today, text.trim())) };
}

/** quick postponement choices: tomorrow, in 2 days ... */
export const quickDays = (today: string): { label: string; date: string }[] => [
  { label: 'Tomorrow', date: addDays(today, 1) },
  { label: 'In 2 days', date: addDays(today, 2) },
  { label: 'In 3 days', date: addDays(today, 3) },
  { label: 'In a week', date: addDays(today, 7) },
];

/** The three dates of a contract as they stand now ('' when not set). */
export interface DatesInput { deadline: string; loadedOn: string; paidOn: string }
export function currentDates(c: Contract): DatesInput {
  return { deadline: termsOf(c).deadline || '', loadedOn: c.loadedOn || '', paidOn: c.paymentReceivedOn || '' };
}

/**
 * Change the loading deadline, the loading date or the payment date (any time, as often as needed).
 * Each change is written in the diary with the old and the new day, so there is always a record.
 * `completed` says whether a newly entered payment date should also mark the contract as completed.
 */
export function datesUpdate(c: Contract, today: string, next: DatesInput, completed: boolean): Partial<Contract> {
  const old = currentDates(c);
  const out: Partial<Contract> = {};
  const events: TimelineEvent[] = [];
  const from = (d: string) => (d ? ` from ${fmtDayYear(d)}` : '');

  if (next.deadline !== old.deadline) {
    out.loadingDeadline = next.deadline;
    events.push(ev('note', today, next.deadline
      ? `Loading deadline ${old.deadline ? 'changed' : 'set'}${from(old.deadline)} to ${fmtDayYear(next.deadline)}`
      : 'Loading deadline cleared (it follows the loading days again)'));
  }
  if (next.loadedOn !== old.loadedOn) {
    out.loadedOn = next.loadedOn || null;
    if (next.loadedOn) {
      events.push(ev('loaded', next.loadedOn, old.loadedOn ? `Loading date changed${from(old.loadedOn)} to ${fmtDayYear(next.loadedOn)}` : `Loaded on ${fmtDayYear(next.loadedOn)}`));
      if (c.snooze?.kind === 'loading') out.snooze = null;
    } else events.push(ev('undo', today, 'Loading date removed'));
  }
  if (next.paidOn !== old.paidOn) {
    out.paymentReceivedOn = next.paidOn || null;
    if (next.paidOn) {
      events.push(ev('paid', next.paidOn, old.paidOn ? `Payment date changed${from(old.paidOn)} to ${fmtDayYear(next.paidOn)}` : `Payment confirmed on ${fmtDayYear(next.paidOn)}`));
      out.snooze = null;
      if (!old.paidOn && completed && c.status !== 'completed') out.status = 'completed';
    } else {
      events.push(ev('undo', today, 'Payment confirmation removed'));
      if (c.status === 'completed') out.status = 'confirmed';
    }
  }
  if (events.length) out.timeline = [...(c.timeline || []), ...events];
  return out;
}

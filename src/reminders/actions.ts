// What happens to a contract when you answer a reminder. Each function returns the fields to save with updateContract().
import { v4 as uuid } from 'uuid';
import { Contract, TimelineEvent } from '../types';
import { addDays, fmtDay, fmtDayYear } from '../../server/reminders/plan.js';

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

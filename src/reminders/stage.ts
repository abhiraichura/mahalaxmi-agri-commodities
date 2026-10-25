// How a contract looks in lists: a stage word, a colour and one line about what is next.
import { Contract } from '../types';
import { Tone } from '../ui';
import { planFor, fmtDay, relDay } from '../../server/reminders/plan.js';

export interface StageInfo { label: string; tone: Tone; line: string; urgent: boolean; stage: string }

export function stageInfo(c: Contract, today: string): StageInfo {
  const p = planFor(c, today);
  const L = p.loading; const P = p.payment;
  switch (p.stage) {
    case 'draft': return { label: 'Draft', tone: 'gray', line: 'Not confirmed yet', urgent: false, stage: 'draft' };
    case 'cancelled': return { label: 'Cancelled', tone: 'red', line: '', urgent: false, stage: 'cancelled' };
    case 'paid': return { label: 'Paid', tone: 'green', line: P.receivedOn ? `Paid ${fmtDay(P.receivedOn)}` : 'Completed', urgent: false, stage: 'paid' };
    case 'awaiting_payment':
      if (P.state === 'overdue') return { label: 'Payment overdue', tone: 'red', line: `${P.overdueDays} day${P.overdueDays === 1 ? '' : 's'} late · was due ${fmtDay(P.to!)}`, urgent: true, stage: 'awaiting_payment' };
      if (P.state === 'last_day') return { label: 'Payment due today', tone: 'amber', line: 'Last day of the payment window', urgent: true, stage: 'awaiting_payment' };
      if (P.state === 'window') return { label: 'Payment due', tone: 'amber', line: `By ${fmtDay(P.to!)} (${relDay(P.to!, today)})`, urgent: true, stage: 'awaiting_payment' };
      if (P.from) return { label: 'Awaiting payment', tone: 'violet', line: `From ${fmtDay(P.from)}`, urgent: false, stage: 'awaiting_payment' };
      return { label: 'Awaiting payment', tone: 'violet', line: L.loadedOn ? `Loaded ${fmtDay(L.loadedOn)}` : '', urgent: false, stage: 'awaiting_payment' };
    default:
      if (L.state === 'overdue') return { label: 'Loading overdue', tone: 'red', line: `${L.overdueDays} day${L.overdueDays === 1 ? '' : 's'} late · was due ${fmtDay(L.deadline!)}`, urgent: true, stage: 'to_load' };
      if (L.state === 'today') return { label: 'Loading due today', tone: 'amber', line: 'Last day to load', urgent: true, stage: 'to_load' };
      if (L.state === 'upcoming') return { label: 'To load', tone: L.daysLeft! <= 1 ? 'amber' : 'blue', line: `By ${fmtDay(L.deadline!)} (${relDay(L.deadline!, today)})`, urgent: L.daysLeft! <= 1, stage: 'to_load' };
      return { label: 'To load', tone: 'blue', line: 'No loading time set', urgent: false, stage: 'to_load' };
  }
}

// "Worth a look": things the app notices by itself from your contracts and bills, so nothing slips.
//   - last month's brokerage bills that have not been made
//   - brokerage bills made 30+ days ago that are still unpaid
//   - parties you have not dealt with for longer than usual
//   - contracts that carry no brokerage at all
//   - contract notes (from the last week) not yet sent to the buyer or the seller
//   - no backup downloaded for a while
// Pure functions: give them the data, they give back cards. Nothing is saved here.
import type { Contract, Party } from '../types';
import { addDays, diffDays } from '../../server/reminders/plan.js';
import { buildPartyBills, contractBrokerage, lineKey } from '../billing/calc';
import { partyStats } from './partyStats';
import { partyName } from '../utils/normalize';
import type { IssuedBill } from '../utils/billStore';

export type InsightKind = 'bills' | 'unpaid' | 'quiet' | 'nobrk' | 'backup' | 'unsent';
export interface Insight {
  id: string;
  kind: InsightKind;
  tone: 'amber' | 'red' | 'blue';
  title: string;
  text: string;
  /** where "Open" goes */
  to: string;
  /** the party this is about (for the WhatsApp and Task buttons) */
  partyId?: string;
  /** a ready message for WhatsApp */
  message?: string;
  /** a ready task */
  task?: { text: string; day: string };
  /** days to hide it for when "Not now" is pressed */
  snooze: number;
}

export interface InsightInput {
  contracts: Contract[];
  parties: Party[];
  billed: Set<string>;
  issued: IssuedBill[];
  today: string;
  /** insight id -> hidden until this date */
  snoozed?: Record<string, string>;
  /** when the last backup was downloaded: null = never, undefined = not known yet (then no reminder) */
  lastBackup?: string | null;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const live = (c: Contract) => c.status !== 'draft' && c.status !== 'cancelled';
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n: number) => String(n).padStart(2, '0');

/** the whole calendar month before the one `today` is in */
export function previousMonth(today: string): { from: string; to: string; label: string; ym: string } {
  let y = Number(today.slice(0, 4)); let m = Number(today.slice(5, 7)) - 1; // m: 1..12 of the previous month
  if (m < 1) { m = 12; y -= 1; }
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}`, label: `${MONTH[m - 1]} ${y}`, ym: `${y}-${pad(m)}` };
}

export function buildInsights(input: InsightInput): Insight[] {
  const { contracts, parties, billed, issued, today } = input;
  const out: Insight[] = [];

  // ---- last month's bills not made
  const pm = previousMonth(today);
  const bills = buildPartyBills(contracts, parties, pm.from, pm.to);
  const dealIds = new Set<string>(); let amount = 0; const ps = new Set<string>();
  for (const b of bills) {
    for (const l of b.lines) {
      if (billed.has(lineKey(l))) continue;
      dealIds.add(l.contractId); amount += l.brokerage; ps.add(b.partyId);
    }
  }
  const deals = dealIds.size;
  if (deals > 0) out.push({ id: `bills-${pm.ym}`, kind: 'bills', tone: 'amber', title: `${pm.label} brokerage bills are not made yet`, text: `${deals} deal${deals === 1 ? '' : 's'} with ${ps.size} part${ps.size === 1 ? 'y' : 'ies'} · about ${inr(amount)} of brokerage to bill.`, to: '/money?tab=bills', snooze: 3 });

  // ---- brokerage bills still unpaid after 30 days
  for (const b of issued) {
    const owed = Math.round((b.total - b.paid) * 100) / 100;
    const made = b.madeAt ? b.madeAt.slice(0, 10) : '';
    if (owed < 1 || !made) continue;
    const age = diffDays(made, today);
    if (age < 30) continue;
    const party = parties.find(p => p.id === b.partyId);
    const name = party ? partyName(party) : b.partyName || 'the party';
    out.push({
      id: `unpaid-${b.id}`, kind: 'unpaid', tone: age >= 60 ? 'red' : 'amber',
      title: `${name} has not paid your brokerage bill`,
      text: `Bill no. ${b.invoiceNo} · ${inr(owed)} still to come${b.paid > 0 ? ` (of ${inr(b.total)})` : ''} · made ${age} days ago.`,
      to: '/money?tab=bills', partyId: b.partyId,
      message: `Namaste, a gentle reminder about our brokerage bill no. ${b.invoiceNo}. ${inr(owed)} is still pending. Kindly arrange the payment. Thank you.`,
      snooze: 7,
    });
  }

  // ---- contracts with no brokerage at all
  const none = contracts.filter(c => live(c) && Number(c.quantity) > 0 && Number(c.price) > 0 && !(contractBrokerage(c, 'buyer') + contractBrokerage(c, 'seller') > 0))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (none.length) {
    const nos = none.slice(0, 3).map(c => `#${c.contractNo}`).join(', ');
    out.push({ id: `nobrk:${none.map(c => c.id).sort().join(',')}`, kind: 'nobrk', tone: 'amber', title: `${none.length} contract${none.length === 1 ? ' has' : 's have'} no brokerage`, text: `${nos}${none.length > 3 ? ` and ${none.length - 3} more` : ''}: nothing will appear on a bill for ${none.length === 1 ? 'it' : 'them'}. Open ${none.length === 1 ? 'it' : 'the latest'} and set the brokerage if that is a mistake.`, to: `/contracts/${none[0].id}`, snooze: 30 });
  }

  // ---- contract notes not sent (deals from the last 7 days, before today)
  const unsent = contracts.filter(c => live(c) && !c.paymentReceivedOn && c.status !== 'completed' && Number(c.quantity) > 0) // eslint-disable-line
    .filter(c => { const d = String(c.date || '').slice(0, 10); return !!d && d < today && diffDays(d, today) <= 7 && !(c.noteSent?.B && c.noteSent?.S); })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (unsent.length) {
    const side = (c: Contract) => (!c.noteSent?.B && !c.noteSent?.S ? 'both copies' : !c.noteSent?.B ? 'buyer copy' : 'seller copy');
    const list = unsent.slice(0, 3).map(c => `#${c.contractNo} (${side(c)})`).join(', ');
    out.push({ id: `unsent:${unsent.map(c => `${c.id}${c.noteSent?.B ? 'b' : ''}${c.noteSent?.S ? 's' : ''}`).sort().join(',')}`, kind: 'unsent', tone: 'amber', title: `${unsent.length} contract note${unsent.length === 1 ? ' is' : 's are'} not sent yet`, text: `${list}${unsent.length > 3 ? ` and ${unsent.length - 3} more` : ''}. Share, print or download the copy from the contract, or tap Mark as sent if it already went out.`, to: `/contracts/${unsent[0].id}`, snooze: 2 });
  }

  // ---- parties that have gone quiet
  const quiet: { insight: Insight; value: number }[] = [];
  for (const p of parties) {
    const s = partyStats(contracts, p.id, today);
    if (s.deals < 1 || s.daysSinceLast == null) continue;
    const dates = [...new Set(s.all.filter(live).map(c => String(c.date).slice(0, 10)).filter(Boolean))].sort();
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) gaps.push(diffDays(dates[i - 1], dates[i]));
    const usual = gaps.length >= 2 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
    const limit = usual != null ? Math.max(30, Math.round(usual * 1.5)) : 45;
    if (s.daysSinceLast < limit || s.daysSinceLast > 365) continue;
    if (s.open > 0) continue; // a deal is still running with them
    const lastC = s.all.filter(live)[0];
    const what = lastC ? `${lastC.quantity} ${lastC.quantityUnit} ${lastC.product?.name || ''}`.trim() : '';
    const product = s.products[0]?.name;
    const first = (p.name || p.legalName || '').split(/\s+/)[0] || 'there';
    quiet.push({
      value: s.value,
      insight: {
        id: `quiet-${p.id}`, kind: 'quiet', tone: 'blue',
        title: `${partyName(p)} has gone quiet`,
        text: `No deal for ${s.daysSinceLast} days${usual != null ? ` (you usually deal about every ${usual})` : ''}${what ? `. Last: ${what}` : ''}.`,
        to: `/parties/${p.id}`, partyId: p.id,
        message: `Namaste ${first}, hope all is well. Any requirement${product ? ` for ${product}` : ''} these days? I can share today's rates and the best deals. Please let me know.`,
        task: { text: `Call ${partyName(p)} (quiet for ${s.daysSinceLast} days)`, day: addDays(today, 1) },
        snooze: 21,
      },
    });
  }
  quiet.sort((a, b) => b.value - a.value);
  out.push(...quiet.slice(0, 3).map(q => q.insight));

  // ---- no recent backup
  if (input.lastBackup !== undefined && contracts.length > 0) {
    const last = input.lastBackup ? input.lastBackup.slice(0, 10) : '';
    const age = last ? diffDays(last, today) : null;
    if (age == null || age > 45) out.push({ id: 'backup', kind: 'backup', tone: 'blue', title: 'Download a backup of your data', text: age == null ? 'You have not made a backup yet. It takes one tap in Settings and keeps a copy on your own device.' : `Your last backup was ${age} days ago. One tap in Settings makes a fresh copy.`, to: '/settings', snooze: 30 });
  }

  const hidden = input.snoozed || {};
  return out.filter(i => !(hidden[i.id] && hidden[i.id] > today));
}

// What the deals say about a party: how much business, how fast they pay (as a buyer), how well they load (as a seller),
// and when you last dealt. All worked out from the contracts you already have, nothing to type in.
import type { Contract } from '../types';
import { diffDays, planFor, termsOf } from '../../server/reminders/plan.js';
import { goodsValue, quantityKg } from '../billing/calc';

const live = (c: Contract) => c.status !== 'draft' && c.status !== 'cancelled';

export interface PartyStats {
  asBuyer: Contract[];
  asSeller: Contract[];
  all: Contract[];
  deals: number;
  open: number;
  completed: number;
  volumeKg: number;
  value: number;
  brokerage: number;
  firstDeal: string | null;
  lastDeal: string | null;
  daysSinceLast: number | null;
  /** as a buyer: days from loading to payment */
  pay: { count: number; avgDays: number | null; maxDays: number | null; withinPct: number | null; overdueNow: number; owed: number };
  /** as a seller: loading against the deadline */
  load: { count: number; onTimePct: number | null; avgLateDays: number | null; overdueNow: number };
  products: { name: string; count: number }[];
}

export function partyContracts(contracts: Contract[], partyId: string) {
  const asBuyer = contracts.filter(c => c.buyerId === partyId || c.buyer?.id === partyId);
  const asSeller = contracts.filter(c => c.sellerId === partyId || c.seller?.id === partyId);
  const all = [...new Map([...asBuyer, ...asSeller].map(c => [c.id, c])).values()].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.contractNo).localeCompare(String(a.contractNo), undefined, { numeric: true }));
  return { asBuyer, asSeller, all };
}

const avg = (a: number[]) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null);

export function partyStats(contracts: Contract[], partyId: string, today: string): PartyStats {
  const { asBuyer, asSeller, all } = partyContracts(contracts, partyId);
  const real = all.filter(live);

  let volumeKg = 0; let value = 0; let brokerage = 0;
  const prod = new Map<string, number>();
  for (const c of real) {
    volumeKg += quantityKg(c.quantity, c.quantityUnit);
    value += goodsValue(c.quantity, c.quantityUnit, c.price, c.priceUnit).value;
    // the brokerage this party paid (its own side only; a party that is on both sides of different deals counts each side once)
    if (c.buyerId === partyId) brokerage += c.buyerBrokerageAmount || 0;
    if (c.sellerId === partyId) brokerage += c.sellerBrokerageAmount || 0;
    const n = c.product?.name || '';
    if (n) prod.set(n, (prod.get(n) || 0) + 1);
  }

  const dates = real.map(c => String(c.date).slice(0, 10)).filter(Boolean).sort();
  const lastDeal = dates.length ? dates[dates.length - 1] : null;

  // payment behaviour (this party as the buyer)
  const payDays: number[] = [];
  let withinKnown = 0; let within = 0; let payOverdue = 0; let owed = 0;
  for (const c of asBuyer.filter(live)) {
    if (c.loadedOn && c.paymentReceivedOn) {
      const d = diffDays(c.loadedOn, c.paymentReceivedOn);
      payDays.push(d);
      const t = termsOf(c);
      if (t.pay) { withinKnown++; if (d <= t.pay.max) within++; }
    } else {
      const p = planFor(c, today);
      if (p.stage === 'awaiting_payment') {
        owed += goodsValue(c.quantity, c.quantityUnit, c.price, c.priceUnit).value;
        if (p.payment.state === 'overdue') payOverdue++;
      }
    }
  }

  // loading behaviour (this party as the seller)
  let loadKnown = 0; let onTime = 0; let loadOverdue = 0; const lateBy: number[] = [];
  for (const c of asSeller.filter(live)) {
    const t = termsOf(c);
    if (c.loadedOn && t.deadline) {
      loadKnown++;
      const late = diffDays(t.deadline, c.loadedOn);
      if (late <= 0) onTime++; else lateBy.push(late);
    } else if (!c.loadedOn) {
      const p = planFor(c, today);
      if (p.stage === 'to_load' && p.loading.state === 'overdue') loadOverdue++;
    }
  }

  return {
    asBuyer, asSeller, all,
    deals: real.length,
    open: real.filter(c => planFor(c, today).stage === 'to_load' || planFor(c, today).stage === 'awaiting_payment').length,
    completed: real.filter(c => planFor(c, today).stage === 'paid').length,
    volumeKg, value, brokerage,
    firstDeal: dates[0] || null,
    lastDeal,
    daysSinceLast: lastDeal ? diffDays(lastDeal, today) : null,
    pay: { count: payDays.length, avgDays: avg(payDays), maxDays: payDays.length ? Math.max(...payDays) : null, withinPct: withinKnown ? Math.round((within / withinKnown) * 100) : null, overdueNow: payOverdue, owed },
    load: { count: loadKnown, onTimePct: loadKnown ? Math.round((onTime / loadKnown) * 100) : null, avgLateDays: avg(lateBy), overdueNow: loadOverdue },
    products: [...prod.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  };
}

/** one plain-words line about how reliable the party is, or null when there is too little history to say */
export function reliability(s: PartyStats): { text: string; tone: 'green' | 'amber' | 'red' } | null {
  const bits: { text: string; tone: 'green' | 'amber' | 'red' }[] = [];
  if (s.pay.count >= 2 && s.pay.withinPct != null) {
    bits.push(s.pay.withinPct >= 80 ? { text: `Pays on time (${s.pay.withinPct}% of deals, about ${s.pay.avgDays} days)`, tone: 'green' }
      : s.pay.withinPct >= 50 ? { text: `Pays late sometimes (${s.pay.withinPct}% on time, about ${s.pay.avgDays} days)`, tone: 'amber' }
      : { text: `Usually pays late (${s.pay.withinPct}% on time, about ${s.pay.avgDays} days)`, tone: 'red' });
  }
  if (s.load.count >= 2 && s.load.onTimePct != null) {
    bits.push(s.load.onTimePct >= 80 ? { text: `Loads on time (${s.load.onTimePct}% of deals)`, tone: 'green' }
      : s.load.onTimePct >= 50 ? { text: `Loads late sometimes (${s.load.onTimePct}% on time)`, tone: 'amber' }
      : { text: `Usually loads late (${s.load.onTimePct}% on time${s.load.avgLateDays ? `, about ${s.load.avgLateDays} days late` : ''})`, tone: 'red' });
  }
  if (!bits.length) return null;
  const rank = { red: 0, amber: 1, green: 2 } as const;
  bits.sort((a, b) => rank[a.tone] - rank[b.tone]);
  return { text: bits.map(b => b.text).join(' · '), tone: bits[0].tone };
}

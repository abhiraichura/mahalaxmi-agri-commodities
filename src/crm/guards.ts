// Quiet checks while a contract is being written: a price with an extra zero, a duplicate, a deal with no brokerage,
// a party that still owes money. Nothing blocks the save (except the same party on both sides); these are heads-ups.
import type { Contract } from '../types';
import { diffDays } from '../../server/reminders/plan.js';
import { kgPerPriceUnit } from '../billing/calc';
import { partyStats, reliability } from './partyStats';
import { partyName } from '../utils/normalize';

export type Tone = 'red' | 'amber' | 'blue';
export interface Heads { id: string; tone: Tone; text: string }

export interface DealDraft {
  sellerId: string; buyerId: string; productId: string;
  quantity: number; quantityUnit: string; price: number; priceUnit: string; date: string;
}

const live = (c: Contract) => c.status !== 'draft' && c.status !== 'cancelled';
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** rupees per KG, or null when the price unit is not recognised */
export function pricePerKg(price: number, priceUnit: string): number | null {
  const per = kgPerPriceUnit(priceUnit);
  return per == null || !(Number(price) > 0) ? null : Number(price) / per;
}

const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** the typical price per KG of a product from recent deals (null if fewer than 3 deals to go by) */
export function recentPrice(contracts: Contract[], productId: string, today: string, excludeId?: string, days = 120): { perKg: number; n: number } | null {
  const xs: number[] = [];
  for (const c of contracts) {
    if (c.id === excludeId || !live(c) || c.productId !== productId) continue;
    const d = String(c.date || '').slice(0, 10);
    if (!d || diffDays(d, today) > days || diffDays(d, today) < -1) continue;
    const p = pricePerKg(c.price, c.priceUnit);
    if (p != null) xs.push(p);
  }
  return xs.length >= 3 ? { perKg: median(xs), n: xs.length } : null;
}

/** the latest deal between the same two parties (either date order), for "use the details of the last deal" */
export function lastDealBetween(contracts: Contract[], sellerId: string, buyerId: string, excludeId?: string): Contract | null {
  if (!sellerId || !buyerId) return null;
  const hits = contracts.filter(c => c.id !== excludeId && live(c) && c.sellerId === sellerId && c.buyerId === buyerId);
  hits.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.contractNo).localeCompare(String(a.contractNo), undefined, { numeric: true }));
  return hits[0] || null;
}

export function dealHeadsUp(d: DealDraft, contracts: Contract[], parties: { id: string; name?: string; legalName?: string }[], brokerageTotal: number, today: string, excludeId?: string): Heads[] {
  const out: Heads[] = [];
  const nm = (id: string) => partyName(parties.find(p => p.id === id));

  if (d.sellerId && d.sellerId === d.buyerId) out.push({ id: 'same', tone: 'red', text: 'The seller and the buyer are the same party.' });

  // brokerage that comes to nothing
  if (d.productId && d.quantity > 0 && d.price > 0 && !(brokerageTotal > 0)) out.push({ id: 'nobrk', tone: 'amber', text: 'Brokerage works out to ₹0 on this deal, so there will be nothing to bill. Check the brokerage below.' });

  // price far from what this product has been trading at
  const mine = pricePerKg(d.price, d.priceUnit);
  if (d.productId && mine != null && d.quantity > 0) {
    const ref = recentPrice(contracts, d.productId, today, excludeId);
    if (ref && ref.perKg > 0) {
      const diff = (mine - ref.perKg) / ref.perKg;
      if (Math.abs(diff) >= 0.25) {
        out.push({ id: 'price', tone: 'amber', text: `${inr(mine)}/kg is ${Math.round(Math.abs(diff) * 100)}% ${diff > 0 ? 'above' : 'below'} your recent deals for this product (about ${inr(ref.perKg)}/kg over ${ref.n} deals). Check the price and its unit.` });
      }
    }
  }

  // the same deal entered twice
  if (d.sellerId && d.buyerId && d.productId) {
    const dup = contracts.find(c => c.id !== excludeId && live(c) && c.sellerId === d.sellerId && c.buyerId === d.buyerId && c.productId === d.productId
      && Number(c.quantity) === Number(d.quantity) && String(c.quantityUnit) === String(d.quantityUnit) && Number(c.price) === Number(d.price)
      && Math.abs(diffDays(String(c.date).slice(0, 10), String(d.date).slice(0, 10) || today)) <= 3);
    if (dup) out.push({ id: 'dup', tone: 'amber', text: `Looks the same as contract #${dup.contractNo} (same parties, goods, quantity and price, ${(() => { const n = Math.abs(diffDays(String(dup.date).slice(0, 10), String(d.date).slice(0, 10) || today)); return n === 0 ? 'same day' : `${n} day${n === 1 ? '' : 's'} apart`; })()}). Is this a duplicate?` });
  }

  // a buyer who still owes, a seller who is late to load, a party with a poor record
  const buyer = d.buyerId ? partyStats(contracts.filter(c => c.id !== excludeId), d.buyerId, today) : null;
  const seller = d.sellerId ? partyStats(contracts.filter(c => c.id !== excludeId), d.sellerId, today) : null;
  if (buyer && buyer.pay.overdueNow > 0) out.push({ id: 'buyer-owes', tone: 'red', text: `${nm(d.buyerId)} has ${buyer.pay.overdueNow} earlier deal${buyer.pay.overdueNow === 1 ? '' : 's'} with payment overdue (about ${inr(buyer.pay.owed)} awaiting payment).` });
  if (seller && seller.load.overdueNow > 0) out.push({ id: 'seller-late', tone: 'red', text: `${nm(d.sellerId)} has ${seller.load.overdueNow} earlier deal${seller.load.overdueNow === 1 ? '' : 's'} still not loaded after the last date.` });
  if (buyer) { const r = reliability({ ...buyer, load: { ...buyer.load, count: 0, onTimePct: null } }); if (r && r.tone !== 'green' && !(buyer.pay.overdueNow > 0)) out.push({ id: 'buyer-rel', tone: r.tone === 'red' ? 'red' : 'amber', text: `${nm(d.buyerId)}: ${r.text}.` }); }
  if (seller) { const r = reliability({ ...seller, pay: { ...seller.pay, count: 0, withinPct: null } }); if (r && r.tone !== 'green' && !(seller.load.overdueNow > 0)) out.push({ id: 'seller-rel', tone: r.tone === 'red' ? 'red' : 'amber', text: `${nm(d.sellerId)}: ${r.text}.` }); }
  return out;
}

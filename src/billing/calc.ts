// Brokerage maths + building the bills (pure functions: no UI, no Firebase).
import type { BrokerageConfig, Contract, Party, ProductSpec } from '../types';

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/* ---------- units ---------- */

/** how many kg one "price unit" is, e.g. "KG" -> 1, "MT" -> 1000, "Quintal" -> 100, "20 KG" -> 20. null = not recognised. */
export function kgPerPriceUnit(unit: string): number | null {
  const u = String(unit || '').toLowerCase().replace(/^\s*per\s+/, '').replace(/[.\s]/g, '');
  if (!u) return 1;
  if (/^(kg|kgs|kilo|kilos|kilogram|kilograms)$/.test(u)) return 1;
  if (/^(mt|mts|mton|mtons|mtone|mtones|ton|tons|tonne|tonnes|metricton|metrictons|metrictonne|metrictonnes)$/.test(u)) return 1000;
  if (/^(qtl|qtls|quintal|quintals)$/.test(u)) return 100;
  if (/^(maund|maunds|mann|mund)$/.test(u)) return 20;
  const m = /^(\d+(?:\.\d+)?)(kg|kgs)$/.exec(u);
  if (m) return parseFloat(m[1]);
  return null;
}

export function quantityKg(quantity: number, unit: string): number {
  const q = Number(quantity) || 0;
  return String(unit || '').toUpperCase() === 'MT' ? q * 1000 : q;
}

/** value of the goods in rupees. `assumed` = the price unit was not recognised, so per-KG was assumed. */
export function goodsValue(quantity: number, quantityUnit: string, price: number, priceUnit: string): { value: number; assumed: boolean } {
  const kg = quantityKg(quantity, quantityUnit);
  const per = kgPerPriceUnit(priceUnit);
  return { value: (kg / (per ?? 1)) * (Number(price) || 0), assumed: per === null };
}

/* ---------- brokerage ---------- */

export function brokerageAmount(cfg: BrokerageConfig | undefined, value: number): number {
  if (!cfg) return 0;
  const v = Number(cfg.value) || 0;
  return round2(cfg.type === 'fixed' ? v : (value * v) / 100);
}

/** the product's default brokerage for each side (same rules the contract form always used) */
export function productBrokerageDefaults(product: ProductSpec | undefined | null): { buyer: BrokerageConfig; seller: BrokerageConfig } {
  const b = product?.brokerage;
  const dflt = product?.defaultBrokerage || 0;
  const side = (s: 'buyer' | 'seller'): BrokerageConfig => {
    const cfg = b?.[s];
    if (cfg?.type === 'fixed') return { type: 'fixed', value: Number(cfg.value) || 0 };
    const legacyFixed = s === 'buyer' ? b?.buyerFixed : b?.sellerFixed;
    if (!cfg?.value && legacyFixed) return { type: 'fixed', value: Number(legacyFixed) || 0 };
    const legacyPct = s === 'buyer' ? b?.buyerPercent : b?.sellerPercent;
    return { type: 'percent', value: Number(cfg?.value || legacyPct || (b ? 0 : dflt)) || 0 };
  };
  return { buyer: side('buyer'), seller: side('seller') };
}

/** the brokerage rate that applies to this contract: its own if it has been set, otherwise the product's */
export function contractBrokerageConfig(c: Pick<Contract, 'brokerage' | 'product'>): { buyer: BrokerageConfig; seller: BrokerageConfig } {
  return c.brokerage ? { buyer: c.brokerage.buyer, seller: c.brokerage.seller } : productBrokerageDefaults(c.product);
}

/** brokerage of one side of a saved contract (the amount stored when it was saved; computed if missing) */
export function contractBrokerage(c: Contract, side: 'buyer' | 'seller'): number {
  const stored = side === 'buyer' ? c.buyerBrokerageAmount : c.sellerBrokerageAmount;
  if (typeof stored === 'number' && isFinite(stored)) return round2(stored);
  const { value } = goodsValue(c.quantity, c.quantityUnit, c.price, c.priceUnit);
  return brokerageAmount(contractBrokerageConfig(c)[side], value);
}

export const describeBrokerage = (cfg: BrokerageConfig | undefined) =>
  !cfg ? '-' : cfg.type === 'fixed' ? `Rs. ${cfg.value} fixed` : `${cfg.value}%`;

/* ---------- bills ---------- */

export interface BillLine {
  contractId: string;
  contractNo: string;
  date: string; // yyyy-mm-dd
  side: 'buyer' | 'seller';
  type: 'Buy' | 'Sell';
  counterparty: { name: string; city: string };
  product: string;
  qtyMT: number;
  qtyKg: number;
  rate: number;
  rateUnit: string; // e.g. "PER KG" (as written on the contract)
  /** the rate converted to rupees per metric ton (the bill shows rates per M.TONES); null if the unit is not recognised */
  ratePerMT: number | null;
  /** how the brokerage was worked out, e.g. "0.5%" or "Rs. 500 fixed" */
  basis: string;
  brokerage: number;
  /** the amount worked out from the contract, when you typed a different one for this bill */
  was?: number;
}

/* ---------- hand edits on one bill ---------- */

/** the key of a bill line, same as used for "what was printed" */
export const lineKey = (l: Pick<BillLine, 'contractId' | 'side'>) => `${l.contractId}:${l.side}`;

/** what you changed on one bill: a different brokerage for a line, or a line left off this bill */
export interface LineEdit { amount?: number; off?: boolean }
export interface BillEdits {
  lines: Record<string, LineEdit>;
  /** GST % for this bill only (otherwise the screen's setting) */
  gst?: number;
  /** bill / invoice date for this bill only */
  date?: string;
}

export const emptyEdits = (): BillEdits => ({ lines: {} });
export const hasEdits = (e: BillEdits) => Object.keys(e.lines).length > 0 || e.gst !== undefined || !!e.date;

/** the bill as it will be printed: edited amounts in, left-off lines out. `calculated` keeps the untouched lines. */
export function applyLineEdits(bill: PartyBill, edits: BillEdits | undefined): PartyBill {
  const calculated = bill.calculated || bill.lines;
  const lines: BillLine[] = [];
  for (const l of calculated) {
    const e = edits?.lines[lineKey(l)];
    if (e?.off) continue;
    if (e && typeof e.amount === 'number' && isFinite(e.amount) && Math.abs(e.amount - l.brokerage) > 0.004) lines.push({ ...l, brokerage: round2(e.amount), was: l.brokerage, basis: 'edited' });
    else lines.push(l);
  }
  return { ...bill, calculated, lines, totalQtyMT: lines.reduce((s, l) => s + l.qtyMT, 0), subtotal: round2(lines.reduce((s, l) => s + l.brokerage, 0)) };
}

export interface PartyBill {
  /** every line as worked out from the contracts, before any hand edits (the edit screen shows these) */
  calculated?: BillLine[];
  partyId: string;
  party: Party;
  lines: BillLine[];
  totalQtyMT: number;
  subtotal: number;
}

const upper = (s: unknown) => String(s ?? '').trim().toUpperCase();
export const partyName = (p?: Partial<Party> | null) => upper(p?.legalName || p?.name);

function rateUnitLabel(u: string): string {
  const t = String(u || '').trim();
  if (!t) return 'PER KG';
  return /^per\s/i.test(t) ? t.toUpperCase() : 'PER ' + t.toUpperCase();
}

/** One bill per party for the period: every contract in the period where the party bought and/or sold. */
export function buildPartyBills(contracts: Contract[], parties: Party[], from: string, to: string): PartyBill[] {
  const byId = new Map(parties.map(p => [p.id, p]));
  const out = new Map<string, PartyBill>();
  const add = (c: Contract, side: 'buyer' | 'seller') => {
    const brokerage = contractBrokerage(c, side);
    if (!(brokerage > 0)) return;
    const partyId = side === 'buyer' ? c.buyerId : c.sellerId;
    const snap = side === 'buyer' ? c.buyer : c.seller;
    const other = side === 'buyer' ? c.seller : c.buyer;
    const otherLive = byId.get(side === 'buyer' ? c.sellerId : c.buyerId) || other;
    const party = byId.get(partyId) || snap;
    if (!partyId || !party) return;
    let b = out.get(partyId);
    if (!b) { b = { partyId, party, lines: [], totalQtyMT: 0, subtotal: 0 }; out.set(partyId, b); }
    const kg = quantityKg(c.quantity, c.quantityUnit);
    const perUnit = kgPerPriceUnit(c.priceUnit);
    b.lines.push({
      contractId: c.id,
      contractNo: String(c.contractNo ?? ''),
      date: String(c.date || '').slice(0, 10),
      side,
      type: side === 'buyer' ? 'Buy' : 'Sell',
      counterparty: { name: partyName(otherLive), city: upper(otherLive?.city) },
      product: upper(c.product?.name),
      qtyKg: kg,
      qtyMT: kg / 1000,
      rate: Number(c.price) || 0,
      rateUnit: rateUnitLabel(c.priceUnit),
      ratePerMT: perUnit === null ? null : round2(((Number(c.price) || 0) * 1000) / perUnit),
      basis: describeBrokerage(contractBrokerageConfig(c)[side]),
      brokerage,
    });
  };
  for (const c of contracts) {
    if (c.status === 'cancelled') continue;
    const d = String(c.date || '').slice(0, 10);
    if (!d || d < from || d > to) continue;
    add(c, 'buyer');
    add(c, 'seller');
  }
  const bills = [...out.values()];
  for (const b of bills) {
    b.lines.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : x.contractNo.localeCompare(y.contractNo, undefined, { numeric: true })));
    b.totalQtyMT = b.lines.reduce((s, l) => s + l.qtyMT, 0);
    b.subtotal = round2(b.lines.reduce((s, l) => s + l.brokerage, 0));
    b.calculated = [...b.lines];
  }
  return bills.sort((a, b) => partyName(a.party).localeCompare(partyName(b.party)));
}

/* ---------- totals (+ optional GST on brokerage) ---------- */

export interface BillTotals {
  subtotal: number;
  adjustment: number;
  taxable: number;
  gstPercent: number;
  intraState: boolean;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export function billTotals(
  subtotal: number,
  adjustment: number,
  gstPercent: number,
  party: Pick<Party, 'gstin' | 'state'>,
  company: { gstin?: string; state?: string },
): BillTotals {
  const taxable = round2(subtotal + (adjustment || 0));
  const pct = Number(gstPercent) || 0;
  const pCode = String(party.gstin || '').trim().slice(0, 2);
  const cCode = String(company.gstin || '').trim().slice(0, 2);
  const intra = pCode && cCode ? pCode === cCode : String(party.state || '').trim().toLowerCase() === String(company.state || '').trim().toLowerCase();
  let cgst = 0, sgst = 0, igst = 0;
  if (pct > 0) {
    if (intra) { cgst = round2((taxable * pct) / 200); sgst = round2((taxable * pct) / 200); }
    else igst = round2((taxable * pct) / 100);
  }
  return { subtotal: round2(subtotal), adjustment: round2(adjustment || 0), taxable, gstPercent: pct, intraState: intra, cgst, sgst, igst, total: round2(taxable + cgst + sgst + igst) };
}

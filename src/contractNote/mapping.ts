// Turns a saved Contract (+ company settings) into the values printed on the Contract Note.
// Anything the user edits on the "Review contract note" screen is stored on the contract as
// `noteOverrides` (flat key -> text) and applied on top, so edits survive but untouched fields keep
// following the contract.
import type { CompanySettings, Contract, Party, ProductSpec, SpecField } from '../types';
import type { NoteParty, NoteValues } from './types';

export type Overrides = Record<string, string>;

/** every form field the review screen can edit (and overrides can store) */
export const OVERRIDE_KEYS = [
  'no', 'date',
  'buyer.name', 'buyer.addr', 'buyer.city', 'buyer.gst',
  'seller.name', 'seller.addr', 'seller.city', 'seller.gst',
  'product.name', 'product.spec',
  'qty.value', 'qty.unit', 'price.value', 'price.unit',
  'packing', 'deliverySame', 'delivery', 'loading',
  'payment.B', 'payment.S', 'brokerage.B', 'brokerage.S', 'other',
] as const;
export type OverrideKey = (typeof OVERRIDE_KEYS)[number];

const t = (s: unknown) => String(s == null ? '' : s).trim();

function partyToNote(p: Party | undefined): NoteParty {
  if (!p) return { name: '', addr: '', city: '', gst: '' };
  const city = [p.city, p.state, p.pincode].map(t).filter(Boolean).join(', ');
  return {
    name: t(p.legalName) || t(p.name),
    addr: t(p.address).replace(/\r?\n+/g, '\n'),
    city,
    gst: t(p.gstin).toUpperCase(),
  };
}

/** "2% OTHER COLOUR", "1.5/2% FFA" ... (value + unit first, then the label) */
function specPart(s: SpecField): string {
  const value = t(s.value);
  const unit = t(s.unit);
  const label = t(s.label);
  if (!value && !label) return '';
  if (!value) return label;
  const vu = unit === '%' || /^%/.test(unit) ? value + unit : unit ? value + ' ' + unit : value;
  return label ? vu + ' ' + label : vu;
}

export function specLine(contract: Contract): string {
  const specs: SpecField[] = (contract.contractSpecs && contract.contractSpecs.length ? contract.contractSpecs : contract.product?.specs) || [];
  const parts = [...specs]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(specPart)
    .filter(Boolean);
  const quality = t(contract.qualityName);
  if (quality && parts.length) return quality + ' (' + parts.join(' AND ') + ')';
  if (quality) return quality;
  return parts.join(' AND ');
}

function pct(n: number): string {
  if (!isFinite(n)) return '';
  if (Number.isInteger(n)) return String(n);
  const two = n.toFixed(2); // 0.5 -> "0.50", 0.25 -> "0.25" (the style on the original note)
  return Number(two) === n ? two : String(n);
}

/** "0.25% OF BILL VALUE" (percent) or "RS. 500 FIXED" (fixed amount) for one side of the product's brokerage */
export function brokerageText(product: ProductSpec | undefined, side: 'buyer' | 'seller'): string {
  if (!product) return '';
  const b = product.brokerage;
  const cfg = b?.[side];
  const fixedLegacy = side === 'buyer' ? b?.buyerFixed : b?.sellerFixed;
  const percentLegacy = side === 'buyer' ? b?.buyerPercent : b?.sellerPercent;
  if (cfg?.type === 'fixed' && cfg.value) return 'RS. ' + cfg.value + ' FIXED';
  if (!cfg?.value && fixedLegacy) return 'RS. ' + fixedLegacy + ' FIXED';
  const v = cfg?.value || percentLegacy || product.defaultBrokerage || 0;
  if (!v) return '';
  return pct(v) + '% OF BILL VALUE';
}

/** brokerage text for one side of THIS contract: the rate set on the contract, else the product's default */
export function contractBrokerageText(c: Contract, side: 'buyer' | 'seller'): string {
  const cfg = c.brokerage?.[side];
  if (cfg) {
    const v = Number(cfg.value) || 0;
    if (!v) return '';
    return cfg.type === 'fixed' ? 'RS. ' + v + ' FIXED' : pct(v) + '% OF BILL VALUE';
  }
  return brokerageText(c.product, side);
}

function qtyFromContract(c: Contract): { value: string; unit: string } {
  const unit = t(c.quantityUnit).toUpperCase();
  const q = Number(c.quantity) || 0;
  if (!q) return { value: '', unit: 'KG' };
  if (unit === 'MT') return { value: String(Math.round(q * 1000 * 100) / 100), unit: 'KG' };
  return { value: String(q), unit: unit || 'KG' };
}

function priceFromContract(c: Contract): { value: string; unit: string } {
  const p = Number(c.price) || 0;
  let u = t(c.priceUnit);
  if (!u) u = 'Kg';
  if (u.toUpperCase() === 'KG') u = 'Kg';
  if (!/^per\s/i.test(u)) u = 'Per ' + u;
  return { value: p ? String(p) : '', unit: p ? u : '' };
}

/** the values straight from the contract, before any user edits */
export function noteValuesFromContract(c: Contract, settings?: Pick<CompanySettings, 'defaultGstPercent'>): NoteValues {
  const gst = c.gstPercent || settings?.defaultGstPercent || 5;
  const delivery = [t(c.deliveryLocation), ...t(c.deliveryAddress).split(/\r?\n/).map(t)].filter(Boolean);
  const pay = t(c.paymentTerms);
  return {
    no: t(c.contractNo),
    date: t(c.date).slice(0, 10),
    buyer: partyToNote(c.buyer),
    seller: partyToNote(c.seller),
    product: { name: t(c.product?.name), spec: specLine(c) },
    qty: qtyFromContract(c),
    price: priceFromContract(c),
    packing: t(c.packing),
    deliverySame: delivery.length === 0,
    delivery: delivery.join('\n'),
    loading: t(c.loadingCondition),
    payment: { B: pay, S: pay },
    brokerage: { B: contractBrokerageText(c, 'buyer'), S: contractBrokerageText(c, 'seller') },
    other: t(c.otherTerms) || `AS PER GOVERMENT RULE, "${gst}% GST" EXTRA.`,
  };
}

/* ---------- reading / writing a value by its form key ---------- */
export function getValue(v: NoteValues, key: string): string {
  switch (key) {
    case 'no': return v.no;
    case 'date': return v.date;
    case 'packing': return v.packing;
    case 'deliverySame': return v.deliverySame ? '1' : '';
    case 'delivery': return v.delivery;
    case 'loading': return v.loading;
    case 'other': return v.other;
    default: {
      const [a, b] = key.split('.');
      const o = (v as any)[a];
      return o && typeof o === 'object' ? String(o[b] ?? '') : '';
    }
  }
}

export function setValue(v: NoteValues, key: string, val: string): NoteValues {
  const n: NoteValues = JSON.parse(JSON.stringify(v));
  switch (key) {
    case 'no': n.no = val; break;
    case 'date': n.date = val; break;
    case 'packing': n.packing = val; break;
    case 'deliverySame': n.deliverySame = val === '1'; break;
    case 'delivery': n.delivery = val; break;
    case 'loading': n.loading = val; break;
    case 'other': n.other = val; break;
    default: {
      const [a, b] = key.split('.');
      const o = (n as any)[a];
      if (o && typeof o === 'object') o[b] = val;
    }
  }
  return n;
}

export function applyOverrides(v: NoteValues, o?: Overrides | null): NoteValues {
  let n = v;
  if (!o) return n;
  for (const k of OVERRIDE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(o, k) && typeof o[k] === 'string') n = setValue(n, k, o[k]);
  }
  return n;
}

/** only the fields that differ from the contract's own values (that is all we need to remember) */
export function diffOverrides(base: NoteValues, edited: NoteValues): Overrides {
  const out: Overrides = {};
  for (const k of OVERRIDE_KEYS) {
    const a = getValue(base, k);
    const b = getValue(edited, k);
    if (a !== b) out[k] = b;
  }
  return out;
}

/* Firestore map keys: store "buyer.name" as "buyer__name" (no dots in stored field names) */
export function encodeOverrides(o: Overrides): Overrides {
  const out: Overrides = {};
  for (const [k, v] of Object.entries(o)) out[k.replace('.', '__')] = v;
  return out;
}
export function decodeOverrides(o?: Overrides | null): Overrides {
  const out: Overrides = {};
  if (!o) return out;
  for (const [k, v] of Object.entries(o)) if (typeof v === 'string') out[k.replace('__', '.')] = v;
  return out;
}

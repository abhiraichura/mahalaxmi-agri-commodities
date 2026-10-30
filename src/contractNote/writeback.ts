// Keeps the contract and its printed note in step.
//
//  * You edit the text of the note ("Preview & edit text")  ->  whatever the contract can hold (price, quantity, packing,
//    loading and payment terms, party name / address / GSTIN, contract number, date ...) is saved INTO THE CONTRACT.
//    Only wording the contract has no field for (the "city, state, pincode" line, the specification line, the brokerage
//    wording, a different payment line on one copy) stays on the note, and is marked as "note only".
//  * You edit the contract (the form)  ->  the note follows. A note edit is dropped when the contract field behind it
//    changed, so the new contract value always shows.
import type { CompanySettings, Contract, Party } from '../types';
import type { NoteValues } from './types';
import { addDays } from '../../server/reminders/plan.js';
import { applyOverrides, decodeOverrides, diffOverrides, encodeOverrides, getValue, noteValuesFromContract, OVERRIDE_KEYS, type Overrides } from './mapping';

type Gst = Pick<CompanySettings, 'defaultGstPercent'>;

/** plain words for each note field (used in the diary and in the "differs" list) */
export const KEY_LABEL: Record<string, string> = {
  no: 'Contract no.', date: 'Date',
  'buyer.name': 'Buyer name', 'buyer.addr': 'Buyer address', 'buyer.city': 'Buyer city line', 'buyer.gst': 'Buyer GSTIN',
  'seller.name': 'Seller name', 'seller.addr': 'Seller address', 'seller.city': 'Seller city line', 'seller.gst': 'Seller GSTIN',
  'product.name': 'Product', 'product.spec': 'Specification',
  'qty.value': 'Quantity', 'qty.unit': 'Quantity unit', 'price.value': 'Price', 'price.unit': 'Price unit',
  packing: 'Packing', deliverySame: 'Delivery', delivery: 'Delivery', loading: 'Loading', 'payment.B': 'Payment (buyer copy)', 'payment.S': 'Payment (seller copy)',
  'brokerage.B': 'Brokerage (buyer copy)', 'brokerage.S': 'Brokerage (seller copy)', other: 'Other terms',
};
export const labelOf = (key: string) => KEY_LABEL[key] || key;

/** the contract fields that a note edit should change, worked out from what was edited */
export function contractPatchFromNote(contract: Contract, base: NoteValues, edited: NoteValues, settings?: Gst): Partial<Contract> {
  const changed = (k: string) => getValue(base, k) !== getValue(edited, k);
  const patch: Partial<Contract> = {};
  const party = (side: 'buyer' | 'seller', f: Partial<Party>) => { patch[side] = { ...(patch[side] || contract[side]), ...f } as Party; };

  if (changed('no') && edited.no.trim()) patch.contractNo = edited.no.trim();
  if (changed('date')) {
    const d = edited.date.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      patch.date = d;
      // a deadline that was simply "date + days" moves with the date
      const days = Number(contract.loadingDays) || 0;
      if (days > 0 && contract.loadingDeadline && contract.date && contract.loadingDeadline === addDays(contract.date, days)) patch.loadingDeadline = addDays(d, days);
    }
  }
  for (const side of ['buyer', 'seller'] as const) {
    if (changed(`${side}.name`) && edited[side].name.trim()) party(side, { legalName: edited[side].name.trim() });
    if (changed(`${side}.addr`)) party(side, { address: edited[side].addr });
    if (changed(`${side}.gst`)) party(side, { gstin: edited[side].gst.trim() });
  }
  if (changed('product.name') && edited.product.name.trim()) patch.product = { ...contract.product, name: edited.product.name.trim() };

  if (changed('qty.value') || changed('qty.unit')) {
    const unit = edited.qty.unit.trim().toUpperCase();
    const v = Number(String(edited.qty.value).replace(/,/g, ''));
    if (Number.isFinite(v) && v > 0) {
      if (unit === 'KG') {
        if ((contract.quantityUnit || '').toUpperCase() === 'MT') patch.quantity = Math.round((v / 1000) * 1e6) / 1e6;
        else { patch.quantity = v; patch.quantityUnit = 'KG'; }
      } else if (unit === 'MT') { patch.quantity = v; patch.quantityUnit = 'MT'; }
    }
  }
  if (changed('price.value')) {
    const v = Number(String(edited.price.value).replace(/,/g, ''));
    if (Number.isFinite(v) && v > 0) patch.price = v;
  }
  if (changed('price.unit')) {
    const u = edited.price.unit.replace(/^per\s+/i, '').trim();
    if (u) patch.priceUnit = /^kg$/i.test(u) ? 'KG' : u;
  }
  if (changed('packing')) patch.packing = edited.packing;
  if (changed('loading')) patch.loadingCondition = edited.loading;
  // one payment line on the contract: only when both copies say the same thing
  if ((changed('payment.B') || changed('payment.S')) && edited.payment.B === edited.payment.S) patch.paymentTerms = edited.payment.B;
  if (changed('other')) {
    const none = noteValuesFromContract({ ...contract, ...patch, otherTerms: '' } as Contract, settings).other;
    patch.otherTerms = edited.other === none ? '' : edited.other;
  }
  if (changed('deliverySame') || changed('delivery')) {
    if (edited.deliverySame) { patch.deliveryLocation = ''; patch.deliveryAddress = ''; }
    else {
      const lines = edited.delivery.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      patch.deliveryLocation = lines[0] || '';
      patch.deliveryAddress = lines.slice(1).join('\n');
    }
  }
  return patch;
}

export interface SplitResult {
  /** fields to save on the contract */
  patch: Partial<Contract>;
  /** what is still only on the note (stored encoded, ready for Firestore) */
  overrides: Overrides;
  /** the note keys that went into the contract */
  moved: string[];
}

/** One edited note -> what goes into the contract and what stays as note-only wording. */
export function splitEdits(contract: Contract, edited: NoteValues, settings?: Gst): SplitResult {
  const base = noteValuesFromContract(contract, settings);
  const patch = contractPatchFromNote(contract, base, edited, settings);
  const next = { ...contract, ...patch } as Contract;
  const base2 = noteValuesFromContract(next, settings);
  const overrides = diffOverrides(base2, edited);
  // everything that differed from the old contract and no longer differs from the new one went into the contract
  const moved = OVERRIDE_KEYS.filter(k => getValue(base, k) !== getValue(base2, k));
  return { patch, overrides, moved: [...moved] };
}

/** After the contract itself was edited: drop the note edits that the contract change replaces.
 *  Returns what to store as `noteOverrides` (already in the stored form), or null when nothing needs to change. */
export function reconcileOverrides(before: Contract, after: Contract, settings?: Gst): Overrides | null {
  const saved = decodeOverrides(after.noteOverrides ?? before.noteOverrides);
  if (!Object.keys(saved).length) return null;
  const a = noteValuesFromContract(before, settings);
  const b = noteValuesFromContract(after, settings);
  const keep: Overrides = {};
  for (const [k, v] of Object.entries(saved)) {
    if (getValue(a, k) !== getValue(b, k)) continue; // the contract changed this: the contract wins
    if (v === getValue(b, k)) continue; // same as the contract now: nothing to remember
    keep[k] = v;
  }
  return Object.keys(keep).length === Object.keys(saved).length ? null : encodeOverrides(keep);
}

export interface NoteDiff { key: string; label: string; contract: string; note: string; /** the contract can take this value */ movable: boolean }

/** how a stored value reads in a list (the "delivery same as buyer" switch is stored as 1 or nothing) */
export const showValue = (key: string, v: string) => (key === 'deliverySame' ? (v === '1' ? 'Same as the buyer' : 'A different place') : v.trim() || '(empty)');

/** where the saved note edits differ from what the contract says right now */
export function noteDiffs(contract: Contract, settings?: Gst): NoteDiff[] {
  const saved = decodeOverrides(contract.noteOverrides);
  if (!Object.keys(saved).length) return [];
  const base = noteValuesFromContract(contract, settings);
  const { overrides: stays } = splitEdits(contract, applyOverrides(base, saved), settings);
  const out: NoteDiff[] = [];
  for (const [k, v] of Object.entries(saved)) {
    const cv = getValue(base, k);
    if (cv === v) continue;
    out.push({ key: k, label: labelOf(k), contract: cv, note: v, movable: !(k in stays) });
  }
  return out;
}

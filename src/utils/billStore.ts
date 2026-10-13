// Brokerage-bill records (invoice numbers, payments, adjustments), kept in Firestore (collection "billRecords")
// so they are the same on the website and on the iPhone and survive clearing the browser/app cache.
//
// New style  : one document per PARTY AND PERIOD, "period_<partyId>_<from>_<to>" (one bill per party for the
//              period, covering everything the party bought and sold).
// Old style  : "<partyId>_<month0>_<year>_<buyer|seller>" (monthly, one per side). These are still read: the
//              payments / adjustments recorded there show up on any new bill whose period fully contains that month.
//
// The oldest localStorage entries (bill_payments_* / bill_adj_*) are copied up once, automatically. They are
// left in place on the device as a backup.
import { collection, doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { useSyncExternalStore } from 'react';
import { db } from './firebase';
import type { BillPayment } from '../types';

const COL = 'billRecords';
const PAY_PREFIX = 'bill_payments_';
const ADJ_PREFIX = 'bill_adj_';
const MIGRATED_FLAG = 'bill_records_migrated_v1';
const PERIOD_PREFIX = 'period_';

export interface BillAdjustment { amount: number; note: string }

export interface BillRecord {
  payments?: BillPayment[];
  adjustment?: BillAdjustment;
  // ---- period records only
  partyId?: string;
  partyName?: string;
  from?: string;
  to?: string;
  invoiceNo?: number;
  billDate?: string;
  /** what the last generated PDF contained: lines as "<contractId>:<buyer|seller>" and the grand total */
  keys?: string[];
  pdfTotal?: number;
  pdfAt?: string;
}

const cache = new Map<string, BillRecord>();
const listeners = new Set<() => void>();
let version = 0;
let stop: (() => void) | null = null;

function bump() { version++; listeners.forEach(l => l()); }

async function write(id: string, patch: BillRecord): Promise<void> {
  const prev = cache.get(id) || {};
  cache.set(id, { ...prev, ...patch }); // show it immediately; Firestore confirms in the background
  bump();
  await setDoc(doc(db, COL, id), { ...JSON.parse(JSON.stringify(patch)), updatedAt: Timestamp.now() }, { merge: true });
}

/* ---------- period records ---------- */
export const periodId = (partyId: string, from: string, to: string) => `${PERIOD_PREFIX}${partyId}_${from}_${to}`;

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();

/** calendar months (0-based month) that lie completely inside [from, to] */
function monthsInside(from: string, to: string): { y: number; m0: number }[] {
  const out: { y: number; m0: number }[] = [];
  const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from);
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(to);
  if (!f || !t) return out;
  let y = +f[1], m0 = +f[2] - 1;
  const endKey = +t[1] * 12 + (+t[2] - 1);
  for (let guard = 0; y * 12 + m0 <= endKey && guard < 120; guard++) {
    const first = `${y}-${pad(m0 + 1)}-01`;
    const last = `${y}-${pad(m0 + 1)}-${pad(lastDay(y, m0))}`;
    if (first >= from && last <= to) out.push({ y, m0 });
    m0++; if (m0 > 11) { m0 = 0; y++; }
  }
  return out;
}

export interface PeriodView {
  record: BillRecord;
  /** payments recorded on this bill plus the ones from old monthly bills inside the period */
  payments: BillPayment[];
  /** payment ids that come from old monthly bills (shown, but not editable here) */
  legacyIds: Set<string>;
  adjustment: BillAdjustment;
}

export function getPeriodView(partyId: string, from: string, to: string): PeriodView {
  const record = cache.get(periodId(partyId, from, to)) || {};
  const own = record.payments || [];
  const payments = [...own];
  const legacyIds = new Set<string>();
  let legacyAdj = 0;
  const notes: string[] = [];
  for (const { y, m0 } of monthsInside(from, to)) {
    for (const side of ['buyer', 'seller'] as const) {
      const old = cache.get(`${partyId}_${m0}_${y}_${side}`);
      if (!old) continue;
      for (const p of old.payments || []) { payments.push(p); legacyIds.add(p.id); }
      if (old.adjustment && Number(old.adjustment.amount)) {
        legacyAdj += Number(old.adjustment.amount) || 0;
        if (old.adjustment.note) notes.push(old.adjustment.note);
      }
    }
  }
  payments.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const adjustment = record.adjustment ?? { amount: Math.round(legacyAdj * 100) / 100, note: notes.join('; ') };
  return { record, payments, legacyIds, adjustment };
}

export function savePeriodPayments(partyId: string, from: string, to: string, payments: BillPayment[]) {
  return write(periodId(partyId, from, to), { partyId, from, to, payments });
}
export function savePeriodAdjustment(partyId: string, from: string, to: string, adjustment: BillAdjustment) {
  return write(periodId(partyId, from, to), { partyId, from, to, adjustment });
}

/** highest invoice number used so far (0 when none) */
export function lastInvoiceNo(): number {
  let max = 0;
  cache.forEach((r, id) => { if (id.startsWith(PERIOD_PREFIX) && Number(r.invoiceNo) > max) max = Number(r.invoiceNo); });
  return max;
}
export const nextInvoiceNo = (start: number) => Math.max(Math.floor(Number(start) || 1), lastInvoiceNo() + 1);

export function invoiceNoTaken(no: number, exceptId?: string): boolean {
  for (const [id, r] of cache) if (id.startsWith(PERIOD_PREFIX) && id !== exceptId && Number(r.invoiceNo) === no) return true;
  return false;
}

export interface IssueInfo {
  partyName: string;
  billDate: string;
  keys: string[];
  total: number;
}

/**
 * Called whenever a bill / invoice PDF is made for a party and period. Keeps the invoice number the party's bill
 * already has (the Brokerage Bill and the Invoice share it), or takes the next free number.
 * Returns the number straight away; saving to Firestore carries on in the background.
 */
export function issueBill(partyId: string, from: string, to: string, info: IssueInfo, startNumber: number): { invoiceNo: number; saved: Promise<void> } {
  const id = periodId(partyId, from, to);
  const have = cache.get(id)?.invoiceNo;
  const invoiceNo = have && have > 0 ? have : nextInvoiceNo(startNumber);
  const saved = write(id, {
    partyId, from, to, invoiceNo,
    partyName: info.partyName, billDate: info.billDate, keys: info.keys, pdfTotal: info.total, pdfAt: new Date().toISOString(),
  });
  return { invoiceNo, saved };
}

/** let the user change a bill's number (must be a whole number nobody else has) */
export function setInvoiceNo(partyId: string, from: string, to: string, no: number): Promise<void> {
  const id = periodId(partyId, from, to);
  if (!Number.isInteger(no) || no < 1) return Promise.reject(new Error('The invoice number must be a whole number, 1 or more.'));
  if (invoiceNoTaken(no, id)) return Promise.reject(new Error('Invoice number ' + no + ' is already used by another bill.'));
  return write(id, { partyId, from, to, invoiceNo: no });
}

/** other bills (other periods) of this party that already include some of these contract lines */
export function billedElsewhere(partyId: string, from: string, to: string, keys: string[]): { invoiceNo?: number; from?: string; to?: string; count: number }[] {
  const mine = periodId(partyId, from, to);
  const want = new Set(keys);
  const out: { invoiceNo?: number; from?: string; to?: string; count: number }[] = [];
  cache.forEach((r, id) => {
    if (!id.startsWith(PERIOD_PREFIX) || id === mine || r.partyId !== partyId || !r.keys) return;
    const count = r.keys.filter(k => want.has(k)).length;
    if (count) out.push({ invoiceNo: r.invoiceNo, from: r.from, to: r.to, count });
  });
  return out;
}

/* ---------- old (monthly, per side) API: kept for anything that still uses it ---------- */
const legacyId = (partyId: string, month: number, year: number, billType: 'buyer' | 'seller') => `${partyId}_${month}_${year}_${billType}`;
export function getBillPayments(partyId: string, month: number, year: number, billType: 'buyer' | 'seller'): BillPayment[] {
  return cache.get(legacyId(partyId, month, year, billType))?.payments || [];
}
export function getBillAdjustment(partyId: string, month: number, year: number, billType: 'buyer' | 'seller'): BillAdjustment {
  return cache.get(legacyId(partyId, month, year, billType))?.adjustment || { amount: 0, note: '' };
}
export function saveBillPayments(partyId: string, month: number, year: number, billType: 'buyer' | 'seller', payments: BillPayment[]) {
  return write(legacyId(partyId, month, year, billType), { payments });
}
export function saveBillAdjustment(partyId: string, month: number, year: number, billType: 'buyer' | 'seller', adjustment: BillAdjustment) {
  return write(legacyId(partyId, month, year, billType), { adjustment });
}

/** copy payments/adjustments that only exist in this browser up to Firestore (once) */
async function migrateLocal(serverIds: Map<string, BillRecord>) {
  try {
    if (localStorage.getItem(MIGRATED_FLAG)) return;
    const jobs: Promise<void>[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const isPay = k.startsWith(PAY_PREFIX);
      const isAdj = k.startsWith(ADJ_PREFIX);
      if (!isPay && !isAdj) continue;
      const id = k.slice(isPay ? PAY_PREFIX.length : ADJ_PREFIX.length);
      let local: any;
      try { local = JSON.parse(localStorage.getItem(k) || 'null'); } catch { continue; }
      if (!local) continue;
      const remote = serverIds.get(id) || {};
      if (isPay && Array.isArray(local) && local.length) {
        const have = new Set((remote.payments || []).map(p => p.id));
        const merged = [...(remote.payments || []), ...(local as BillPayment[]).filter(p => !have.has(p.id))];
        if (merged.length !== (remote.payments || []).length) jobs.push(write(id, { payments: merged }));
      } else if (isAdj && !remote.adjustment && (Number(local.amount) || local.note)) {
        jobs.push(write(id, { adjustment: { amount: Number(local.amount) || 0, note: String(local.note || '') } }));
      }
    }
    await Promise.all(jobs);
    localStorage.setItem(MIGRATED_FLAG, '1');
  } catch (e) {
    console.error('Bill migration failed (will retry next time)', e);
  }
}

/** start listening (call once after sign-in). Returns the stop function. */
export function startBillSync(): () => void {
  if (stop) return stop;
  let migrated = false;
  const unsub = onSnapshot(
    collection(db, COL),
    snap => {
      snap.docChanges().forEach(ch => {
        if (ch.type === 'removed') cache.delete(ch.doc.id);
        else cache.set(ch.doc.id, ch.doc.data() as BillRecord);
      });
      bump();
      // only migrate once we have seen what the server really holds
      if (!migrated && !snap.metadata.fromCache) {
        migrated = true;
        void migrateLocal(new Map(cache));
      }
    },
    err => console.error('Bill sync error', err),
  );
  stop = () => { unsub(); stop = null; cache.clear(); bump(); };
  return stop;
}

/** changes whenever bill records change (use as a useMemo dependency) */
export function useBillVersion(): number {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => version,
  );
}

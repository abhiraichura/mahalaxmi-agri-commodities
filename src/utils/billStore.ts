// Brokerage-bill payments and adjustments, kept in Firestore (collection "billRecords") instead of the
// browser's localStorage, so they are the same on the website and on the iPhone and survive clearing the
// browser/app cache. One document per bill: "<partyId>_<month>_<year>_<buyer|seller>".
//
// The old localStorage entries (bill_payments_* / bill_adj_*) are copied up once, automatically. They are
// left in place on the device as a backup.
import { collection, doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { useSyncExternalStore } from 'react';
import { db } from './firebase';
import type { BillPayment } from '../types';

const COL = 'billRecords';
const PAY_PREFIX = 'bill_payments_';
const ADJ_PREFIX = 'bill_adj_';
const MIGRATED_FLAG = 'bill_records_migrated_v1';

export interface BillAdjustment { amount: number; note: string }
interface BillRecord { payments?: BillPayment[]; adjustment?: BillAdjustment }

const cache = new Map<string, BillRecord>();
const listeners = new Set<() => void>();
let version = 0;
let stop: (() => void) | null = null;

const idOf = (partyId: string, month: number, year: number, billType: 'buyer' | 'seller') => `${partyId}_${month}_${year}_${billType}`;
function bump() { version++; listeners.forEach(l => l()); }

export function getBillPayments(partyId: string, month: number, year: number, billType: 'buyer' | 'seller'): BillPayment[] {
  return cache.get(idOf(partyId, month, year, billType))?.payments || [];
}
export function getBillAdjustment(partyId: string, month: number, year: number, billType: 'buyer' | 'seller'): BillAdjustment {
  return cache.get(idOf(partyId, month, year, billType))?.adjustment || { amount: 0, note: '' };
}

async function write(id: string, patch: BillRecord): Promise<void> {
  const prev = cache.get(id) || {};
  cache.set(id, { ...prev, ...patch }); // show it immediately; Firestore confirms in the background
  bump();
  await setDoc(doc(db, COL, id), { ...patch, updatedAt: Timestamp.now() }, { merge: true });
}
export function saveBillPayments(partyId: string, month: number, year: number, billType: 'buyer' | 'seller', payments: BillPayment[]) {
  return write(idOf(partyId, month, year, billType), { payments });
}
export function saveBillAdjustment(partyId: string, month: number, year: number, billType: 'buyer' | 'seller', adjustment: BillAdjustment) {
  return write(idOf(partyId, month, year, billType), { adjustment });
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

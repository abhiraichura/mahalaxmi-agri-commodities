// A copy of everything in the app that you can keep on your own computer: parties, products, contracts, bills, notes, tasks, lists, settings.
// (The photos and PDFs attached to contracts stay in the cloud; the backup lists them but does not contain the files.)
import { collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from './firebase';
import { kvSave } from '../broadcast/storage';
import { contractBrokerage, goodsValue } from '../billing/calc';
import type { Contract } from '../types';

export const BACKUP_COLLECTIONS = ['parties', 'products', 'contracts', 'notes', 'daily_todos', 'whatsapp_lists', 'whatsapp_extras', 'billRecords', 'settings'] as const;

/** Firestore times become plain ISO text, everything else is copied as it is */
function plain(v: unknown): unknown {
  if (v == null || typeof v !== 'object') return v;
  const o = v as { toDate?: () => Date; seconds?: number; nanoseconds?: number };
  if (typeof o.toDate === 'function') { try { return o.toDate().toISOString(); } catch { return null; } }
  if (typeof o.seconds === 'number' && Object.keys(o).every(k => k === 'seconds' || k === 'nanoseconds')) return new Date(o.seconds * 1000).toISOString();
  if (Array.isArray(v)) return v.map(plain);
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, plain(x)]));
}

export interface Backup { app: string; exportedAt: string; counts: Record<string, number>; data: Record<string, Record<string, unknown>> }

export async function buildBackup(): Promise<Backup> {
  const data: Record<string, Record<string, unknown>> = {};
  const counts: Record<string, number> = {};
  for (const name of BACKUP_COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, name));
      const docs: Record<string, unknown> = {};
      snap.forEach(d => { docs[d.id] = plain(d.data()); });
      data[name] = docs; counts[name] = Object.keys(docs).length;
    } catch { data[name] = {}; counts[name] = 0; }
  }
  return { app: 'Mahalaxmi Agri Commodities', exportedAt: new Date().toISOString(), counts, data };
}

function saveAs(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** downloads the backup file and remembers the day, so Today can remind you when it is old */
export async function downloadBackup(): Promise<Backup> {
  const b = await buildBackup();
  saveAs(`mahalaxmi_backup_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`, JSON.stringify(b), 'application/json');
  void kvSave('last_backup', new Date().toISOString());
  return b;
}

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** one row per contract, for Excel */
export function contractsCsv(contracts: Contract[]): string {
  const head = ['Contract no', 'Date', 'Financial year', 'Status', 'Seller', 'Buyer', 'Product', 'Quantity', 'Unit', 'Price', 'Price unit', 'Goods value', 'Buyer brokerage', 'Seller brokerage', 'Total brokerage', 'Loaded on', 'Payment received on', 'Delivery'];
  const rows = [...contracts].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.contractNo).localeCompare(String(b.contractNo), undefined, { numeric: true })).map(c => {
    const bb = contractBrokerage(c, 'buyer'); const sb = contractBrokerage(c, 'seller');
    return [c.contractNo, String(c.date || '').slice(0, 10), c.financialYear, c.status, c.seller?.legalName || c.seller?.name, c.buyer?.legalName || c.buyer?.name, c.product?.name, c.quantity, c.quantityUnit, c.price, c.priceUnit,
      Math.round(goodsValue(c.quantity, c.quantityUnit, c.price, c.priceUnit).value), bb, sb, Math.round((bb + sb) * 100) / 100, c.loadedOn || '', c.paymentReceivedOn || '', c.deliveryLocation || ''].map(csvCell).join(',');
  });
  return '﻿' + [head.map(csvCell).join(','), ...rows].join('\n');
}

export function downloadContractsCsv(contracts: Contract[]) {
  saveAs(`mahalaxmi_contracts_${format(new Date(), 'yyyy-MM-dd')}.csv`, contractsCsv(contracts), 'text/csv;charset=utf-8;');
}

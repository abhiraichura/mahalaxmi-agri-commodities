// Stores the user's Verdana font file privately in their own Firestore (it is a licensed font, so it is
// never part of the public code), and keeps a copy on the device so notes work offline.
import { Bytes, collection, doc, getDoc, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

const COL = 'appFiles';
const META_ID = 'contractFont';
const CHUNK = 600_000; // bytes per Firestore document (limit is ~1 MiB)

export interface FontMeta {
  fileName: string;
  size: number;
  chunks: number;
  version: number;
  fullName?: string;
}
export interface StoredFont { bytes: Uint8Array; meta: FontMeta }

/* ---------- tiny IndexedDB cache ---------- */
const IDB_NAME = 'mahalaxmi-contract-note';
function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const d = await idb();
    return await new Promise<T | undefined>((resolve, reject) => {
      const rq = d.transaction('files').objectStore('files').get(key);
      rq.onsuccess = () => resolve(rq.result as T | undefined);
      rq.onerror = () => reject(rq.error);
    });
  } catch { return undefined; }
}
async function idbSet(key: string, val: unknown): Promise<void> {
  try {
    const d = await idb();
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction('files', 'readwrite');
      tx.objectStore('files').put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* the cache is only a convenience */ }
}
async function idbDel(key: string): Promise<void> {
  try {
    const d = await idb();
    await new Promise<void>((resolve) => {
      const tx = d.transaction('files', 'readwrite');
      tx.objectStore('files').delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* ignore */ }
}

let memo: StoredFont | null | undefined;
const listeners = new Set<() => void>();
export function onFontChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
function emit() { listeners.forEach(f => f()); }

/** The stored Verdana (or null when none has been uploaded yet). */
export async function getStoredFont(): Promise<StoredFont | null> {
  if (memo !== undefined) return memo;
  const cached = await idbGet<StoredFont>('font');
  let meta: FontMeta | null = null;
  let reachable = true;
  try {
    const snap = await getDoc(doc(db, COL, META_ID));
    meta = snap.exists() ? (snap.data() as FontMeta) : null;
    if (!snap.exists()) {
      // no font in the cloud: forget any stale device copy
      if (cached) await idbDel('font');
      memo = null;
      return null;
    }
  } catch {
    reachable = false;
  }
  if (!reachable || !meta) {
    memo = cached || null; // offline: use what this device already has
    return memo;
  }
  if (cached && cached.meta.version === meta.version) { memo = cached; return cached; }
  // download the chunks
  const snaps = await Promise.all(
    Array.from({ length: meta.chunks }, (_, i) => getDoc(doc(db, COL, `${META_ID}_${i}`))),
  );
  const parts: Uint8Array[] = snaps.map(s => {
    const d = s.data() as { data?: Bytes } | undefined;
    if (!d?.data) throw new Error('The stored font is incomplete. Please upload it again in Settings.');
    return d.data.toUint8Array();
  });
  const bytes = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { bytes.set(p, o); o += p.length; }
  const stored = { bytes, meta };
  await idbSet('font', stored);
  memo = stored;
  return stored;
}

export async function saveFont(bytes: Uint8Array, fileName: string, fullName?: string): Promise<FontMeta> {
  const chunks = Math.ceil(bytes.length / CHUNK);
  const version = Date.now();
  const meta: FontMeta = { fileName, size: bytes.length, chunks, version, ...(fullName ? { fullName } : {}) };
  const batch = writeBatch(db);
  for (let i = 0; i < chunks; i++) {
    batch.set(doc(db, COL, `${META_ID}_${i}`), { data: Bytes.fromUint8Array(bytes.slice(i * CHUNK, (i + 1) * CHUNK)), index: i, version });
  }
  batch.set(doc(db, COL, META_ID), meta); // written in the same batch: all or nothing
  await batch.commit();
  const stored = { bytes, meta };
  await idbSet('font', stored);
  memo = stored;
  emit();
  return meta;
}

export async function removeFont(): Promise<void> {
  const snaps = await getDocs(collection(db, COL));
  await Promise.all(snaps.docs.filter(d => d.id.startsWith(META_ID)).map(d => deleteDoc(d.ref)));
  await idbDel('font');
  memo = null;
  emit();
}

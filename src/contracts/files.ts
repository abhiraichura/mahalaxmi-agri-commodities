// Files kept with a contract: bills, loading slips, weighment slips, LR copies, payment proofs ... (photos or PDFs).
// They live in your own Firebase database, cut into pieces of 600 KB (the same way the Verdana font is kept), so no
// extra service or setting is needed. Photos are made smaller first, so a phone picture takes about 0.3 to 0.8 MB.
// The contract itself only holds a short list (name, type, size); the pieces are read when you open a file.
import { Bytes, doc, getDoc, writeBatch } from 'firebase/firestore';
import { v4 as uuid } from 'uuid';
import { db } from '../utils/firebase';
import type { ContractFile, ContractFileKind } from '../types';

const COL = 'appFiles';
const CHUNK = 600_000;
export const MAX_FILE_BYTES = 9_000_000;

export const FILE_KINDS: { value: ContractFileKind; label: string; short: string }[] = [
  { value: 'loading_slip', label: 'Loading slip', short: 'Loading' },
  { value: 'weighment', label: 'Weighment slip', short: 'Weighment' },
  { value: 'lr', label: 'LR / transport', short: 'LR' },
  { value: 'bill', label: 'Bill / invoice', short: 'Bill' },
  { value: 'payment', label: 'Payment proof', short: 'Payment' },
  { value: 'quality', label: 'Quality report', short: 'Quality' },
  { value: 'other', label: 'Other', short: 'Other' },
];
export const kindLabel = (k: string) => FILE_KINDS.find(x => x.value === k)?.label || 'File';

const chunkId = (cid: string, fid: string, i: number) => `cf_${cid}_${fid}_${i}`;
const thumbId = (cid: string, fid: string) => `cf_${cid}_${fid}_t`;

export const isImage = (f: Pick<ContractFile, 'mime' | 'name'>) => /^image\//.test(f.mime) || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name);
export const isPdf = (f: Pick<ContractFile, 'mime' | 'name'>) => f.mime === 'application/pdf' || /\.pdf$/i.test(f.name);
export const prettySize = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

/* ---------- making a photo smaller ---------- */
async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions); } catch { /* fall through */ }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('This picture cannot be opened.'));
      img.src = url;
    });
  } finally { setTimeout(() => URL.revokeObjectURL(url), 5000); }
}
async function drawn(file: Blob, maxSide: number, quality: number): Promise<Blob | null> {
  const img = await loadBitmap(file);
  const w = 'naturalWidth' in img ? img.naturalWidth : img.width;
  const h = 'naturalHeight' in img ? img.naturalHeight : img.height;
  if (!w || !h) return null;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  if ('close' in img) (img as ImageBitmap).close();
  return new Promise<Blob | null>(res => canvas.toBlob(b => res(b), 'image/jpeg', quality));
}
/** a photo of a document: at most 2000 px on the long side, JPEG. Small pictures are kept as they are. */
export async function shrinkImage(file: File): Promise<{ blob: Blob; mime: string; name: string }> {
  if (!/^image\//.test(file.type) || file.type === 'image/gif') return { blob: file, mime: file.type || 'application/octet-stream', name: file.name };
  try {
    if (file.size <= 350_000 && file.type !== 'image/heic') return { blob: file, mime: file.type, name: file.name };
    const out = await drawn(file, 2000, 0.82);
    if (out && out.size < file.size) return { blob: out, mime: 'image/jpeg', name: file.name.replace(/\.[a-z0-9]+$/i, '') + '.jpg' };
  } catch { /* keep the original */ }
  return { blob: file, mime: file.type, name: file.name };
}
async function makeThumb(blob: Blob): Promise<string | null> {
  try {
    const out = await drawn(blob, 220, 0.6);
    if (!out) return null;
    return await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsDataURL(out); });
  } catch { return null; }
}

/* ---------- a small device cache, so a file opened once opens instantly next time ---------- */
const memo = new Map<string, Blob>();
const thumbs = new Map<string, string | null>();
function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('mahalaxmi-contract-files', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('f');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function cacheGet(key: string): Promise<Blob | undefined> {
  try { const d = await idb(); return await new Promise(res => { const q = d.transaction('f').objectStore('f').get(key); q.onsuccess = () => res(q.result as Blob | undefined); q.onerror = () => res(undefined); }); } catch { return undefined; }
}
async function cachePut(key: string, b: Blob) {
  try { const d = await idb(); await new Promise<void>(res => { const tx = d.transaction('f', 'readwrite'); tx.objectStore('f').put(b, key); tx.oncomplete = () => res(); tx.onerror = () => res(); }); } catch { /* only a convenience */ }
}
async function cacheDel(key: string) {
  try { const d = await idb(); await new Promise<void>(res => { const tx = d.transaction('f', 'readwrite'); tx.objectStore('f').delete(key); tx.oncomplete = () => res(); tx.onerror = () => res(); }); } catch { /* ignore */ }
}

/* ---------- saving, reading, deleting ---------- */
export interface NewFile { file: File; kind: ContractFileKind; note?: string }

/** Cuts the file into pieces and saves them. Returns the short record to keep on the contract. */
export async function saveContractFile(contractId: string, nf: NewFile): Promise<ContractFile> {
  const { blob, mime, name } = await shrinkImage(nf.file);
  if (blob.size > MAX_FILE_BYTES) throw new Error(`"${nf.file.name}" is ${prettySize(blob.size)}. The limit is ${prettySize(MAX_FILE_BYTES)}: send a photo of it, or a smaller PDF.`);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const id = uuid().replace(/-/g, '').slice(0, 16);
  const chunks = Math.max(1, Math.ceil(bytes.length / CHUNK));
  const batch = writeBatch(db);
  for (let i = 0; i < chunks; i++) batch.set(doc(db, COL, chunkId(contractId, id, i)), { data: Bytes.fromUint8Array(bytes.slice(i * CHUNK, (i + 1) * CHUNK)), index: i, contractId });
  const thumb = /^image\//.test(mime) ? await makeThumb(blob) : null;
  if (thumb) batch.set(doc(db, COL, thumbId(contractId, id)), { data: thumb, contractId });
  await batch.commit();
  const meta: ContractFile = { id, name, kind: nf.kind, mime: mime || 'application/octet-stream', size: bytes.length, chunks, addedAt: Date.now(), ...(nf.note?.trim() ? { note: nf.note.trim() } : {}) };
  memo.set(`${contractId}/${id}`, blob);
  void cachePut(`${contractId}/${id}`, blob);
  if (thumb) thumbs.set(`${contractId}/${id}`, thumb);
  return meta;
}

export async function loadContractFile(contractId: string, f: ContractFile): Promise<Blob> {
  const key = `${contractId}/${f.id}`;
  const m = memo.get(key); if (m) return m;
  const c = await cacheGet(key); if (c) { memo.set(key, c); return c; }
  const snaps = await Promise.all(Array.from({ length: f.chunks }, (_, i) => getDoc(doc(db, COL, chunkId(contractId, f.id, i)))));
  const parts = snaps.map(s => {
    const d = s.data() as { data?: Bytes } | undefined;
    if (!d?.data) throw new Error('This file is incomplete in the database. Please add it again.');
    return d.data.toUint8Array();
  });
  const blob = new Blob(parts as BlobPart[], { type: f.mime });
  memo.set(key, blob); void cachePut(key, blob);
  return blob;
}

export async function loadThumb(contractId: string, f: ContractFile): Promise<string | null> {
  const key = `${contractId}/${f.id}`;
  if (thumbs.has(key)) return thumbs.get(key) || null;
  try {
    const s = await getDoc(doc(db, COL, thumbId(contractId, f.id)));
    const v = s.exists() ? String((s.data() as { data?: string }).data || '') || null : null;
    thumbs.set(key, v);
    return v;
  } catch { return null; }
}

export async function deleteContractFiles(contractId: string, files: ContractFile[]): Promise<void> {
  for (let i = 0; i < files.length; i += 20) {
    const batch = writeBatch(db);
    for (const f of files.slice(i, i + 20)) {
      for (let n = 0; n < f.chunks; n++) batch.delete(doc(db, COL, chunkId(contractId, f.id, n)));
      batch.delete(doc(db, COL, thumbId(contractId, f.id)));
      memo.delete(`${contractId}/${f.id}`); thumbs.delete(`${contractId}/${f.id}`); void cacheDel(`${contractId}/${f.id}`);
    }
    await batch.commit();
  }
}

/** a sensible first choice for the "what is this?" question, from where the contract stands */
export function guessKind(stage: string): ContractFileKind {
  return stage === 'to_load' ? 'loading_slip' : stage === 'awaiting_payment' ? 'bill' : stage === 'paid' ? 'payment' : 'other';
}

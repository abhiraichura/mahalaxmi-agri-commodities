// src/broadcast/storage.ts
// Small settings the broadcast page keeps: saved messages, recent broadcasts, channel link, last mode.
// They are saved in Firebase (collection "whatsapp_extras") and also in this browser, so nothing is lost
// if Firebase refuses the write (for example when its rules only allow certain collections).
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

const COL = 'whatsapp_extras';
const LS = 'mac_wa_';

const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function localGet<T>(name: string, fallback: T): T {
  try {
    const s = localStorage.getItem(LS + name);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch { return fallback; }
}

export function localSet(name: string, value: unknown): void {
  try { localStorage.setItem(LS + name, JSON.stringify(value)); } catch { /* private mode etc. */ }
}

export function localDel(name: string): void {
  try { localStorage.removeItem(LS + name); } catch { /* ignore */ }
}

/** Firebase first, this browser as the fallback. */
export async function kvLoad<T>(name: string, fallback: T): Promise<T> {
  try {
    const snap = await getDoc(doc(db, COL, name));
    if (snap.exists()) {
      const d = snap.data() as { value?: T } | undefined;
      if (d && d.value !== undefined) { localSet(name, d.value); return d.value; }
    }
  } catch { /* use the copy in this browser */ }
  return localGet<T>(name, fallback);
}

/** returns false when only this browser could keep it */
export async function kvSave(name: string, value: unknown): Promise<boolean> {
  const v = clean(value);
  localSet(name, v);
  try {
    await setDoc(doc(db, COL, name), { value: v, updatedAt: Date.now() });
    return true;
  } catch { return false; }
}

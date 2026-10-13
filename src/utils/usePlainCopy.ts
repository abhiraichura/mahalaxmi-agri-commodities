// "Without letterhead" choice, shared by the Contract Notes and the Brokerage Bills / Invoices.
// ON = the PDF has no header, no footer and no lotus (everything else stays exactly where it is), so it can be
// printed on your own pre-printed letterhead. The choice is remembered on this device.
import { useCallback, useEffect, useState } from 'react';

const KEY = 'mahalaxmi.plainCopy';
const listeners = new Set<(v: boolean) => void>();

function read(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
let current = read();

export function usePlainCopy(): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(current);
  useEffect(() => {
    listeners.add(setValue);
    setValue(current);
    return () => { listeners.delete(setValue); };
  }, []);
  const set = useCallback((v: boolean) => {
    current = v;
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* private mode: the choice just is not remembered */ }
    listeners.forEach(l => l(v));
  }, []);
  return [value, set];
}

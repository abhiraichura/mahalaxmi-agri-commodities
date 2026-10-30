// The latest NCDEX price for the product being written into a contract (Jeera, Dhaniya, Turmeric), for reference.
import { useEffect, useState } from 'react';
import { ratesCall, type CommodityKey, type RateUpdate } from './api';

export interface NcdexRef { name: string; perQuintal: number; perKg: number; changePct: number; date: string; atMs: number }

const keyOf = (productName: string): CommodityKey | null => {
  const n = String(productName || '').toLowerCase();
  if (/jeera|cumin/.test(n)) return 'jeera';
  if (/dhaniya|dhania|coriander/.test(n)) return 'dhaniya';
  if (/turmeric|haldi/.test(n)) return 'turmeric';
  return null;
};
const LABEL: Record<CommodityKey, string> = { jeera: 'Jeera', dhaniya: 'Dhaniya', turmeric: 'Turmeric' };

let cache: { at: number; updates: RateUpdate[] } | null = null;
let pending: Promise<RateUpdate[]> | null = null;
async function latest(): Promise<RateUpdate[]> {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.updates;
  if (!pending) {
    pending = ratesCall<{ updates: RateUpdate[] }>('list', { limit: 4 })
      .then(r => { cache = { at: Date.now(), updates: r.updates || [] }; return cache.updates; })
      .catch(() => [] as RateUpdate[])
      .finally(() => { pending = null; });
  }
  return pending;
}

/** the newest ready update that has a price for this product, or null (also null when the product is not one NCDEX lists) */
export function useNcdexRef(productName: string): NcdexRef | null {
  const key = keyOf(productName);
  const [ref, setRef] = useState<NcdexRef | null>(null);
  useEffect(() => {
    let live = true;
    setRef(null);
    if (!key) return;
    latest().then(updates => {
      if (!live) return;
      const u = updates.filter(x => x.status === 'ready' && x.picks?.[key]).sort((a, b) => b.createdAtMs - a.createdAtMs)[0];
      const p = u?.picks?.[key];
      if (u && p && p.ltp > 0) setRef({ name: LABEL[key], perQuintal: p.ltp, perKg: p.ltp / 100, changePct: p.changePct, date: u.date, atMs: u.createdAtMs });
    });
    return () => { live = false; };
  }, [key]);
  return ref;
}

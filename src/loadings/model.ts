// Loading in parts: one contract, several trucks. Pure helpers; the screen is LoadingsCard.
import { v4 as uuid } from 'uuid';
import type { Contract, Loading, TimelineEvent } from '../types';
import { fmtDay } from '../../server/reminders/plan.js';

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export const loadingsOf = (c: Pick<Contract, 'loadings'>): Loading[] =>
  (Array.isArray(c.loadings) ? c.loadings : [])
    .filter(l => l && typeof l === 'object')
    .map((l, i) => ({ id: String(l.id || `l${i}`), date: String(l.date || '').slice(0, 10), qty: Number(l.qty) || 0, ...(l.vehicle ? { vehicle: String(l.vehicle) } : {}), ...(l.note ? { note: String(l.note) } : {}) }))
    .sort((a, b) => a.date.localeCompare(b.date));

export interface Progress { loaded: number; total: number; remaining: number; pct: number; done: boolean; over: boolean; lastDate: string | null }

export function progress(c: Pick<Contract, 'loadings' | 'quantity'>): Progress {
  const ls = loadingsOf(c);
  const loaded = round3(ls.reduce((s, l) => s + l.qty, 0));
  const total = Number(c.quantity) || 0;
  return {
    loaded, total, remaining: round3(Math.max(0, total - loaded)),
    pct: total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0,
    done: total > 0 && loaded >= total - 0.0005,
    over: total > 0 && loaded > total * 1.02,
    lastDate: ls.length ? ls[ls.length - 1].date : null,
  };
}

const note = (c: Contract, date: string, text: string): TimelineEvent[] => [...(c.timeline || []), { id: uuid(), type: 'note', date, text, at: Date.now() }];
const desc = (c: Contract, l: Loading) => `${l.qty} ${c.quantityUnit || ''}`.trim() + (l.vehicle ? ` (${l.vehicle})` : '');

/** the fields to save when a part is added */
export function addLoading(c: Contract, input: { date: string; qty: number; vehicle?: string; note?: string }): Partial<Contract> {
  const l: Loading = { id: uuid(), date: input.date, qty: round3(Number(input.qty) || 0), ...(input.vehicle?.trim() ? { vehicle: input.vehicle.trim() } : {}), ...(input.note?.trim() ? { note: input.note.trim() } : {}) };
  const loadings = [...loadingsOf(c), l].sort((a, b) => a.date.localeCompare(b.date));
  const p = progress({ ...c, loadings });
  return { loadings, timeline: note(c, input.date, `Loaded ${desc(c, l)} on ${fmtDay(input.date)}. ${p.loaded} of ${p.total} ${c.quantityUnit || ''} loaded so far`.trim()) };
}

export function changeLoading(c: Contract, id: string, input: { date: string; qty: number; vehicle?: string; note?: string }): Partial<Contract> {
  const loadings = loadingsOf(c).map(l => (l.id === id ? { id, date: input.date, qty: round3(Number(input.qty) || 0), ...(input.vehicle?.trim() ? { vehicle: input.vehicle.trim() } : {}), ...(input.note?.trim() ? { note: input.note.trim() } : {}) } : l)).sort((a, b) => a.date.localeCompare(b.date));
  return { loadings };
}

export function removeLoading(c: Contract, id: string, today: string): Partial<Contract> {
  const gone = loadingsOf(c).find(l => l.id === id);
  return { loadings: loadingsOf(c).filter(l => l.id !== id), ...(gone ? { timeline: note(c, today, `Loading entry removed: ${desc(c, gone)} on ${fmtDay(gone.date)}`) } : {}) };
}

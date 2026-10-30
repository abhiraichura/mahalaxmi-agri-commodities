import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { Sheet } from './Sheet';

export interface PickItem {
  id: string;
  title: string;
  /** a second, smaller line (city, phone ...) */
  sub?: string;
  /** more words that should be found by the search but are not shown (GSTIN, other phone numbers ...) */
  search?: string;
}

const low = (s: unknown) => String(s ?? '').toLowerCase();
const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '');

/** every word you type must appear somewhere in the item (name, city, phone, GSTIN ...). Names that start with it come first. */
export function filterItems(items: PickItem[], query: string): PickItem[] {
  const words = low(query).split(/\s+/).filter(Boolean);
  if (!words.length) return items;
  const scored: { it: PickItem; score: number }[] = [];
  for (const it of items) {
    const hay = low(`${it.title} ${it.sub || ''} ${it.search || ''}`);
    const hayDigits = digits(hay);
    let score = 0;
    let all = true;
    for (const w of words) {
      const num = digits(w);
      const hit = hay.includes(w) || (num.length >= 3 && num === w.replace(/[\s+()-]/g, '') && hayDigits.includes(num));
      if (!hit) { all = false; break; }
      const t = low(it.title);
      score += t.startsWith(w) ? 3 : t.split(/\s+/).some(x => x.startsWith(w)) ? 2 : 1;
    }
    if (all) scored.push({ it, score });
  }
  return scored.sort((a, b) => b.score - a.score).map(x => x.it);
}

function useDesktop() {
  const q = '(min-width: 1024px)';
  const [d, setD] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches);
  useEffect(() => {
    const m = window.matchMedia?.(q); if (!m) return;
    const on = () => setD(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return d;
}

interface Props {
  label: string;
  required?: boolean;
  items: PickItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  /** shown first (when nothing is typed) under "Recent" */
  recent?: string[];
  /** adds a "+ Add new" row; receives what was typed */
  onAdd?: (typed: string) => void;
  addLabel?: string;
  emptyText?: string;
  below?: ReactNode;
  disabled?: boolean;
}

/**
 * A choice list you can SEARCH: type any part of the name, the city, a phone number or the GSTIN.
 * On a phone it opens as a sheet with the keyboard ready; on a computer it opens under the field. Arrow keys + Enter work.
 */
export function Picker({ label, required, items, value, onChange, placeholder = 'Select', searchPlaceholder = 'Search…', recent, onAdd, addLabel = 'Add new', emptyText = 'Nothing to pick yet.', below, disabled }: Props) {
  const desktop = useDesktop();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const selected = items.find(i => i.id === value);

  const rows = useMemo(() => {
    const found = filterItems(items, q);
    if (q.trim() || !recent?.length) return found.map(it => ({ it, group: '' }));
    const rec = recent.map(id => items.find(i => i.id === id)).filter((x): x is PickItem => !!x).slice(0, 5);
    const ids = new Set(rec.map(r => r.id));
    return [...rec.map(it => ({ it, group: 'Recent' })), ...items.filter(i => !ids.has(i.id)).map(it => ({ it, group: 'All' }))];
  }, [items, q, recent]);

  useEffect(() => { setHi(0); }, [q, open]);
  useEffect(() => { if (open) { setQ(''); const t = setTimeout(() => input.current?.focus(), 60); return () => clearTimeout(t); } }, [open]);
  // a click outside closes the computer version
  useEffect(() => {
    if (!open || !desktop) return;
    const onDown = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, desktop]);
  useEffect(() => { if (open) document.getElementById(`pick-${label}-${hi}`)?.scrollIntoView({ block: 'nearest' }); }, [hi, open, label]);

  const choose = (id: string) => { onChange(id); setOpen(false); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(rows.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (rows[hi]) choose(rows[hi].it.id); else if (onAdd && q.trim()) { setOpen(false); onAdd(q.trim()); } }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
  };

  const list = (
    <div className="flex flex-col min-h-0">
      <div className="relative px-1 pb-2">
        <Search size={16} className="absolute left-4 top-[13px] text-gray-400 pointer-events-none" />
        <input ref={input} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} placeholder={searchPlaceholder} aria-label={`Search ${label}`}
          className="input-field !pl-10" autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" />
      </div>
      <div role="listbox" aria-label={label} className={`overflow-y-auto overscroll-contain ${desktop ? 'max-h-72' : 'max-h-[52vh]'} -mx-1`}>
        {items.length === 0 && <p className="px-4 py-6 text-sm text-gray-500 text-center">{emptyText}</p>}
        {items.length > 0 && rows.length === 0 && <p className="px-4 py-5 text-sm text-gray-500 text-center">Nothing matches “{q}”.</p>}
        {rows.map(({ it, group }, i) => {
          const sel = it.id === value;
          return (
            <div key={`${group}-${it.id}`}>
              {group && (i === 0 || rows[i - 1].group !== group) && <p className="section-label px-4 pt-2 pb-1">{group}</p>}
              <button type="button" id={`pick-${label}-${i}`} role="option" aria-selected={sel} onClick={() => choose(it.id)} onMouseEnter={() => setHi(i)}
                className={`w-full px-4 py-2.5 text-left flex items-center gap-3 rounded-xl min-h-[52px] transition-colors ${i === hi ? 'bg-black/[0.05]' : ''} ${sel ? 'text-rose-700' : 'text-gray-900'}`}>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[15px] truncate ${sel ? 'font-semibold' : 'font-medium'}`}>{it.title}</span>
                  {it.sub && <span className="block text-xs text-gray-500 truncate">{it.sub}</span>}
                </span>
                {sel && <Check size={16} className="shrink-0" />}
              </button>
            </div>
          );
        })}
        {onAdd && (
          <button type="button" onClick={() => { setOpen(false); onAdd(q.trim()); }} className="w-full px-4 py-3 text-left flex items-center gap-2 rounded-xl text-rose-700 font-semibold text-sm min-h-[48px] hover:bg-rose-50">
            <Plus size={16} />{q.trim() ? `${addLabel}: “${q.trim()}”` : addLabel}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative" ref={wrap}>
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-rose-600"> *</span>}</span>
      <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); setOpen(true); } }}
        className="input-field flex items-center justify-between gap-2 text-left min-h-[48px]">
        <span className="min-w-0 flex-1">
          {selected ? (<>
            <span className="block text-gray-900 font-medium truncate">{selected.title}</span>
            {selected.sub && <span className="block text-xs text-gray-500 truncate">{selected.sub}</span>}
          </>) : <span className="text-gray-500">{placeholder}</span>}
        </span>
        <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {below}
      {open && desktop && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-2xl bg-white/95 backdrop-blur-xl shadow-xl ring-1 ring-black/10 p-2 animate-pop">{list}</div>
      )}
      {!desktop && <Sheet open={open} onClose={() => setOpen(false)} title={label}>{list}</Sheet>}
    </div>
  );
}

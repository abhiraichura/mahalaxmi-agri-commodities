// "Find anything": contracts (number, party, product), parties (name, city, phone) and pages. Opens with the search button,
// or with the "/" key on a computer. Arrow keys + Enter work; on a phone just tap.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Users, ArrowRight, X, CornerDownLeft } from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import { ALL_PAGES } from './nav';

interface Hit { key: string; to: string; title: string; sub: string; kind: 'contract' | 'party' | 'page'; icon: typeof Search }

const low = (s: unknown) => String(s || '').toLowerCase();
const digits = (s: unknown) => String(s || '').replace(/\D/g, '');

export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { contracts, parties } = useAppStore();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ(''); setIdx(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); document.body.style.overflow = prev; };
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const term = low(q).trim();
    const out: Hit[] = [];
    if (!term) {
      return ALL_PAGES.slice(0, 8).map(p => ({ key: 'p' + p.to, to: p.to, title: p.label, sub: p.hint || '', kind: 'page' as const, icon: p.icon }));
    }
    const numTerm = digits(term);
    const cs = contracts.filter(c =>
      low(c.contractNo).includes(term) || low(c.seller?.legalName).includes(term) || low(c.seller?.name).includes(term)
      || low(c.buyer?.legalName).includes(term) || low(c.buyer?.name).includes(term) || low(c.product?.name).includes(term));
    for (const c of cs.slice(0, 7)) {
      out.push({ key: 'c' + c.id, to: `/contracts/${c.id}`, title: `Contract #${c.contractNo} · ${c.product?.name || ''}`, sub: `${c.seller?.legalName || c.seller?.name || '?'} → ${c.buyer?.legalName || c.buyer?.name || '?'}`, kind: 'contract', icon: FileText });
    }
    const ps = parties.filter(p =>
      low(p.name).includes(term) || low(p.legalName).includes(term) || low(p.city).includes(term) || low(p.gstin).includes(term)
      || (numTerm.length >= 3 && (digits(p.phone).includes(numTerm) || (p.alternatePhones || []).some(x => digits(x).includes(numTerm)))));
    for (const p of ps.slice(0, 7)) {
      out.push({ key: 'u' + p.id, to: `/parties/edit/${p.id}`, title: p.legalName || p.name, sub: [p.type, p.city, p.phone].filter(Boolean).join(' · '), kind: 'party', icon: Users });
    }
    const pg = ALL_PAGES.filter(p => low(p.label).includes(term) || low(p.keywords).includes(term));
    for (const p of pg.slice(0, 4)) out.push({ key: 'p' + p.to, to: p.to, title: p.label, sub: 'Open this page', kind: 'page', icon: p.icon });
    return out;
  }, [q, contracts, parties]);

  useEffect(() => { setIdx(0); }, [q]);

  const go = (h: Hit | undefined) => { if (!h) return; onClose(); navigate(h.to); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(hits.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(hits[idx]); }
  };

  if (!open) return null;
  const groupOf = (k: Hit['kind']) => (k === 'contract' ? 'Contracts' : k === 'party' ? 'Parties' : q.trim() ? 'Pages' : 'Go to');
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center sm:pt-[10vh]" role="dialog" aria-modal="true" aria-label="Find anything">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-xl sm:rounded-2xl shadow-2xl flex flex-col h-full sm:h-auto sm:max-h-[70vh]" onKeyDown={onKey}>
        <div className="flex items-center gap-2 px-4 border-b border-gray-100" style={{ paddingTop: 'max(0.25rem, env(safe-area-inset-top))' }}>
          <Search size={18} className="text-gray-400 shrink-0" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Contract number, party, phone, product…" aria-label="Find anything"
            className="flex-1 py-4 text-base outline-none bg-transparent placeholder:text-gray-400" />
          <button onClick={onClose} aria-label="Close search" className="p-2 -mr-2 rounded-full text-gray-500 hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 py-2" role="listbox">
          {hits.length === 0 && <p className="px-5 py-10 text-center text-sm text-gray-500">Nothing found for “{q}”. Try a contract number, a party name or a phone number.</p>}
          {hits.map((h, i) => {
            const Icon = h.icon;
            const first = i === 0 || groupOf(hits[i - 1].kind) !== groupOf(h.kind);
            return (
              <div key={h.key}>
                {first && <p className="section-label px-5 pt-3 pb-1">{groupOf(h.kind)}</p>}
                <button role="option" aria-selected={i === idx} onClick={() => go(h)} onMouseEnter={() => setIdx(i)}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left min-h-[52px] ${i === idx ? 'bg-rose-50' : 'hover:bg-gray-50'}`}>
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${h.kind === 'contract' ? 'bg-sky-50 text-sky-700' : h.kind === 'party' ? 'bg-violet-50 text-violet-700' : 'bg-gray-100 text-gray-600'}`}><Icon size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900 truncate">{h.title}</span>
                    {h.sub && <span className="block text-xs text-gray-500 truncate">{h.sub}</span>}
                  </span>
                  {i === idx ? <CornerDownLeft size={15} className="text-gray-400 hidden sm:block" /> : <ArrowRight size={15} className="text-gray-300" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 border-t border-gray-100 text-xs text-gray-500">
          <span>↑↓ to move</span><span>Enter to open</span><span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}

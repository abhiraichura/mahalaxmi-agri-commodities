// src/pages/AllContracts.tsx
// Every contract, with the stage it is in (to load / awaiting payment / paid) and what is next.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, FileText, X, ChevronRight, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { useAppStore } from '../hooks/useAuthStore';
import { Page, Button, Badge, Segmented, EmptyState } from '../ui';
import { stageInfo } from '../reminders/stage';
import { useToday } from '../reminders/useToday';
import { planFor, diffDays } from '../../server/reminders/plan.js';
import { goodsValue } from '../billing/calc';
import { inrShort } from '../ui/format';
import { Contract } from '../types';

type Filter = 'all' | 'action' | 'to_load' | 'awaiting_payment' | 'overdue' | 'paid' | 'draft' | 'cancelled';
const FILTERS: Filter[] = ['all', 'action', 'to_load', 'awaiting_payment', 'overdue', 'paid', 'draft', 'cancelled'];

const nm = (p?: { legalName?: string; name?: string }) => (p && (p.legalName || p.name)) || '—';
const safeDate = (d: string) => { try { return format(new Date(d), 'dd MMM yy'); } catch { return d || ''; } };

export default function AllContracts() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { contracts, currentFinancialYear, settings } = useAppStore();
  const today = useToday();
  const [search, setSearch] = useState('');
  const [fy, setFyState] = useState<string>(currentFinancialYear);
  const fyTouched = useRef(false);
  const setFy = (v: string) => { fyTouched.current = true; setFyState(v); };
  const fyOf = (c: Contract) => c.financialYear || `${c.year}-${c.year + 1}`;
  // every year that has contracts is offered, plus the years in Settings
  const years = useMemo(() => [...new Set([...(settings.financialYears || []), ...contracts.map(fyOf)])].sort().reverse(), [settings.financialYears, contracts]);
  // the saved "current year" may have no contracts at all: then show everything instead of an empty list
  useEffect(() => {
    if (fyTouched.current || !contracts.length || fy === 'all') return;
    if (!contracts.some(c => fyOf(c) === fy)) setFyState('all');
  }, [contracts, fy]);
  const [sort, setSort] = useState<'newest' | 'due'>('newest');
  const asked = params.get('stage') as Filter | null;
  const filter: Filter = asked && FILTERS.includes(asked) ? asked : 'all';
  const setFilter = (f: Filter) => { const n = new URLSearchParams(params); if (f === 'all') n.delete('stage'); else n.set('stage', f); setParams(n, { replace: true }); };

  const rows = useMemo(() => contracts
    .filter(c => fy === 'all' || fyOf(c) === fy)
    .map(c => ({ c, info: stageInfo(c, today), plan: planFor(c, today) })), [contracts, fy, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const n: Record<Filter, number> = { all: rows.length, action: 0, to_load: 0, awaiting_payment: 0, overdue: 0, paid: 0, draft: 0, cancelled: 0 };
    for (const r of rows) {
      if (r.plan.eligible && r.plan.ask) n.action++;
      if (r.info.stage in n) n[r.info.stage as Filter]++;
      if (r.info.tone === 'red' && (r.info.stage === 'to_load' || r.info.stage === 'awaiting_payment')) n.overdue++;
    }
    return n;
  }, [rows]);

  const q = search.trim().toLowerCase();
  const list = useMemo(() => {
    const out = rows.filter(({ c, info, plan }) => {
      const hit = !q || [c.contractNo, c.seller?.legalName, c.seller?.name, c.seller?.city, c.buyer?.legalName, c.buyer?.name, c.buyer?.city, c.product?.name].some(x => String(x || '').toLowerCase().includes(q));
      const f = filter === 'all' ? true : filter === 'action' ? !!(plan.eligible && plan.ask)
        : filter === 'overdue' ? info.tone === 'red' && (info.stage === 'to_load' || info.stage === 'awaiting_payment') : info.stage === filter;
      return hit && f;
    });
    const dueKey = (r: (typeof rows)[number]) => (r.plan.next ? diffDays(today, r.plan.next.date) : 9999);
    out.sort(sort === 'due'
      ? (a, b) => (a.plan.ask ? -1 : 0) - (b.plan.ask ? -1 : 0) || dueKey(a) - dueKey(b)
      : (a, b) => String(b.c.date).localeCompare(String(a.c.date)) || String(b.c.contractNo).localeCompare(String(a.c.contractNo), undefined, { numeric: true }));
    return out;
  }, [rows, q, filter, sort, today]);

  const label: Record<Filter, string> = { all: 'All', action: 'Needs you', to_load: 'To load', awaiting_payment: 'Awaiting payment', overdue: 'Overdue', paid: 'Paid', draft: 'Draft', cancelled: 'Cancelled' };
  const visible = FILTERS.filter(f => f === 'all' || f === 'action' || f === filter || counts[f] > 0);

  return (
    <Page title="Contracts" subtitle={`${list.length} of ${rows.length} contract${rows.length === 1 ? '' : 's'}${fy === 'all' ? '' : ` · ${fy}`}`} width="wide"
      actions={<Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/contracts/new')}>New contract</Button>}>
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search number, party or product" aria-label="Search contracts" className="input-field pl-10 pr-10" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 rounded-full"><X size={16} /></button>}
        </div>
        <div className="flex gap-3">
          <select value={fy} onChange={e => setFy(e.target.value)} aria-label="Financial year" className="input-field w-auto flex-1 sm:flex-none">
            <option value="all">All years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value as 'newest' | 'due')} aria-label="Sort" className="input-field w-auto flex-1 sm:flex-none">
            <option value="newest">Newest first</option>
            <option value="due">Most urgent first</option>
          </select>
        </div>
      </div>
      <div className="mb-4">
        <Segmented<Filter> value={filter} onChange={setFilter} label="Show" options={visible.map(f => ({ value: f, label: label[f], count: f === 'all' ? undefined : counts[f] }))} />
      </div>

      {list.length === 0 ? (
        <div className="card">
          <EmptyState icon={<FileText size={24} />} title={rows.length === 0 ? 'No contracts yet' : 'No contract matches'}
            action={rows.length === 0 ? <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/contracts/new')}>Make the first contract</Button> : <Button onClick={() => { setSearch(''); setFilter('all'); }}>Clear filters</Button>}>
            {rows.length === 0 ? 'Your contracts will be listed here, with what is next for each.' : 'Try another word, or show all contracts.'}
          </EmptyState>
        </div>
      ) : (
        <>
          {/* phone and tablet: cards */}
          <ul className="lg:hidden space-y-2.5">
            {list.map(({ c, info }) => (
              <li key={c.id}>
                <button onClick={() => navigate(`/contracts/${c.id}`)} className="card w-full text-left p-4 active:bg-gray-50 flex items-start gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900">#{c.contractNo} <span className="font-normal text-gray-500">· {safeDate(c.date)}</span></span>
                      <Badge tone={info.tone}>{info.label}</Badge>
                    </span>
                    <span className="block mt-1 text-sm text-gray-800">{c.quantity} {c.quantityUnit} {c.product?.name}</span>
                    <span className="block text-sm text-gray-500 truncate">{nm(c.seller)} → {nm(c.buyer)}</span>
                    {(info.line || (c.files || []).length > 0) && <span className={`mt-1.5 flex items-center gap-2 text-xs ${info.urgent ? 'text-amber-800 font-medium' : 'text-gray-500'}`}>{info.line}{(c.files || []).length > 0 && <span className="inline-flex items-center gap-0.5 text-gray-500 font-normal"><Paperclip size={11} />{c.files!.length}</span>}</span>}
                  </span>
                  <ChevronRight size={18} className="text-gray-300 mt-1 shrink-0" />
                </button>
              </li>
            ))}
          </ul>

          {/* computer: table */}
          <div className="hidden lg:block card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-semibold">Contract</th>
                  <th className="px-4 py-3 font-semibold">Parties</th>
                  <th className="px-4 py-3 font-semibold">Goods</th>
                  <th className="px-4 py-3 font-semibold text-right">Value</th>
                  <th className="px-4 py-3 font-semibold">Stage</th>
                </tr>
              </thead>
              <tbody>
                {list.map(({ c, info }) => (
                  <tr key={c.id} onClick={() => navigate(`/contracts/${c.id}`)} className="border-b border-gray-50 last:border-0 hover:bg-rose-50/40 cursor-pointer">
                    <td className="px-4 py-3"><span className="font-semibold text-gray-900">#{c.contractNo}</span>{(c.files || []).length > 0 && <Paperclip size={11} className="inline ml-1.5 text-gray-400" />}<span className="block text-xs text-gray-500">{safeDate(c.date)}</span></td>
                    <td className="px-4 py-3 max-w-[280px]"><span className="block truncate text-gray-900">{nm(c.seller)}</span><span className="block truncate text-xs text-gray-500">→ {nm(c.buyer)}</span></td>
                    <td className="px-4 py-3"><span className="block text-gray-900">{c.product?.name}</span><span className="block text-xs text-gray-500">{c.quantity} {c.quantityUnit} @ ₹{Number(c.price || 0).toLocaleString('en-IN')}/{c.priceUnit}</span></td>
                    <td className="px-4 py-3 text-right text-gray-900">{inrShort(valueOf(c))}</td>
                    <td className="px-4 py-3"><Badge tone={info.tone}>{info.label}</Badge>{info.line && <span className={`block mt-1 text-xs ${info.urgent ? 'text-amber-800 font-medium' : 'text-gray-500'}`}>{info.line}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Page>
  );
}

function valueOf(c: Contract) { return goodsValue(c.quantity, c.quantityUnit, c.price, c.priceUnit).value; }

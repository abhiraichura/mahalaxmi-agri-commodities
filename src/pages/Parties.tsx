// src/pages/Parties.tsx
// All your parties in one searchable list (and a peek into the Gulfood directory while you search). Tap a party to see everything
// about it; editing is a button on that screen. Export, import and "select many" live under the "…" button.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, X, MoreHorizontal, Download, Upload, CheckSquare, Trash2, Check, Globe2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../hooks/useAuthStore';
import { getColData } from '../utils/firebase';
import { Page, Button, Badge, Sheet, Segmented, EmptyState, Group, Row, filterItems } from '../ui';
import type { PickItem } from '../ui';
import ExportPartyModal from '../components/ExportPartyModal';
import PartiesTabs from '../components/PartiesTabs';
import { partyName } from '../utils/normalize';
import { planFor } from '../../server/reminders/plan.js';
import { useToday } from '../reminders/useToday';
import { Party } from '../types';

type TypeFilter = 'all' | 'buyer' | 'seller';
const TINTS = ['bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800', 'bg-violet-100 text-violet-700', 'bg-teal-100 text-teal-700'];
const tint = (s: string) => TINTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

export default function Parties() {
  const navigate = useNavigate();
  const { parties, products, contracts, deleteParty, addParty } = useAppStore();
  const today = useToday();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [product, setProduct] = useState('all');
  const [menu, setMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [gulfood, setGulfood] = useState<{ id: string; companyName: string; cityState?: string; contactNumber?: string; contactPerson?: string; profile?: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // the Gulfood directory is searched too (only shown while you search)
  useEffect(() => {
    (async () => {
      try {
        const fb = await getColData('gulfood_members');
        if (fb.length) { setGulfood(fb as never); return; }
        const local = localStorage.getItem('gulfood_directory_members');
        if (local) setGulfood(JSON.parse(local));
      } catch { /* the Gulfood part is optional */ }
    })();
  }, []);

  // open deals and attention per party, in one pass over the contracts
  const signals = useMemo(() => {
    const m = new Map<string, { open: number; hot: boolean }>();
    const bump = (id: string, hot: boolean) => { if (!id) return; const x = m.get(id) || { open: 0, hot: false }; x.open++; x.hot = x.hot || hot; m.set(id, x); };
    for (const c of contracts) {
      if (c.status === 'draft' || c.status === 'cancelled') continue;
      const p = planFor(c, today);
      if (p.stage !== 'to_load' && p.stage !== 'awaiting_payment') continue;
      const hot = p.attention === 'overdue';
      bump(c.buyerId, hot && p.stage === 'awaiting_payment'); bump(c.sellerId, hot && p.stage === 'to_load');
    }
    return m;
  }, [contracts, today]);

  const items = useMemo(() => parties.map(p => ({
    p,
    pick: { id: p.id, title: partyName(p), sub: p.city, search: [p.name, p.city, p.state, p.phone, ...(p.alternatePhones || []), p.contactPerson, p.gstin, ...(p.otherContacts || []).map(c => `${c.name} ${c.phone} ${c.role}`), ...(p.productIds || []).map(id => products.find(x => x.id === id)?.name || '')].join(' ') } as PickItem,
  })), [parties, products]);

  const list = useMemo(() => {
    const hits = new Set(filterItems(items.map(i => i.pick), search).map(i => i.id));
    return items.filter(({ p }) => hits.has(p.id)
      && (type === 'all' || p.type === 'both' || p.type === type)
      && (product === 'all' || (p.productIds || []).includes(product)))
      .map(i => i.p)
      .sort((a, b) => partyName(a).localeCompare(partyName(b)));
  }, [items, search, type, product]);

  const gulfoodHits = useMemo(() => {
    const q = search.trim();
    if (q.length < 2 || type !== 'all' || product !== 'all') return [];
    const pick = gulfood.map(g => ({ id: g.id, title: g.companyName || '', sub: g.cityState, search: `${g.contactPerson || ''} ${g.contactNumber || ''} ${g.profile || ''}` }));
    const ids = new Set(filterItems(pick, q).map(x => x.id));
    return gulfood.filter(g => ids.has(g.id));
  }, [gulfood, search, type, product]);

  const groups = useMemo(() => {
    const g = new Map<string, Party[]>();
    for (const p of list) { const l = (partyName(p)[0] || '#').toUpperCase(); const k = /[A-Z]/.test(l) ? l : '#'; g.set(k, [...(g.get(k) || []), p]); }
    return [...g.entries()];
  }, [list]);

  const sortedProducts = useMemo(() => [...products].sort((a, b) => (a.name || '').localeCompare(b.name || '')), [products]);
  const exportRows = useMemo(() => parties.map(p => ({ id: p.id, name: partyName(p), type: p.type, phone: p.phone, contactPerson: p.contactPerson || '', city: p.city, products: (p.productIds || []).map(id => products.find(x => x.id === id)?.name || '').filter(Boolean) })), [parties, products]);

  const cancelSelect = () => { setSelecting(false); setPicked([]); setDeleteStep(0); };
  const toggle = (id: string) => setPicked(a => (a.includes(id) ? a.filter(x => x !== id) : [...a, id]));
  const doDelete = async () => {
    const t = toast.loading('Deleting…');
    try { for (const id of picked) await deleteParty(id); toast.success(`Deleted ${picked.length} part${picked.length === 1 ? 'y' : 'ies'}`, { id: t }); cancelSelect(); }
    catch { toast.error('Could not delete them all. Try again.', { id: t }); setDeleteStep(0); }
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const lines = String(ev.target?.result || '').split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('The CSV file is empty'); return; }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        if (!row['Legal Name']) continue;
        const now = new Date().toISOString();
        const party: Party = {
          id: row['ID'] || crypto.randomUUID(), legalName: row['Legal Name'], name: row['Display Name'] || row['Legal Name'], gstin: row['GSTIN'] || '',
          type: (['buyer', 'seller', 'both'].includes(row['Type']) ? row['Type'] : 'both') as Party['type'], address: row['Address'] || '', city: row['City'] || '', state: row['State'] || 'Gujarat', pincode: row['Pincode'] || '',
          phone: row['Phone'] || '', email: row['Email'] || '', pan: row['PAN'] || '', productIds: [], contactPerson: row['Contact Person'] || '',
          alternatePhones: row['Alternate Phones'] ? row['Alternate Phones'].split(';').map(s => s.trim()).filter(Boolean) : [],
          alternateEmails: row['Alternate Emails'] ? row['Alternate Emails'].split(';').map(s => s.trim()).filter(Boolean) : [], otherContacts: [], notes: row['Notes'] || '', createdAt: now, updatedAt: now,
        };
        try { await addParty(party); count++; } catch (err) { console.error('Import error:', err); }
      }
      toast.success(`Imported ${count} part${count === 1 ? 'y' : 'ies'}`);
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <Page title="Parties" subtitle={`${parties.length} part${parties.length === 1 ? 'y' : 'ies'} saved`} width="default"
      actions={selecting ? (
        <>
          <Button onClick={cancelSelect} icon={<X size={16} />}>Cancel</Button>
          {picked.length > 0 && <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setDeleteStep(1)}>Delete {picked.length}</Button>}
        </>
      ) : (
        <>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/parties/new')}>New party</Button>
          <Button aria-label="More: export, import, select" className="!px-3" icon={<MoreHorizontal size={18} />} onClick={() => setMenu(true)} />
        </>
      )}>
      <PartiesTabs />
      <input ref={fileRef} type="file" accept=".csv" onChange={importCSV} className="hidden" aria-label="Import parties from a CSV file" />

      {/* search + filters */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, city, phone or GSTIN" aria-label="Search parties" className="input-field pl-10 pr-10" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 rounded-full"><X size={16} /></button>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<TypeFilter> value={type} onChange={setType} label="Party type" options={[{ value: 'all', label: 'All' }, { value: 'buyer', label: 'Buyers' }, { value: 'seller', label: 'Sellers' }]} />
          {sortedProducts.length > 0 && (
            <select value={product} onChange={e => setProduct(e.target.value)} aria-label="Filter by product" className="input-field !w-auto !py-2 !rounded-xl text-[13px] font-semibold">
              <option value="all">All products</option>
              {sortedProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <span className="text-xs text-gray-500 ml-auto">{list.length === parties.length ? '' : `${list.length} of ${parties.length}`}</span>
        </div>
      </div>

      {/* the list, A to Z */}
      {parties.length === 0 ? (
        <div className="card"><EmptyState icon={<Users size={24} />} title="No parties yet" action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/parties/new')}>Add the first party</Button>}>Buyers and sellers you deal with will be listed here.</EmptyState></div>
      ) : list.length === 0 ? (
        <div className="card"><EmptyState icon={<Search size={24} />} title="No party matches" action={<Button onClick={() => { setSearch(''); setType('all'); setProduct('all'); }}>Clear search</Button>}>Try fewer words, a phone number or the city.</EmptyState></div>
      ) : (
        <div className="space-y-4">
          {groups.map(([letter, ps]) => (
            <section key={letter} aria-label={`Parties starting with ${letter}`}>
              <h2 className="section-label px-1 mb-1.5">{letter}</h2>
              <div className="group-list">
                {ps.map(p => {
                  const sig = signals.get(p.id);
                  const checked = picked.includes(p.id);
                  const body = (
                    <>
                      {selecting && <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-rose-700 border-rose-700 text-white' : 'border-gray-300'}`}>{checked && <Check size={14} strokeWidth={3} />}</span>}
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0 ${tint(partyName(p))}`}>{(partyName(p)[0] || '?').toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-gray-900 truncate">{partyName(p)}</span>
                        <span className="block text-xs text-gray-500 truncate">{[p.city, p.phone].filter(Boolean).join(' · ') || 'No details yet'}</span>
                      </span>
                      <span className="hidden lg:flex flex-wrap gap-1 justify-end max-w-[220px]">{(p.productIds || []).slice(0, 2).map(id => { const n = products.find(x => x.id === id)?.name; return n ? <Badge key={id}>{n}</Badge> : null; })}</span>
                      {sig && <Badge tone={sig.hot ? 'red' : 'amber'}>{sig.open} open</Badge>}
                      <Badge tone={p.type === 'buyer' ? 'blue' : p.type === 'seller' ? 'green' : 'violet'} className="hidden sm:inline-flex">{p.type === 'both' ? 'Both' : p.type === 'buyer' ? 'Buyer' : 'Seller'}</Badge>
                    </>
                  );
                  return selecting
                    ? <button key={p.id} type="button" onClick={() => toggle(p.id)} className="row w-full text-left">{body}</button>
                    : <Link key={p.id} to={`/parties/${p.id}`} className="row">{body}</Link>;
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* a peek into the Gulfood directory */}
      {gulfoodHits.length > 0 && (
        <section className="mt-6" aria-label="Gulfood directory matches">
          <div className="flex items-center justify-between mb-1.5 px-1"><h2 className="section-label flex items-center gap-1.5"><Globe2 size={13} />Also in the Gulfood directory · {gulfoodHits.length}</h2><Link to="/parties/gulfood" className="text-xs font-semibold text-rose-700">Open</Link></div>
          <Group>
            {gulfoodHits.slice(0, 5).map(g => <Row key={g.id} to="/parties/gulfood" title={g.companyName} sub={[g.cityState, g.contactPerson, g.contactNumber].filter(Boolean).join(' · ')} />)}
          </Group>
        </section>
      )}

      {selecting && picked.length > 0 && <p className="mt-4 text-center text-xs text-gray-500">{picked.length} selected</p>}

      {/* … menu */}
      <Sheet open={menu} onClose={() => setMenu(false)} title="Parties">
        <Group>
          <Row icon={<CheckSquare size={18} />} title="Select several" sub="Tick parties to delete them together" onClick={() => { setMenu(false); setSelecting(true); }} />
          <Row icon={<Download size={18} />} title="Export" sub="A PDF list, by product or type" onClick={() => { setMenu(false); setExporting(true); }} />
          <Row icon={<Upload size={18} />} title="Import from a CSV file" sub="Columns: Legal Name, City, Phone, GSTIN …" onClick={() => { setMenu(false); fileRef.current?.click(); }} />
          <Row icon={<Globe2 size={18} />} title="Gulfood directory" sub="Contacts met at Gulfood" to="/parties/gulfood" />
        </Group>
      </Sheet>
      <ExportPartyModal isOpen={exporting} onClose={() => setExporting(false)} parties={exportRows} />

      {/* two-step delete */}
      <Sheet open={deleteStep > 0} onClose={() => setDeleteStep(0)} title={deleteStep === 1 ? `Delete ${picked.length} part${picked.length === 1 ? 'y' : 'ies'}?` : 'Last check'}
        footer={<div className="flex gap-2"><Button className="flex-1" onClick={() => setDeleteStep(0)}>Keep them</Button>
          {deleteStep === 1 ? <Button variant="danger" className="flex-1" onClick={() => setDeleteStep(2)}>Continue</Button> : <Button variant="danger" className="flex-1" icon={<Trash2 size={16} />} onClick={doDelete}>Delete for good</Button>}</div>}>
        {deleteStep === 1
          ? <p className="text-sm text-gray-700">The selected parties will be removed from your list. Contracts already made keep their own copy of the party details.</p>
          : <p className="text-sm text-red-700 font-medium">This cannot be undone. {picked.length} part{picked.length === 1 ? 'y' : 'ies'} will be deleted.</p>}
      </Sheet>
    </Page>
  );
}

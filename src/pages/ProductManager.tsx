// src/pages/ProductManager.tsx
// Products: the usual brokerage and the quality / specification sheets that go onto contracts.
//  - "Quick add": type a name, pick the brokerage, press Add. A product exists in two taps; details can come later.
//  - Tap a product to change anything: brokerage per side, qualities and their specs (with one-tap spec suggestions).
import { useMemo, useState } from 'react';
import { ChevronRight, Copy, Package, Plus, Search, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '../hooks/useAuthStore';
import type { BrokerageConfig, ProductSpec, Quality, SpecField } from '../types';
import { Page, Button, EmptyState, Segmented, Sheet, Field, Badge, filterItems } from '../ui';
import type { PickItem } from '../ui';
import { productBrokerageDefaults } from '../billing/calc';
import { inrFull } from '../ui/format';

type Kind = 'percent' | 'fixed';
interface Side { type: Kind; value: string }
interface Draft { id?: string; name: string; same: boolean; buyer: Side; seller: Side; qualities: Quality[] }

const PRESETS = ['0.25', '0.5', '1', '1.5', '2'];
const SPEC_IDEAS = ['Purity', 'Moisture', 'Oil content', 'Foreign matter', 'Admixture', 'Damage', 'FFA', 'Colour', 'Size', 'Packing'];
const TINTS = ['bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800', 'bg-violet-100 text-violet-700', 'bg-teal-100 text-teal-700'];
const tint = (s: string) => TINTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

const sideOf = (c: BrokerageConfig): Side => ({ type: c.type, value: c.value ? String(c.value) : '' });
const sideText = (c: BrokerageConfig) => (c.type === 'fixed' ? `${inrFull(c.value)} fixed` : `${c.value}%`);
const num = (s: string) => { const n = parseFloat(s); return isFinite(n) && n > 0 ? n : 0; };
const blankSpec = (order: number, label = ''): SpecField => ({ id: uuidv4(), label, value: '', unit: '', order });

function draftOf(p: ProductSpec): Draft {
  const b = productBrokerageDefaults(p);
  // old products may only have loose "specs": show them as one quality
  const qualities = p.qualities?.length ? p.qualities : p.specs?.length ? [{ id: uuidv4(), name: 'Standard', specs: p.specs }] : [];
  const same = b.buyer.type === b.seller.type && b.buyer.value === b.seller.value;
  return { id: p.id, name: p.name, same, buyer: sideOf(b.buyer), seller: sideOf(b.seller), qualities };
}

export default function ProductManager() {
  const { products, contracts, addProduct, updateProduct, deleteProduct } = useAppStore();
  const [query, setQuery] = useState('');
  const [quickName, setQuickName] = useState('');
  const [preset, setPreset] = useState<string>('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // what you use most often becomes the one-tap choice
  const usual = useMemo(() => {
    const tally = new Map<string, number>();
    for (const p of products) { const b = productBrokerageDefaults(p).buyer; if (b.type === 'percent' && b.value) tally.set(String(b.value), (tally.get(String(b.value)) || 0) + 1); }
    return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '0.5';
  }, [products]);
  const chosen = preset || usual;
  const presets = useMemo(() => [...new Set([...PRESETS, usual])].sort((a, b) => Number(a) - Number(b)), [usual]);

  // deals per product, and the latest rate
  const usage = useMemo(() => {
    const m = new Map<string, { n: number; last?: { date: string; price: number; unit: string } }>();
    for (const c of contracts) {
      if (!c.productId) continue;
      const u = m.get(c.productId) || { n: 0 };
      u.n++;
      if (c.status !== 'cancelled' && (!u.last || String(c.date) > u.last.date)) u.last = { date: String(c.date), price: Number(c.price) || 0, unit: c.priceUnit || 'KG' };
      m.set(c.productId, u);
    }
    return m;
  }, [contracts]);

  const shown = useMemo(() => {
    const items: PickItem[] = products.map(p => ({ id: p.id, title: p.name || '', search: (p.qualities || []).map(q => q.name).join(' ') }));
    const hit = new Set(filterItems(items, query).map(i => i.id));
    return products.filter(p => hit.has(p.id)).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [products, query]);

  const exists = (name: string, exceptId?: string) => products.some(p => p.id !== exceptId && String(p.name || '').trim().toLowerCase() === name.trim().toLowerCase());

  const payloadOf = (d: Draft): ProductSpec => {
    const buyer = { type: d.buyer.type, value: num(d.buyer.value) };
    const seller = d.same ? { ...buyer } : { type: d.seller.type, value: num(d.seller.value) };
    const old = d.id ? products.find(p => p.id === d.id) : undefined;
    return {
      id: d.id || uuidv4(),
      name: d.name.trim(),
      qualities: d.qualities.filter(q => q.name.trim()).map(q => ({ ...q, name: q.name.trim(), specs: q.specs.filter(s => s.label.trim()).map((s, i) => ({ ...s, order: i })) })),
      specs: [], // old field, kept empty
      defaultBrokerage: buyer.type === 'percent' ? buyer.value : 0,
      brokerage: {
        buyer, seller,
        buyerPercent: buyer.type === 'percent' ? buyer.value : 0, buyerFixed: buyer.type === 'fixed' ? buyer.value : 0,
        sellerPercent: seller.type === 'percent' ? seller.value : 0, sellerFixed: seller.type === 'fixed' ? seller.value : 0,
      },
      createdAt: old?.createdAt ?? new Date().toISOString(),
    };
  };

  /* ---- quick add */
  const quickAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = quickName.trim();
    if (!name) { toast.error('Type the product name first'); return; }
    if (exists(name)) { toast.error(`${name} is already in your products`); return; }
    const side: Side = { type: 'percent', value: chosen };
    try {
      await addProduct(payloadOf({ name, same: true, buyer: side, seller: side, qualities: [] }));
      setQuickName('');
      toast.success(`${name} added`);
    } catch { toast.error('Could not save. Check your connection.'); }
  };
  const quickMore = () => {
    const side: Side = { type: 'percent', value: chosen };
    setConfirmDelete(false);
    setDraft({ name: quickName.trim(), same: true, buyer: side, seller: side, qualities: [] });
  };

  /* ---- full editor */
  const open = (p: ProductSpec) => { setConfirmDelete(false); setDraft(draftOf(p)); };
  const patch = (f: Partial<Draft>) => setDraft(d => (d ? { ...d, ...f } : d));
  const setSide = (which: 'buyer' | 'seller', f: Partial<Side>) => setDraft(d => (d ? { ...d, [which]: { ...d[which], ...f }, ...(d.same && which === 'buyer' ? { seller: { ...d.seller, ...f } } : {}) } : d));
  const setQ = (id: string, f: Partial<Quality>) => setDraft(d => (d ? { ...d, qualities: d.qualities.map(q => (q.id === id ? { ...q, ...f } : q)) } : d));
  const setSpec = (qid: string, i: number, f: Partial<SpecField>) => setDraft(d => (d ? { ...d, qualities: d.qualities.map(q => (q.id === qid ? { ...q, specs: q.specs.map((s, j) => (j === i ? { ...s, ...f } : s)) } : q)) } : d));
  const addSpec = (qid: string, label = '') => setDraft(d => (d ? { ...d, qualities: d.qualities.map(q => (q.id === qid ? { ...q, specs: [...q.specs.filter(s => s.label.trim() || s.value.trim() || s.unit.trim()), blankSpec(q.specs.length, label)] } : q)) } : d));
  const delSpec = (qid: string, i: number) => setDraft(d => (d ? { ...d, qualities: d.qualities.map(q => (q.id === qid ? { ...q, specs: q.specs.filter((_, j) => j !== i) } : q)) } : d));
  const addQuality = () => setDraft(d => (d ? { ...d, qualities: [...d.qualities, { id: uuidv4(), name: '', specs: [blankSpec(0)] }] } : d));

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { toast.error('Product name required'); return; }
    if (exists(draft.name, draft.id)) { toast.error(`${draft.name.trim()} is already in your products`); return; }
    setSaving(true);
    try {
      const payload = payloadOf(draft);
      if (draft.id) { await updateProduct(draft.id, payload); toast.success('Product updated'); }
      else { await addProduct(payload); toast.success('Product added'); setQuickName(''); }
      setDraft(null);
    } catch { toast.error('Could not save. Check your connection.'); }
    finally { setSaving(false); }
  };
  const duplicate = () => {
    if (!draft) return;
    setDraft({ ...draft, id: undefined, name: `${draft.name} copy`, qualities: draft.qualities.map(q => ({ ...q, id: uuidv4(), specs: q.specs.map(s => ({ ...s, id: uuidv4() })) })) });
    toast('Copy ready. Change the name and save.', { icon: '📄' });
  };
  const remove = async () => {
    if (!draft?.id) return;
    try { await deleteProduct(draft.id); toast.success('Deleted'); setDraft(null); }
    catch { toast.error('Could not delete. Try again.'); }
  };

  const sideEditor = (which: 'buyer' | 'seller', label: string) => {
    if (!draft) return null;
    const s = draft[which];
    return (
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1.5">{label}</p>
        <div className="flex items-center gap-2">
          <Segmented<Kind> value={s.type} onChange={t => setSide(which, { type: t })} label={`${label} type`} options={[{ value: 'percent', label: '%' }, { value: 'fixed', label: 'Rs. fixed' }]} />
          <input type="number" min="0" step={s.type === 'percent' ? '0.01' : '1'} inputMode="decimal" value={s.value} aria-label={`${label} amount`}
            onChange={e => setSide(which, { value: e.target.value })} placeholder={s.type === 'percent' ? 'e.g. 0.5' : 'e.g. 500'} className="input-field !py-2 flex-1 min-w-0" />
        </div>
      </div>
    );
  };

  const used = draft?.id ? usage.get(draft.id)?.n || 0 : 0;

  return (
    <Page title="Products" subtitle="Usual brokerage and quality sheets. Add one in seconds, fill in the rest when you need it."
      width="default">
      {/* quick add */}
      <form onSubmit={quickAdd} className="card p-3.5 sm:p-4 mb-4" aria-label="Quick add a product">
        <div className="flex gap-2">
          <input value={quickName} onChange={e => setQuickName(e.target.value)} placeholder="New product, e.g. Cumin Seeds" aria-label="New product name" className="input-field flex-1 min-w-0" />
          <Button type="submit" variant="primary" icon={<Plus size={16} />}>Add</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-xs text-gray-500">Brokerage on each side</span>
          <Segmented<string> value={chosen} onChange={setPreset} label="Brokerage percentage" options={presets.map(v => ({ value: v, label: `${v}%` }))} />
          <button type="button" onClick={quickMore} className="ml-auto text-[13px] font-semibold text-rose-700 min-h-[36px] px-1">More options</button>
        </div>
      </form>

      {/* the list */}
      {products.length > 6 && (
        <div className="relative mb-3">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products" aria-label="Search products" className="input-field pl-10 pr-10" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400"><X size={16} /></button>}
        </div>
      )}
      {products.length === 0 ? (
        <div className="card"><EmptyState icon={<Package size={24} />} title="No products yet">Type a name above and press Add. Brokerage, qualities and specifications can be filled in later.</EmptyState></div>
      ) : shown.length === 0 ? (
        <div className="card"><EmptyState icon={<Search size={24} />} title="No product matches" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {shown.map(p => {
            const b = productBrokerageDefaults(p);
            const u = usage.get(p.id);
            const nq = p.qualities?.length || 0;
            return (
              <button key={p.id} type="button" onClick={() => open(p)} aria-label={`Open ${p.name}`} className="card p-3.5 flex items-center gap-3 text-left active:scale-[0.99] transition-transform">
                <span className={`w-11 h-11 rounded-2xl flex items-center justify-center text-[17px] font-bold shrink-0 ${tint(p.name || '?')}`}>{(p.name || '?')[0].toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-gray-900 truncate">{p.name}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone="blue">Buyer {sideText(b.buyer)}</Badge>
                    <Badge tone="green">Seller {sideText(b.seller)}</Badge>
                  </span>
                  <span className="block text-xs text-gray-500 mt-1.5 truncate">
                    {nq ? `${nq} quality sheet${nq > 1 ? 's' : ''}` : 'No quality sheet'}
                    {u ? ` · ${u.n} deal${u.n > 1 ? 's' : ''}` : ''}
                    {u?.last && u.last.price ? ` · last Rs. ${u.last.price.toLocaleString('en-IN')} per ${u.last.unit}` : ''}
                  </span>
                </span>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* full editor */}
      <Sheet open={!!draft} onClose={() => setDraft(null)} wide title={draft?.id ? 'Edit product' : 'New product'}
        footer={draft && (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setDraft(null)}>Cancel</Button>
            <Button variant="primary" className="flex-[2]" loading={saving} onClick={save}>{draft.id ? 'Save changes' : 'Add product'}</Button>
          </div>
        )}>
        {draft && (
          <div className="space-y-5">
            <Field label="Product name">
              <input value={draft.name} onChange={e => patch({ name: e.target.value })} placeholder="e.g. Coriander Seeds" className="input-field" autoFocus={!draft.id} />
            </Field>

            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="section-label px-1">Brokerage</h3>
                <label className="flex items-center gap-2 text-[13px] text-gray-700 min-h-[36px]">
                  <input type="checkbox" checked={draft.same} className="w-4 h-4 accent-rose-700"
                    onChange={e => patch({ same: e.target.checked, ...(e.target.checked ? { seller: { ...draft.buyer } } : {}) })} />
                  Same for buyer and seller
                </label>
              </div>
              <div className="space-y-3 rounded-2xl bg-black/[0.035] p-3">
                {sideEditor('buyer', draft.same ? 'Each side' : 'Buyer pays')}
                {!draft.same && sideEditor('seller', 'Seller pays')}
              </div>
              <p className="text-xs text-gray-500 mt-1.5 px-1">A percentage is of the goods value; a fixed amount is per contract. You can still change it on any contract.</p>
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="section-label px-1">Quality sheets</h3>
                <Button size="sm" variant="soft" icon={<Plus size={15} />} onClick={addQuality}>Add quality</Button>
              </div>
              {draft.qualities.length === 0 && <p className="text-sm text-gray-500 px-1">None yet. Add a quality (like Z-black or Semi) to print its specifications on contracts.</p>}
              <div className="space-y-3">
                {draft.qualities.map(q => (
                  <div key={q.id} className="rounded-2xl bg-black/[0.035] p-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <input value={q.name} onChange={e => setQ(q.id, { name: e.target.value })} placeholder="Quality name (e.g. Z-black, Semi)" aria-label="Quality name" className="input-field flex-1 min-w-0 font-semibold" />
                      <button type="button" aria-label="Remove this quality" onClick={() => setDraft(d => (d ? { ...d, qualities: d.qualities.filter(x => x.id !== q.id) } : d))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 rounded-xl"><Trash2 size={16} /></button>
                    </div>
                    {q.specs.map((s, i) => (
                      <div key={s.id} className="flex gap-2 items-center">
                        <input value={s.label} onChange={e => setSpec(q.id, i, { label: e.target.value })} placeholder="Label" aria-label="Specification label" className="input-field !py-2 flex-[3] min-w-0" />
                        <input value={s.value} onChange={e => setSpec(q.id, i, { value: e.target.value })} placeholder="Value" aria-label="Specification value" className="input-field !py-2 flex-[2] min-w-0" />
                        <input value={s.unit} onChange={e => setSpec(q.id, i, { unit: e.target.value })} placeholder="Unit" aria-label="Specification unit" className="input-field !py-2 flex-1 min-w-0" />
                        <button type="button" aria-label="Remove this specification" onClick={() => delSpec(q.id, i)} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-600 rounded-xl shrink-0"><X size={16} /></button>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {SPEC_IDEAS.filter(x => !q.specs.some(s => s.label.trim().toLowerCase() === x.toLowerCase())).slice(0, 6).map(x => (
                        <button key={x} type="button" onClick={() => addSpec(q.id, x)} className="chip bg-white text-gray-700 ring-1 ring-black/10 min-h-[30px] hover:bg-rose-50">+ {x}</button>
                      ))}
                      <button type="button" onClick={() => addSpec(q.id)} className="chip bg-white text-rose-700 ring-1 ring-black/10 min-h-[30px]">+ Other</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {draft.id && (
              <section className="flex flex-wrap items-center gap-2 pt-1">
                <Button size="sm" icon={<Copy size={14} />} onClick={duplicate}>Duplicate</Button>
                {!confirmDelete
                  ? <Button size="sm" variant="ghost" className="!text-red-600" icon={<Trash2 size={14} />} onClick={() => setConfirmDelete(true)}>Delete</Button>
                  : (
                    <span className="flex items-center gap-2 text-sm">
                      <span className="text-red-700">{used ? `Used in ${used} contract${used > 1 ? 's' : ''}; they keep their own copy.` : 'Delete this product?'}</span>
                      <Button size="sm" variant="danger" onClick={remove}>Yes, delete</Button>
                      <Button size="sm" onClick={() => setConfirmDelete(false)}>Keep</Button>
                    </span>
                  )}
              </section>
            )}
          </div>
        )}
      </Sheet>
    </Page>
  );
}

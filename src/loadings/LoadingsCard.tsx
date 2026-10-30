// src/loadings/LoadingsCard.tsx
// Loading in parts: add each truck as it goes, see how much of the contract is loaded, and mark the contract loaded when it is all there.
import { useState } from 'react';
import { Check, Plus, Trash2, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Sheet } from '../ui';
import { useAppStore } from '../hooks/useAuthStore';
import { fmtDay } from '../../server/reminders/plan.js';
import { loadedUpdate } from '../reminders/actions';
import { addLoading, changeLoading, loadingsOf, progress, removeLoading } from './model';
import type { Contract, Loading } from '../types';

export default function LoadingsCard({ contract, today, open }: { contract: Contract; today: string; open: boolean }) {
  const { updateContract } = useAppStore();
  const ls = loadingsOf(contract);
  const p = progress(contract);
  const unit = contract.quantityUnit || '';
  const [sheet, setSheet] = useState<null | { edit?: Loading }>(null);
  const [date, setDate] = useState(today);
  const [qty, setQty] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [note, setNote] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  // only worth showing while goods are still to be loaded, or when parts have been written down
  if (!open && ls.length === 0) return null;

  const openAdd = () => { setDate(today); setQty(p.remaining > 0 ? String(p.remaining) : ''); setVehicle(''); setNote(''); setConfirmDel(false); setSheet({}); };
  const openEdit = (l: Loading) => { setDate(l.date); setQty(String(l.qty)); setVehicle(l.vehicle || ''); setNote(l.note || ''); setConfirmDel(false); setSheet({ edit: l }); };
  const q = Number(qty);
  const valid = Number.isFinite(q) && q > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const upd = sheet?.edit ? changeLoading(contract, sheet.edit.id, { date, qty: q, vehicle, note }) : addLoading(contract, { date, qty: q, vehicle, note });
      await updateContract(contract.id, upd);
      toast.success(sheet?.edit ? 'Loading updated' : 'Loading added');
      setSheet(null);
    } catch { toast.error('Could not save. Try again.'); }
    setBusy(false);
  };
  const del = async () => {
    if (!sheet?.edit) return;
    setBusy(true);
    try { await updateContract(contract.id, removeLoading(contract, sheet.edit.id, today)); toast.success('Removed'); setSheet(null); }
    catch { toast.error('Could not remove. Try again.'); }
    setBusy(false);
  };
  const markLoaded = async () => {
    try { await updateContract(contract.id, loadedUpdate(contract, p.lastDate || today)); toast.success('Marked as loaded'); }
    catch { toast.error('Could not save. Try again.'); }
  };

  const newTotal = (sheet?.edit ? p.loaded - sheet.edit.qty : p.loaded) + (valid ? q : 0);
  const overWarn = valid && contract.quantity > 0 && newTotal > contract.quantity * 1.02;

  return (
    <section className="card p-4 sm:p-5" aria-label="Loadings">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-label flex items-center gap-1.5"><Truck size={14} />Loadings</h2>
        <Button size="sm" variant="soft" icon={<Plus size={15} />} onClick={openAdd}>Add loading</Button>
      </div>
      <p className="mt-2 text-sm text-gray-800"><b>{p.loaded}</b> of {p.total} {unit} loaded{p.remaining > 0 && ls.length > 0 ? <span className="text-gray-500"> · {p.remaining} {unit} to go</span> : null}</p>
      <div className="mt-2 h-2 rounded-full bg-black/[0.07] overflow-hidden" role="progressbar" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Loaded so far">
        <div className={`h-full rounded-full transition-all ${p.over ? 'bg-amber-500' : p.done ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${p.pct}%` }} />
      </div>
      {p.over && <p className="mt-2 text-xs text-amber-800">More than the contract quantity has been written down. Check the entries.</p>}

      {ls.length > 0 && (
        <ul className="mt-3 divide-y divide-black/5">
          {ls.map(l => (
            <li key={l.id}>
              <button type="button" onClick={() => openEdit(l)} aria-label={`Change loading of ${l.qty} ${unit} on ${fmtDay(l.date)}`} className="w-full flex items-center gap-3 py-2.5 text-left min-h-[48px]">
                <span className="w-9 h-9 rounded-[10px] bg-sky-50 text-sky-700 flex items-center justify-center shrink-0"><Truck size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-900">{l.qty} {unit} · {fmtDay(l.date)}</span>
                  {(l.vehicle || l.note) && <span className="block text-xs text-gray-500 truncate">{[l.vehicle, l.note].filter(Boolean).join(' · ')}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {p.done && !contract.loadedOn && (
        <div className="mt-3 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 p-3 flex flex-wrap items-center gap-3" role="status">
          <p className="text-sm text-emerald-900 flex-1 min-w-[12rem]">The full {p.total} {unit} is loaded. Mark the contract as loaded{p.lastDate ? ` on ${fmtDay(p.lastDate)}` : ''}? Payment reminders start from that day.</p>
          <Button size="sm" variant="success" icon={<Check size={15} />} onClick={markLoaded}>Yes, mark loaded</Button>
        </div>
      )}
      {ls.length > 0 && !p.done && !contract.loadedOn && <p className="mt-3 text-xs text-gray-500">The contract stays &ldquo;to be loaded&rdquo; (and the loading reminders continue) until all of it is loaded.</p>}

      <Sheet open={!!sheet} onClose={() => setSheet(null)} title={sheet?.edit ? 'Change loading' : 'Add loading'}
        footer={(
          <div className="flex items-center gap-2">
            {sheet?.edit && (confirmDel
              ? <><Button variant="danger" size="sm" loading={busy} onClick={del}>Yes, remove</Button><Button size="sm" onClick={() => setConfirmDel(false)}>Keep</Button></>
              : <Button variant="ghost" size="sm" className="!text-red-600" icon={<Trash2 size={15} />} onClick={() => setConfirmDel(true)} aria-label="Remove this loading">Remove</Button>)}
            <span className="flex-1" />
            <Button onClick={() => setSheet(null)}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={!valid} onClick={save}>{sheet?.edit ? 'Save' : 'Add'}</Button>
          </div>
        )}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Day loaded"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" aria-label="Day loaded" /></Field>
            <Field label={`Quantity (${unit})`}><input inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} className="input-field" aria-label="Quantity loaded" placeholder="0" /></Field>
          </div>
          <Field label="Truck number (optional)"><input value={vehicle} onChange={e => setVehicle(e.target.value.toUpperCase())} className="input-field" aria-label="Truck number" placeholder="GJ 03 AB 1234" /></Field>
          <Field label="Note (optional)"><input value={note} onChange={e => setNote(e.target.value)} className="input-field" aria-label="Loading note" placeholder="e.g. weighment slip number" /></Field>
          {overWarn && <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3">That makes {Math.round(newTotal * 1000) / 1000} {unit}, more than the contract&rsquo;s {contract.quantity} {unit}.</p>}
        </div>
      </Sheet>
    </section>
  );
}

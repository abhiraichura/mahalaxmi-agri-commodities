// Under "Documents" on the contract page: tells you when the printed note and the contract say different things (and lets you
// settle it in one tap), and when a party's details were changed after the contract was made.
import { useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import toast from 'react-hot-toast';
import { CheckCircle2, GitCompare, UserCog } from 'lucide-react';
import { Contract, Party } from '../types';
import { useAppStore } from '../hooks/useAuthStore';
import { Button } from '../ui';
import { todayIST } from '../../server/reminders/plan.js';
import { applyOverrides, decodeOverrides, encodeOverrides, noteValuesFromContract } from './mapping';
import { labelOf, noteDiffs, reconcileOverrides, showValue, splitEdits } from './writeback';

const FIELDS: { key: keyof Party; label: string }[] = [
  { key: 'legalName', label: 'name' }, { key: 'address', label: 'address' }, { key: 'city', label: 'city' }, { key: 'state', label: 'state' }, { key: 'pincode', label: 'pincode' }, { key: 'gstin', label: 'GSTIN' },
];
const same = (a: unknown, b: unknown) => String(a || '').trim() === String(b || '').trim();

export default function NoteSync({ contract, onOpen }: { contract: Contract; onOpen: () => void }) {
  const { parties, settings, updateContract } = useAppStore();
  const gst = { defaultGstPercent: settings.defaultGstPercent };
  const [busy, setBusy] = useState(false);
  const diffs = useMemo(() => noteDiffs(contract, gst), [contract, settings.defaultGstPercent]); // eslint-disable-line react-hooks/exhaustive-deps

  // parties changed after the contract was made
  const partyChanges = useMemo(() => {
    const out: { side: 'buyer' | 'seller'; live: Party; what: string[] }[] = [];
    for (const side of ['buyer', 'seller'] as const) {
      const live = parties.find(p => p.id === (side === 'buyer' ? contract.buyerId : contract.sellerId));
      if (!live) continue;
      const snap = contract[side];
      const what = FIELDS.filter(f => !same(f.key === 'legalName' ? (live.legalName || live.name) : live[f.key], f.key === 'legalName' ? (snap.legalName || snap.name) : snap[f.key])).map(f => f.label);
      if (what.length) out.push({ side, live, what });
    }
    return out;
  }, [contract, parties]);

  const act = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save. Try again.'); } finally { setBusy(false); }
  };

  const useContract = () => act(() => updateContract(contract.id, { noteOverrides: {} }), 'The note now follows the contract');
  const useNote = () => act(async () => {
    const edited = applyOverrides(noteValuesFromContract(contract, gst), decodeOverrides(contract.noteOverrides));
    const { patch, overrides, moved } = splitEdits(contract, edited, gst);
    const text = `Contract updated from the contract note: ${[...new Set(moved.map(labelOf))].join(', ')}`;
    await updateContract(contract.id, { ...patch, noteOverrides: encodeOverrides(overrides), ...(moved.length ? { timeline: [...(contract.timeline || []), { id: uuid(), type: 'note' as const, date: todayIST(), text, at: Date.now() }] } : {}) });
  }, 'The contract now matches the note');
  const refreshParties = () => act(async () => {
    const patch: Partial<Contract> = {};
    for (const c of partyChanges) patch[c.side] = { ...c.live };
    const after = { ...contract, ...patch } as Contract;
    const keep = reconcileOverrides(contract, after, gst);
    const names = partyChanges.map(c => `${c.side} (${c.what.join(', ')})`).join('; ');
    await updateContract(contract.id, { ...patch, ...(keep ? { noteOverrides: keep } : {}), timeline: [...(contract.timeline || []), { id: uuid(), type: 'note' as const, date: todayIST(), text: `Party details refreshed from Parties: ${names}`, at: Date.now() }] });
  }, 'Party details updated in this contract');

  const movable = diffs.filter(d => d.movable);

  return (
    <div className="space-y-3 mb-3">
      {partyChanges.length > 0 && (
        <div className="rounded-2xl bg-sky-50 ring-1 ring-sky-100 p-3.5 text-sm text-sky-900" role="status">
          <p className="font-semibold flex items-center gap-1.5"><UserCog size={16} />A party's details changed after this contract was made</p>
          <p className="mt-1 text-[13px]">{partyChanges.map(c => `${c.side === 'buyer' ? 'Buyer' : 'Seller'} ${c.live.legalName || c.live.name}: ${c.what.join(', ')}`).join(' · ')}. The printed notes still show the old details.</p>
          <div className="mt-2.5 flex flex-wrap gap-2"><Button size="sm" variant="primary" loading={busy} onClick={refreshParties}>Update this contract</Button><span className="self-center text-xs text-sky-800/80">Or leave it if the old details are what was agreed.</span></div>
        </div>
      )}
      {diffs.length > 0 ? (
        <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-100 p-3.5 text-sm text-amber-950" role="status">
          <p className="font-semibold flex items-center gap-1.5"><GitCompare size={16} />The printed note differs from the contract</p>
          <ul className="mt-2 space-y-1 text-[13px]">
            {diffs.slice(0, 6).map(d => (
              <li key={d.key}><span className="font-medium">{d.label}:</span> contract <span className="font-mono text-[12px]">{showValue(d.key, d.contract)}</span> · note <span className="font-mono text-[12px]">{showValue(d.key, d.note)}</span>{!d.movable && <span className="text-amber-800/70"> (wording only on the note)</span>}</li>
            ))}
            {diffs.length > 6 && <li className="text-amber-800/80">…and {diffs.length - 6} more</li>}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="primary" loading={busy} onClick={useContract}>Use the contract's values</Button>
            {movable.length > 0 && <Button size="sm" loading={busy} onClick={useNote}>Update the contract from the note</Button>}
            <Button size="sm" variant="ghost" onClick={onOpen}>Review</Button>
          </div>
        </div>
      ) : partyChanges.length === 0 && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" />The notes match the contract.</p>
      )}
    </div>
  );
}

// src/broadcast/ContactSheet.tsx
// "Add contacts" for the WhatsApp broadcast: one person, or a pasted list (a name and a number on each line).
// The people are saved for broadcasts only and can go straight into a list.
import { useEffect, useMemo, useState } from 'react';
import { Sheet, Segmented, Button, Field } from '../ui';
import { partyPhones } from './phone';
import { parseContactLines, type BcContact } from './contacts';

export interface NewContact { name: string; phone: string; city: string }
export interface SaveResult { add: NewContact[]; /** numbers that were already saved: only put these people into the list */ existing: string[] }

interface Props {
  open: boolean;
  onClose: () => void;
  lists: { id: string; name: string }[];
  defaultListId: string;
  edit?: BcContact | null;
  /** every number already saved (parties and broadcast contacts): digits -> who */
  known: Map<string, { id: string; name: string }>;
  onSave: (r: SaveResult, listId: string, editId?: string) => void | Promise<void>;
}

export default function ContactSheet({ open, onClose, lists, defaultListId, edit, known, onSave }: Props) {
  const [mode, setMode] = useState<'one' | 'many'>('one');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [paste, setPaste] = useState('');
  const [listId, setListId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('one'); setPaste(''); setBusy(false);
    setName(edit?.name || ''); setPhone(edit?.phone || ''); setCity(edit?.city || '');
    setListId(edit ? '' : defaultListId);
  }, [open, edit, defaultListId]);

  const best = useMemo(() => partyPhones({ phone }).best, [phone]);
  const other = best && known.get(best.digits) && known.get(best.digits)!.id !== edit?.id ? known.get(best.digits)! : null;
  const rows = useMemo(() => parseContactLines(paste), [paste]);
  const rowInfo = useMemo(() => {
    let fresh = 0, dup = 0, bad = 0;
    for (const r of rows) { if (!r.digits) bad++; else if (known.has(r.digits)) dup++; else fresh++; }
    return { fresh, dup, bad };
  }, [rows, known]);

  const canOne = !!name.trim() && !!best;
  const submit = async () => {
    setBusy(true);
    try {
      if (mode === 'one') {
        if (other && !edit) await onSave({ add: [], existing: [other.id] }, listId);
        else await onSave({ add: [{ name: name.trim(), phone: phone.trim(), city: city.trim() }], existing: [] }, listId, edit?.id);
      } else {
        const add = rows.filter(r => r.digits && !known.has(r.digits)).map(r => ({ name: r.name || partyPhones({ phone: r.phone }).best!.display, phone: r.phone, city: '' }));
        const existing = rows.filter(r => r.digits && known.has(r.digits)).map(r => known.get(r.digits!)!.id);
        await onSave({ add, existing }, listId);
      }
    } finally { setBusy(false); }
  };

  const listPicker = (
    <Field label="Put them in a list" hint={listId ? 'They will be ticked into this list.' : 'Only saved. You can tick them into a list later in Manage Lists.'}>
      <select value={listId} onChange={e => setListId(e.target.value)} className="input-field" aria-label="Put them in a list">
        <option value="">No list for now</option>
        {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
    </Field>
  );

  const manyCount = rowInfo.fresh + rowInfo.dup;
  return (
    <Sheet open={open} onClose={onClose} title={edit ? 'Edit contact' : 'Add contacts'}
      footer={(
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-[2]" loading={busy} onClick={submit} disabled={mode === 'one' ? !canOne : manyCount === 0}>
            {edit ? 'Save changes' : mode === 'one' ? (other ? 'Add to the list' : 'Save contact') : `Add ${manyCount || ''} ${manyCount === 1 ? 'contact' : 'contacts'}`.replace('  ', ' ')}
          </Button>
        </div>
      )}>
      <p className="text-sm text-gray-600 -mt-1 mb-3">For broadcasts only. These people do not appear in your Parties.</p>
      {!edit && <div className="mb-4"><Segmented<'one' | 'many'> full value={mode} onChange={setMode} label="How many" options={[{ value: 'one', label: 'One person' }, { value: 'many', label: 'Paste several' }]} /></div>}

      {mode === 'one' ? (
        <div className="space-y-3">
          <Field label="Name"><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ramesh Patel" className="input-field" autoFocus aria-label="Contact name" /></Field>
          <Field label="WhatsApp number" error={phone.trim() && !best ? 'Not a valid mobile number. Use 10 digits, or with the country code.' : undefined}
            hint={best ? `Will message ${best.display}` : undefined}>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="98250 12345" inputMode="tel" className="input-field" aria-label="WhatsApp number" />
          </Field>
          {other && !edit && <p className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2">This number is already saved as <strong>{other.name}</strong>. They will be added to the list instead of saving twice.</p>}
          {other && edit && <p className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2">This number is also saved as <strong>{other.name}</strong>.</p>}
          <Field label="City (optional)"><input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Unjha" className="input-field" aria-label="City" /></Field>
          {!edit && listPicker}
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Paste one person on each line" hint="A name and a number, in any order. Copy straight from Excel or your phone's contacts.">
            <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={7} aria-label="Contacts to paste" placeholder={'Ramesh Patel, 98250 12345\nSuresh bhai 99099 22222\n+971 50 123 4567 Ali Traders'} className="input-field font-mono text-[13px]" />
          </Field>
          {rows.length > 0 && (
            <p className="text-xs rounded-xl bg-black/[0.04] px-3 py-2 text-gray-700" role="status">
              <strong>{rowInfo.fresh}</strong> new{rowInfo.dup ? <> · <strong>{rowInfo.dup}</strong> already saved (just added to the list)</> : null}{rowInfo.bad ? <> · <span className="text-red-700"><strong>{rowInfo.bad}</strong> without a valid number (skipped)</span></> : null}
            </p>
          )}
          {listPicker}
        </div>
      )}
    </Sheet>
  );
}

// "Add a party in 10 seconds" without leaving the form you are in (used on the contract form).
import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import toast from 'react-hot-toast';
import { Party } from '../types';
import { useAppStore } from '../hooks/useAuthStore';
import { Button, Sheet } from '../ui';
import { partyName } from '../utils/normalize';

const norm = (s: string) => s.toLowerCase().replace(/\b(pvt|private|ltd|limited|llp|co|company|and|&)\b/g, '').replace(/[^a-z0-9]/g, '');

export default function QuickParty({ open, initialName = '', type, onClose, onCreated }: {
  open: boolean; initialName?: string; type: 'buyer' | 'seller'; onClose: () => void; onCreated: (id: string) => void;
}) {
  const { parties, addParty } = useAppStore();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Gujarat');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(initialName.trim().toUpperCase()); setCity(''); setPhone(''); setGstin(''); } }, [open, initialName]);

  const twin = name.trim().length >= 3 ? parties.find(p => norm(partyName(p)) === norm(name) || (gstin.trim().length === 15 && p.gstin.toUpperCase() === gstin.trim().toUpperCase())) : undefined;
  const gstBad = gstin.trim() !== '' && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin.trim().toUpperCase());

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const p: Party = {
        id: uuid(), name: name.trim(), legalName: name.trim(), gstin: gstin.trim().toUpperCase(), address: '', city: city.trim(), state: state.trim(), pincode: '',
        phone: phone.trim(), email: '', pan: gstin.trim().length === 15 ? gstin.trim().toUpperCase().slice(2, 12) : '', type, productIds: [], contactPerson: '',
        alternatePhones: [], alternateEmails: [], otherContacts: [], notes: '', createdAt: now, updatedAt: now,
      };
      await addParty(p);
      toast.success(`${p.legalName} added`);
      onCreated(p.id);
      onClose();
    } catch { toast.error('Could not save the party. Check your internet and try again.'); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`New ${type}`}
      footer={<Button variant="primary" className="w-full" loading={busy} disabled={!name.trim() || gstBad} onClick={save}>Add and use this {type}</Button>}>
      {twin && (
        <div className="mb-3 rounded-xl bg-amber-50 ring-1 ring-amber-100 p-3 text-sm text-amber-900">
          <p className="font-semibold">{partyName(twin)} is already in your parties.</p>
          <p className="text-[13px] mt-0.5">{[twin.city, twin.phone].filter(Boolean).join(' · ')}</p>
          <Button size="sm" className="mt-2" onClick={() => { onCreated(twin.id); onClose(); }}>Use the existing one</Button>
        </div>
      )}
      <div className="space-y-3">
        <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1">Company name <span className="text-rose-600">*</span></span>
          <input value={name} onChange={e => setName(e.target.value)} autoFocus className="input-field uppercase" placeholder="PATEL EXPORTS PVT LTD" autoCapitalize="characters" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1">City</span><input value={city} onChange={e => setCity(e.target.value)} className="input-field" placeholder="Unjha" /></label>
          <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1">State</span><input value={state} onChange={e => setState(e.target.value)} className="input-field" /></label>
        </div>
        <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1">Phone / WhatsApp</span><input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" className="input-field" placeholder="98250 12345" /></label>
        <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1">GSTIN <span className="font-normal text-gray-500">(optional)</span></span>
          <input value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} maxLength={15} className="input-field font-mono" placeholder="24AAAAA0000A1Z5" />
          {gstBad && <span className="block text-xs text-red-600 mt-1">That does not look like a GSTIN (15 letters and numbers).</span>}</label>
        <p className="text-xs text-gray-500">You can add the address, more phone numbers and contact people later from Parties.</p>
      </div>
    </Sheet>
  );
}

import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Search, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import { Party } from '../types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export default function PartyForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { parties, addParty, updateParty, loadParties } = useAppStore();
  const [gstLoading, setGstLoading] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);

  const existing = id ? parties.find(p => p.id === id) : null;

  const [form, setForm] = useState({
    name: '', legalName: '', gstin: '', address: '', city: '', state: '', pincode: '',
    phone: '', email: '', pan: '', type: 'buyer' as 'buyer' | 'seller' | 'both',
    brokeragePercent: 0.5, brokerageFixed: 0
  });

  useEffect(() => { loadParties(); }, []);

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || '', legalName: existing.legalName, gstin: existing.gstin,
        address: existing.address, city: existing.city, state: existing.state, pincode: existing.pincode,
        phone: existing.phone, email: existing.email, pan: existing.pan,
        type: existing.type, brokeragePercent: existing.brokeragePercent, brokerageFixed: existing.brokerageFixed
      });
    }
  }, [existing]);

  const verifyGST = async () => {
    if (form.gstin.length !== 15) { toast.error('Enter valid 15-digit GSTIN'); return; }
    setGstLoading(true);
    try {
      const res = await fetch(`https://sheet.gstincheck.co.in/check/${form.gstin}`);
      const data = await res.json();
      if (data?.taxpayerInfo) {
        const info = data.taxpayerInfo;
        const addr = info.pradr?.addr || {};
        setForm(prev => ({
          ...prev,
          legalName: info.lgnm || prev.legalName,
          address: `${addr.bno || ''} ${addr.st || ''} ${addr.loc || ''}`.trim(),
          city: addr.city || addr.dst || '', state: addr.stcd || '', pincode: addr.pncd || ''
        }));
        setGstVerified(true);
        toast.success('GST verified!');
      } else { toast.error('Could not verify'); }
    } catch (e) { toast.error('Service unavailable'); }
    setGstLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.legalName || !form.gstin) { toast.error('Legal name and GSTIN required'); return; }
    const party: Party = {
      id: id || uuidv4(),
      name: form.name,
      legalName: form.legalName,
      gstin: form.gstin,
      address: form.address,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
      phone: form.phone,
      email: form.email,
      pan: form.pan,
      type: form.type,
      brokeragePercent: form.brokeragePercent,
      brokerageFixed: form.brokerageFixed,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date()
    };
    try {
      if (id) { await updateParty(id, party); toast.success('Updated!'); }
      else { await addParty(party); toast.success('Added!'); }
      navigate('/parties');
    } catch (e) { toast.error('Failed to save'); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/parties')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{id ? 'Edit Party' : 'Add New Party'}</h1>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })} maxLength={15}
              placeholder="GSTIN *" className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase" />
            <button onClick={verifyGST} disabled={gstLoading || form.gstin.length !== 15}
              className="px-4 py-3 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              <Search className="w-4 h-4" /> {gstLoading ? '...' : 'Verify'}
            </button>
          </div>
          {gstVerified && <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle2 className="w-4 h-4" /> GST Verified</div>}
          <input value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} placeholder="Legal Name *" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Display Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Address" rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" />
          <div className="grid md:grid-cols-3 gap-4">
            <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="State" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="Pincode" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })} maxLength={10} placeholder="PAN" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase" />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'buyer' | 'seller' | 'both' })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input type="number" step="0.01" value={form.brokeragePercent} onChange={e => setForm({ ...form, brokeragePercent: parseFloat(e.target.value) })} placeholder="Brokerage %" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input type="number" step="0.01" value={form.brokerageFixed} onChange={e => setForm({ ...form, brokerageFixed: parseFloat(e.target.value) })} placeholder="Fixed Brokerage (Rs.)" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100 mt-6">
          <button onClick={() => navigate('/parties')} className="px-6 py-3 text-gray-600 font-medium">Cancel</button>
          <button onClick={handleSubmit} className="px-8 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 flex items-center gap-2">
            <Save className="w-4 h-4" /> {id ? 'Update' : 'Save'} Party
          </button>
        </div>
      </div>
    </div>
  );
}

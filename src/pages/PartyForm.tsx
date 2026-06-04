import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Search, CheckCircle2, Eye, EyeOff } from 'lucide-react';
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
  const [showPrivate, setShowPrivate] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const existing = id ? parties.find(p => p.id === id) : null;

  const [form, setForm] = useState({
    name: '', legalName: '', gstin: '', address: '', city: '', state: '', pincode: '',
    phone: '', email: '', pan: '', type: 'buyer' as 'buyer' | 'seller' | 'both',
    // Private fields
    contactPerson: '', altPhone: '', altEmail: '', remarks: '', notes: '',
    bankName: '', bankAccount: '', bankIfsc: ''
  });

  useEffect(() => { loadParties(); }, []);

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || '', legalName: existing.legalName, gstin: existing.gstin,
        address: existing.address, city: existing.city, state: existing.state, pincode: existing.pincode,
        phone: existing.phone, email: existing.email, pan: existing.pan,
        type: existing.type,
        contactPerson: existing.contactPerson || '', altPhone: existing.altPhone || '',
        altEmail: existing.altEmail || '', remarks: existing.remarks || '', notes: existing.notes || '',
        bankName: existing.bankName || '', bankAccount: existing.bankAccount || '', bankIfsc: existing.bankIfsc || ''
      });
    }
  }, [existing]);

  // Pincode auto-fetch
  const fetchPincode = async (pincode: string) => {
    if (pincode.length !== 6) return;
    setPincodeLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        setForm(prev => ({
          ...prev,
          city: po.District || po.Name || prev.city,
          state: po.State || prev.state,
        }));
      }
    } catch (e) { console.error('Pincode fetch failed', e); }
    setPincodeLoading(false);
  };

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
      contactPerson: form.contactPerson,
      altPhone: form.altPhone,
      altEmail: form.altEmail,
      remarks: form.remarks,
      notes: form.notes,
      bankName: form.bankName,
      bankAccount: form.bankAccount,
      bankIfsc: form.bankIfsc,
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
          {gstVerified && <div className="flex items-center gap-2 text-sm text-rose-600"><CheckCircle2 className="w-4 h-4" /> GST Verified</div>}
          <input value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} placeholder="Legal Name *" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Display Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Address" rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" />
          <div className="grid md:grid-cols-3 gap-4">
            <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="State" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <div className="relative">
              <input value={form.pincode} onChange={e => { setForm({ ...form, pincode: e.target.value }); if (e.target.value.length === 6) fetchPincode(e.target.value); }} placeholder="Pincode" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              {pincodeLoading && <div className="absolute right-3 top-3 w-4 h-4 border-2 border-gray-300 border-t-rose-600 rounded-full animate-spin" />}
            </div>
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

          {/* Private Details Toggle */}
          <div className="border-t border-gray-100 pt-4">
            <button onClick={() => setShowPrivate(!showPrivate)}
              className="flex items-center gap-2 text-sm font-semibold text-rose-600 hover:text-rose-700">
              {showPrivate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPrivate ? 'Hide Private Details' : 'Show Private Details (Not on Contract)'}
            </button>
            {showPrivate && (
              <div className="mt-4 space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700">Private Information</h4>
                <input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                  placeholder="Contact Person Name" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                <div className="grid md:grid-cols-2 gap-4">
                  <input value={form.altPhone} onChange={e => setForm({ ...form, altPhone: e.target.value })}
                    placeholder="Alt. Phone" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                  <input value={form.altEmail} onChange={e => setForm({ ...form, altEmail: e.target.value })}
                    placeholder="Alt. Email" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                </div>
                <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Remarks" rows={2} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm resize-none" />
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes" rows={2} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm resize-none" />
                <div className="grid md:grid-cols-2 gap-4">
                  <input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })}
                    placeholder="Bank Name" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                  <input value={form.bankAccount} onChange={e => setForm({ ...form, bankAccount: e.target.value })}
                    placeholder="Account Number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                </div>
                <input value={form.bankIfsc} onChange={e => setForm({ ...form, bankIfsc: e.target.value })}
                  placeholder="IFSC Code" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm" />
              </div>
            )}
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

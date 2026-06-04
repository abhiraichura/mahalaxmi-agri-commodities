import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { ArrowLeft, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function PartyForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { parties, products, addParty, updateParty } = useAppStore();

  const existing = id ? parties.find(p => p.id === id) : null;

  const [form, setForm] = useState({
    name: existing?.name || '',
    legalName: existing?.legalName || '',
    gstin: existing?.gstin || '',
    pan: existing?.pan || '',
    address: existing?.address || '',
    city: existing?.city || '',
    state: existing?.state || '',
    pincode: existing?.pincode || '',
    phone: existing?.phone || '',
    altPhone: existing?.altPhone || '',
    email: existing?.email || '',
    altEmail: existing?.altEmail || '',
    type: existing?.type || 'both',
    contactPerson: existing?.contactPerson || '',
    bankName: existing?.bankName || '',
    bankAccount: existing?.bankAccount || '',
    bankIfsc: existing?.bankIfsc || '',
    remarks: existing?.remarks || '',
    notes: existing?.notes || '',
    brokeragePercent: existing?.brokeragePercent || 0,
    brokerageFixed: existing?.brokerageFixed || 0,
    productIds: existing?.productIds || [] as string[],
  });

  const [gstVerified, setGstVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const verifyGST = async () => {
    if (!form.gstin || form.gstin.length !== 15) {
      toast.error('Enter valid 15-digit GSTIN');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch(`https://gst-insights.p.rapidapi.com/getGSTDetails/?gstin=${form.gstin}`, {
        headers: {
          'X-RapidAPI-Key': 'YOUR_RAPIDAPI_KEY',
          'X-RapidAPI-Host': 'gst-insights.p.rapidapi.com'
        }
      });
      const data = await res.json();
      if (data && data.tradeName) {
        setForm(prev => ({ ...prev, legalName: data.tradeName, name: data.tradeName }));
        setGstVerified(true);
        toast.success('GST verified');
      } else {
        toast.error('GST verification failed');
      }
    } catch (e) {
      toast.error('GST API error');
    }
    setVerifying(false);
  };

  const toggleProduct = (productId: string) => {
    setForm(prev => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.legalName || !form.phone || !form.address || !form.city || !form.state || !form.pincode) {
      toast.error('Fill required fields');
      return;
    }

    const partyData = {
      ...form,
      id: existing?.id || uuidv4(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      await updateParty(existing.id, partyData);
      toast.success('Party updated');
    } else {
      await addParty(partyData as any);
      toast.success('Party added');
    }
    navigate('/parties');
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/parties')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{id ? 'Edit Party' : 'Add New Party'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Basic Information</h2>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">GSTIN</label>
            <div className="flex gap-2">
              <input value={form.gstin} onChange={e => { setForm({ ...form, gstin: e.target.value.toUpperCase() }); setGstVerified(false); }}
                maxLength={15} placeholder="GSTIN (optional)"
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase" />
              <button type="button" onClick={verifyGST} disabled={verifying}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm disabled:opacity-50">
                {verifying ? '...' : 'Verify'}
              </button>
            </div>
            {gstVerified && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><Check size={12} /> Verified</p>}
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Legal Name *</label>
            <input value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })}
              placeholder="Legal Name" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Display Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Display Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">PAN</label>
              <input value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                maxLength={10} placeholder="PAN" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Phone *</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g., 90330 00032 / 98255 00032" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Alt Phone</label>
              <input value={form.altPhone} onChange={e => setForm({ ...form, altPhone: e.target.value })}
                placeholder="Alternative number" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="Email" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Alt Email</label>
              <input type="email" value={form.altEmail} onChange={e => setForm({ ...form, altEmail: e.target.value })}
                placeholder="Alternative email" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Contact Person</label>
            <input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })}
              placeholder="Contact person name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Address</h2>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Address *</label>
            <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
              rows={2} required placeholder="Full address" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">City *</label>
              <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">State *</label>
              <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}
                required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Pincode *</label>
              <input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })}
                required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Products</h2>
          <p className="text-xs text-gray-500">Select products this party deals in</p>
          <div className="flex flex-wrap gap-2">
            {products.map(pr => (
              <button key={pr.id} type="button" onClick={() => toggleProduct(pr.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  form.productIds.includes(pr.id)
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-rose-300'
                }`}>
                {pr.name}
              </button>
            ))}
          </div>
          {products.length === 0 && <p className="text-sm text-gray-400">No products added yet. Add products in Product Manager first.</p>}
        </div>

        {/* Bank */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Bank Details</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Bank Name</label>
              <input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Account Number</label>
              <input value={form.bankAccount} onChange={e => setForm({ ...form, bankAccount: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">IFSC</label>
              <input value={form.bankIfsc} onChange={e => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase" />
            </div>
          </div>
        </div>

        {/* Brokerage */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Brokerage</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Brokerage %</label>
              <input type="number" value={form.brokeragePercent} onChange={e => setForm({ ...form, brokeragePercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fixed Brokerage (Rs.)</label>
              <input type="number" value={form.brokerageFixed} onChange={e => setForm({ ...form, brokerageFixed: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Notes</h2>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Remarks</label>
            <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })}
              rows={2} placeholder="Short remarks" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Internal Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2} placeholder="Internal notes" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-medium hover:bg-rose-700 transition-colors">
            {id ? 'Update Party' : 'Add Party'}
          </button>
          <button type="button" onClick={() => navigate('/parties')} className="px-6 py-3 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

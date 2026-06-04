import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { ArrowLeft, Save, Check, X, ChevronDown, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface PincodeData {
  Name: string;
  District: string;
  State: string;
  Country: string;
}

export default function PartyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { parties, addParty, updateParty, products } = useAppStore();

  const [form, setForm] = useState({
    name: '',
    legalName: '',
    gstin: '',
    address: '',
    city: '',
    state: 'Gujarat',
    pincode: '',
    phone: '',
    email: '',
    pan: '',
    type: 'both' as 'buyer' | 'seller' | 'both',
    brokeragePercent: 0,
    brokerageFixed: 0,
    productIds: [] as string[]
  });

  const [gstVerified, setGstVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const existing = id ? parties.find(p => p.id === id) : null;

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || '',
        legalName: existing.legalName || '',
        gstin: existing.gstin || '',
        address: existing.address || '',
        city: existing.city || '',
        state: existing.state || 'Gujarat',
        pincode: existing.pincode || '',
        phone: existing.phone || '',
        email: existing.email || '',
        pan: existing.pan || '',
        type: existing.type || 'both',
        brokeragePercent: existing.brokeragePercent || 0,
        brokerageFixed: existing.brokerageFixed || 0,
        productIds: existing.productIds || []
      });
      if (existing.gstin && existing.gstin.length === 15) setGstVerified(true);
    }
  }, [existing]);

  // Auto-detect city/state from pincode
  const fetchPincodeDetails = async (pincode: string) => {
    if (pincode.length !== 6) return;
    setPincodeLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const office = data[0].PostOffice[0];
        setForm(prev => ({
          ...prev,
          city: office.District || office.Name || prev.city,
          state: office.State || prev.state,
          // Don't overwrite address if already filled
          address: prev.address || `${office.Name}, ${office.District}`
        }));
        toast.success(`Location found: ${office.District}, ${office.State}`);
      } else {
        toast.error('Pincode not found');
      }
    } catch (err) {
      toast.error('Could not fetch pincode details');
    }
    setPincodeLoading(false);
  };

  const verifyGST = async () => {
    if (form.gstin.length !== 15) return;
    setVerifying(true);
    try {
      const res = await fetch(`https://gstinsuvidha.gstsuvidhakendra.org/asp/api/gstin/${form.gstin}`);
      const data = await res.json();
      if (data?.data?.lgnm) {
        setForm(prev => ({ ...prev, legalName: data.data.lgnm }));
        setGstVerified(true);
        toast.success('GST Verified');
      } else {
        toast.error('GST verification failed');
      }
    } catch {
      toast.error('Could not verify GST');
    }
    setVerifying(false);
  };

  const toggleProduct = (productId: string) => {
    setForm(prev => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter(pid => pid !== productId)
        : [...prev.productIds, productId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.legalName.trim()) {
      toast.error('Legal Name is required');
      return;
    }

    const payload = {
      ...form,
      id: id || uuidv4(),
      name: form.name || form.legalName,
      updatedAt: new Date().toISOString()
    };

    try {
      if (id) {
        await updateParty(id, payload);
        toast.success('Party updated');
      } else {
        await addParty({ ...payload, createdAt: new Date().toISOString() });
        toast.success('Party added');
      }
      navigate('/parties');
    } catch (err) {
      toast.error('Failed to save');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/parties')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{id ? 'Edit Party' : 'Add New Party'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* GSTIN - optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
          <div className="flex gap-2">
            <input
              value={form.gstin}
              onChange={e => {
                setForm({ ...form, gstin: e.target.value.toUpperCase() });
                setGstVerified(false);
              }}
              maxLength={15}
              placeholder="GSTIN (optional)"
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase"
            />
            {form.gstin.length === 15 && (
              <button
                type="button"
                onClick={verifyGST}
                disabled={verifying}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
              >
                {verifying ? '...' : 'Verify'}
              </button>
            )}
          </div>
          {gstVerified && (
            <span className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <Check className="w-3 h-3" /> GST Verified
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name *</label>
            <input
              value={form.legalName}
              onChange={e => setForm({ ...form, legalName: e.target.value })}
              placeholder="Legal Name"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Display Name"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            placeholder="Full address"
            rows={2}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
        </div>

        {/* Pincode with auto-detect */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
            <div className="relative">
              <input
                value={form.pincode}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setForm({ ...form, pincode: val });
                  if (val.length === 6) {
                    fetchPincodeDetails(val);
                  }
                }}
                placeholder="6 digits"
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
              {pincodeLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-rose-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Enter 6 digits to auto-fill city & state</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
              placeholder="City"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              value={form.state}
              onChange={e => setForm({ ...form, state: e.target.value })}
              placeholder="State"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. 99999 99999 / 77777 77777"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
          <input
            value={form.pan}
            onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })}
            placeholder="PAN"
            maxLength={10}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value as any })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            >
              <option value="both">Both</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brokerage (%)</label>
            <input
              type="number"
              step="0.01"
              value={form.brokeragePercent}
              onChange={e => setForm({ ...form, brokeragePercent: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Product Multi-Select */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Products</label>
          <button
            type="button"
            onClick={() => setProductDropdownOpen(!productDropdownOpen)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-left flex items-center justify-between"
          >
            <span className={form.productIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
              {form.productIds.length === 0
                ? 'Select products...'
                : `${form.productIds.length} product(s) selected`}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {productDropdownOpen && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
              {products.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">No products available</div>
              ) : (
                products.map(product => (
                  <label
                    key={product.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.productIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-sm">{product.name}</span>
                  </label>
                ))
              )}
            </div>
          )}

          {form.productIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.productIds.map(pid => {
                const p = products.find(prod => prod.id === pid);
                return p ? (
                  <span key={pid} className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-xs rounded-lg">
                    {p.name}
                    <button type="button" onClick={() => toggleProduct(pid)} className="hover:text-rose-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700"
          >
            <Save className="w-4 h-4" /> {id ? 'Update' : 'Save'} Party
          </button>
          <button
            type="button"
            onClick={() => navigate('/parties')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

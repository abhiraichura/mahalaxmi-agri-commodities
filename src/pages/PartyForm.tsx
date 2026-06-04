import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function PartyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { parties, addParty, updateParty, products } = useAppStore();
  const party = parties.find(p => p.id === id);

  const [form, setForm] = useState({
    legalName: '',
    name: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    products: [] as string[]
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (party) {
      setForm({
        legalName: party.legalName || '',
        name: party.name || '',
        gstin: party.gstin || '',
        address: party.address || '',
        city: party.city || '',
        state: party.state || '',
        pincode: party.pincode || '',
        phone: party.phone || '',
        email: party.email || '',
        products: party.products || []
      });
    }
  }, [party]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.legalName.trim()) {
      toast.error('Legal name is required');
      return;
    }
    if (!form.address.trim()) {
      toast.error('Address is required');
      return;
    }
    if (!form.city.trim()) {
      toast.error('City is required');
      return;
    }
    if (!form.state.trim()) {
      toast.error('State is required');
      return;
    }

    setSaving(true);
    try {
      if (id) {
        await updateParty(id, { ...form });
        toast.success('Party updated');
      } else {
        await addParty({
          id: uuidv4(),
          ...form,
          createdAt: new Date().toISOString()
        });
        toast.success('Party added');
      }
      navigate('/parties');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setForm(prev => ({
      ...prev,
      products: prev.products.includes(productId)
        ? prev.products.filter(p => p !== productId)
        : [...prev.products, productId]
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/parties')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{id ? 'Edit Party' : 'Add New Party'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Legal Name *</label>
          <input
            value={form.legalName}
            onChange={e => setForm({ ...form, legalName: e.target.value })}
            placeholder="Company legal name"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Short display name (optional)"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">GSTIN</label>
          <input
            value={form.gstin}
            onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
            maxLength={15}
            placeholder="15 character GSTIN (optional)"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. 99999 99999 / 77777 77777"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">Separate multiple numbers with "/"</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              type="email"
              placeholder="email@company.com"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Address *</label>
          <textarea
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            rows={2}
            placeholder="Full address"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
            <input
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
              placeholder="City"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">State *</label>
            <input
              value={form.state}
              onChange={e => setForm({ ...form, state: e.target.value })}
              placeholder="State"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Pincode</label>
            <input
              value={form.pincode}
              onChange={e => setForm({ ...form, pincode: e.target.value })}
              placeholder="Pincode"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
        </div>

        {/* Products Section */}
        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Products they deal in</label>
          <div className="flex flex-wrap gap-2">
            {products.map(product => (
              <button
                key={product.id}
                type="button"
                onClick={() => toggleProduct(product.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                  form.products.includes(product.id)
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {product.name}
              </button>
            ))}
            {products.length === 0 && (
              <p className="text-sm text-gray-400 italic">No products added yet. Add products in Products section.</p>
            )}
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : id ? 'Update Party' : 'Add Party'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/parties')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

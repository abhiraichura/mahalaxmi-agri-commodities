import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { ArrowLeft, Save, Check, X } from 'lucide-react';
import { Party } from '../types';

const emptyParty: Partial<Party> = {
  name: '',
  legalName: '',
  gstin: '',
  pan: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  altPhone: '',
  email: '',
  altEmail: '',
  type: 'both',
  contactPerson: '',
  bankName: '',
  bankAccount: '',
  bankIfsc: '',
  remarks: '',
  notes: '',
  brokeragePercent: 0,
  brokerageFixed: 0,
  productIds: [],
};

export default function PartyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { parties, products, addParty, updateParty } = useAppStore();

  const [form, setForm] = useState<Partial<Party>>(emptyParty);
  const [loading, setLoading] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);

  const editingParty = id ? parties.find((p: Party) => p.id === id) : null;

  useEffect(() => {
    if (editingParty) {
      setForm({ ...editingParty });
      setGstVerified(!!editingParty.gstin);
    }
  }, [editingParty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.legalName || !form.gstin) {
      alert('Legal Name and GSTIN are required');
      return;
    }
    setLoading(true);
    try {
      const partyData = {
        ...form,
        id: id || `party-${Date.now()}`,
      } as Party;

      if (id) {
        await updateParty(id, partyData);
      } else {
        await addParty(partyData);
      }
      navigate('/parties');
    } catch (err) {
      console.error(err);
      alert('Failed to save party');
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    const current = form.productIds || [];
    const updated = current.includes(productId)
      ? current.filter((pid: string) => pid !== productId)
      : [...current, productId];
    setForm({ ...form, productIds: updated });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/parties')}
          className="p-2 hover:bg-gray-100 rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Party' : 'Add New Party'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.gstin || ''}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  maxLength={15}
                  placeholder="GSTIN *"
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase"
                  required
                />
                <button
                  type="button"
                  onClick={() => setGstVerified(!gstVerified)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl ${gstVerified ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}
                >
                  {gstVerified ? <Check className="w-4 h-4" /> : 'Verify'}
                </button>
              </div>
              {gstVerified && (
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <Check className="w-3 h-3 mr-1" /> GST Verified
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name *</label>
              <input
                type="text"
                value={form.legalName || ''}
                onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                placeholder="Legal Name *"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Display Name"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
              <input
                type="text"
                value={form.pan || ''}
                onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                maxLength={10}
                placeholder="PAN"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type || 'both'}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              >
                <option value="both">Both</option>
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Contact Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alt Phone</label>
              <input
                type="tel"
                value={form.altPhone || ''}
                onChange={(e) => setForm({ ...form, altPhone: e.target.value })}
                placeholder="Alternative Phone"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alt Email</label>
              <input
                type="email"
                value={form.altEmail || ''}
                onChange={(e) => setForm({ ...form, altEmail: e.target.value })}
                placeholder="Alternative Email"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={form.contactPerson || ''}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="Contact Person Name"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Address</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={form.address || ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Full Address"
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={form.city || ''}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="City"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={form.state || ''}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="State"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={form.pincode || ''}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  placeholder="Pincode"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Bank Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={form.bankName || ''}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder="Bank Name"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <input
                type="text"
                value={form.bankAccount || ''}
                onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                placeholder="Account Number"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
              <input
                type="text"
                value={form.bankIfsc || ''}
                onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
                placeholder="IFSC Code"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase"
              />
            </div>
          </div>
        </div>

        {/* Brokerage */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Brokerage Settings</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brokerage (%)</label>
              <input
                type="number"
                step="0.01"
                value={form.brokeragePercent || 0}
                onChange={(e) => setForm({ ...form, brokeragePercent: parseFloat(e.target.value) || 0 })}
                placeholder="Brokerage Percentage"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Brokerage (₹)</label>
              <input
                type="number"
                step="0.01"
                value={form.brokerageFixed || 0}
                onChange={(e) => setForm({ ...form, brokerageFixed: parseFloat(e.target.value) || 0 })}
                placeholder="Fixed Brokerage Amount"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        {/* Products */}
        {products.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Associated Products</h3>
            <div className="flex flex-wrap gap-2">
              {products.map((product: any) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => toggleProduct(product.id)}
                  className={`px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
                    (form.productIds || []).includes(product.id)
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {product.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Remarks & Notes */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Additional Information</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea
              value={form.remarks || ''}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Remarks"
              rows={2}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Internal notes"
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/parties')}
            className="px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-3 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : (id ? 'Update Party' : 'Create Party')}
          </button>
        </div>
      </form>
    </div>
  );
}

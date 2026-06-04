import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { Contract, Party, ProductSpec } from '../types';

const emptyContract: Partial<Contract> = {
  contractNo: '',
  year: new Date().getFullYear(),
  date: new Date().toISOString().split('T')[0],
  seller: undefined as any,
  buyer: undefined as any,
  product: undefined as any,
  quantity: 0,
  quantityUnit: 'MT',
  price: 0,
  priceUnit: 'per KG',
  deliveryLocation: '',
  deliveryAddress: '',
  packing: '40 KG Plain P.P. Nett Packing with Double Stitching',
  loadingCondition: 'Goods to be loaded within one week',
  paymentTerms: '3 to 4 days payment with 1% discount after delivery',
  gstPercent: 5,
  otherTerms: '',
  notes: '',
  status: 'active',
};

export default function ContractForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contracts, parties, products, settings, addContract, updateContract } = useAppStore();

  const [form, setForm] = useState<Partial<Contract>>(emptyContract);
  const [loading, setLoading] = useState(false);

  const editingContract = id ? contracts.find((c: Contract) => c.id === id) : null;

  useEffect(() => {
    if (editingContract) {
      setForm({ ...editingContract });
    } else {
      // Auto-generate contract number
      const year = new Date().getFullYear();
      const yearContracts = contracts.filter((c: Contract) => c.year === year);
      const nextNo = yearContracts.length + 1;
      setForm({
        ...emptyContract,
        contractNo: String(nextNo).padStart(3, '0'),
        year,
      });
    }
  }, [editingContract, contracts]);

  const selectedSeller = parties.find((p: Party) => p.id === (form.seller as any)?.id || (form as any).sellerId);
  const selectedBuyer = parties.find((p: Party) => p.id === (form.buyer as any)?.id || (form as any).buyerId);
  const selectedProduct = products.find((p: ProductSpec) => p.id === (form.product as any)?.id || (form as any).productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.seller || !form.buyer || !form.product) {
      alert('Please select seller, buyer and product');
      return;
    }
    setLoading(true);
    try {
      const contractData = {
        ...form,
        id: id || `contract-${Date.now()}`,
        sellerId: (form.seller as any).id,
        buyerId: (form.buyer as any).id,
        productId: (form.product as any).id,
      } as Contract;

      if (id) {
        await updateContract(id, contractData);
      } else {
        await addContract(contractData);
      }
      navigate('/contracts');
    } catch (err) {
      console.error(err);
      alert('Failed to save contract');
    } finally {
      setLoading(false);
    }
  };

  const sellers = parties.filter((p: Party) => !p.type || p.type === 'seller' || p.type === 'both');
  const buyers = parties.filter((p: Party) => !p.type || p.type === 'buyer' || p.type === 'both');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/contracts')}
          className="p-2 hover:bg-gray-100 rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Contract' : 'New Contract Note'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
        {/* Contract Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract No *</label>
            <input
              type="text"
              value={form.contractNo || ''}
              onChange={(e) => setForm({ ...form, contractNo: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              value={form.year || new Date().getFullYear()}
              onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || new Date().getFullYear() })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              value={form.date || ''}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              required
            />
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seller *</label>
            <select
              value={(form.seller as any)?.id || (form as any).sellerId || ''}
              onChange={(e) => {
                const party = parties.find((p: Party) => p.id === e.target.value);
                setForm({ ...form, seller: party as any });
              }}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              required
            >
              <option value="">Select Seller</option>
              {sellers.map((p: Party) => (
                <option key={p.id} value={p.id}>{p.legalName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buyer *</label>
            <select
              value={(form.buyer as any)?.id || (form as any).buyerId || ''}
              onChange={(e) => {
                const party = parties.find((p: Party) => p.id === e.target.value);
                setForm({ ...form, buyer: party as any });
              }}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              required
            >
              <option value="">Select Buyer</option>
              {buyers.map((p: Party) => (
                <option key={p.id} value={p.id}>{p.legalName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
          <select
            value={(form.product as any)?.id || (form as any).productId || ''}
            onChange={(e) => {
              const prod = products.find((p: ProductSpec) => p.id === e.target.value);
              setForm({ ...form, product: prod as any });
            }}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            required
          >
            <option value="">Select Product</option>
            {products.map((p: ProductSpec) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Product Specs Preview */}
        {selectedProduct && selectedProduct.specs && selectedProduct.specs.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Product Specifications</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {selectedProduct.specs.map((spec, i) => (
                <div key={i} className="text-sm">
                  <span className="text-gray-500">{spec.label}:</span>{' '}
                  <span className="font-medium">{spec.value} {spec.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commercial Terms */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Commercial Terms</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.quantity || 0}
                  onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
                <input
                  type="text"
                  value={form.quantityUnit || 'MT'}
                  onChange={(e) => setForm({ ...form, quantityUnit: e.target.value })}
                  className="w-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  placeholder="Unit"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.price || 0}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
                <input
                  type="text"
                  value={form.priceUnit || 'per KG'}
                  onChange={(e) => setForm({ ...form, priceUnit: e.target.value })}
                  className="w-40 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  placeholder="Per unit"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Location</label>
            <input
              type="text"
              value={form.deliveryLocation || ''}
              onChange={(e) => setForm({ ...form, deliveryLocation: e.target.value })}
              placeholder="e.g., Unjha"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
            <input
              type="text"
              value={form.deliveryAddress || ''}
              onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
              placeholder="Address will be provided by buyer"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Packing</label>
            <input
              type="text"
              value={form.packing || ''}
              onChange={(e) => setForm({ ...form, packing: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loading Condition</label>
            <input
              type="text"
              value={form.loadingCondition || ''}
              onChange={(e) => setForm({ ...form, loadingCondition: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
            <input
              type="text"
              value={form.paymentTerms || ''}
              onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST %</label>
            <input
              type="number"
              value={form.gstPercent || 0}
              onChange={(e) => setForm({ ...form, gstPercent: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Other Terms</label>
            <textarea
              value={form.otherTerms || ''}
              onChange={(e) => setForm({ ...form, otherTerms: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/contracts')}
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
            {loading ? 'Saving...' : (id ? 'Update Contract' : 'Create Contract')}
          </button>
        </div>
      </form>
    </div>
  );
}

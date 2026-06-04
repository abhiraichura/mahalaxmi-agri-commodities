import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { ArrowLeft, Save, ChevronDown, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function ContractForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { parties, products, contracts, addContract, updateContract, settings, currentYear } = useAppStore();
  const contract = contracts.find(c => c.id === id);

  const [form, setForm] = useState({
    contractNo: '',
    date: new Date().toISOString().split('T')[0],
    financialYear: currentYear,
    sellerId: '',
    buyerId: '',
    productId: '',
    quantity: 0,
    quantityUnit: 'MT',
    price: 0,
    priceUnit: 'Per KG',
    deliveryLocation: '',
    deliveryAddress: '',
    packing: settings.defaultPacking,
    loadingCondition: settings.defaultLoadingCondition,
    loadingDeadline: '',
    paymentTerms: settings.defaultPaymentTerms,
    gstPercent: settings.defaultGstPercent,
    otherTerms: '',
    brokeragePercent: 0,
    status: 'active' as 'active' | 'completed' | 'cancelled'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (contract) {
      setForm({
        contractNo: contract.contractNo,
        date: contract.date,
        financialYear: contract.financialYear,
        sellerId: contract.seller.id,
        buyerId: contract.buyer.id,
        productId: contract.product.id,
        quantity: contract.quantity,
        quantityUnit: contract.quantityUnit,
        price: contract.price,
        priceUnit: contract.priceUnit,
        deliveryLocation: contract.deliveryLocation,
        deliveryAddress: contract.deliveryAddress,
        packing: contract.packing,
        loadingCondition: contract.loadingCondition,
        loadingDeadline: contract.loadingDeadline || '',
        paymentTerms: contract.paymentTerms,
        gstPercent: contract.gstPercent,
        otherTerms: contract.otherTerms || '',
        brokeragePercent: contract.brokeragePercent || 0,
        status: contract.status
      });
    } else {
      const yearContracts = contracts.filter(c => c.financialYear === currentYear);
      const nextNo = yearContracts.length + 1;
      setForm(prev => ({
        ...prev,
        contractNo: `${currentYear.split('-')[0].slice(2)}${currentYear.split('-')[1].slice(2)}-${String(nextNo).padStart(3, '0')}`
      }));
    }
  }, [contract, currentYear, contracts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sellerId || !form.buyerId || !form.productId) {
      toast.error('Please select seller, buyer and product');
      return;
    }
    if (form.sellerId === form.buyerId) {
      toast.error('Seller and buyer cannot be the same');
      return;
    }

    const seller = parties.find(p => p.id === form.sellerId);
    const buyer = parties.find(p => p.id === form.buyerId);
    const product = products.find(p => p.id === form.productId);
    if (!seller || !buyer || !product) {
      toast.error('Invalid selection');
      return;
    }

    const totalValue = form.quantity * form.price;
    const brokerageAmount = (totalValue * (form.brokeragePercent || 0)) / 100;

    setSaving(true);
    try {
      const contractData = {
        id: id || uuidv4(),
        contractNo: form.contractNo,
        date: form.date,
        financialYear: form.financialYear,
        status: form.status,
        seller,
        buyer,
        product,
        quantity: form.quantity,
        quantityUnit: form.quantityUnit,
        price: form.price,
        priceUnit: form.priceUnit,
        deliveryLocation: form.deliveryLocation,
        deliveryAddress: form.deliveryAddress,
        packing: form.packing,
        loadingCondition: form.loadingCondition,
        loadingDeadline: form.loadingDeadline || undefined,
        paymentTerms: form.paymentTerms,
        gstPercent: form.gstPercent,
        otherTerms: form.otherTerms || undefined,
        brokeragePercent: form.brokeragePercent,
        brokerageAmount,
        totalValue
      };

      if (id) {
        await updateContract(id, contractData);
        toast.success('Contract updated');
      } else {
        await addContract(contractData);
        toast.success('Contract created');
      }
      navigate('/contracts');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const selectedSeller = parties.find(p => p.id === form.sellerId);
  const selectedBuyer = parties.find(p => p.id === form.buyerId);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/contracts')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{id ? 'Edit Contract' : 'New Contract Note'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        {/* Contract Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contract No</label>
            <input
              value={form.contractNo}
              onChange={e => setForm({ ...form, contractNo: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              required
            />
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Seller *</label>
            <select
              value={form.sellerId}
              onChange={e => setForm({ ...form, sellerId: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              required
            >
              <option value="">Select Seller</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>{p.legalName}</option>
              ))}
            </select>
            {selectedSeller && (
              <p className="text-xs text-gray-500 mt-1">{selectedSeller.city}, {selectedSeller.state}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Buyer *</label>
            <select
              value={form.buyerId}
              onChange={e => setForm({ ...form, buyerId: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              required
            >
              <option value="">Select Buyer</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>{p.legalName}</option>
              ))}
            </select>
            {selectedBuyer && (
              <p className="text-xs text-gray-500 mt-1">{selectedBuyer.city}, {selectedBuyer.state}</p>
            )}
          </div>
        </div>

        {/* Product */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Product *</label>
          <select
            value={form.productId}
            onChange={e => setForm({ ...form, productId: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            required
          >
            <option value="">Select Product</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Commercial Terms */}
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Commercial Terms</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={form.quantity || ''}
                    onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                  <input
                    value={form.quantityUnit}
                    onChange={e => setForm({ ...form, quantityUnit: e.target.value })}
                    className="w-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                    placeholder="Unit"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Price</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={form.price || ''}
                    onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                  <input
                    value={form.priceUnit}
                    onChange={e => setForm({ ...form, priceUnit: e.target.value })}
                    className="w-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                    placeholder="Per unit"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Location</label>
                <input
                  value={form.deliveryLocation}
                  onChange={e => setForm({ ...form, deliveryLocation: e.target.value })}
                  placeholder="e.g., Unjha"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Loading Deadline</label>
                <input
                  type="date"
                  value={form.loadingDeadline}
                  onChange={e => setForm({ ...form, loadingDeadline: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Address</label>
              <input
                value={form.deliveryAddress}
                onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
                placeholder="Address will be provided by buyer"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Packing</label>
                <input
                  value={form.packing}
                  onChange={e => setForm({ ...form, packing: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Loading Condition</label>
                <input
                  value={form.loadingCondition}
                  onChange={e => setForm({ ...form, loadingCondition: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Terms</label>
                <input
                  value={form.paymentTerms}
                  onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Brokerage %</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.brokeragePercent || ''}
                  onChange={e => setForm({ ...form, brokeragePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">GST %</label>
              <input
                type="number"
                step="0.01"
                value={form.gstPercent || ''}
                onChange={e => setForm({ ...form, gstPercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Other Terms</label>
              <textarea
                value={form.otherTerms}
                onChange={e => setForm({ ...form, otherTerms: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : id ? 'Update Contract' : 'Create Contract'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/contracts')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

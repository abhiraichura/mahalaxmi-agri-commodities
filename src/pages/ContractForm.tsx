import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function ContractForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { contracts, parties, products, settings, addContract, updateContract, currentYear } = useAppStore();

  const existing = id ? contracts.find(c => c.id === id) : null;

  const getNextNumber = () => {
    const yearContracts = contracts.filter(c => c.year === currentYear);
    const max = yearContracts.reduce((m, c) => {
      const n = parseInt(c.contractNo);
      return n > m ? n : m;
    }, 0);
    return String(max + 1).padStart(3, '0');
  };

  const financialYears = settings.financialYears && settings.financialYears.length > 0
    ? settings.financialYears
    : [`${currentYear}-${currentYear + 1}`];

  const [form, setForm] = useState({
    contractNo: existing?.contractNo || getNextNumber(),
    year: existing?.year || currentYear,
    date: existing?.date || new Date().toISOString().split('T')[0],
    sellerId: existing?.sellerId || '',
    buyerId: existing?.buyerId || '',
    productId: existing?.productId || '',
    quantity: existing?.quantity || 0,
    quantityUnit: existing?.quantityUnit || 'MT',
    price: existing?.price || 0,
    priceUnit: existing?.priceUnit || 'Quintal',
    deliveryLocation: existing?.deliveryLocation || '',
    deliveryAddress: existing?.deliveryAddress || '',
    packing: existing?.packing || settings.defaultPacking || '',
    loadingCondition: existing?.loadingCondition || settings.defaultLoadingCondition || '',
    paymentTerms: existing?.paymentTerms || settings.defaultPaymentTerms || '',
    gstPercent: existing?.gstPercent ?? settings.defaultGstPercent ?? 5,
    otherTerms: existing?.otherTerms || '',
    notes: existing?.notes || '',
    status: existing?.status || 'active',
    brokerageAmount: existing?.brokerageAmount || 0,
    loadingDeadline: existing?.loadingDeadline || '',
  });

  const [specs, setSpecs] = useState<{ label: string; value: string; unit?: string }[]>(
    existing?.product?.specs?.map((s: any) => ({ label: s.label, value: s.value, unit: s.unit })) || []
  );

  const selectedProduct = products.find(p => p.id === form.productId);
  const selectedSeller = parties.find(p => p.id === form.sellerId);
  const selectedBuyer = parties.find(p => p.id === form.buyerId);

  useEffect(() => {
    if (selectedProduct && !existing) {
      setSpecs(selectedProduct.specs.map(s => ({ label: s.label, value: s.value, unit: s.unit })));
    }
  }, [form.productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sellerId || !form.buyerId || !form.productId) {
      toast.error('Select seller, buyer and product');
      return;
    }

    const seller = parties.find(p => p.id === form.sellerId);
    const buyer = parties.find(p => p.id === form.buyerId);
    const product = products.find(p => p.id === form.productId);

    if (!seller || !buyer || !product) {
      toast.error('Invalid selection');
      return;
    }

    const contractData = {
      ...form,
      seller,
      buyer,
      product: { ...product, specs: specs.map((s, i) => ({ ...s, id: uuidv4(), order: i })) },
      brokerageAmount: form.brokerageAmount,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      await updateContract(existing.id, contractData);
      toast.success('Contract updated');
    } else {
      await addContract({ ...contractData, id: uuidv4(), createdAt: new Date().toISOString() } as any);
      toast.success('Contract created');
    }
    navigate('/contracts');
  };

  const updateSpec = (i: number, field: string, value: string) => {
    const updated = [...specs];
    updated[i] = { ...updated[i], [field]: value };
    setSpecs(updated);
  };

  const addSpec = () => setSpecs([...specs, { label: '', value: '', unit: '' }]);
  const removeSpec = (i: number) => setSpecs(specs.filter((_, idx) => idx !== i));

  const fyStart = parseInt(form.year.toString().split('-')[0]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/contracts')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{id ? 'Edit Contract' : 'New Contract Note'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Basic Info</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Contract No</label>
              <input value={form.contractNo} onChange={e => setForm({ ...form, contractNo: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Financial Year</label>
              <select value={`${form.year}-${form.year + 1}`}
                onChange={e => {
                  const start = parseInt(e.target.value.split('-')[0]);
                  setForm({ ...form, year: start });
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                {financialYears.map(fy => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Parties</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Seller *</label>
              <select value={form.sellerId} onChange={e => setForm({ ...form, sellerId: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" required>
                <option value="">Select Seller</option>
                {parties.filter(p => !p.type || p.type === 'seller' || p.type === 'both').map(p => (
                  <option key={p.id} value={p.id}>{p.legalName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Buyer *</label>
              <select value={form.buyerId} onChange={e => setForm({ ...form, buyerId: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" required>
                <option value="">Select Buyer</option>
                {parties.filter(p => !p.type || p.type === 'buyer' || p.type === 'both').map(p => (
                  <option key={p.id} value={p.id}>{p.legalName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Product */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Product</h2>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Product *</label>
            <select value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" required>
              <option value="">Select Product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {specs.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-gray-500">Specifications</label>
              {specs.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input value={s.label} onChange={e => updateSpec(i, 'label', e.target.value)}
                    placeholder="Label" className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                  <input value={s.value} onChange={e => updateSpec(i, 'value', e.target.value)}
                    placeholder="Value" className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                  <input value={s.unit || ''} onChange={e => updateSpec(i, 'unit', e.target.value)}
                    placeholder="Unit" className="w-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                  <button type="button" onClick={() => removeSpec(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Minus size={16} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addSpec} className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700">
                <Plus size={16} /> Add Spec
              </button>
            </div>
          )}
        </div>

        {/* Commercial Terms */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Commercial Terms</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex gap-2">
              <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Quantity" />
              <input value={form.quantityUnit} onChange={e => setForm({ ...form, quantityUnit: e.target.value })}
                className="w-28 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Unit" />
            </div>
            <div className="flex gap-2">
              <input type="number" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Price" />
              <input value={form.priceUnit} onChange={e => setForm({ ...form, priceUnit: e.target.value })}
                className="w-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Per unit" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Delivery Location</label>
            <input value={form.deliveryLocation} onChange={e => setForm({ ...form, deliveryLocation: e.target.value })}
              placeholder="e.g., Unjha" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Delivery Address</label>
            <input value={form.deliveryAddress} onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
              placeholder="Address will be provided by buyer" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Packing</label>
              <input value={form.packing} onChange={e => setForm({ ...form, packing: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Loading Condition</label>
              <input value={form.loadingCondition} onChange={e => setForm({ ...form, loadingCondition: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Payment Terms</label>
            <input value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">GST %</label>
              <input type="number" value={form.gstPercent} onChange={e => setForm({ ...form, gstPercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Loading Deadline</label>
              <input type="date" value={form.loadingDeadline} onChange={e => setForm({ ...form, loadingDeadline: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Other Terms</label>
            <textarea value={form.otherTerms} onChange={e => setForm({ ...form, otherTerms: e.target.value })}
              rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" />
          </div>
        </div>

        {/* Internal */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Internal</h2>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Brokerage Amount (Rs.)</label>
            <input type="number" value={form.brokerageAmount} onChange={e => setForm({ ...form, brokerageAmount: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Internal Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-medium hover:bg-rose-700 transition-colors">
            {id ? 'Update Contract' : 'Create Contract'}
          </button>
          <button type="button" onClick={() => navigate('/contracts')} className="px-6 py-3 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

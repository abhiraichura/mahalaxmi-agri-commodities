import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { ArrowLeft, Save, ChevronDown, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const QUANTITY_UNITS = [
  { value: 'MT', label: 'Metric Ton (MT)', factor: 1000 }, // 1 MT = 1000 KG
  { value: 'KG', label: 'Kilogram (KG)', factor: 1 },
];

export default function ContractForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { parties, products, contracts, addContract, updateContract, settings, currentFinancialYear, setCurrentFinancialYear } = useAppStore();

  const [form, setForm] = useState({
    contractNo: '',
    date: new Date().toISOString().split('T')[0],
    sellerId: '',
    buyerId: '',
    productId: '',
    quantity: 0,
    quantityUnit: 'MT' as 'MT' | 'KG',
    price: 0,
    priceUnit: 'KG',
    deliveryLocation: '',
    deliveryAddress: '',
    packing: settings.defaultPacking || '40 KG Plain P.P. Nett Packing with Double Stitching',
    loadingCondition: settings.defaultLoadingCondition || 'Goods to be loaded within one week',
    loadingDeadline: '',
    paymentTerms: settings.defaultPaymentTerms || '3 to 4 days payment with 1% discount after delivery',
    gstPercent: settings.defaultGstPercent || 5,
    otherTerms: '',
    notes: '',
    status: 'confirmed' as 'draft' | 'confirmed' | 'cancelled' | 'completed',
    financialYear: currentFinancialYear
  });

  const [fyDropdownOpen, setFyDropdownOpen] = useState(false);
  const [newFyInput, setNewFyInput] = useState('');
  const [showAddFy, setShowAddFy] = useState(false);

  const existing = id ? contracts.find(c => c.id === id) : null;

  useEffect(() => {
    if (existing) {
      setForm({
        contractNo: existing.contractNo || '',
        date: existing.date ? existing.date.split('T')[0] : new Date().toISOString().split('T')[0],
        sellerId: existing.sellerId || '',
        buyerId: existing.buyerId || '',
        productId: existing.productId || '',
        quantity: existing.quantity || 0,
        quantityUnit: (existing.quantityUnit as 'MT' | 'KG') || 'MT',
        price: existing.price || 0,
        priceUnit: existing.priceUnit || 'KG',
        deliveryLocation: existing.deliveryLocation || '',
        deliveryAddress: existing.deliveryAddress || '',
        packing: existing.packing || settings.defaultPacking || '',
        loadingCondition: existing.loadingCondition || settings.defaultLoadingCondition || '',
        loadingDeadline: existing.loadingDeadline || '',
        paymentTerms: existing.paymentTerms || settings.defaultPaymentTerms || '',
        gstPercent: existing.gstPercent || settings.defaultGstPercent || 5,
        otherTerms: existing.otherTerms || '',
        notes: existing.notes || '',
        status: existing.status || 'confirmed',
        financialYear: existing.financialYear || currentFinancialYear
      });
    } else {
      const fyContracts = contracts.filter(c => c.financialYear === currentFinancialYear);
      const maxNo = fyContracts.reduce((max, c) => {
        const num = parseInt(c.contractNo);
        return num > max ? num : max;
      }, 0);
      setForm(prev => ({ ...prev, contractNo: String(maxNo + 1).padStart(3, '0') }));
    }
  }, [existing, contracts, currentFinancialYear, settings]);

  const selectedSeller = parties.find(p => p.id === form.sellerId);
  const selectedBuyer = parties.find(p => p.id === form.buyerId);
  const selectedProduct = products.find(p => p.id === form.productId);

  // Calculate brokerage based on product settings and party type
  const calculateBrokerage = (): number => {
    if (!selectedProduct || form.quantity <= 0 || form.price <= 0) return 0;

    const b = selectedProduct.brokerage || {
      buyer: { type: 'percent', value: selectedProduct.defaultBrokerage || 0 },
      seller: { type: 'percent', value: selectedProduct.defaultBrokerage || 0 }
    };

    // Convert quantity to KG for calculation if needed
    const unitFactor = QUANTITY_UNITS.find(u => u.value === form.quantityUnit)?.factor || 1;
    const quantityInKg = form.quantity * unitFactor;
    const totalValue = quantityInKg * form.price;

    // Use buyer brokerage if buyer is selected, seller brokerage if seller is selected
    // For the contract, we calculate total brokerage (buyer + seller)
    const buyerBrokerage = b.buyer?.type === 'fixed' 
      ? (b.buyer?.value || 0) 
      : (totalValue * (b.buyer?.value || b.buyerPercent || 0)) / 100;

    const sellerBrokerage = b.seller?.type === 'fixed'
      ? (b.seller?.value || 0)
      : (totalValue * (b.seller?.value || b.sellerPercent || 0)) / 100;

    return buyerBrokerage + sellerBrokerage;
  };

  const brokerageAmount = calculateBrokerage();

  const handleAddFinancialYear = () => {
    if (!newFyInput.match(/^\d{4}-\d{4}$/)) {
      toast.error('Format must be YYYY-YYYY (e.g. 2026-2027)');
      return;
    }
    const years = [...settings.financialYears, newFyInput].sort();
    const updated = { ...settings, financialYears: years };
    useAppStore.getState().updateSettings(updated);
    useAppStore.getState().saveSettingsToFirebase();
    setForm({ ...form, financialYear: newFyInput });
    setCurrentFinancialYear(newFyInput);
    setNewFyInput('');
    setShowAddFy(false);
    toast.success('Financial year added');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sellerId || !form.buyerId || !form.productId) {
      toast.error('Please select seller, buyer and product');
      return;
    }
    if (!form.contractNo.trim()) {
      toast.error('Contract number is required');
      return;
    }

    const seller = parties.find(p => p.id === form.sellerId)!;
    const buyer = parties.find(p => p.id === form.buyerId)!;
    const product = products.find(p => p.id === form.productId)!;

    const year = parseInt(form.financialYear.split('-')[0]);

    const payload = {
      ...form,
      id: id || uuidv4(),
      year,
      seller,
      buyer,
      product,
      brokerageAmount,
      payments: existing?.payments || [],
      updatedAt: new Date().toISOString()
    };

    try {
      if (id) {
        await updateContract(id, payload);
        toast.success('Contract updated');
      } else {
        await addContract({ ...payload, createdAt: new Date().toISOString() });
        toast.success('Contract created');
      }
      navigate('/contracts');
    } catch (err) {
      toast.error('Failed to save');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/contracts')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{id ? 'Edit Contract' : 'New Contract Note'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contract Number & Financial Year */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract No. *</label>
            <input
              value={form.contractNo}
              onChange={e => setForm({ ...form, contractNo: e.target.value })}
              placeholder="001"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
            <button
              type="button"
              onClick={() => setFyDropdownOpen(!fyDropdownOpen)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-left flex items-center justify-between"
            >
              <span>{form.financialYear}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {fyDropdownOpen && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                {settings.financialYears.map(fy => (
                  <button
                    key={fy}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, financialYear: fy });
                      setCurrentFinancialYear(fy);
                      setFyDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${form.financialYear === fy ? 'bg-rose-50 text-rose-700 font-medium' : ''}`}
                  >
                    {fy}
                  </button>
                ))}
                <div className="border-t border-gray-100 px-4 py-2">
                  {!showAddFy ? (
                    <button
                      type="button"
                      onClick={() => setShowAddFy(true)}
                      className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add New Year
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={newFyInput}
                        onChange={e => setNewFyInput(e.target.value)}
                        placeholder="2026-2027"
                        className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddFinancialYear}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-sm"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seller *</label>
            <select
              value={form.sellerId}
              onChange={e => setForm({ ...form, sellerId: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            >
              <option value="">Select Seller</option>
              {parties.filter(p => p.type === 'seller' || p.type === 'both').map(p => (
                <option key={p.id} value={p.id}>{p.legalName}</option>
              ))}
            </select>
            {selectedSeller && (
              <div className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1">
                <p>{selectedSeller.address}</p>
                <p>{selectedSeller.city}, {selectedSeller.state}</p>
                {selectedSeller.gstin && <p>GSTIN: {selectedSeller.gstin}</p>}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buyer *</label>
            <select
              value={form.buyerId}
              onChange={e => setForm({ ...form, buyerId: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            >
              <option value="">Select Buyer</option>
              {parties.filter(p => p.type === 'buyer' || p.type === 'both').map(p => (
                <option key={p.id} value={p.id}>{p.legalName}</option>
              ))}
            </select>
            {selectedBuyer && (
              <div className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1">
                <p>{selectedBuyer.address}</p>
                <p>{selectedBuyer.city}, {selectedBuyer.state}</p>
                {selectedBuyer.gstin && <p>GSTIN: {selectedBuyer.gstin}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Product */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
          <select
            value={form.productId}
            onChange={e => setForm({ ...form, productId: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          >
            <option value="">Select Product</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {selectedProduct && (
            <div className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-600">
              <p>Buyer Brokerage: {selectedProduct.brokerage?.buyer?.value || selectedProduct.brokerage?.buyerPercent || selectedProduct.defaultBrokerage || 0}{selectedProduct.brokerage?.buyer?.type === 'fixed' || selectedProduct.brokerage?.buyerFixed ? ' Rs.' : '%'}</p>
              <p>Seller Brokerage: {selectedProduct.brokerage?.seller?.value || selectedProduct.brokerage?.sellerPercent || selectedProduct.defaultBrokerage || 0}{selectedProduct.brokerage?.seller?.type === 'fixed' || selectedProduct.brokerage?.sellerFixed ? ' Rs.' : '%'}</p>
            </div>
          )}
        </div>

        {/* Quantity & Price with proper units */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
              <select
                value={form.quantityUnit}
                onChange={e => setForm({ ...form, quantityUnit: e.target.value as 'MT' | 'KG' })}
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              >
                {QUANTITY_UNITS.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            {form.quantity > 0 && form.quantityUnit === 'MT' && (
              <p className="text-xs text-gray-500 mt-1">= {form.quantity * 1000} KG</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
              <input
                value={form.priceUnit}
                onChange={e => setForm({ ...form, priceUnit: e.target.value })}
                placeholder="Per unit"
                className="w-40 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Location</label>
            <input
              value={form.deliveryLocation}
              onChange={e => setForm({ ...form, deliveryLocation: e.target.value })}
              placeholder="e.g., Unjha"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
            <input
              value={form.deliveryAddress}
              onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
              placeholder="Address will be provided by buyer"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Packing</label>
            <input
              value={form.packing}
              onChange={e => setForm({ ...form, packing: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loading Condition</label>
            <input
              value={form.loadingCondition}
              onChange={e => setForm({ ...form, loadingCondition: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Loading Deadline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loading Deadline</label>
            <input
              type="date"
              value={form.loadingDeadline}
              onChange={e => setForm({ ...form, loadingDeadline: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Goods must be loaded by this date. Alert will show if overdue.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
            <input
              value={form.paymentTerms}
              onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST %</label>
            <input
              type="number"
              step="0.01"
              value={form.gstPercent}
              onChange={e => setForm({ ...form, gstPercent: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value as any })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            >
              <option value="confirmed">Confirmed</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Other Terms</label>
          <textarea
            value={form.otherTerms}
            onChange={e => setForm({ ...form, otherTerms: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
        </div>

        {/* Brokerage Preview */}
        {selectedProduct && form.quantity > 0 && form.price > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800">
              <strong>Brokerage Preview:</strong> Rs. {brokerageAmount.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Based on: {form.quantity} {form.quantityUnit} × Rs.{form.price}/{form.priceUnit} 
              {' | '}
              Buyer: {selectedProduct.brokerage?.buyer?.value || selectedProduct.brokerage?.buyerPercent || 0}{selectedProduct.brokerage?.buyer?.type === 'fixed' || selectedProduct.brokerage?.buyerFixed ? ' Rs.' : '%'}
              {' | '}
              Seller: {selectedProduct.brokerage?.seller?.value || selectedProduct.brokerage?.sellerPercent || 0}{selectedProduct.brokerage?.seller?.type === 'fixed' || selectedProduct.brokerage?.sellerFixed ? ' Rs.' : '%'}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700"
          >
            <Save className="w-4 h-4" /> {id ? 'Update' : 'Save'} Contract
          </button>
          <button
            type="button"
            onClick={() => navigate('/contracts')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

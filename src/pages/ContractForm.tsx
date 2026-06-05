import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import type { Contract, Party, ProductSpec } from '../types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export default function ContractForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { contracts, parties, products, settings, addContract, updateContract, loadContracts, loadParties, loadProducts } = useAppStore();

  const existing = id ? contracts.find(c => c.id === id) : null;
  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    contractNo: '',
    year: currentYear,
    date: new Date().toISOString().split('T')[0],
    sellerId: '',
    buyerId: '',
    productId: '',
    quantity: 0,
    quantityUnit: 'MT',
    price: 0,
    priceUnit: 'per MT',
    deliveryLocation: '',
    deliveryAddress: '',
    packing: settings.defaultPacking || '',
    loadingCondition: settings.defaultLoadingCondition || '',
    paymentTerms: settings.defaultPaymentTerms || '',
    gstPercent: settings.defaultGstPercent || 5,
    otherTerms: '',
    notes: '',
    status: 'draft' as 'draft' | 'confirmed' | 'cancelled' | 'completed'
  });

  const [selectedSeller, setSelectedSeller] = useState<Party | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<Party | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductSpec | null>(null);

  useEffect(() => {
    loadContracts();
    loadParties();
    loadProducts();
  }, []);

  useEffect(() => {
    if (existing) {
      setForm({
        contractNo: existing.contractNo,
        year: existing.year,
        date: existing.date,
        sellerId: existing.sellerId,
        buyerId: existing.buyerId,
        productId: existing.productId,
        quantity: existing.quantity,
        quantityUnit: existing.quantityUnit,
        price: existing.price,
        priceUnit: existing.priceUnit,
        deliveryLocation: existing.deliveryLocation,
        deliveryAddress: existing.deliveryAddress,
        packing: existing.packing,
        loadingCondition: existing.loadingCondition,
        paymentTerms: existing.paymentTerms,
        gstPercent: existing.gstPercent,
        otherTerms: existing.otherTerms || '',
        notes: existing.notes || '',
        status: existing.status
      });
      setSelectedSeller(existing.seller);
      setSelectedBuyer(existing.buyer);
      setSelectedProduct(existing.product);
    }
  }, [existing]);

  useEffect(() => {
    if (form.sellerId) {
      const seller = parties.find(p => p.id === form.sellerId);
      setSelectedSeller(seller || null);
    }
  }, [form.sellerId, parties]);

  useEffect(() => {
    if (form.buyerId) {
      const buyer = parties.find(p => p.id === form.buyerId);
      setSelectedBuyer(buyer || null);
    }
  }, [form.buyerId, parties]);

  useEffect(() => {
    if (form.productId) {
      const product = products.find(p => p.id === form.productId);
      setSelectedProduct(product || null);
    }
  }, [form.productId, products]);

  const calculateBrokerage = () => {
    if (!selectedProduct) return 0;
    // Use product's default brokerage
    const brokerageRate = selectedProduct.defaultBrokerage || 0;
    return (form.quantity * form.price * brokerageRate) / 100;
  };

  const handleSubmit = async () => {
    if (!form.sellerId || !form.buyerId || !form.productId) {
      toast.error('Seller, Buyer and Product are required');
      return;
    }
    if (!form.contractNo) {
      toast.error('Contract number is required');
      return;
    }

    const seller = parties.find(p => p.id === form.sellerId)!;
    const buyer = parties.find(p => p.id === form.buyerId)!;
    const product = products.find(p => p.id === form.productId)!;
    const brokerageAmount = calculateBrokerage();

    const contract: Contract = {
      id: id || uuidv4(),
      contractNo: form.contractNo,
      year: form.year,
      date: form.date,
      sellerId: form.sellerId,
      seller,
      buyerId: form.buyerId,
      buyer,
      productId: form.productId,
      product,
      quantity: form.quantity,
      quantityUnit: form.quantityUnit,
      price: form.price,
      priceUnit: form.priceUnit,
      deliveryLocation: form.deliveryLocation,
      deliveryAddress: form.deliveryAddress,
      packing: form.packing,
      loadingCondition: form.loadingCondition,
      paymentTerms: form.paymentTerms,
      gstPercent: form.gstPercent,
      otherTerms: form.otherTerms,
      notes: form.notes,
      status: form.status,
      brokerageAmount,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date()
    };

    try {
      if (id) { await updateContract(id, contract); toast.success('Updated!'); }
      else { await addContract(contract); toast.success('Created!'); }
      navigate('/contracts');
    } catch (e) { toast.error('Failed to save'); }
  };

  const sellers = parties.filter(p => p.type === 'seller' || p.type === 'both');
  const buyers = parties.filter(p => p.type === 'buyer' || p.type === 'both');

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate('/contracts')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{id ? 'Edit Contract' : 'New Contract Note'}</h1>
        <div className="space-y-4">
          {/* Contract No & Date */}
          <div className="grid md:grid-cols-3 gap-4">
            <input value={form.contractNo} onChange={e => setForm({ ...form, contractNo: e.target.value })}
              placeholder="Contract No *" className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <select value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Parties */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Seller *</label>
              <select value={form.sellerId} onChange={e => setForm({ ...form, sellerId: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                <option value="">Select Seller</option>
                {sellers.map(p => <option key={p.id} value={p.id}>{p.legalName}</option>)}
              </select>
              {selectedSeller && (
                <div className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-600">
                  <p className="font-medium text-gray-900">{selectedSeller.legalName}</p>
                  <p>{selectedSeller.address}, {selectedSeller.city}</p>
                  <p>GSTIN: {selectedSeller.gstin}</p>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Buyer *</label>
              <select value={form.buyerId} onChange={e => setForm({ ...form, buyerId: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                <option value="">Select Buyer</option>
                {buyers.map(p => <option key={p.id} value={p.id}>{p.legalName}</option>)}
              </select>
              {selectedBuyer && (
                <div className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-600">
                  <p className="font-medium text-gray-900">{selectedBuyer.legalName}</p>
                  <p>{selectedBuyer.address}, {selectedBuyer.city}</p>
                  <p>GSTIN: {selectedBuyer.gstin}</p>
                </div>
              )}
            </div>
          </div>

          {/* Product */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Product *</label>
            <select value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <option value="">Select Product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {selectedProduct && (
              <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium text-gray-900">{selectedProduct.name}</p>
                <p className="text-xs text-gray-500">Brokerage: {selectedProduct.defaultBrokerage}%</p>
                {selectedProduct.specs && selectedProduct.specs.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {selectedProduct.specs.sort((a, b) => a.order - b.order).map(spec => (
                      <div key={spec.id} className="text-xs text-gray-600">
                        <span className="font-medium">{spec.label}:</span> {spec.value} {spec.unit}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Commercial Terms */}
          <h3 className="text-sm font-semibold text-gray-700 pt-4 border-t border-gray-100">Commercial Terms</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex gap-2">
              <input type="number" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                placeholder="Quantity" className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              <input value={form.quantityUnit} onChange={e => setForm({ ...form, quantityUnit: e.target.value })}
                className="w-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Unit" />
            </div>
            <div className="flex gap-2">
              <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                placeholder="Price" className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              <input value={form.priceUnit} onChange={e => setForm({ ...form, priceUnit: e.target.value })}
                className="w-40 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Per unit" />
            </div>
          </div>

          <input value={form.deliveryLocation} onChange={e => setForm({ ...form, deliveryLocation: e.target.value })}
            placeholder="Delivery Location e.g., Unjha" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <input value={form.deliveryAddress} onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
            placeholder="Delivery Address (will be provided by buyer)" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <input value={form.packing} onChange={e => setForm({ ...form, packing: e.target.value })}
            placeholder="Packing" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <input value={form.loadingCondition} onChange={e => setForm({ ...form, loadingCondition: e.target.value })}
            placeholder="Loading Condition" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <input value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
            placeholder="Payment Terms" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />

          <div className="grid md:grid-cols-2 gap-4">
            <input type="number" step="0.01" value={form.gstPercent} onChange={e => setForm({ ...form, gstPercent: parseFloat(e.target.value) || 0 })}
              placeholder="GST %" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <textarea value={form.otherTerms} onChange={e => setForm({ ...form, otherTerms: e.target.value })}
            placeholder="Other Terms & Conditions" rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" />
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Internal Notes (not shown on contract)" rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" />

          {/* Brokerage Summary */}
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
            <h4 className="text-sm font-semibold text-rose-700 mb-2">Brokerage Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Quantity</p>
                <p className="font-medium text-gray-900">{form.quantity} {form.quantityUnit}</p>
              </div>
              <div>
                <p className="text-gray-500">Price</p>
                <p className="font-medium text-gray-900">Rs.{form.price.toLocaleString('en-IN')} {form.priceUnit}</p>
              </div>
              <div>
                <p className="text-gray-500">Brokerage</p>
                <p className="font-bold text-rose-700">Rs.{calculateBrokerage().toLocaleString('en-IN')}</p>
              </div>
            </div>
            {selectedProduct && (
              <p className="text-xs text-gray-500 mt-2">Rate: {selectedProduct.defaultBrokerage}% (from product settings)</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100 mt-6">
          <button onClick={() => navigate('/contracts')} className="px-6 py-3 text-gray-600 font-medium">Cancel</button>
          <button onClick={handleSubmit} className="px-8 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 flex items-center gap-2">
            <Save className="w-4 h-4" /> {id ? 'Update' : 'Save'} Contract
          </button>
        </div>
      </div>
    </div>
  );
}

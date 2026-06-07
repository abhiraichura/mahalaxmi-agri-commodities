import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, X, Save, Printer, FileText, Trash2, AlertCircle } from 'lucide-react';
import { generateContractPDF, downloadPDF } from '../utils/pdfGenerator';
import { format, addDays } from 'date-fns';

export default function ContractForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { parties, products, contracts, addContract, updateContract, deleteContract, settings } = useAppStore();
  const isEdit = !!id;
  const existing = isEdit ? contracts.find(c => c.id === id) : null;

  const [sellerId, setSellerId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [productId, setProductId] = useState('');
  const [qualityId, setQualityId] = useState('');
  const [qualitySpecs, setQualitySpecs] = useState<{specId: string; label: string; value: string; unit: string}[]>([]);
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('MT');
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('USD/MT');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [packing, setPacking] = useState(settings?.defaultPacking || '');
  const [loadingCondition, setLoadingCondition] = useState(settings?.defaultLoadingCondition || '');
  const [loadingDeadline, setLoadingDeadline] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(settings?.defaultPaymentTerms || '');
  const [gstPercent, setGstPercent] = useState(settings?.defaultGstPercent || 0);
  const [otherTerms, setOtherTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'draft' | 'confirmed' | 'cancelled' | 'completed'>('draft');
  const [payments, setPayments] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [financialYear, setFinancialYear] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), amount: 0, mode: 'bank_transfer' as any, reference: '', notes: '' });

  // Contract number auto-generation
  const [contractNo, setContractNo] = useState('');

  const sellers = useMemo(() => parties.filter(p => p.type === 'seller' || p.type === 'both'), [parties]);
  const buyers = useMemo(() => parties.filter(p => p.type === 'buyer' || p.type === 'both'), [parties]);
  const selectedProduct = useMemo(() => products.find(p => p.id === productId), [products, productId]);
  const selectedQuality = useMemo(() => selectedProduct?.qualities?.find((q: any) => q.id === qualityId), [selectedProduct, qualityId]);

  useEffect(() => {
    if (existing) {
      setSellerId(existing.sellerId);
      setBuyerId(existing.buyerId);
      setProductId(existing.productId);
      setQualityId(existing.quality?.qualityId || '');
      setQualitySpecs(existing.quality?.specs || []);
      setQuantity(String(existing.quantity));
      setQuantityUnit(existing.quantityUnit);
      setPrice(String(existing.price));
      setPriceUnit(existing.priceUnit);
      setDeliveryLocation(existing.deliveryLocation);
      setDeliveryAddress(existing.deliveryAddress);
      setPacking(existing.packing);
      setLoadingCondition(existing.loadingCondition);
      setLoadingDeadline(existing.loadingDeadline);
      setPaymentTerms(existing.paymentTerms);
      setGstPercent(existing.gstPercent);
      setOtherTerms(existing.otherTerms);
      setNotes(existing.notes);
      setStatus(existing.status);
      setPayments(existing.payments || []);
      setYear(existing.year);
      setFinancialYear(existing.financialYear);
      setDate(existing.date);
      setContractNo(existing.contractNo);
    } else {
      const fy = settings?.financialYearStart || new Date().getFullYear();
      const currentFY = `${fy}-${fy + 1}`;
      setFinancialYear(currentFY);
      setYear(new Date().getFullYear());
      // Auto-generate contract number
      const yearContracts = contracts.filter(c => c.year === new Date().getFullYear());
      const nextNo = yearContracts.length + 1;
      setContractNo(`MAC-${new Date().getFullYear()}-${String(nextNo).padStart(4, '0')}`);
    }
  }, [existing, settings, contracts]);

  // When product changes, reset quality
  useEffect(() => {
    if (productId && selectedProduct) {
      // If product has qualities, don't auto-select any
      if (!selectedProduct.qualities || selectedProduct.qualities.length === 0) {
        setQualityId('');
        setQualitySpecs([]);
      }
    } else {
      setQualityId('');
      setQualitySpecs([]);
    }
  }, [productId]);

  // When quality changes, populate specs
  useEffect(() => {
    if (selectedQuality) {
      setQualitySpecs(selectedQuality.specs.map((s: any) => ({
        specId: s.id,
        label: s.label,
        value: s.value,
        unit: s.unit
      })));
    } else {
      setQualitySpecs([]);
    }
  }, [qualityId, selectedQuality]);

  const updateQualitySpecValue = (specId: string, value: string) => {
    setQualitySpecs(specs => specs.map(s => s.specId === specId ? { ...s, value } : s));
  };

  const totalValue = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const prc = parseFloat(price) || 0;
    return qty * prc;
  }, [quantity, price]);

  const calculateBrokerage = (partyType: 'buyer' | 'seller') => {
    if (!selectedProduct) return 0;
    const b = selectedProduct.brokerage || {
      buyer: { type: 'percent', value: selectedProduct.defaultBrokerage || 0 },
      seller: { type: 'percent', value: selectedProduct.defaultBrokerage || 0 }
    };
    const config = partyType === 'buyer' ? b.buyer : b.seller;
    if (!config) return 0;
    if (config.type === 'fixed') return config.value || 0;
    return totalValue * (config.value || 0) / 100;
  };

  const buyerBrokerage = useMemo(() => calculateBrokerage('buyer'), [selectedProduct, totalValue]);
  const sellerBrokerage = useMemo(() => calculateBrokerage('seller'), [selectedProduct, totalValue]);

  const handleSave = async () => {
    if (!sellerId || !buyerId || !productId || !quantity || !price) {
      toast.error('Please fill all required fields');
      return;
    }

    const seller = parties.find(p => p.id === sellerId);
    const buyer = parties.find(p => p.id === buyerId);
    const product = products.find(p => p.id === productId);

    if (!seller || !buyer || !product) {
      toast.error('Invalid selection');
      return;
    }

    const payload = {
      id: id || uuidv4(),
      contractNo,
      year,
      financialYear,
      date,
      sellerId,
      seller,
      buyerId,
      buyer,
      productId,
      product,
      quality: qualityId ? {
        qualityId,
        qualityName: selectedQuality?.name || '',
        specs: qualitySpecs
      } : null,
      quantity: parseFloat(quantity),
      quantityUnit,
      price: parseFloat(price),
      priceUnit,
      deliveryLocation,
      deliveryAddress,
      packing,
      loadingCondition,
      loadingDeadline,
      paymentTerms,
      gstPercent,
      otherTerms,
      notes,
      status,
      buyerBrokerageAmount: buyerBrokerage,
      sellerBrokerageAmount: sellerBrokerage,
      brokerageAmount: buyerBrokerage + sellerBrokerage,
      payments: isEdit ? existing?.payments || [] : [],
      createdAt: isEdit ? existing?.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (isEdit) {
        await updateContract(id!, payload);
        toast.success('Contract updated');
      } else {
        await addContract(payload as any);
        toast.success('Contract created');
      }
      navigate('/contracts');
    } catch (err) {
      toast.error('Failed to save contract');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this contract?')) return;
    await deleteContract(id!);
    toast.success('Deleted');
    navigate('/contracts');
  };

  const handlePrint = () => {
    if (!existing) return;
    const doc = generateContractPDF(existing, settings);
    downloadPDF(doc, `Contract_${existing.contractNo}.pdf`);
  };

  const handleAddPayment = () => {
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      toast.error('Enter valid amount');
      return;
    }
    const newPayment = {
      id: crypto.randomUUID(),
      ...paymentForm,
      createdAt: new Date().toISOString()
    };
    const updated = [...payments, newPayment];
    setPayments(updated);
    setPaymentForm({ date: format(new Date(), 'yyyy-MM-dd'), amount: 0, mode: 'bank_transfer', reference: '', notes: '' });
    setShowPaymentModal(false);
    toast.success('Payment added');
  };

  const handleRemovePayment = (pid: string) => {
    setPayments(payments.filter(p => p.id !== pid));
  };

  return (
    <div className="max-w-4xl mx-auto pt-16 lg:pt-8 px-4 lg:px-8 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/contracts')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit Contract' : 'New Contract'}</h1>
        {isEdit && (
          <div className="flex gap-2 ml-auto">
            <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={handleDelete} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
        {/* Contract Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract No</label>
            <input value={contractNo} onChange={e => setContractNo(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
            <select value={financialYear} onChange={e => setFinancialYear(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              {(settings?.financialYears || []).map(fy => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seller *</label>
            <select value={sellerId} onChange={e => setSellerId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <option value="">Select Seller</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.legalName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buyer *</label>
            <select value={buyerId} onChange={e => setBuyerId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <option value="">Select Buyer</option>
              {buyers.map(b => <option key={b.id} value={b.id}>{b.legalName}</option>)}
            </select>
          </div>
        </div>

        {/* Product & Quality */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
            <select value={productId} onChange={e => setProductId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <option value="">Select Product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {selectedProduct?.qualities && selectedProduct.qualities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
              <select value={qualityId} onChange={e => setQualityId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                <option value="">Select Quality</option>
                {selectedProduct.qualities.map((q: any) => (
                  <option key={q.id} value={q.id}>{q.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Quality Specifications (editable) */}
        {qualitySpecs.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Specifications {selectedQuality?.name ? `- ${selectedQuality.name}` : ''}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {qualitySpecs.map(spec => (
                <div key={spec.specId}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{spec.label} {spec.unit ? `(${spec.unit})` : ''}</label>
                  <input
                    value={spec.value}
                    onChange={e => updateQualitySpecValue(spec.specId, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quantity & Price */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <input value={quantityUnit} onChange={e => setQuantityUnit(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price Unit</label>
            <input value={priceUnit} onChange={e => setPriceUnit(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        {/* Delivery & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Location</label>
            <input value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
            <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Packing</label>
            <input value={packing} onChange={e => setPacking(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loading Condition</label>
            <input value={loadingCondition} onChange={e => setLoadingCondition(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loading Deadline</label>
            <input type="date" value={loadingDeadline} onChange={e => setLoadingDeadline(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
            <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        {/* GST & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST %</label>
            <input type="number" value={gstPercent} onChange={e => setGstPercent(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Other Terms</label>
          <textarea value={otherTerms} onChange={e => setOtherTerms(e.target.value)} rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
        </div>

        {/* Brokerage Preview */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="text-sm font-medium text-amber-800 mb-2">Brokerage Preview</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Buyer Brokerage:</span>
              <span className="ml-2 font-medium">₹{buyerBrokerage.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">Seller Brokerage:</span>
              <span className="ml-2 font-medium">₹{sellerBrokerage.toFixed(2)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Total Value:</span>
              <span className="ml-2 font-medium">₹{totalValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payments (edit mode only) */}
        {isEdit && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Payments</h4>
              <button onClick={() => setShowPaymentModal(true)} className="text-sm text-rose-600 hover:text-rose-700 font-medium">
                + Add Payment
              </button>
            </div>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-400">No payments recorded</p>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">₹{p.amount} - {p.mode}</p>
                      <p className="text-xs text-gray-500">{p.date} {p.reference && `| Ref: ${p.reference}`}</p>
                    </div>
                    <button onClick={() => handleRemovePayment(p.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700">
            <Save className="w-4 h-4" /> {isEdit ? 'Update Contract' : 'Create Contract'}
          </button>
          <button onClick={() => navigate('/contracts')} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
            Cancel
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Payment</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <select value={paymentForm.mode} onChange={e => setPaymentForm({...paymentForm, mode: e.target.value as any})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input value={paymentForm.notes} onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAddPayment} className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700">Add</button>
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

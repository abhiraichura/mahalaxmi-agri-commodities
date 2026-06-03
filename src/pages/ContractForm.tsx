import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Search, Plus, Trash2, FileText, Save, X, Users, Package, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import { Party, ProductSpec, Contract, SpecField } from '../types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface FormData {
  date: string;
  quantity: number;
  quantityUnit: string;
  price: number;
  priceUnit: string;
  deliveryLocation: string;
  deliveryAddress: string;
  packing: string;
  loadingCondition: string;
  paymentTerms: string;
  gstPercent: number;
  otherTerms: string;
  brokeragePercent: number;
  brokerageFixed: number;
}

export default function ContractForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { parties, products, settings, currentYear, addContract, updateContract, contracts, addParty, loadParties, loadProducts } = useAppStore();

  const [selectedSeller, setSelectedSeller] = useState<Party | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<Party | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductSpec | null>(null);
  const [showSellerSearch, setShowSellerSearch] = useState(false);
  const [showBuyerSearch, setShowBuyerSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewParty, setShowNewParty] = useState(false);
  const [newPartyType, setNewPartyType] = useState<'seller' | 'buyer'>('buyer');
  const [saving, setSaving] = useState(false);
  const [gstLoading, setGstLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      quantityUnit: 'M. TONES',
      priceUnit: 'M. TONES F.O.R.',
      packing: settings.defaultPacking,
      loadingCondition: settings.defaultLoadingCondition,
      paymentTerms: settings.defaultPaymentTerms,
      gstPercent: settings.defaultGstPercent,
      quantity: 10,
      price: 63000,
      brokeragePercent: 0.5,
      brokerageFixed: 0
    }
  });

  // Load data
  useEffect(() => {
    loadParties();
    loadProducts();
  }, []);

  // Edit mode
  useEffect(() => {
    if (id && contracts.length > 0) {
      const c = contracts.find(x => x.id === id);
      if (c) {
        setSelectedSeller(c.seller);
        setSelectedBuyer(c.buyer);
        setSelectedProduct(c.product);
        reset({
          date: c.date,
          quantity: c.quantity,
          quantityUnit: c.quantityUnit,
          price: c.price,
          priceUnit: c.priceUnit,
          deliveryLocation: c.deliveryLocation,
          deliveryAddress: c.deliveryAddress,
          packing: c.packing,
          loadingCondition: c.loadingCondition,
          paymentTerms: c.paymentTerms,
          gstPercent: c.gstPercent,
          otherTerms: c.otherTerms || '',
          brokeragePercent: c.brokerageAmount / (c.quantity * c.price) * 100 || 0.5,
          brokerageFixed: 0
        });
      }
    }
  }, [id, contracts]);

  const generateContractNo = () => {
    const year = currentYear.toString().slice(-2);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${random}${year}`;
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedSeller || !selectedBuyer || !selectedProduct) {
      toast.error('Please select seller, buyer, and product');
      return;
    }

    setSaving(true);
    try {
      const totalValue = data.quantity * data.price;
      const brokerage = data.brokerageFixed > 0 ? data.brokerageFixed : (totalValue * data.brokeragePercent) / 100;

      const contract: Contract = {
        id: id || uuidv4(),
        contractNo: id ? (contracts.find(c => c.id === id)?.contractNo || generateContractNo()) : generateContractNo(),
        year: currentYear,
        date: data.date,
        sellerId: selectedSeller.id,
        seller: selectedSeller,
        buyerId: selectedBuyer.id,
        buyer: selectedBuyer,
        productId: selectedProduct.id,
        product: selectedProduct,
        quantity: data.quantity,
        quantityUnit: data.quantityUnit,
        price: data.price,
        priceUnit: data.priceUnit,
        deliveryLocation: data.deliveryLocation,
        deliveryAddress: data.deliveryAddress,
        packing: data.packing,
        loadingCondition: data.loadingCondition,
        paymentTerms: data.paymentTerms,
        gstPercent: data.gstPercent,
        otherTerms: data.otherTerms,
        notes: '',
        status: 'confirmed',
        brokerageAmount: brokerage,
        createdAt: id ? (contracts.find(c => c.id === id)?.createdAt || new Date()) : new Date(),
        updatedAt: new Date()
      };

      if (id) {
        await updateContract(id, contract);
        toast.success('Contract updated!');
      } else {
        await addContract(contract);
        toast.success('Contract saved!');
      }

      navigate(`/contract/${contract.id}`);
    } catch (e) {
      toast.error('Failed to save contract');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const filteredParties = parties.filter(p =>
    p.legalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.gstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Contract' : 'New Contract Note'}</h1>
          <p className="text-sm text-gray-500 mt-1">Fill details and save to generate copies</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Parties */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-600" /> Parties
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <PartySelector label="Seller" selected={selectedSeller} onSelect={setSelectedSeller}
              parties={filteredParties.filter(p => p.type === 'seller' || p.type === 'both')}
              showSearch={showSellerSearch} setShowSearch={setShowSellerSearch}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              onAddNew={() => { setNewPartyType('seller'); setShowNewParty(true); }} />
            <PartySelector label="Buyer" selected={selectedBuyer} onSelect={setSelectedBuyer}
              parties={filteredParties.filter(p => p.type === 'buyer' || p.type === 'both')}
              showSearch={showBuyerSearch} setShowSearch={setShowBuyerSearch}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              onAddNew={() => { setNewPartyType('buyer'); setShowNewParty(true); }} />
          </div>
        </div>

        {/* Product */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-rose-600" /> Product
          </h2>
          <select {...register('productId')}
            onChange={(e) => {
              const p = products.find(x => x.id === e.target.value);
              setSelectedProduct(p || null);
            }}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-4">
            <option value="">Select Product...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {selectedProduct && selectedProduct.specs && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Specifications</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {selectedProduct.specs.map((spec, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                    <span className="text-sm font-medium text-gray-700">{spec.label}</span>
                    <span className="text-sm text-gray-900">{spec.value} {spec.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Commercial Terms */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Commercial Terms</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Quantity</label>
              <div className="flex gap-2">
                <input {...register('quantity', { valueAsNumber: true })} type="number" step="0.001" className="flex-1 input-field" />
                <input {...register('quantityUnit')} className="w-32 input-field" placeholder="Unit" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Price</label>
              <div className="flex gap-2">
                <input {...register('price', { valueAsNumber: true })} type="number" step="0.01" className="flex-1 input-field" />
                <input {...register('priceUnit')} className="w-40 input-field" placeholder="Per unit" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Delivery Location</label>
              <input {...register('deliveryLocation')} placeholder="e.g., Unjha" className="w-full input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Delivery Address</label>
              <input {...register('deliveryAddress')} placeholder="Address will be provided by buyer" className="w-full input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Packing</label>
              <input {...register('packing')} className="w-full input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Loading Condition</label>
              <input {...register('loadingCondition')} className="w-full input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Terms</label>
              <input {...register('paymentTerms')} className="w-full input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">GST %</label>
              <input {...register('gstPercent', { valueAsNumber: true })} type="number" step="0.01" className="w-full input-field" />
            </div>
          </div>
        </div>

        {/* Brokerage */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Brokerage</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Brokerage %</label>
              <input {...register('brokeragePercent', { valueAsNumber: true })} type="number" step="0.01" className="w-full input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Fixed Brokerage (Rs.)</label>
              <input {...register('brokerageFixed', { valueAsNumber: true })} type="number" step="0.01" className="w-full input-field" />
            </div>
          </div>
        </div>

        {/* Other Terms */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Other Terms</h2>
          <textarea {...register('otherTerms')} rows={3} placeholder="Additional terms..." className="w-full input-field resize-none" />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button type="button" onClick={() => navigate('/')} className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-8 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {id ? 'Update Contract' : 'Save Contract'}
          </button>
        </div>
      </form>

      {/* New Party Modal */}
      {showNewParty && (
        <NewPartyModal type={newPartyType} onClose={() => setShowNewParty(false)}
          onSave={async (party: Party) => {
            await addParty(party);
            if (newPartyType === 'seller') setSelectedSeller(party);
            else setSelectedBuyer(party);
            setShowNewParty(false);
            toast.success('Party added!');
          }} />
      )}
    </div>
  );
}

function PartySelector({ label, selected, onSelect, parties, showSearch, setShowSearch, searchQuery, setSearchQuery, onAddNew }: any) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <button type="button" onClick={() => { setShowSearch(true); setSearchQuery(''); }}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          {selected ? (
            <div className="text-left">
              <p className="font-medium text-gray-900">{selected.legalName}</p>
              <p className="text-xs text-gray-500">{selected.gstin}</p>
            </div>
          ) : <span className="text-gray-500">Select {label}...</span>}
          <Search className="w-4 h-4 text-gray-400" />
        </button>

        {showSearch && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-80 overflow-auto">
            <div className="p-3 border-b border-gray-100">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search name, GSTIN, city..." autoFocus
                className="w-full px-4 py-2 bg-gray-50 rounded-lg text-sm" />
            </div>
            <div className="p-2">
              {parties.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500 mb-3">No {label.toLowerCase()}s found</p>
                  <button onClick={onAddNew} className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-sm font-medium">
                    <Plus className="w-4 h-4" /> Add New {label}
                  </button>
                </div>
              ) : (
                parties.map((party: Party) => (
                  <button key={party.id} type="button"
                    onClick={() => { onSelect(party); setShowSearch(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <p className="font-medium text-gray-900">{party.legalName}</p>
                    <p className="text-xs text-gray-500">{party.gstin} &bull; {party.city}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NewPartyModal({ type, onClose, onSave }: any) {
  const [form, setForm] = useState({ name: '', legalName: '', gstin: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', pan: '', brokeragePercent: 0.5, brokerageFixed: 0 });
  const [gstVerified, setGstVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const verifyGST = async () => {
    if (form.gstin.length !== 15) { toast.error('Enter valid 15-digit GSTIN'); return; }
    setVerifying(true);
    try {
      const res = await fetch(`https://sheet.gstincheck.co.in/check/${form.gstin}`);
      const data = await res.json();
      if (data?.taxpayerInfo) {
        const info = data.taxpayerInfo;
        const addr = info.pradr?.addr || {};
        setForm(prev => ({
          ...prev,
          legalName: info.lgnm || prev.legalName,
          address: `${addr.bno || ''} ${addr.st || ''} ${addr.loc || ''}`.trim(),
          city: addr.city || addr.dst || '',
          state: addr.stcd || '',
          pincode: addr.pncd || ''
        }));
        setGstVerified(true);
        toast.success('GST verified!');
      } else {
        toast.error('Could not verify GSTIN');
      }
    } catch (e) {
      toast.error('GST service unavailable');
    }
    setVerifying(false);
  };

  const handleSave = () => {
    if (!form.legalName || !form.gstin) { toast.error('Legal name and GSTIN required'); return; }
    const party: Party = {
      id: uuidv4(),
      ...form,
      type: type === 'seller' ? 'seller' : 'buyer',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    onSave(party);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add New {type === 'seller' ? 'Seller' : 'Buyer'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })} maxLength={15}
              placeholder="GSTIN (15 digits)" className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase" />
            <button onClick={verifyGST} disabled={verifying || form.gstin.length !== 15}
              className="px-4 py-3 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium disabled:opacity-50">
              {verifying ? '...' : 'Verify'}
            </button>
          </div>
          {gstVerified && <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="w-4 h-4" /> GST Verified</div>}
          <input value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} placeholder="Legal Name *" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Display Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Address" rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="State" className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="Pincode" className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <input value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })} maxLength={10} placeholder="PAN" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase" />
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={!form.legalName || !form.gstin}
            className="px-6 py-2 bg-rose-600 text-white rounded-xl font-medium disabled:opacity-50">Save Party</button>
        </div>
      </div>
    </div>
  );
}

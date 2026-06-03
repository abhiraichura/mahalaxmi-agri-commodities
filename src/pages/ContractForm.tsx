import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { 
  Search, 
  Plus, 
  Trash2, 
  FileText, 
  Save, 
  X,
  ChevronDown,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import { Party, ProductSpec, Contract, SpecField } from '../types';
import { generateContractPDF, downloadPDF } from '../utils/pdfGenerator';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface ContractFormData {
  sellerId: string;
  buyerId: string;
  productId: string;
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
  notes: string;
  brokeragePercent: number;
  brokerageFixed: number;
}

export default function ContractForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { parties, products, settings, currentYear, addParty } = useAppStore();

  const [showSellerSearch, setShowSellerSearch] = useState(false);
  const [showBuyerSearch, setShowBuyerSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<Party | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<Party | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductSpec | null>(null);
  const [contractType, setContractType] = useState<'buyer_copy' | 'seller_copy' | 'broker_copy'>('broker_copy');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNewPartyModal, setShowNewPartyModal] = useState(false);
  const [newPartyType, setNewPartyType] = useState<'buyer' | 'seller'>('buyer');
  const [gstLoading, setGstLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, control, reset } = useForm<ContractFormData>({
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

  const { fields: specFields, append, remove } = useFieldArray({
    control,
    name: 'specs' as any
  });

  // Load existing contract if editing
  useEffect(() => {
    if (id) {
      // In real app, fetch from Firebase
      // For now, we'll just set some defaults
    }
  }, [id]);

  // Auto-fill from party selection
  const handleSelectParty = (party: Party, type: 'seller' | 'buyer') => {
    if (type === 'seller') {
      setSelectedSeller(party);
      setValue('sellerId', party.id);
      setShowSellerSearch(false);
    } else {
      setSelectedBuyer(party);
      setValue('buyerId', party.id);
      setShowBuyerSearch(false);
    }
  };

  // GST Verification
  const verifyGST = async (gstin: string) => {
    if (!gstin || gstin.length !== 15) {
      toast.error('Please enter a valid 15-digit GSTIN');
      return;
    }

    setGstLoading(true);
    try {
      // Using a free GST verification API
      const response = await fetch(`https://sheet.gstincheck.co.in/check/${gstin}`);
      const data = await response.json();

      if (data && data.taxpayerInfo) {
        const info = data.taxpayerInfo;
        const addr = info.pradr?.addr || {};

        toast.success('GST Verified successfully!');
        return {
          legalName: info.lgnm || '',
          tradeName: info.tradeNam || '',
          address: `${addr.bno || ''} ${addr.st || ''} ${addr.loc || ''}`.trim(),
          city: addr.city || addr.dst || '',
          state: addr.stcd || '',
          pincode: addr.pncd || '',
          status: info.sts || '',
          constitution: info.ctb || ''
        };
      } else {
        toast.error('Could not verify GSTIN');
        return null;
      }
    } catch (error) {
      toast.error('GST verification service unavailable');
      return null;
    } finally {
      setGstLoading(false);
    }
  };

  // Generate contract number
  const generateContractNo = () => {
    const year = currentYear.toString().slice(-2);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${random}${year}`;
  };

  // Calculate brokerage
  const calculateBrokerage = (data: ContractFormData) => {
    const totalValue = data.quantity * data.price;
    if (data.brokerageFixed > 0) {
      return data.brokerageFixed;
    }
    return (totalValue * (data.brokeragePercent || 0.5)) / 100;
  };

  // Submit handler
  const onSubmit = async (data: ContractFormData) => {
    if (!selectedSeller || !selectedBuyer || !selectedProduct) {
      toast.error('Please select seller, buyer, and product');
      return;
    }

    setIsGenerating(true);

    try {
      const contract: Contract = {
        id: id || uuidv4(),
        contractNo: id || generateContractNo(),
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
        notes: data.notes,
        status: 'confirmed',
        type: contractType,
        brokerageAmount: calculateBrokerage(data),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate PDF
      const doc = generateContractPDF(contract, settings, contractType);

      // Save to store (in real app, save to Firebase)
      // await saveContract(contract);

      // Download PDF
      downloadPDF(doc, `Contract_${contract.contractNo}_${contractType}.pdf`);

      toast.success('Contract generated successfully!');

      if (!id) {
        // Reset form for new contract
        reset();
        setSelectedSeller(null);
        setSelectedBuyer(null);
        setSelectedProduct(null);
      }
    } catch (error) {
      toast.error('Failed to generate contract');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter parties
  const filteredParties = parties.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.gstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {id ? 'Edit Contract' : 'New Contract Note'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create professional contract notes in seconds
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={contractType}
            onChange={(e) => setContractType(e.target.value as any)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          >
            <option value="broker_copy">Broker Copy</option>
            <option value="buyer_copy">Buyer Copy</option>
            <option value="seller_copy">Seller Copy</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Parties Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-600" />
            Parties
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Seller Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Seller</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNewPartyType('seller');
                    setShowSellerSearch(true);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {selectedSeller ? (
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{selectedSeller.legalName}</p>
                      <p className="text-xs text-gray-500">{selectedSeller.gstin}</p>
                    </div>
                  ) : (
                    <span className="text-gray-500">Select Seller...</span>
                  )}
                  <Search className="w-4 h-4 text-gray-400" />
                </button>

                {showSellerSearch && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-80 overflow-auto">
                    <div className="p-3 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by name, GSTIN, or city..."
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="p-2">
                      {filteredParties.filter(p => p.type === 'seller' || p.type === 'both').length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-gray-500 mb-3">No sellers found</p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowSellerSearch(false);
                              setShowNewPartyModal(true);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-sm font-medium hover:bg-rose-100"
                          >
                            <Plus className="w-4 h-4" />
                            Add New Seller
                          </button>
                        </div>
                      ) : (
                        filteredParties
                          .filter(p => p.type === 'seller' || p.type === 'both')
                          .map(party => (
                            <button
                              key={party.id}
                              type="button"
                              onClick={() => handleSelectParty(party, 'seller')}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              <p className="font-medium text-gray-900">{party.legalName}</p>
                              <p className="text-xs text-gray-500">{party.gstin} • {party.city}</p>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Buyer Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Buyer</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNewPartyType('buyer');
                    setShowBuyerSearch(true);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {selectedBuyer ? (
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{selectedBuyer.legalName}</p>
                      <p className="text-xs text-gray-500">{selectedBuyer.gstin}</p>
                    </div>
                  ) : (
                    <span className="text-gray-500">Select Buyer...</span>
                  )}
                  <Search className="w-4 h-4 text-gray-400" />
                </button>

                {showBuyerSearch && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-80 overflow-auto">
                    <div className="p-3 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by name, GSTIN, or city..."
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="p-2">
                      {filteredParties.filter(p => p.type === 'buyer' || p.type === 'both').length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-gray-500 mb-3">No buyers found</p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowBuyerSearch(false);
                              setShowNewPartyModal(true);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-sm font-medium hover:bg-rose-100"
                          >
                            <Plus className="w-4 h-4" />
                            Add New Buyer
                          </button>
                        </div>
                      ) : (
                        filteredParties
                          .filter(p => p.type === 'buyer' || p.type === 'both')
                          .map(party => (
                            <button
                              key={party.id}
                              type="button"
                              onClick={() => handleSelectParty(party, 'buyer')}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              <p className="font-medium text-gray-900">{party.legalName}</p>
                              <p className="text-xs text-gray-500">{party.gstin} • {party.city}</p>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product & Specifications */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-rose-600" />
            Product & Specifications
          </h2>

          <div className="space-y-4">
            {/* Product Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Product</label>
              <select
                {...register('productId')}
                onChange={(e) => {
                  const product = products.find(p => p.id === e.target.value);
                  setSelectedProduct(product || null);
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              >
                <option value="">Select Product...</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>

            {/* Specifications */}
            {selectedProduct && selectedProduct.specs && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">Specifications</h3>
                  <button
                    type="button"
                    onClick={() => append({ label: '', value: '', unit: '' })}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                  >
                    + Add Spec
                  </button>
                </div>

                {selectedProduct.specs.map((spec, index) => (
                  <div key={spec.id} className="grid grid-cols-3 gap-3">
                    <input
                      {...register(`specs.${index}.label` as any)}
                      defaultValue={spec.label}
                      placeholder="Label"
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    />
                    <input
                      {...register(`specs.${index}.value` as any)}
                      defaultValue={spec.value}
                      placeholder="Value"
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    />
                    <input
                      {...register(`specs.${index}.unit` as any)}
                      defaultValue={spec.unit}
                      placeholder="Unit"
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Commercial Terms */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Quantity</label>
                <div className="flex gap-2">
                  <input
                    {...register('quantity', { valueAsNumber: true })}
                    type="number"
                    step="0.001"
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                  <input
                    {...register('quantityUnit')}
                    className="w-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    placeholder="Unit"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Price</label>
                <div className="flex gap-2">
                  <input
                    {...register('price', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                  <input
                    {...register('priceUnit')}
                    className="w-40 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    placeholder="Per unit"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery & Payment */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery & Payment Terms</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Delivery Location</label>
              <input
                {...register('deliveryLocation')}
                placeholder="e.g., Unjha"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Delivery Address</label>
              <input
                {...register('deliveryAddress')}
                placeholder="Address will be provided by buyer"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Packing</label>
              <input
                {...register('packing')}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Loading Condition</label>
              <input
                {...register('loadingCondition')}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Terms</label>
              <input
                {...register('paymentTerms')}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">GST %</label>
              <input
                {...register('gstPercent', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Brokerage */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Brokerage</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Brokerage %</label>
              <input
                {...register('brokeragePercent', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Fixed Brokerage (₹)</label>
              <input
                {...register('brokerageFixed', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Other Terms */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Other Terms</h2>
          <textarea
            {...register('otherTerms')}
            rows={3}
            placeholder="Additional terms and conditions..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isGenerating}
            className="px-8 py-3 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-xl font-medium shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate Contract
              </>
            )}
          </button>
        </div>
      </form>

      {/* New Party Modal */}
      {showNewPartyModal && (
        <NewPartyModal
          type={newPartyType}
          onClose={() => setShowNewPartyModal(false)}
          onSave={(party) => {
            addParty(party);
            if (newPartyType === 'seller') {
              setSelectedSeller(party);
              setValue('sellerId', party.id);
            } else {
              setSelectedBuyer(party);
              setValue('buyerId', party.id);
            }
            setShowNewPartyModal(false);
            toast.success('Party added successfully!');
          }}
          verifyGST={verifyGST}
          gstLoading={gstLoading}
        />
      )}
    </div>
  );
}

// New Party Modal Component
function NewPartyModal({ type, onClose, onSave, verifyGST, gstLoading }: any) {
  const [gstData, setGstData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    pan: '',
    brokeragePercent: 0.5,
    brokerageFixed: 0
  });

  const handleVerifyGST = async () => {
    const data = await verifyGST(formData.gstin);
    if (data) {
      setGstData(data);
      setFormData(prev => ({
        ...prev,
        legalName: data.legalName || prev.legalName,
        address: data.address || prev.address,
        city: data.city || prev.city,
        state: data.state || prev.state,
        pincode: data.pincode || prev.pincode
      }));
    }
  };

  const handleSubmit = () => {
    const party: Party = {
      id: uuidv4(),
      ...formData,
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
          <h3 className="text-lg font-semibold text-gray-900">
            Add New {type === 'seller' ? 'Seller' : 'Buyer'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* GST Verification */}
          <div className="flex gap-2">
            <input
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              placeholder="Enter GSTIN (15 digits)"
              maxLength={15}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase"
            />
            <button
              type="button"
              onClick={handleVerifyGST}
              disabled={gstLoading || formData.gstin.length !== 15}
              className="px-4 py-3 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium hover:bg-rose-100 disabled:opacity-50"
            >
              {gstLoading ? '...' : 'Verify'}
            </button>
          </div>

          {gstData && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">GST Verified: {gstData.legalName}</span>
            </div>
          )}

          <input
            value={formData.legalName}
            onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
            placeholder="Legal Name *"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
          <input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Display Name"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Address"
            rows={2}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="City"
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
            <input
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="State"
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              placeholder="Pincode"
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
            <input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Phone"
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <input
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Email"
            type="email"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
          <input
            value={formData.pan}
            onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
            placeholder="PAN Number"
            maxLength={10}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase"
          />
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.legalName || !formData.gstin}
            className="px-6 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 disabled:opacity-50"
          >
            Save Party
          </button>
        </div>
      </div>
    </div>
  );
}

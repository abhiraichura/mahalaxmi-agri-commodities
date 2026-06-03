import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Printer, FileText, Copy } from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import { generateContractPDF, downloadPDF } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';

export default function ContractView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useAppStore();

  // Mock contract data - in real app, fetch from Firebase
  const contract = {
    id: id || '4328',
    contractNo: '4328',
    year: 2020,
    date: '2020-07-29',
    seller: {
      legalName: 'Krishna Agribrokers',
      gstin: '24ACEPR5988A1ZH',
      address: 'Office No.408, Star Plaza, Phoolchhab Chowk',
      city: 'Rajkot',
      state: 'Gujarat',
      phone: '99244 00990'
    },
    buyer: {
      legalName: 'K.V. Agro Products',
      gstin: '24AAOFK1278N1ZT',
      address: 'Unjha-Siddhpur Highway, Near Sahara Hotel, Maktupur',
      city: 'Unjha',
      state: 'Gujarat',
      phone: '98765 43210'
    },
    product: {
      name: 'Coriander Seeds',
      specs: [
        { id: '1', label: 'Quality', value: 'Eagle Plus', unit: '', order: 1 },
        { id: '2', label: 'Clean', value: 'Machine and Destoner Clean', unit: '', order: 2 },
        { id: '3', label: 'Split', value: '5', unit: '% Maximum', order: 3 },
        { id: '4', label: 'Admixture', value: '1', unit: '% Maximum', order: 4 },
        { id: '5', label: 'Moisture', value: '9', unit: '% Maximum', order: 5 },
      ]
    },
    quantity: 10,
    quantityUnit: 'M. TONES',
    price: 63000,
    priceUnit: 'M. TONES F.O.R.',
    deliveryLocation: 'Unjha',
    deliveryAddress: 'As provided by buyer at time of delivery',
    packing: '40 KG Plain P.P. Nett Packing with Double Stitching',
    loadingCondition: 'Goods to be loaded within one week',
    paymentTerms: '3 to 4 days payment with 1% discount after delivery',
    gstPercent: 5,
    otherTerms: 'Please send extra 10 empty bags with cargo',
    brokerageAmount: 3150,
    status: 'confirmed'
  };

  const handleDownload = (type: 'buyer_copy' | 'seller_copy' | 'broker_copy') => {
    const doc = generateContractPDF(contract as any, settings, type);
    downloadPDF(doc, `Contract_${contract.contractNo}_${type}.pdf`);
    toast.success(`${type.replace('_', ' ').toUpperCase()} downloaded!`);
  };

  const handleShareWhatsApp = () => {
    const text = `Contract Note #${contract.contractNo}\nSeller: ${contract.seller.legalName}\nBuyer: ${contract.buyer.legalName}\nProduct: ${contract.product.name}\nQuantity: ${contract.quantity} ${contract.quantityUnit}\nPrice: ₹${contract.price.toLocaleString('en-IN')}/${contract.priceUnit}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract #{contract.contractNo}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(contract.date).toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
          <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
            {contract.status === 'confirmed' ? 'Confirmed' : contract.status}
          </span>
        </div>

        {/* Parties */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-rose-600 mb-2">SELLER</h3>
            <p className="font-semibold text-gray-900">{contract.seller.legalName}</p>
            <p className="text-sm text-gray-600 mt-1">{contract.seller.address}</p>
            <p className="text-sm text-gray-600">{contract.seller.city}, {contract.seller.state}</p>
            <p className="text-sm text-gray-500 mt-2">GSTIN: {contract.seller.gstin}</p>
            <p className="text-sm text-gray-500">Phone: {contract.seller.phone}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-rose-600 mb-2">BUYER</h3>
            <p className="font-semibold text-gray-900">{contract.buyer.legalName}</p>
            <p className="text-sm text-gray-600 mt-1">{contract.buyer.address}</p>
            <p className="text-sm text-gray-600">{contract.buyer.city}, {contract.buyer.state}</p>
            <p className="text-sm text-gray-500 mt-2">GSTIN: {contract.buyer.gstin}</p>
            <p className="text-sm text-gray-500">Phone: {contract.buyer.phone}</p>
          </div>
        </div>

        {/* Product Details */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Product: {contract.product.name}</h3>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="grid md:grid-cols-2 gap-3">
              {contract.product.specs.map((spec) => (
                <div key={spec.id} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                  <span className="text-sm font-medium text-gray-700">{spec.label}</span>
                  <span className="text-sm text-gray-900">{spec.value} {spec.unit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Commercial Terms */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Commercial Terms</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Quantity</span>
              <span className="text-sm font-medium text-gray-900">{contract.quantity} {contract.quantityUnit}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Price</span>
              <span className="text-sm font-medium text-gray-900">₹{contract.price.toLocaleString('en-IN')}/{contract.priceUnit}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Value</span>
              <span className="text-sm font-medium text-gray-900">₹{(contract.quantity * contract.price).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Brokerage</span>
              <span className="text-sm font-medium text-gray-900">₹{contract.brokerageAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">GST</span>
              <span className="text-sm font-medium text-gray-900">{contract.gstPercent}% Extra</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Packing</span>
              <span className="text-sm font-medium text-gray-900">{contract.packing}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Delivery</span>
              <span className="text-sm font-medium text-gray-900">{contract.deliveryLocation}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Payment Terms</span>
              <span className="text-sm font-medium text-gray-900">{contract.paymentTerms}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleDownload('broker_copy')}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Broker Copy
          </button>
          <button
            onClick={() => handleDownload('buyer_copy')}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Buyer Copy
          </button>
          <button
            onClick={() => handleDownload('seller_copy')}
            className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Seller Copy
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

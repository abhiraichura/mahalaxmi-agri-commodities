import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Printer, FileText, Trash2, Edit2, MessageCircle } from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import { generateContractPDF, downloadPDF } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';

export default function ContractView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contracts, settings, deleteContract } = useAppStore();

  const contract = contracts.find(c => c.id === id);

  if (!contract) {
    return (
      <div className="text-center py-20">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Contract not found</p>
        <button onClick={() => navigate('/')} className="mt-4 text-rose-600 font-medium">Go to Dashboard</button>
      </div>
    );
  }

  const handleDownload = (type: 'buyer_copy' | 'seller_copy' | 'broker_copy') => {
    try {
      const doc = generateContractPDF(contract, settings, type);
      downloadPDF(doc, `Contract_${contract.contractNo}_${type}.pdf`);
      toast.success(`${type.replace('_', ' ').toUpperCase()} downloaded!`);
    } catch (e) {
      toast.error('Failed to generate PDF');
      console.error(e);
    }
  };

  const handleShareWhatsApp = (type: string) => {
    const text = `Contract Note #${contract.contractNo}\n${type.toUpperCase()}\nSeller: ${contract.seller.legalName}\nBuyer: ${contract.buyer.legalName}\nProduct: ${contract.product.name}\nQty: ${contract.quantity} ${contract.quantityUnit}\nPrice: Rs.${contract.price.toLocaleString('en-IN')}/${contract.priceUnit}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDelete = async () => {
    if (!confirm('Delete this contract permanently?')) return;
    try {
      await deleteContract(contract.id);
      toast.success('Contract deleted');
      navigate('/');
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const totalValue = contract.quantity * contract.price;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract #{contract.contractNo}</h1>
            <p className="text-sm text-gray-500 mt-1">{new Date(contract.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">{contract.status}</span>
          </div>
        </div>

        {/* Parties */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-rose-600 uppercase mb-2">Seller</h3>
            <p className="font-semibold text-gray-900">{contract.seller.legalName}</p>
            <p className="text-sm text-gray-600 mt-1">{contract.seller.address}</p>
            <p className="text-sm text-gray-600">{contract.seller.city}, {contract.seller.state}</p>
            <p className="text-xs text-gray-500 mt-2">GSTIN: {contract.seller.gstin}</p>
            <p className="text-xs text-gray-500">Phone: {contract.seller.phone || 'N/A'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-rose-600 uppercase mb-2">Buyer</h3>
            <p className="font-semibold text-gray-900">{contract.buyer.legalName}</p>
            <p className="text-sm text-gray-600 mt-1">{contract.buyer.address}</p>
            <p className="text-sm text-gray-600">{contract.buyer.city}, {contract.buyer.state}</p>
            <p className="text-xs text-gray-500 mt-2">GSTIN: {contract.buyer.gstin}</p>
            <p className="text-xs text-gray-500">Phone: {contract.buyer.phone || 'N/A'}</p>
          </div>
        </div>

        {/* Product */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Product: {contract.product.name}</h3>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="grid md:grid-cols-2 gap-3">
              {contract.product.specs?.map((spec: any) => (
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
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Commercial Terms</h3>
          <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
            <TermRow label="Quantity" value={`${contract.quantity} ${contract.quantityUnit}`} />
            <TermRow label="Price" value={`Rs. ${contract.price.toLocaleString('en-IN')} per ${contract.priceUnit}`} />
            <TermRow label="Total Value" value={`Rs. ${totalValue.toLocaleString('en-IN')}`} highlight />
            <TermRow label="Buyer Brokerage %" value={`${contract.buyerBrokeragePercent}%`} />
            <TermRow label="Seller Brokerage %" value={`${contract.sellerBrokeragePercent}%`} />
            <TermRow label="Packing" value={contract.packing} />
            <TermRow label="Delivery" value={`${contract.deliveryLocation} - ${contract.deliveryAddress}`} />
            <TermRow label="Loading" value={contract.loadingCondition} />
            <TermRow label="Payment" value={contract.paymentTerms} />
            <TermRow label="GST" value={`${contract.gstPercent}% Extra`} />
            {contract.otherTerms && <TermRow label="Other Terms" value={contract.otherTerms} />}
          </div>
        </div>

        {/* Download Actions */}
        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Download Contract Copies</h3>
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <button onClick={() => handleDownload('broker_copy')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors">
              <Download className="w-4 h-4" /> Broker Copy
            </button>
            <button onClick={() => handleDownload('buyer_copy')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" /> Buyer Copy
            </button>
            <button onClick={() => handleDownload('seller_copy')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
              <Download className="w-4 h-4" /> Seller Copy
            </button>
          </div>

          <h3 className="text-sm font-semibold text-gray-700 mb-3">Share via</h3>
          <div className="flex gap-3 mb-6">
            <button onClick={() => handleShareWhatsApp('buyer')}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100">
              <MessageCircle className="w-4 h-4" /> WhatsApp Buyer
            </button>
            <button onClick={() => handleShareWhatsApp('seller')}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100">
              <MessageCircle className="w-4 h-4" /> WhatsApp Seller
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>

        {/* Edit/Delete */}
        <div className="border-t border-gray-100 pt-6 flex items-center justify-between">
          <button onClick={() => navigate(`/contract/${contract.id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors">
            <Edit2 className="w-4 h-4" /> Edit Contract
          </button>
          <button onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
            <Trash2 className="w-4 h-4" /> Delete Contract
          </button>
        </div>
      </div>
    </div>
  );
}

function TermRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between px-4 py-3">
      <span className="text-sm text-gray-600 w-32 shrink-0">{label}</span>
      <span className={`text-sm text-right ${highlight ? 'font-bold text-rose-600' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

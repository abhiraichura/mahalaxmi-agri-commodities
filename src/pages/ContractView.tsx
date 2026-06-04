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

  // Share PDF via WhatsApp using Web Share API
  const handleShareWhatsApp = async (type: 'buyer_copy' | 'seller_copy' | 'broker_copy') => {
    try {
      const doc = generateContractPDF(contract, settings, type);
      const pdfBlob = doc.output('blob');
      const fileName = `Contract_${contract.contractNo}_${type}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Try native Web Share API with files (works on mobile)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Contract Note #${contract.contractNo}`,
          text: `${type.replace('_', ' ').toUpperCase()}\nSeller: ${contract.seller.legalName}\nBuyer: ${contract.buyer.legalName}\nProduct: ${contract.product.name}\nQty: ${contract.quantity} ${contract.quantityUnit}`,
        });
        toast.success('Sharing...');
      } else {
        // Fallback: download + open WhatsApp with text
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const text = `Contract Note #${contract.contractNo}\n${type.replace('_', ' ').toUpperCase()}\nSeller: ${contract.seller.legalName}\nBuyer: ${contract.buyer.legalName}\nProduct: ${contract.product.name}\nQty: ${contract.quantity} ${contract.quantityUnit}\nPrice: Rs.${contract.price.toLocaleString('en-IN')}/${contract.priceUnit}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        toast.success('PDF downloaded! Please attach it in WhatsApp.');
      }
    } catch (e) {
      toast.error('Failed to share PDF');
      console.error(e);
    }
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
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contract #{contract.contractNo}</h1>
              <p className="text-sm text-gray-500 mt-1">{new Date(contract.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              contract.status === 'confirmed' ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {contract.status}
            </span>
          </div>
        </div>

        {/* Parties */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Parties</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-rose-600 uppercase mb-2">Seller</p>
              <p className="font-semibold text-gray-900">{contract.seller.legalName}</p>
              <p className="text-sm text-gray-600 mt-1">{contract.seller.address}</p>
              <p className="text-sm text-gray-600">{contract.seller.city}, {contract.seller.state}</p>
              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                <p>GSTIN: {contract.seller.gstin}</p>
                <p>Phone: {contract.seller.phone || 'N/A'}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-rose-600 uppercase mb-2">Buyer</p>
              <p className="font-semibold text-gray-900">{contract.buyer.legalName}</p>
              <p className="text-sm text-gray-600 mt-1">{contract.buyer.address}</p>
              <p className="text-sm text-gray-600">{contract.buyer.city}, {contract.buyer.state}</p>
              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                <p>GSTIN: {contract.buyer.gstin}</p>
                <p>Phone: {contract.buyer.phone || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Product</h3>
          <p className="font-semibold text-gray-900 mb-3">{contract.product.name}</p>
          <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {contract.product.specs?.map((spec: any, i: number) => (
                  <tr key={spec.id} className={i % 2 === 1 ? 'bg-white' : ''}>
                    <td className="px-4 py-2.5 font-medium text-gray-700 w-1/3">{spec.label}</td>
                    <td className="px-4 py-2.5 text-gray-900">{spec.value} {spec.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commercial Terms */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Commercial Terms</h3>
          <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <TermRow label="Quantity" value={`${contract.quantity} ${contract.quantityUnit}`} />
                <TermRow label="Price" value={`Rs. ${contract.price.toLocaleString('en-IN')} per ${contract.priceUnit}`} />
                <TermRow label="Total Value" value={`Rs. ${totalValue.toLocaleString('en-IN')}`} highlight />
                <TermRow label="Packing" value={contract.packing} />
                <TermRow label="Delivery" value={`${contract.deliveryLocation} - ${contract.deliveryAddress}`} />
                <TermRow label="Loading" value={contract.loadingCondition} />
                <TermRow label="Payment" value={contract.paymentTerms} />
                <TermRow label="GST" value={`${contract.gstPercent}% Extra`} />
                <TermRow label="Buyer Brokerage" value={`${contract.buyerBrokeragePercent}%`} />
                <TermRow label="Seller Brokerage" value={`${contract.sellerBrokeragePercent}%`} />
                {contract.otherTerms && <TermRow label="Other Terms" value={contract.otherTerms} />}
              </tbody>
            </table>
          </div>
        </div>

        {/* Download Actions */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Download Copies</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <button onClick={() => handleDownload('broker_copy')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
              <Download className="w-4 h-4" /> Broker Copy
            </button>
            <button onClick={() => handleDownload('buyer_copy')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
              <Download className="w-4 h-4" /> Buyer Copy
            </button>
            <button onClick={() => handleDownload('seller_copy')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
              <Download className="w-4 h-4" /> Seller Copy
            </button>
          </div>
        </div>

        {/* Share Actions */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Share via WhatsApp (with PDF)</h3>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => handleShareWhatsApp('buyer_copy')}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
              <MessageCircle className="w-4 h-4" /> WhatsApp Buyer (PDF)
            </button>
            <button onClick={() => handleShareWhatsApp('seller_copy')}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
              <MessageCircle className="w-4 h-4" /> WhatsApp Seller (PDF)
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            On mobile, the PDF will be shared directly. On desktop, it will auto-download and open WhatsApp with contract details.
          </p>
        </div>

        {/* Edit/Delete */}
        <div className="p-6 flex items-center justify-between">
          <button onClick={() => navigate(`/contract/${contract.id}/edit`)}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors">
            <Edit2 className="w-4 h-4" /> Edit Contract
          </button>
          <button onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors">
            <Trash2 className="w-4 h-4" /> Delete Contract
          </button>
        </div>
      </div>
    </div>
  );
}

function TermRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <tr>
      <td className="px-4 py-2.5 text-gray-600 w-1/3">{label}</td>
      <td className={`px-4 py-2.5 ${highlight ? 'font-bold text-rose-600' : 'text-gray-900'}`}>{value}</td>
    </tr>
  );
}

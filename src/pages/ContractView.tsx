import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { ArrowLeft, Printer, Download, FileText, Pencil, Trash2, Share2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { generateContractPDF, downloadPDF } from '../utils/pdfGenerator';
import { format } from 'date-fns';

export default function ContractView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contracts, settings, deleteContract } = useAppStore();
  const [showPrintModal, setShowPrintModal] = useState(false);

  const contract = contracts.find(c => c.id === id);
  if (!contract) return (
    <div className="p-8 text-center">
      <p className="text-gray-500">Contract not found</p>
      <button onClick={() => navigate('/contracts')} className="mt-4 text-rose-600 text-sm">Go back</button>
    </div>
  );

  const handleDelete = async () => {
    if (!confirm('Delete this contract permanently?')) return;
    await deleteContract(contract.id);
    toast.success('Deleted');
    navigate('/contracts');
  };

  const handleDownload = (type: 'buyer_copy' | 'seller_copy' | 'broker_copy') => {
    const doc = generateContractPDF(contract, settings, type, false);
    downloadPDF(doc, `Contract_${contract.contractNo}_${type}.pdf`);
    toast.success('Downloaded');
  };

  const handlePrint = (type: 'buyer_copy' | 'seller_copy' | 'broker_copy') => {
    const doc = generateContractPDF(contract, settings, type, false);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => {
        win.print();
      };
    }
  };

  const handleShare = async (type: 'buyer_copy' | 'seller_copy') => {
    const doc = generateContractPDF(contract, settings, type, false);
    const blob = doc.output('blob');
    const file = new File([blob], `Contract_${contract.contractNo}_${type}.pdf`, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Contract ${contract.contractNo}` });
      } catch (e) {
        // user cancelled
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contract_${contract.contractNo}_${type}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded');
    }
  };

  const renderPhoneNumbers = (phoneStr: string) => {
    if (!phoneStr) return <span className="text-gray-400">N/A</span>;
    const numbers = phoneStr.split(/[\/\,\-]+/).map(n => n.trim()).filter(Boolean);
    return (
      <div className="flex flex-wrap gap-2">
        {numbers.map((num, i) => (
          <a
            key={i}
            href={`tel:${num.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md"
          >
            {num}
          </a>
        ))}
      </div>
    );
  };

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  const isOverdue = contract.loadingDeadline && new Date(contract.loadingDeadline) < new Date() && contract.status === 'active';

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/contracts')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[contract.status] || 'bg-gray-100'}`}>
            {contract.status.toUpperCase()}
          </span>
          {isOverdue && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 animate-pulse">
              OVERDUE
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Contract Header */}
        <div className="bg-gray-50 px-6 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Contract #{contract.contractNo}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {format(new Date(contract.date), 'dd MMMM yyyy')} • FY {contract.year}-{contract.year + 1}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowPrintModal(true)} className="p-2 hover:bg-gray-100 rounded-lg" title="Print / Download">
                <Printer size={18} className="text-gray-600" />
              </button>
              <button onClick={() => navigate(`/contracts/edit/${contract.id}`)} className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                <Pencil size={18} className="text-gray-600" />
              </button>
              <button onClick={handleDelete} className="p-2 hover:bg-gray-100 rounded-lg" title="Delete">
                <Trash2 size={18} className="text-red-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Parties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-xl p-5">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-3">Seller</p>
              <h3 className="font-semibold text-gray-900">{contract.seller.legalName}</h3>
              <p className="text-sm text-gray-600 mt-1">{contract.seller.address}</p>
              <p className="text-sm text-gray-600">{contract.seller.city}, {contract.seller.state}</p>
              {contract.seller.gstin && <p className="text-sm text-gray-500 mt-2">GSTIN: {contract.seller.gstin}</p>}
              <div className="mt-2">{renderPhoneNumbers(contract.seller.phone)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-5">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-3">Buyer</p>
              <h3 className="font-semibold text-gray-900">{contract.buyer.legalName}</h3>
              <p className="text-sm text-gray-600 mt-1">{contract.buyer.address}</p>
              <p className="text-sm text-gray-600">{contract.buyer.city}, {contract.buyer.state}</p>
              {contract.buyer.gstin && <p className="text-sm text-gray-500 mt-2">GSTIN: {contract.buyer.gstin}</p>}
              <div className="mt-2">{renderPhoneNumbers(contract.buyer.phone)}</div>
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-3">Product</p>
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 text-lg">{contract.product.name}</h3>
              {contract.product.specs && contract.product.specs.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {contract.product.specs.sort((a, b) => (a.order || 0) - (b.order || 0)).map(spec => (
                    <div key={spec.id} className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                      <p className="text-xs text-gray-500">{spec.label}</p>
                      <p className="text-sm font-medium text-gray-900">{spec.value} {spec.unit}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Commercial Terms */}
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-3">Commercial Terms</p>
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Quantity</p><p className="text-sm font-medium">{contract.quantity} {contract.quantityUnit}</p></div>
                <div><p className="text-xs text-gray-500">Price</p><p className="text-sm font-medium">Rs. {contract.price.toLocaleString('en-IN')} per {contract.priceUnit}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Packing</p><p className="text-sm font-medium">{contract.packing}</p></div>
                <div><p className="text-xs text-gray-500">Delivery</p><p className="text-sm font-medium">{contract.deliveryLocation}</p></div>
              </div>
              <div><p className="text-xs text-gray-500">Delivery Address</p><p className="text-sm font-medium">{contract.deliveryAddress || 'Will be provided by buyer'}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Loading Condition</p><p className="text-sm font-medium">{contract.loadingCondition}</p></div>
                <div><p className="text-xs text-gray-500">Payment Terms</p><p className="text-sm font-medium">{contract.paymentTerms}</p></div>
              </div>
              {contract.loadingDeadline && (
                <div>
                  <p className="text-xs text-gray-500">Loading Deadline</p>
                  <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                    {format(new Date(contract.loadingDeadline), 'dd MMMM yyyy')}
                    {isOverdue && ' (OVERDUE)'}
                  </p>
                </div>
              )}
              <div><p className="text-xs text-gray-500">GST</p><p className="text-sm font-medium">{contract.gstPercent}% Extra</p></div>
              {contract.otherTerms && <div><p className="text-xs text-gray-500">Other Terms</p><p className="text-sm font-medium">{contract.otherTerms}</p></div>}
              {contract.notes && <div><p className="text-xs text-gray-500">Internal Notes</p><p className="text-sm font-medium text-amber-700">{contract.notes}</p></div>}
            </div>
          </div>

          {/* Internal Total Value */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Internal Use Only</p>
            <p className="text-lg font-bold text-amber-900">
              Total Value: Rs. {(contract.quantity * contract.price).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-amber-600 mt-1">Not shown on shared/printed copies</p>
          </div>
        </div>
      </div>

      {/* Print/Download Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Contract Copies</h3>
            <div className="space-y-3">
              <button onClick={() => { handlePrint('buyer_copy'); setShowPrintModal(false); }}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors">
                <Printer size={20} className="text-rose-600" />
                <div>
                  <p className="font-medium text-gray-900">Print Buyer Copy</p>
                  <p className="text-xs text-gray-500">Buyer shown first, no total value</p>
                </div>
              </button>
              <button onClick={() => { handlePrint('seller_copy'); setShowPrintModal(false); }}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors">
                <Printer size={20} className="text-rose-600" />
                <div>
                  <p className="font-medium text-gray-900">Print Seller Copy</p>
                  <p className="text-xs text-gray-500">Seller shown first, no total value</p>
                </div>
              </button>
              <button onClick={() => { handleDownload('buyer_copy'); setShowPrintModal(false); }}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors">
                <Download size={20} className="text-rose-600" />
                <div>
                  <p className="font-medium text-gray-900">Download Buyer Copy</p>
                  <p className="text-xs text-gray-500">PDF with buyer first</p>
                </div>
              </button>
              <button onClick={() => { handleDownload('seller_copy'); setShowPrintModal(false); }}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors">
                <Download size={20} className="text-rose-600" />
                <div>
                  <p className="font-medium text-gray-900">Download Seller Copy</p>
                  <p className="text-xs text-gray-500">PDF with seller first</p>
                </div>
              </button>
              <button onClick={() => { handleShare('buyer_copy'); setShowPrintModal(false); }}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors">
                <Share2 size={20} className="text-rose-600" />
                <div>
                  <p className="font-medium text-gray-900">Share Buyer Copy</p>
                  <p className="text-xs text-gray-500">WhatsApp / Share sheet</p>
                </div>
              </button>
              <button onClick={() => { handleShare('seller_copy'); setShowPrintModal(false); }}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors">
                <Share2 size={20} className="text-rose-600" />
                <div>
                  <p className="font-medium text-gray-900">Share Seller Copy</p>
                  <p className="text-xs text-gray-500">WhatsApp / Share sheet</p>
                </div>
              </button>
            </div>
            <button onClick={() => setShowPrintModal(false)} className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

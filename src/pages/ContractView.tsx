import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import {
  ArrowLeft, Edit2, Trash2, Printer, Download, Share2, Phone,
  AlertTriangle, CheckCircle, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateContractPDF, downloadPDF } from '../utils/pdfGenerator';
import { format, isPast, isTomorrow, parseISO } from 'date-fns';

export default function ContractView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contracts, settings, deleteContract } = useAppStore();

  const contract = contracts.find(c => c.id === id);

  if (!contract) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Contract not found</p>
        <button onClick={() => navigate('/contracts')} className="mt-4 text-rose-600">Go back</button>
      </div>
    );
  }

  const totalValue = contract.quantity * contract.price;

  const handleDelete = async () => {
    if (!confirm('Delete this contract?')) return;
    await deleteContract(contract.id);
    toast.success('Deleted');
    navigate('/contracts');
  };

  const handleDownload = (type: 'buyer_copy' | 'seller_copy' | 'broker_copy') => {
    const doc = generateContractPDF(contract, settings, type, { showTotalValue: type === 'broker_copy' });
    const label = type === 'buyer_copy' ? 'Buyer' : type === 'seller_copy' ? 'Seller' : 'Broker';
    downloadPDF(doc, `Contract_${contract.contractNo}_${label}_Copy.pdf`);
    toast.success(`${label} copy downloaded`);
  };

  const handlePrint = (type: 'buyer_copy' | 'seller_copy' | 'broker_copy') => {
    const doc = generateContractPDF(contract, settings, type, { showTotalValue: type === 'broker_copy' });
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    toast.success(`Opening ${type === 'buyer_copy' ? 'Buyer' : type === 'seller_copy' ? 'Seller' : 'Broker'} copy for print`);
  };

  const handleShare = async (type: 'buyer_copy' | 'seller_copy') => {
    const doc = generateContractPDF(contract, settings, type);
    const blob = doc.output('blob');
    const file = new File([blob], `Contract_${contract.contractNo}_${type}.pdf`, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Contract Note ${contract.contractNo}`,
        });
      } catch {
        toast.error('Share cancelled');
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contract_${contract.contractNo}_${type}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded for sharing');
    }
  };

  // Parse phone numbers
  const parsePhones = (phoneStr: string): string[] => {
    if (!phoneStr) return [];
    return phoneStr.split(/[/,]/).map(s => s.trim()).filter(Boolean);
  };

  // Loading deadline alert
  const deadlineAlert = () => {
    if (!contract.loadingDeadline) return null;
    const deadline = parseISO(contract.loadingDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isPast(deadline) && deadline.getTime() < today.getTime()) {
      return (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span><strong>OVERDUE:</strong> Loading deadline was {format(deadline, 'dd MMM yyyy')}</span>
        </div>
      );
    }
    if (isTomorrow(deadline)) {
      return (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          <Clock className="w-4 h-4" />
          <span><strong>URGENT:</strong> Loading deadline is tomorrow ({format(deadline, 'dd MMM yyyy')})</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>Loading deadline: {format(deadline, 'dd MMM yyyy')}</span>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/contracts')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Contract #{contract.contractNo}</h1>
          <p className="text-sm text-gray-500">
            {format(new Date(contract.date), 'dd MMM yyyy')} &bull; {contract.financialYear || contract.year}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
          contract.status === 'confirmed' ? 'bg-green-50 text-green-700' :
          contract.status === 'draft' ? 'bg-gray-100 text-gray-600' :
          contract.status === 'completed' ? 'bg-blue-50 text-blue-700' :
          'bg-red-50 text-red-700'
        }`}>
          {contract.status}
        </span>
      </div>

      {/* Loading Deadline Alert */}
      {deadlineAlert() && <div className="mb-4">{deadlineAlert()}</div>}

      {/* WhatsApp Reminder Button (1 day before) */}
      {contract.loadingDeadline && isTomorrow(parseISO(contract.loadingDeadline)) && (
        <div className="mb-4">
          <a
            href={`https://wa.me/?text=Reminder: Loading deadline for Contract ${contract.contractNo} is tomorrow (${format(parseISO(contract.loadingDeadline), 'dd MMM yyyy')}). Please ensure goods are loaded on time.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"
          >
            <Share2 className="w-4 h-4" /> Send WhatsApp Reminder
          </a>
        </div>
      )}

      {/* Print / Download / Share Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Buyer Copy</h3>
          <div className="flex gap-2">
            <button onClick={() => handlePrint('buyer_copy')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={() => handleDownload('buyer_copy')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-100">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
          <button onClick={() => handleShare('buyer_copy')} className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50">
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Seller Copy</h3>
          <div className="flex gap-2">
            <button onClick={() => handlePrint('seller_copy')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={() => handleDownload('seller_copy')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-100">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
          <button onClick={() => handleShare('seller_copy')} className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50">
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Broker Copy (Internal)</h3>
          <div className="flex gap-2">
            <button onClick={() => handlePrint('broker_copy')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={() => handleDownload('broker_copy')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-100">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
        </div>
      </div>

      {/* Contract Details */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* Parties */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="p-6">
            <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-3">Seller</h3>
            <p className="font-semibold text-gray-900">{contract.seller.legalName}</p>
            <p className="text-sm text-gray-600 mt-1">{contract.seller.address}</p>
            <p className="text-sm text-gray-600">{contract.seller.city}, {contract.seller.state}</p>
            {contract.seller.gstin && <p className="text-sm text-gray-500 mt-1">GSTIN: {contract.seller.gstin}</p>}
            {contract.seller.phone && (
              <div className="flex flex-wrap gap-2 mt-2">
                {parsePhones(contract.seller.phone).map((phone, idx) => (
                  <a key={idx} href={`tel:+91${phone.replace(/\D/g, '')}`} className="inline-flex items-center gap-1 text-sm text-rose-600 hover:underline">
                    <Phone className="w-3.5 h-3.5" /> {phone}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="p-6">
            <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-3">Buyer</h3>
            <p className="font-semibold text-gray-900">{contract.buyer.legalName}</p>
            <p className="text-sm text-gray-600 mt-1">{contract.buyer.address}</p>
            <p className="text-sm text-gray-600">{contract.buyer.city}, {contract.buyer.state}</p>
            {contract.buyer.gstin && <p className="text-sm text-gray-500 mt-1">GSTIN: {contract.buyer.gstin}</p>}
            {contract.buyer.phone && (
              <div className="flex flex-wrap gap-2 mt-2">
                {parsePhones(contract.buyer.phone).map((phone, idx) => (
                  <a key={idx} href={`tel:+91${phone.replace(/\D/g, '')}`} className="inline-flex items-center gap-1 text-sm text-rose-600 hover:underline">
                    <Phone className="w-3.5 h-3.5" /> {phone}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 p-6">
          <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-3">Product</h3>
          <p className="font-semibold text-gray-900">{contract.product.name}</p>
          {contract.product.specs && contract.product.specs.length > 0 && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
              {contract.product.specs.sort((a, b) => (a.order || 0) - (b.order || 0)).map(spec => (
                <div key={spec.id} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{spec.label}</p>
                  <p className="text-sm font-medium text-gray-900">{spec.value} {spec.unit}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 p-6">
          <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-3">Commercial Terms</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p><span className="text-gray-500">Quantity:</span> {contract.quantity} {contract.quantityUnit}</p>
              <p><span className="text-gray-500">Price:</span> Rs. {contract.price.toLocaleString('en-IN')} per {contract.priceUnit}</p>
              {/* Total value only shown for broker/internal view */}
              <p><span className="text-gray-500">Total Value:</span> <span className="text-gray-400 text-xs">(Internal only)</span></p>
              <p><span className="text-gray-500">Packing:</span> {contract.packing}</p>
              <p><span className="text-gray-500">Delivery:</span> {contract.deliveryLocation}</p>
            </div>
            <div className="space-y-2">
              <p><span className="text-gray-500">Delivery Address:</span> {contract.deliveryAddress || 'Will be provided by buyer'}</p>
              <p><span className="text-gray-500">Loading:</span> {contract.loadingCondition}</p>
              {contract.loadingDeadline && (
                <p><span className="text-gray-500">Loading Deadline:</span> {format(new Date(contract.loadingDeadline), 'dd MMM yyyy')}</p>
              )}
              <p><span className="text-gray-500">Payment:</span> {contract.paymentTerms}</p>
              <p><span className="text-gray-500">GST:</span> {contract.gstPercent}% Extra</p>
            </div>
          </div>
          {contract.otherTerms && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Other Terms</p>
              <p className="text-sm text-gray-700">{contract.otherTerms}</p>
            </div>
          )}
        </div>

        {contract.notes && (
          <div className="border-t border-gray-100 p-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Internal Notes</h3>
            <p className="text-sm text-gray-600">{contract.notes}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => navigate(`/contracts/edit/${contract.id}`)}
          className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
        >
          <Edit2 className="w-4 h-4" /> Edit
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>
    </div>
  );
}

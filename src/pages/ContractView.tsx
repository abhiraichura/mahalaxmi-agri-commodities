import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { ArrowLeft, Edit, Trash2, Download, Printer, FileText } from 'lucide-react';
import { generateContractPDF, downloadPDF } from '../utils/pdfGenerator';
import { Contract } from '../types';

export default function ContractView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contracts, settings, deleteContract } = useAppStore();

  const contract = contracts.find((c: Contract) => c.id === id);

  if (!contract) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900">Contract not found</h2>
        <Link to="/contracts" className="text-red-600 hover:underline mt-2 inline-block">Back to contracts</Link>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    await deleteContract(contract.id);
    navigate('/contracts');
  };

  const handleDownload = (type: 'buyer_copy' | 'seller_copy' | 'broker_copy') => {
    const doc = generateContractPDF(contract, settings, type);
    const typeName = type === 'buyer_copy' ? 'Buyer' : type === 'seller_copy' ? 'Seller' : 'Broker';
    downloadPDF(doc, `Contract-${contract.contractNo}-${typeName}.pdf`);
  };

  const totalValue = contract.quantity * contract.price;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/contracts')}
            className="p-2 hover:bg-gray-100 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract #{contract.contractNo}</h1>
            <p className="text-sm text-gray-500">
              {new Date(contract.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              {contract.year ? ` / FY ${contract.year}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            contract.status === 'active' ? 'bg-green-50 text-green-700' :
            contract.status === 'completed' ? 'bg-gray-50 text-gray-700' :
            'bg-red-50 text-red-700'
          }`}>
            {contract.status}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleDownload('buyer_copy')}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Buyer Copy
        </button>
        <button
          onClick={() => handleDownload('seller_copy')}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Seller Copy
        </button>
        <button
          onClick={() => handleDownload('broker_copy')}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Broker Copy
        </button>
        <Link
          to={`/contracts/${contract.id}/edit`}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Link>
        <button
          onClick={handleDelete}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-white border border-gray-200 rounded-xl hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </button>
      </div>

      {/* Contract Details */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* Parties */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Seller</h3>
            <div className="space-y-2">
              <p className="font-bold text-gray-900">{contract.seller?.legalName}</p>
              <p className="text-sm text-gray-600">{contract.seller?.address}</p>
              <p className="text-sm text-gray-600">{contract.seller?.city}, {contract.seller?.state}</p>
              <p className="text-sm text-gray-600">GSTIN: {contract.seller?.gstin}</p>
              <p className="text-sm text-gray-600">Phone: {contract.seller?.phone || 'N/A'}</p>
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Buyer</h3>
            <div className="space-y-2">
              <p className="font-bold text-gray-900">{contract.buyer?.legalName}</p>
              <p className="text-sm text-gray-600">{contract.buyer?.address}</p>
              <p className="text-sm text-gray-600">{contract.buyer?.city}, {contract.buyer?.state}</p>
              <p className="text-sm text-gray-600">GSTIN: {contract.buyer?.gstin}</p>
              <p className="text-sm text-gray-600">Phone: {contract.buyer?.phone || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Product */}
        <div className="border-t border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Product: {contract.product?.name}</h3>
          {contract.product?.specs && contract.product.specs.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {contract.product.specs.map((spec: any, i: number) => (
                <div key={spec.id || i} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">{spec.label}</p>
                  <p className="font-medium text-gray-900">{spec.value} {spec.unit}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commercial Terms */}
        <div className="border-t border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Commercial Terms</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Quantity</p>
              <p className="font-medium text-gray-900">{contract.quantity} {contract.quantityUnit}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Price</p>
              <p className="font-medium text-gray-900">₹{contract.price.toLocaleString('en-IN')} {contract.priceUnit}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Total Value</p>
              <p className="font-medium text-gray-900">₹{totalValue.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">GST</p>
              <p className="font-medium text-gray-900">{contract.gstPercent}%</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Packing</p>
              <p className="font-medium text-gray-900">{contract.packing}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Delivery Location</p>
              <p className="font-medium text-gray-900">{contract.deliveryLocation}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Loading Condition</p>
              <p className="font-medium text-gray-900">{contract.loadingCondition}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Payment Terms</p>
              <p className="font-medium text-gray-900">{contract.paymentTerms}</p>
            </div>
          </div>
          {contract.otherTerms && (
            <div className="mt-4 bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Other Terms</p>
              <p className="font-medium text-gray-900">{contract.otherTerms}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {contract.notes && (
          <div className="border-t border-gray-100 p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

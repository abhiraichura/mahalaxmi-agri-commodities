import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { ArrowLeft, Edit2, Trash2, Printer, Download, Share2, Phone, MapPin, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function ContractView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contracts, deleteContract, settings } = useAppStore();
  const contract = contracts.find(c => c.id === id);
  const [printMode, setPrintMode] = useState<'buyer' | 'seller' | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  if (!contract) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Contract not found</p>
        <button onClick={() => navigate('/contracts')} className="mt-4 text-rose-600 hover:underline">Back to Contracts</button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm('Delete this contract?')) return;
    await deleteContract(contract.id);
    toast.success('Contract deleted');
    navigate('/contracts');
  };

  const isOverdue = contract.loadingDeadline && new Date(contract.loadingDeadline) < new Date();
  const isDueTomorrow = contract.loadingDeadline && 
    new Date(contract.loadingDeadline).getTime() - new Date().getTime() < 86400000 &&
    new Date(contract.loadingDeadline).getTime() > new Date().getTime();

  const parsePhoneNumbers = (phone: string = '') => {
    return phone.split('/').map(n => n.trim()).filter(Boolean);
  };

  const generatePDF = (type: 'buyer' | 'seller') => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 20;

    // No header - letterhead will be printed on physical paper
    // Start contract content lower to leave letterhead space
    y = 45;

    // Contract Title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTRACT NOTE', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Contract No & Date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Contract No: ${contract.contractNo}`, margin, y);
    doc.text(`Date: ${new Date(contract.date).toLocaleDateString('en-IN')}`, pageWidth - margin, y, { align: 'right' });
    y += 10;

    // Parties
    const firstParty = type === 'buyer' ? contract.buyer : contract.seller;
    const secondParty = type === 'buyer' ? contract.seller : contract.buyer;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(type === 'buyer' ? 'BUYER' : 'SELLER', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(firstParty.legalName, margin, y);
    y += 4;
    doc.text(`${firstParty.address}, ${firstParty.city}, ${firstParty.state}`, margin, y);
    y += 4;
    if (firstParty.gstin) doc.text(`GSTIN: ${firstParty.gstin}`, margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(type === 'buyer' ? 'SELLER' : 'BUYER', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(secondParty.legalName, margin, y);
    y += 4;
    doc.text(`${secondParty.address}, ${secondParty.city}, ${secondParty.state}`, margin, y);
    y += 4;
    if (secondParty.gstin) doc.text(`GSTIN: ${secondParty.gstin}`, margin, y);
    y += 10;

    // Product
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUCT', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${contract.product.name}`, margin, y);
    y += 4;
    if (contract.product.specs) {
      contract.product.specs.forEach(spec => {
        doc.text(`${spec.label}: ${spec.value} ${spec.unit || ''}`, margin, y);
        y += 4;
      });
    }
    y += 6;

    // Commercial Terms Table
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('COMMERCIAL TERMS', margin, y);
    y += 8;

    const termsData = [
      ['Quantity', `${contract.quantity} ${contract.quantityUnit}`],
      ['Price', `${contract.price} ${contract.priceUnit}`],
      ['Delivery Location', contract.deliveryLocation || 'N/A'],
      ['Delivery Address', contract.deliveryAddress || 'N/A'],
      ['Packing', contract.packing || 'N/A'],
      ['Loading Condition', contract.loadingCondition || 'N/A'],
      ['Payment Terms', contract.paymentTerms || 'N/A'],
      ['GST', `${contract.gstPercent}%`],
    ];

    if (contract.loadingDeadline) {
      termsData.push(['Loading Deadline', new Date(contract.loadingDeadline).toLocaleDateString('en-IN')]);
    }

    (doc as any).autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      body: termsData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Other Terms
    if (contract.otherTerms) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('OTHER TERMS', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const splitTerms = doc.splitTextToSize(contract.otherTerms, pageWidth - margin * 2);
      doc.text(splitTerms, margin, y);
      y += splitTerms.length * 4 + 6;
    }

    // Brokerage (internal only - not on shared copies)
    // Skip total value on shared copies

    // Terms & Conditions
    if (settings.termsAndConditions?.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TERMS & CONDITIONS', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      settings.termsAndConditions.forEach((term, i) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }
        const splitTerm = doc.splitTextToSize(`${i + 1}. ${term}`, pageWidth - margin * 2);
        doc.text(splitTerm, margin, y);
        y += splitTerm.length * 3.5 + 2;
      });
    }

    // Footer
    y = pageHeight - 25;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a computer generated contract note.', margin, y);
    doc.text(`${type.toUpperCase()} COPY`, pageWidth - margin, y, { align: 'right' });

    doc.save(`Contract_${contract.contractNo}_${type}_copy.pdf`);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} copy downloaded`);
  };

  const handlePrint = (type: 'buyer' | 'seller') => {
    setPrintMode(type);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 100);
  };

  const firstParty = printMode === 'buyer' ? contract.buyer : contract.seller;
  const secondParty = printMode === 'buyer' ? contract.seller : contract.buyer;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Normal View */}
      <div className="print:hidden">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/contracts')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Contract #{contract.contractNo}</h1>
            <p className="text-sm text-gray-500">
              {new Date(contract.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              contract.status === 'active' ? 'bg-green-100 text-green-700' :
              contract.status === 'completed' ? 'bg-blue-100 text-blue-700' :
              'bg-red-100 text-red-700'
            }`}>
              {contract.status}
            </span>
          </div>
        </div>

        {/* Alerts */}
        {(isOverdue || isDueTomorrow) && (
          <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${
            isOverdue ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
          }`}>
            <AlertTriangle className={`w-5 h-5 ${isOverdue ? 'text-red-600' : 'text-amber-600'}`} />
            <div>
              <p className={`text-sm font-medium ${isOverdue ? 'text-red-800' : 'text-amber-800'}`}>
                {isOverdue ? 'Loading deadline has passed!' : 'Loading deadline is tomorrow!'}
              </p>
              <p className="text-xs text-gray-600">Deadline: {new Date(contract.loadingDeadline!).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Parties */}
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="p-6">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-3">Seller</p>
              <h3 className="font-semibold text-gray-900">{contract.seller.legalName}</h3>
              <p className="text-sm text-gray-600 mt-1">{contract.seller.address}</p>
              <p className="text-sm text-gray-600">{contract.seller.city}, {contract.seller.state}</p>
              {contract.seller.gstin && <p className="text-sm text-gray-500 mt-1">GSTIN: {contract.seller.gstin}</p>}
              {contract.seller.phone && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {parsePhoneNumbers(contract.seller.phone).map((num, i) => (
                    <a key={i} href={`tel:+91${num.replace(/\s/g, '')}`} className="text-sm text-rose-600 hover:underline">
                      <Phone className="w-3 h-3 inline mr-1" />{num}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-3">Buyer</p>
              <h3 className="font-semibold text-gray-900">{contract.buyer.legalName}</h3>
              <p className="text-sm text-gray-600 mt-1">{contract.buyer.address}</p>
              <p className="text-sm text-gray-600">{contract.buyer.city}, {contract.buyer.state}</p>
              {contract.buyer.gstin && <p className="text-sm text-gray-500 mt-1">GSTIN: {contract.buyer.gstin}</p>}
              {contract.buyer.phone && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {parsePhoneNumbers(contract.buyer.phone).map((num, i) => (
                    <a key={i} href={`tel:+91${num.replace(/\s/g, '')}`} className="text-sm text-rose-600 hover:underline">
                      <Phone className="w-3 h-3 inline mr-1" />{num}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 p-6">
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-3">Product</p>
            <h3 className="font-semibold text-gray-900">{contract.product.name}</h3>
            {contract.product.specs?.map((spec: any) => (
              <p key={spec.label} className="text-sm text-gray-600 mt-1">
                {spec.label}: <span className="font-medium">{spec.value} {spec.unit}</span>
              </p>
            ))}
          </div>

          <div className="border-t border-gray-100 p-6">
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-4">Commercial Terms</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Quantity</span>
                  <span className="font-medium text-gray-900">{contract.quantity} {contract.quantityUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Price</span>
                  <span className="font-medium text-gray-900">{contract.price} {contract.priceUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Value</span>
                  <span className="font-medium text-gray-900">Rs. {(contract.totalValue || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Brokerage</span>
                  <span className="font-medium text-gray-900">Rs. {(contract.brokerageAmount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Location</span>
                  <span className="font-medium text-gray-900">{contract.deliveryLocation || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Loading Deadline</span>
                  <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                    {contract.loadingDeadline ? new Date(contract.loadingDeadline).toLocaleDateString('en-IN') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Packing</span>
                  <span className="font-medium text-gray-900">{contract.packing || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Terms</span>
                  <span className="font-medium text-gray-900">{contract.paymentTerms || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {contract.otherTerms && (
            <div className="border-t border-gray-100 p-6">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-2">Other Terms</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{contract.otherTerms}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-6">
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors">
              <Printer className="w-4 h-4" />
              Print
            </button>
            <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={() => handlePrint('buyer')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg">
                Print Buyer Copy
              </button>
              <button onClick={() => handlePrint('seller')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg">
                Print Seller Copy
              </button>
            </div>
          </div>

          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Download
            </button>
            <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={() => generatePDF('buyer')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg">
                Download Buyer Copy
              </button>
              <button onClick={() => generatePDF('seller')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg">
                Download Seller Copy
              </button>
            </div>
          </div>

          <button
            onClick={() => navigate(`/contracts/edit/${contract.id}`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Print View - Hidden normally, shown when printing */}
      {printMode && (
        <div ref={printRef} className="hidden print:block print:p-0">
          <div className="min-h-[297mm] w-[210mm] mx-auto bg-white p-[20mm] relative">
            {/* No header - space for letterhead */}
            <div className="mt-[35mm]">
              <div className="text-center mb-8">
                <h2 className="text-lg font-bold text-gray-900 tracking-wide">CONTRACT NOTE</h2>
                <div className="flex justify-between text-sm mt-4 px-4">
                  <span><span className="font-semibold">Contract No:</span> {contract.contractNo}</span>
                  <span><span className="font-semibold">Date:</span> {new Date(contract.date).toLocaleDateString('en-IN')}</span>
                </div>
              </div>

              <div className="space-y-6">
                {/* First Party */}
                <div className="border border-gray-300 rounded-lg p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {printMode === 'buyer' ? 'BUYER' : 'SELLER'}
                  </p>
                  <p className="font-bold text-gray-900">{firstParty.legalName}</p>
                  <p className="text-sm text-gray-700 mt-1">{firstParty.address}</p>
                  <p className="text-sm text-gray-700">{firstParty.city}, {firstParty.state}</p>
                  {firstParty.gstin && <p className="text-sm text-gray-600 mt-1">GSTIN: {firstParty.gstin}</p>}
                  {firstParty.phone && (
                    <p className="text-sm text-gray-600 mt-1">
                      Phone: {parsePhoneNumbers(firstParty.phone).join(' / ')}
                    </p>
                  )}
                </div>

                {/* Second Party */}
                <div className="border border-gray-300 rounded-lg p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {printMode === 'buyer' ? 'SELLER' : 'BUYER'}
                  </p>
                  <p className="font-bold text-gray-900">{secondParty.legalName}</p>
                  <p className="text-sm text-gray-700 mt-1">{secondParty.address}</p>
                  <p className="text-sm text-gray-700">{secondParty.city}, {secondParty.state}</p>
                  {secondParty.gstin && <p className="text-sm text-gray-600 mt-1">GSTIN: {secondParty.gstin}</p>}
                  {secondParty.phone && (
                    <p className="text-sm text-gray-600 mt-1">
                      Phone: {parsePhoneNumbers(secondParty.phone).join(' / ')}
                    </p>
                  )}
                </div>

                {/* Product */}
                <div className="border border-gray-300 rounded-lg p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">PRODUCT</p>
                  <p className="font-bold text-gray-900">{contract.product.name}</p>
                  {contract.product.specs?.map((spec: any) => (
                    <p key={spec.label} className="text-sm text-gray-700 mt-1">
                      {spec.label}: <span className="font-semibold">{spec.value} {spec.unit}</span>
                    </p>
                  ))}
                </div>

                {/* Commercial Terms */}
                <div className="border border-gray-300 rounded-lg p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">COMMERCIAL TERMS</p>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-600 w-1/3">Quantity</td>
                        <td className="py-2 font-semibold text-gray-900">{contract.quantity} {contract.quantityUnit}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-600">Price</td>
                        <td className="py-2 font-semibold text-gray-900">{contract.price} {contract.priceUnit}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-600">Delivery Location</td>
                        <td className="py-2 font-semibold text-gray-900">{contract.deliveryLocation || 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-600">Delivery Address</td>
                        <td className="py-2 font-semibold text-gray-900">{contract.deliveryAddress || 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-600">Packing</td>
                        <td className="py-2 font-semibold text-gray-900">{contract.packing || 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-600">Loading Condition</td>
                        <td className="py-2 font-semibold text-gray-900">{contract.loadingCondition || 'N/A'}</td>
                      </tr>
                      {contract.loadingDeadline && (
                        <tr className="border-b border-gray-100">
                          <td className="py-2 text-gray-600">Loading Deadline</td>
                          <td className="py-2 font-semibold text-gray-900">{new Date(contract.loadingDeadline).toLocaleDateString('en-IN')}</td>
                        </tr>
                      )}
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-600">Payment Terms</td>
                        <td className="py-2 font-semibold text-gray-900">{contract.paymentTerms || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-600">GST</td>
                        <td className="py-2 font-semibold text-gray-900">{contract.gstPercent}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {contract.otherTerms && (
                  <div className="border border-gray-300 rounded-lg p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">OTHER TERMS</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{contract.otherTerms}</p>
                  </div>
                )}

                {settings.termsAndConditions?.length > 0 && (
                  <div className="border border-gray-300 rounded-lg p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">TERMS & CONDITIONS</p>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      {settings.termsAndConditions.map((term, i) => (
                        <li key={i}>{term}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between text-xs text-gray-500">
                <span>This is a computer generated contract note.</span>
                <span className="font-bold uppercase">{printMode} COPY</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { ChevronDown, Download, Eye, TrendingUp } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

export default function BrokerageBills() {
  const navigate = useNavigate();
  const { contracts, settings } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewingBill, setViewingBill] = useState<any>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
  const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth));

  const monthContracts = contracts.filter(c => {
    const d = parseISO(c.date);
    return isWithinInterval(d, { start: monthStart, end: monthEnd }) && c.status !== 'cancelled';
  });

  // Group by party
  const bills = useMemo(() => {
    const grouped: any = {};
    monthContracts.forEach(c => {
      const partyId = c.seller.id;
      if (!grouped[partyId]) {
        grouped[partyId] = {
          party: c.seller,
          contracts: [],
          totalQuantity: 0,
          totalBrokerage: 0
        };
      }
      grouped[partyId].contracts.push(c);
      grouped[partyId].totalQuantity += c.quantity;
      grouped[partyId].totalBrokerage += (c.brokerageAmount || 0);
    });
    return Object.values(grouped);
  }, [monthContracts]);

  const totalMonthBrokerage = bills.reduce((sum: number, b: any) => sum + b.totalBrokerage, 0);

  const generateBillPDF = (bill: any) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.name, pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Brokerage Bill', pageWidth / 2, y, { align: 'center' });
    y += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(bill.party.legalName, 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (bill.party.gstin) doc.text(`GSTIN: ${bill.party.gstin}`, 15, y);
    y += 5;
    doc.text(`Period: ${months[selectedMonth]} ${selectedYear}`, 15, y);
    y += 10;

    const tableData = bill.contracts.map((c: any) => [
      `#${c.contractNo}`,
      new Date(c.date).toLocaleDateString('en-IN'),
      c.product?.name || 'N/A',
      `${c.quantity} ${c.quantityUnit}`,
      `Rs.${(c.brokerageAmount || 0).toLocaleString('en-IN')}`
    ]);

    (doc as any).autoTable({
      startY: y,
      head: [['Contract#', 'Date', 'Product', 'Qty', 'Brokerage']],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [225, 29, 72] }
    });

    y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Contracts: ${bill.contracts.length}`, 15, y);
    doc.text(`Total Brokerage: Rs.${bill.totalBrokerage.toLocaleString('en-IN')}`, pageWidth - 15, y, { align: 'right' });

    doc.save(`Brokerage_Bill_${bill.party.legalName}_${months[selectedMonth]}_${selectedYear}.pdf`);
    toast.success('Bill downloaded');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brokerage Bills</h1>
          <p className="text-sm text-gray-500 mt-1">Auto-generated monthly statements</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-rose-500 outline-none appearance-none pr-10"
            >
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-rose-500 outline-none appearance-none pr-10"
            >
              {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Monthly Summary Widget */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm font-medium">{months[selectedMonth]} {selectedYear}</p>
            <p className="text-3xl font-bold mt-1">Rs. {totalMonthBrokerage.toLocaleString('en-IN')}</p>
            <p className="text-emerald-200 text-sm mt-1">brokerage earned from {monthContracts.length} contracts</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {bills.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No brokerage bills for {months[selectedMonth]} {selectedYear}</p>
          <p className="text-sm text-gray-400 mt-1">Create contracts to generate bills</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bills.map((bill: any) => (
            <div key={bill.party.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{bill.party.legalName}</h3>
                  {bill.party.gstin && <p className="text-sm text-gray-500">{bill.party.gstin}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">Rs. {bill.totalBrokerage.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500">{bill.contracts.length} Contracts</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Contract#</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Product</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Qty</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Brokerage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bill.contracts.map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2">
                          <button
                            onClick={() => navigate(`/contracts/${c.id}`)}
                            className="text-rose-600 hover:underline font-medium"
                          >
                            #{c.contractNo}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{new Date(c.date).toLocaleDateString('en-IN')}</td>
                        <td className="px-3 py-2 text-gray-900">{c.product?.name || 'N/A'}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{c.quantity} {c.quantityUnit}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">Rs. {(c.brokerageAmount || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Total Quantity: {bill.totalQuantity} MT</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingBill(bill)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => generateBillPDF(bill)}
                    className="flex items-center gap-2 px-3 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bill View Modal */}
      {viewingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setViewingBill(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">{settings.name}</h2>
                <p className="text-sm text-gray-500">Brokerage Bill</p>
              </div>
              <div className="mb-4">
                <p className="font-semibold text-gray-900">{viewingBill.party.legalName}</p>
                {viewingBill.party.gstin && <p className="text-sm text-gray-500">{viewingBill.party.gstin}</p>}
                <p className="text-sm text-gray-500">Period: {months[selectedMonth]} {selectedYear}</p>
              </div>
              <table className="w-full text-sm mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Contract#</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Product</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Qty</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Brokerage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewingBill.contracts.map((c: any) => (
                    <tr key={c.id}>
                      <td className="px-3 py-2 text-rose-600 font-medium">#{c.contractNo}</td>
                      <td className="px-3 py-2 text-gray-600">{new Date(c.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-3 py-2 text-gray-900">{c.product?.name}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{c.quantity} {c.quantityUnit}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">Rs. {(c.brokerageAmount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600">Total Contracts: {viewingBill.contracts.length}</p>
                <p className="text-lg font-bold text-gray-900">Total: Rs. {viewingBill.totalBrokerage.toLocaleString('en-IN')}</p>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => generateBillPDF(viewingBill)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => setViewingBill(null)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Download, Eye, X, Share2 } from 'lucide-react';
import { generateBrokerageBillPDF, downloadPDF } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function BrokerageBills() {
  const { contracts, parties, settings } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewingBill, setViewingBill] = useState<any>(null);

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  const monthContracts = contracts.filter(c => {
    const d = new Date(c.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const bills = useMemo(() => {
    const byParty: Record<string, any> = {};
    monthContracts.forEach(c => {
      if (!byParty[c.sellerId]) {
        byParty[c.sellerId] = {
          party: c.seller,
          contracts: [],
          totalBrokerage: 0,
          totalQuantity: 0
        };
      }
      byParty[c.sellerId].contracts.push(c);
      byParty[c.sellerId].totalBrokerage += c.brokerageAmount || 0;
      byParty[c.sellerId].totalQuantity += c.quantity || 0;
    });
    return Object.values(byParty);
  }, [monthContracts]);

  const handleDownloadBill = (bill: any) => {
    const doc = generateBrokerageBillPDF(
      {
        ...bill,
        month: selectedMonth + 1,
        year: selectedYear,
        generatedAt: new Date()
      },
      settings
    );
    downloadPDF(doc, `Brokerage_Bill_${bill.party.legalName}_${months[selectedMonth]}_${selectedYear}.pdf`);
    toast.success('Bill downloaded');
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Brokerage Bills</h1>
          <p className="text-sm text-gray-500">Auto-generated monthly statements</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value))}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
          >
            {months.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-500">
        {monthContracts.length} contracts this month
      </div>

      {bills.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-2xl">
          <p>No brokerage bills for {months[selectedMonth]} {selectedYear}</p>
          <p className="text-xs mt-1">Create contracts to generate bills</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bills.map((bill: any, idx: number) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold">{bill.party.legalName}</h3>
                  <p className="text-sm text-gray-500">{bill.party.gstin}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-rose-600">Rs. {bill.totalBrokerage.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500">{bill.contracts.length} Contracts</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Contract#</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Date</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Product</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">Qty</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">Brokerage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.contracts.map((c: any) => (
                      <tr key={c.id} className="border-t border-gray-50">
                        <td className="px-3 py-2">#{c.contractNo}</td>
                        <td className="px-3 py-2 text-gray-600">{c.date}</td>
                        <td className="px-3 py-2">{c.product?.name || 'N/A'}</td>
                        <td className="px-3 py-2 text-right">{c.quantity} {c.quantityUnit}</td>
                        <td className="px-3 py-2 text-right">Rs.{c.brokerageAmount?.toLocaleString('en-IN') || '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-600">
                  Total Quantity: <span className="font-medium">{bill.totalQuantity} MT</span>
                  <span className="mx-2">|</span>
                  Total Brokerage: <span className="font-medium text-rose-600">Rs.{bill.totalBrokerage.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingBill({ ...bill, month: selectedMonth, year: selectedYear })}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button
                    onClick={() => handleDownloadBill(bill)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-100"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Bill Modal */}
      {viewingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewingBill(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-rose-600">{settings.name}</h2>
                <p className="text-sm text-gray-500">Brokerage Bill</p>
              </div>
              <button onClick={() => setViewingBill(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="font-semibold">{viewingBill.party.legalName}</p>
                <p className="text-sm text-gray-600">{viewingBill.party.gstin}</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Period: {months[viewingBill.month]} {viewingBill.year}</span>
              </div>
            </div>

            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 text-xs font-semibold">Contract#</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold">Date</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold">Product</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold">Qty</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold">Brokerage</th>
                </tr>
              </thead>
              <tbody>
                {viewingBill.contracts.map((c: any) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">#{c.contractNo}</td>
                    <td className="px-3 py-2 text-gray-600">{c.date}</td>
                    <td className="px-3 py-2">{c.product?.name}</td>
                    <td className="px-3 py-2 text-right">{c.quantity} {c.quantityUnit}</td>
                    <td className="px-3 py-2 text-right">Rs.{c.brokerageAmount?.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                Total Contracts: <span className="font-medium">{viewingBill.contracts.length}</span>
              </div>
              <div className="text-lg font-bold text-rose-600">
                Total: Rs.{viewingBill.totalBrokerage.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

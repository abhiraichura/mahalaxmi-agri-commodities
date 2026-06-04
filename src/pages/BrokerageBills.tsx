import { useState, useMemo } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { FileText, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateBrokerageBillPDF, downloadPDF } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function BrokerageBills() {
  const { contracts, parties, settings } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewingBill, setViewingBill] = useState<any>(null);

  const monthContracts = useMemo(() => {
    return contracts.filter(c => {
      const d = new Date(c.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && c.status !== 'cancelled';
    });
  }, [contracts, selectedMonth, selectedYear]);

  const bills = useMemo(() => {
    const partyMap = new Map<string, any[]>();
    monthContracts.forEach(c => {
      if (!partyMap.has(c.sellerId)) partyMap.set(c.sellerId, []);
      partyMap.get(c.sellerId)!.push({ ...c, brokerageDirection: 'seller' });
      if (!partyMap.has(c.buyerId)) partyMap.set(c.buyerId, []);
      partyMap.get(c.buyerId)!.push({ ...c, brokerageDirection: 'buyer' });
    });

    return Array.from(partyMap.entries()).map(([partyId, partyContracts]) => {
      const party = parties.find(p => p.id === partyId);
      if (!party) return null;
      const totalBrokerage = partyContracts.reduce((sum, c) => sum + (c.brokerageAmount || 0), 0);
      const totalQuantity = partyContracts.reduce((sum, c) => sum + (c.quantity || 0), 0);
      return {
        id: `${partyId}-${selectedMonth}-${selectedYear}`,
        month: selectedMonth,
        year: selectedYear,
        partyId,
        party,
        contracts: partyContracts,
        totalBrokerage,
        totalQuantity,
        generatedAt: new Date().toISOString(),
        status: 'pending'
      };
    }).filter(Boolean);
  }, [monthContracts, parties, selectedMonth, selectedYear]);

  const downloadBill = (bill: any) => {
    const doc = generateBrokerageBillPDF(bill, settings);
    downloadPDF(doc, `Brokerage_Bill_${bill.party.legalName}_${months[selectedMonth]}_${selectedYear}.pdf`);
    toast.success('Downloaded');
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brokerage Bills</h1>
          <p className="text-sm text-gray-500">Auto-generated monthly statements</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <button onClick={() => setSelectedMonth(m => m === 0 ? 11 : m - 1)} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium w-28 text-center">{months[selectedMonth]} {selectedYear}</span>
          <button onClick={() => setSelectedMonth(m => m === 11 ? 0 : m + 1)} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <p className="text-sm text-gray-600">{monthContracts.length} contracts this month</p>
      </div>

      {bills.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500">No brokerage bills for {months[selectedMonth]} {selectedYear}</p>
          <p className="text-sm text-gray-400 mt-1">Create contracts to generate bills</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bills.map(bill => (
            <div key={bill.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{bill.party.legalName}</h3>
                  {bill.party.gstin && <p className="text-sm text-gray-500">{bill.party.gstin}</p>}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span>{bill.contracts.length} Contracts</span>
                    <span className="font-semibold text-rose-600">Rs.{bill.totalBrokerage.toLocaleString('en-IN')}</span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setViewingBill(bill)} className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                    <Eye size={18} className="text-gray-600" />
                  </button>
                  <button onClick={() => downloadBill(bill)} className="p-2 hover:bg-gray-100 rounded-lg" title="Download">
                    <Download size={18} className="text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-xs text-gray-500 font-medium">Contract#</th>
                      <th className="text-left py-2 text-xs text-gray-500 font-medium">Date</th>
                      <th className="text-left py-2 text-xs text-gray-500 font-medium">Product</th>
                      <th className="text-left py-2 text-xs text-gray-500 font-medium">Qty</th>
                      <th className="text-right py-2 text-xs text-gray-500 font-medium">Brokerage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.contracts.map((c: any) => (
                      <tr key={c.id} className="border-b border-gray-50">
                        <td className="py-2 font-medium">#{c.contractNo}</td>
                        <td className="py-2 text-gray-600">{c.date}</td>
                        <td className="py-2 text-gray-600">{c.product?.name || 'N/A'}</td>
                        <td className="py-2 text-gray-600">{c.quantity} {c.quantityUnit}</td>
                        <td className="py-2 text-right font-medium">Rs.{(c.brokerageAmount || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end gap-4 mt-3 text-sm">
                  <span className="text-gray-500">Total Quantity: <span className="font-medium text-gray-900">{bill.totalQuantity} MT</span></span>
                  <span className="text-gray-500">Total Brokerage: <span className="font-medium text-rose-600">Rs.{bill.totalBrokerage.toLocaleString('en-IN')}</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingBill(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-rose-600">{settings.name}</h2>
              <p className="text-sm text-gray-500">Brokerage Bill</p>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-900">{viewingBill.party.legalName}</p>
                {viewingBill.party.gstin && <p className="text-sm text-gray-500">{viewingBill.party.gstin}</p>}
                <p className="text-sm text-gray-500 mt-1">Period: {months[viewingBill.month]} {viewingBill.year}</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-rose-100">
                    <th className="text-left py-2 text-xs text-rose-600 font-semibold">Contract No</th>
                    <th className="text-left py-2 text-xs text-rose-600 font-semibold">Date</th>
                    <th className="text-left py-2 text-xs text-rose-600 font-semibold">Product</th>
                    <th className="text-left py-2 text-xs text-rose-600 font-semibold">Qty</th>
                    <th className="text-right py-2 text-xs text-rose-600 font-semibold">Brokerage</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingBill.contracts.map((c: any) => (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="py-2 font-medium">#{c.contractNo}</td>
                      <td className="py-2 text-gray-600">{c.date}</td>
                      <td className="py-2 text-gray-600">{c.product?.name}</td>
                      <td className="py-2 text-gray-600">{c.quantity} {c.quantityUnit}</td>
                      <td className="py-2 text-right font-medium">Rs.{(c.brokerageAmount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">Total Contracts: {viewingBill.contracts.length}</span>
                <span className="text-lg font-bold text-rose-600">Total: Rs.{viewingBill.totalBrokerage.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => { downloadBill(viewingBill); setViewingBill(null); }}
                className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-rose-700">Download PDF</button>
              <button onClick={() => setViewingBill(null)} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

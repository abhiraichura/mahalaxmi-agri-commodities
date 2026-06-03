import { useState, useEffect } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Receipt, Download, Calendar, Eye, IndianRupee, FileText, MessageCircle } from 'lucide-react';
import { generateBrokerageBillPDF, downloadPDF } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';

export default function BrokerageBills() {
  const { contracts, parties, settings } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewingBill, setViewingBill] = useState<any>(null);

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const monthContracts = contracts.filter(c => {
    const d = new Date(c.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && c.status !== 'cancelled';
  });

  const bills: any[] = [];
  const partyIds = [...new Set(monthContracts.map(c => c.sellerId))];
  partyIds.forEach(pid => {
    const pContracts = monthContracts.filter(c => c.sellerId === pid);
    const party = parties.find(p => p.id === pid);
    if (party && pContracts.length > 0) {
      const totalBrokerage = pContracts.reduce((sum, c) => sum + (c.brokerageAmount || 0), 0);
      const totalQty = pContracts.reduce((sum, c) => sum + c.quantity, 0);
      bills.push({
        id: `${pid}-${selectedMonth}-${selectedYear}`,
        month: selectedMonth,
        year: selectedYear,
        party,
        contracts: pContracts,
        totalBrokerage,
        totalQuantity: totalQty,
        generatedAt: new Date(),
        status: 'pending'
      });
    }
  });

  const handleDownload = (bill: any) => {
    try {
      const doc = generateBrokerageBillPDF(bill, settings);
      downloadPDF(doc, `Brokerage_Bill_${bill.party.legalName}_${months[selectedMonth]}_${selectedYear}.pdf`);
      toast.success('Bill downloaded!');
    } catch (e) {
      toast.error('Failed to generate bill');
    }
  };

  const handleShare = (bill: any) => {
    const text = `Brokerage Bill - ${bill.party.legalName}\nPeriod: ${months[selectedMonth]} ${selectedYear}\nTotal Brokerage: Rs.${bill.totalBrokerage.toLocaleString('en-IN')}\nContracts: ${bill.contracts.length}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brokerage Bills</h1>
          <p className="text-sm text-gray-500 mt-1">Auto-generated monthly statements</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <Calendar className="w-5 h-5 text-gray-400" />
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
            {[2024,2025,2026,2027,2028].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-sm text-gray-500 ml-auto">{monthContracts.length} contracts this month</span>
        </div>
      </div>

      {bills.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No brokerage bills for {months[selectedMonth]} {selectedYear}</p>
          <p className="text-sm text-gray-400 mt-1">Create contracts to generate bills</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bills.map(bill => (
            <div key={bill.id} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{bill.party.legalName}</h3>
                    <p className="text-sm text-gray-500">{bill.party.gstin}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {bill.contracts.length} Contracts</span>
                      <span className="flex items-center gap-1"><IndianRupee className="w-4 h-4" /> {bill.totalBrokerage.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">Pending</span>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Contract Breakdown</h4>
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Contract#</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Product</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600">Qty</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600">Brokerage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bill.contracts.map((c: any) => (
                        <tr key={c.id} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-2 text-gray-900">#{c.contractNo}</td>
                          <td className="px-4 py-2 text-gray-600">{c.date}</td>
                          <td className="px-4 py-2 text-gray-600">{c.product?.name || 'N/A'}</td>
                          <td className="px-4 py-2 text-right text-gray-900">{c.quantity} {c.quantityUnit}</td>
                          <td className="px-4 py-2 text-right font-medium text-rose-600">Rs.{c.brokerageAmount?.toLocaleString('en-IN') || '0'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Total Quantity: <span className="font-medium">{bill.totalQuantity} MT</span>
                  <span className="mx-3">|</span>
                  Total Brokerage: <span className="font-bold text-rose-600">Rs.{bill.totalBrokerage.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setViewingBill(bill)}
                    className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> View
                  </button>
                  <button onClick={() => handleDownload(bill)}
                    className="px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-sm font-medium hover:bg-rose-100 flex items-center gap-2">
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                  <button onClick={() => handleShare(bill)}
                    className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> Share
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingBill && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Brokerage Bill Preview</h3>
              <button onClick={() => setViewingBill(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div className="text-center border-b border-gray-200 pb-4">
                  <h2 className="text-xl font-bold text-rose-600">{settings.name}</h2>
                  <p className="text-sm text-gray-500">Brokerage Bill</p>
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{viewingBill.party.legalName}</p>
                    <p className="text-gray-500">{viewingBill.party.gstin}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">Period: {months[viewingBill.month]} {viewingBill.year}</p>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-rose-200">
                      <th className="text-left py-2 font-medium text-rose-700">Contract#</th>
                      <th className="text-left py-2 font-medium text-rose-700">Date</th>
                      <th className="text-left py-2 font-medium text-rose-700">Product</th>
                      <th className="text-right py-2 font-medium text-rose-700">Qty</th>
                      <th className="text-right py-2 font-medium text-rose-700">Brokerage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingBill.contracts.map((c: any) => (
                      <tr key={c.id} className="border-b border-gray-100">
                        <td className="py-2">#{c.contractNo}</td>
                        <td className="py-2">{c.date}</td>
                        <td className="py-2">{c.product?.name}</td>
                        <td className="py-2 text-right">{c.quantity} {c.quantityUnit}</td>
                        <td className="py-2 text-right font-medium">Rs.{c.brokerageAmount?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t-2 border-rose-200 pt-4 flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Contracts: {viewingBill.contracts.length}</span>
                  <span className="text-lg font-bold text-rose-600">Total: Rs.{viewingBill.totalBrokerage.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setViewingBill(null)} className="px-4 py-2 text-gray-600 font-medium">Close</button>
              <button onClick={() => { handleDownload(viewingBill); setViewingBill(null); }}
                className="px-6 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 flex items-center gap-2">
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

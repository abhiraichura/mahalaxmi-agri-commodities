import { useState, useMemo } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { FileText, Download, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { generateBrokerageBillPDF, downloadPDF } from '../utils/pdfGenerator';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function BrokerageBills() {
  const { contracts, parties, settings } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewingBill, setViewingBill] = useState<any>(null);

  const monthContracts = useMemo(() => {
    return contracts.filter((c: any) => {
      const d = new Date(c.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [contracts, selectedMonth, selectedYear]);

  const bills = useMemo(() => {
    const partyMap = new Map();
    monthContracts.forEach((c: any) => {
      const sellerId = c.seller?.id || c.sellerId;
      const buyerId = c.buyer?.id || c.buyerId;

      [sellerId, buyerId].forEach((partyId) => {
        if (!partyId) return;
        const party = parties.find((p: any) => p.id === partyId);
        if (!party) return;

        if (!partyMap.has(partyId)) {
          partyMap.set(partyId, {
            party,
            contracts: [],
            totalBrokerage: 0,
            totalQuantity: 0,
            month: selectedMonth,
            year: selectedYear,
          });
        }
        const bill = partyMap.get(partyId);
        const brokerageAmount = c.brokerageAmount || 0;
        bill.contracts.push({ ...c, brokerageAmount });
        bill.totalBrokerage += brokerageAmount;
        bill.totalQuantity += (c.quantity || 0);
      });
    });
    return Array.from(partyMap.values());
  }, [monthContracts, parties, selectedMonth, selectedYear]);

  const handlePrint = (bill: any) => {
    setViewingBill(bill);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleDownloadPDF = (bill: any) => {
    const doc = generateBrokerageBillPDF(bill, settings);
    downloadPDF(doc, `Brokerage-Bill-${bill.party.legalName}-${months[selectedMonth]}-${selectedYear}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brokerage Bills</h1>
          <p className="text-sm text-gray-500 mt-1">Auto-generated monthly statements</p>
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200">
        <button
          onClick={() => setSelectedMonth((m) => (m === 0 ? 11 : m - 1))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <div className="text-lg font-bold text-gray-900">{months[selectedMonth]} {selectedYear}</div>
          <div className="text-sm text-gray-500">{monthContracts.length} contracts this month</div>
        </div>
        <button
          onClick={() => setSelectedMonth((m) => (m === 11 ? 0 : m + 1))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Bills */}
      {bills.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No brokerage bills for {months[selectedMonth]} {selectedYear}</h3>
          <p className="text-sm text-gray-500 mt-1">Create contracts to generate bills</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {bills.map((bill: any) => (
            <div key={bill.party.id} className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{bill.party.legalName}</h3>
                  <p className="text-sm text-gray-500">{bill.party.gstin}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">₹{bill.totalBrokerage.toLocaleString('en-IN')}</div>
                  <div className="text-sm text-gray-500">{bill.contracts.length} Contracts</div>
                </div>
              </div>

              {/* Contract Breakdown */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 font-medium text-gray-500">Contract#</th>
                      <th className="text-left py-2 font-medium text-gray-500">Date</th>
                      <th className="text-left py-2 font-medium text-gray-500">Product</th>
                      <th className="text-left py-2 font-medium text-gray-500">Qty</th>
                      <th className="text-right py-2 font-medium text-gray-500">Brokerage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.contracts.map((c: any) => (
                      <tr key={c.id} className="border-b border-gray-50">
                        <td className="py-2">#{c.contractNo}</td>
                        <td className="py-2">{c.date}</td>
                        <td className="py-2">{c.product?.name || 'N/A'}</td>
                        <td className="py-2">{c.quantity} {c.quantityUnit}</td>
                        <td className="py-2 text-right">₹{c.brokerageAmount?.toLocaleString('en-IN') || '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  Total Quantity: {bill.totalQuantity} MT
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrint(bill)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(bill)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Print View */}
      {viewingBill && (
        <div className="hidden print:block">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-center">{settings.name}</h2>
            <p className="text-center text-gray-500">Brokerage Bill</p>
            <div className="mt-8">
              <p><strong>Party:</strong> {viewingBill.party.legalName}</p>
              <p><strong>GSTIN:</strong> {viewingBill.party.gstin}</p>
              <p><strong>Period:</strong> {months[viewingBill.month]} {viewingBill.year}</p>
            </div>
            <table className="w-full mt-4 border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">Contract#</th>
                  <th className="border border-gray-300 p-2">Date</th>
                  <th className="border border-gray-300 p-2">Product</th>
                  <th className="border border-gray-300 p-2">Qty</th>
                  <th className="border border-gray-300 p-2">Brokerage</th>
                </tr>
              </thead>
              <tbody>
                {viewingBill.contracts.map((c: any) => (
                  <tr key={c.id}>
                    <td className="border border-gray-300 p-2">#{c.contractNo}</td>
                    <td className="border border-gray-300 p-2">{c.date}</td>
                    <td className="border border-gray-300 p-2">{c.product?.name}</td>
                    <td className="border border-gray-300 p-2">{c.quantity} {c.quantityUnit}</td>
                    <td className="border border-gray-300 p-2">₹{c.brokerageAmount?.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-right">
              <p>Total Contracts: {viewingBill.contracts.length}</p>
              <p className="text-xl font-bold">Total: ₹{viewingBill.totalBrokerage.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

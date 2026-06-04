import { useState } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, FileText, ArrowLeft, Download, Phone } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function PartyLedger() {
  const { parties, contracts, products } = useAppStore();
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  const selectedParty = parties.find(p => p.id === selectedPartyId);

  const partyContracts = contracts.filter(c => {
    if (!selectedPartyId) return false;
    const isParty = c.sellerId === selectedPartyId || c.buyerId === selectedPartyId;
    if (!isParty) return false;
    const cDate = parseISO(c.date);
    return isWithinInterval(cDate, {
      start: startOfMonth(new Date(selectedYear, selectedMonth)),
      end: endOfMonth(new Date(selectedYear, selectedMonth))
    });
  });

  // Calculate running balance
  let runningBalance = 0;
  const ledgerRows = partyContracts.map(c => {
    const isSeller = c.sellerId === selectedPartyId;
    const brokerage = c.brokerageAmount || 0;
    const totalPayments = (c.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    // If party is seller: they receive payment, we charge brokerage
    // If party is buyer: they pay, we charge brokerage
    const debit = isSeller ? 0 : totalPayments; // Buyer pays = debit to them
    const credit = isSeller ? totalPayments : 0; // Seller receives = credit to them
    const brokerageDue = brokerage;
    runningBalance += (credit - debit - brokerageDue);

    return {
      date: c.date,
      description: `Contract #${c.contractNo} - ${c.product.name}`,
      type: isSeller ? 'Sale' : 'Purchase',
      quantity: `${c.quantity} ${c.quantityUnit}`,
      price: c.price,
      totalValue: c.quantity * c.price,
      brokerage: brokerageDue,
      payments: totalPayments,
      balance: runningBalance
    };
  });

  const totalBrokerage = partyContracts.reduce((sum, c) => sum + (c.brokerageAmount || 0), 0);
  const totalPayments = partyContracts.reduce((sum, c) => sum + (c.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0), 0);

  const exportLedger = () => {
    if (!selectedParty) return;
    const headers = ['Date', 'Description', 'Type', 'Quantity', 'Price', 'Total Value', 'Brokerage', 'Payments', 'Balance'];
    const rows = ledgerRows.map(r => [
      format(new Date(r.date), 'dd/MM/yyyy'),
      r.description,
      r.type,
      r.quantity,
      r.price,
      r.totalValue,
      r.brokerage,
      r.payments,
      r.balance
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ledger_${selectedParty.legalName}_${months[selectedMonth]}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parsePhones = (phoneStr: string): string[] => {
    if (!phoneStr) return [];
    return phoneStr.split(/[/,]/).map(s => s.trim()).filter(Boolean);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Party Ledger / Account Statement</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Party</label>
          <select
            value={selectedPartyId}
            onChange={e => setSelectedPartyId(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm"
          >
            <option value="">-- Select Party --</option>
            {parties.map(p => (
              <option key={p.id} value={p.id}>{p.legalName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value))}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm"
          >
            {months.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedParty && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">{selectedParty.legalName}</h2>
              <p className="text-sm text-gray-600">{selectedParty.address}</p>
              <p className="text-sm text-gray-600">{selectedParty.city}, {selectedParty.state}</p>
              {selectedParty.gstin && <p className="text-sm text-gray-500">GSTIN: {selectedParty.gstin}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {parsePhones(selectedParty.phone).map((phone, idx) => (
                  <a key={idx} href={`tel:+91${phone.replace(/\D/g, '')}`} className="text-sm text-rose-600 hover:underline">
                    <Phone className="w-3.5 h-3.5 inline mr-1" />{phone}
                  </a>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{months[selectedMonth]} {selectedYear}</p>
              <p className="text-lg font-bold text-rose-600">Rs. {totalBrokerage.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-500">Total Brokerage</p>
            </div>
          </div>
        </div>
      )}

      {selectedPartyId && (
        <div className="flex justify-end mb-3">
          <button
            onClick={exportLedger}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      )}

      {selectedPartyId && partyContracts.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-2xl">
          <FileText className="w-12 h-12 mx-auto mb-3" />
          <p>No contracts found for {selectedParty?.legalName} in {months[selectedMonth]} {selectedYear}</p>
        </div>
      ) : selectedPartyId ? (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Description</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Qty</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Price</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Total Value</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Brokerage</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Payments</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledgerRows.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-600">{format(new Date(row.date), 'dd MMM')}</td>
                  <td className="px-4 py-3 font-medium">{row.description}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs ${row.type === 'Sale' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{row.quantity}</td>
                  <td className="px-4 py-3 text-right">Rs. {row.price.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right">Rs. {row.totalValue.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-rose-600">Rs. {row.brokerage.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-green-600">Rs. {row.payments.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right font-medium">Rs. {row.balance.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={6} className="px-4 py-3 text-right">Totals:</td>
                <td className="px-4 py-3 text-right text-rose-600">Rs. {totalBrokerage.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right text-green-600">Rs. {totalPayments.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right">Rs. {runningBalance.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </div>
  );
}

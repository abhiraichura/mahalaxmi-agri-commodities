import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, ChevronDown, Download, ArrowLeft, FileText, Receipt } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

export default function PartyLedger() {
  const navigate = useNavigate();
  const { parties, contracts, currentYear } = useAppStore();
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const filteredParties = parties.filter(p =>
    p.legalName.toLowerCase().includes(search.toLowerCase()) ||
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const party = parties.find(p => p.id === selectedParty);

  const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
  const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth));

  const partyContracts = useMemo(() => {
    if (!selectedParty) return [];
    return contracts.filter(c => {
      const d = parseISO(c.date);
      return (
        (c.seller.id === selectedParty || c.buyer.id === selectedParty) &&
        isWithinInterval(d, { start: monthStart, end: monthEnd })
      );
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [contracts, selectedParty, monthStart, monthEnd]);

  const runningBalance = useMemo(() => {
    let balance = 0;
    return partyContracts.map(c => {
      const isSeller = c.seller.id === selectedParty;
      const brokerage = c.brokerageAmount || 0;
      // If party is seller, they receive payment (credit to them, debit from broker)
      // If party is buyer, they pay (debit to them, credit to broker)
      const debit = isSeller ? 0 : (c.totalValue || 0);
      const credit = isSeller ? (c.totalValue || 0) : 0;
      balance += credit - debit;
      return { ...c, debit, credit, balance, isSeller };
    });
  }, [partyContracts, selectedParty]);

  const totalBrokerage = partyContracts.reduce((sum, c) => sum + (c.brokerageAmount || 0), 0);
  const totalValue = partyContracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);

  const exportLedger = () => {
    if (!party) return;
    const headers = ['Date', 'Contract#', 'Type', 'Product', 'Qty', 'Debit', 'Credit', 'Balance'];
    const rows = runningBalance.map(entry => [
      entry.date,
      entry.contractNo,
      entry.isSeller ? 'Sale' : 'Purchase',
      entry.product.name,
      `${entry.quantity} ${entry.quantityUnit}`,
      entry.debit.toLocaleString('en-IN'),
      entry.credit.toLocaleString('en-IN'),
      entry.balance.toLocaleString('en-IN')
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_${party.legalName}_${months[selectedMonth]}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Party Ledger</h1>
          <p className="text-sm text-gray-500">Monthly account statement per party</p>
        </div>
      </div>

      {/* Party Selection */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Party</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search party..."
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>
        {search && filteredParties.length > 0 && (
          <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {filteredParties.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedParty(p.id); setSearch(''); }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium text-gray-900">{p.legalName}</p>
                <p className="text-xs text-gray-500">{p.city}, {p.state}</p>
              </button>
            ))}
          </div>
        )}
        {selectedParty && party && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium text-rose-900">{party.legalName}</p>
              <p className="text-xs text-rose-700">{party.city}, {party.state}</p>
            </div>
            <button onClick={() => setSelectedParty('')} className="text-rose-600 hover:text-rose-800 text-sm font-medium">
              Change
            </button>
          </div>
        )}
      </div>

      {/* Month/Year Selector */}
      <div className="flex gap-3">
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
        {selectedParty && (
          <button
            onClick={exportLedger}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors ml-auto"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Ledger Statement */}
      {selectedParty && party && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">{party.legalName}</h2>
                <p className="text-sm text-gray-500">Account Statement - {months[selectedMonth]} {selectedYear}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Contracts</p>
                <p className="text-xl font-bold text-gray-900">{partyContracts.length}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Total Value</p>
                <p className="text-lg font-bold text-gray-900">Rs. {totalValue.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Brokerage Due</p>
                <p className="text-lg font-bold text-rose-600">Rs. {totalBrokerage.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Running Balance</p>
                <p className={`text-lg font-bold ${runningBalance.length > 0 ? (runningBalance[runningBalance.length - 1].balance >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-900'}`}>
                  Rs. {runningBalance.length > 0 ? runningBalance[runningBalance.length - 1].balance.toLocaleString('en-IN') : '0'}
                </p>
              </div>
            </div>
          </div>

          {runningBalance.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No contracts for this month</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Contract#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Product</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Qty</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Debit</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Credit</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {runningBalance.map((entry, i) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600">{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/contracts/${entry.id}`)}
                          className="text-rose-600 hover:underline font-medium"
                        >
                          #{entry.contractNo}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${entry.isSeller ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {entry.isSeller ? 'Sale' : 'Purchase'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{entry.product.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{entry.quantity} {entry.quantityUnit}</td>
                      <td className="px-4 py-3 text-right text-red-600">{entry.debit > 0 ? entry.debit.toLocaleString('en-IN') : '-'}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{entry.credit > 0 ? entry.credit.toLocaleString('en-IN') : '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{entry.balance.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

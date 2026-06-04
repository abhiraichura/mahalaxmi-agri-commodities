import { useState, useMemo } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Plus, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PartyLedger() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const { parties, contracts, settings } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const party = parties.find(p => p.id === partyId);
  if (!party) return (
    <div className="p-8 text-center">
      <p className="text-gray-500">Party not found</p>
      <button onClick={() => navigate('/parties')} className="mt-4 text-rose-600 text-sm">Go back</button>
    </div>
  );

  const partyContracts = useMemo(() => {
    return contracts
      .filter(c => (c.sellerId === partyId || c.buyerId === partyId) && c.status !== 'cancelled')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [contracts, partyId]);

  const monthlyContracts = partyContracts.filter(c => {
    const d = new Date(c.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const entries = useMemo(() => {
    let balance = 0;
    return monthlyContracts.map(c => {
      const isSeller = c.sellerId === partyId;
      const brokerage = c.brokerageAmount || 0;
      const debit = isSeller ? 0 : brokerage;
      const credit = isSeller ? brokerage : 0;
      balance += debit - credit;
      return {
        date: c.date,
        description: `Contract #${c.contractNo} - ${c.product.name} (${isSeller ? 'Sold' : 'Bought'})`,
        contractId: c.id,
        debit,
        credit,
        balance,
      };
    });
  }, [monthlyContracts, partyId]);

  const totalBrokerage = monthlyContracts.reduce((sum, c) => sum + (c.brokerageAmount || 0), 0);
  const totalQuantity = monthlyContracts.reduce((sum, c) => sum + c.quantity, 0);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Debit (Rs.)', 'Credit (Rs.)', 'Balance (Rs.)'];
    const rows = entries.map(e => [
      format(new Date(e.date), 'dd/MM/yyyy'),
      e.description,
      e.debit || '',
      e.credit || '',
      e.balance
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ledger_${party.legalName}_${months[selectedMonth]}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/parties')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Party Ledger</h1>
          <p className="text-sm text-gray-500">{party.legalName}</p>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3 mb-6">
        <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm">
          {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm">
          {[2023, 2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 ml-auto">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Contracts</p>
          <p className="text-xl font-bold text-gray-900">{monthlyContracts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Quantity</p>
          <p className="text-xl font-bold text-gray-900">{totalQuantity} MT</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Brokerage</p>
          <p className="text-xl font-bold text-rose-600">Rs. {totalBrokerage.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Statement Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Account Statement</h2>
          <p className="text-xs text-gray-500">{months[selectedMonth]} {selectedYear}</p>
        </div>
        {entries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No transactions this month</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Description</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500">Debit</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500">Credit</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e, i) => (
                <tr key={i} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/contracts/${e.contractId}`)}>
                  <td className="px-6 py-3 text-gray-600">{format(new Date(e.date), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gray-400" />
                      <span className="text-gray-900">{e.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-900">{e.debit ? `Rs. ${e.debit.toLocaleString('en-IN')}` : '-'}</td>
                  <td className="px-6 py-3 text-right text-gray-900">{e.credit ? `Rs. ${e.credit.toLocaleString('en-IN')}` : '-'}</td>
                  <td className="px-6 py-3 text-right font-semibold text-gray-900">Rs. {e.balance.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

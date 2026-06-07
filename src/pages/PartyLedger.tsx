import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, FileText, ArrowLeft, Download, Phone, ChevronDown, Check } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function PartyLedger() {
  const { parties, contracts, products } = useAppStore();
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node)) {
        setPartyDropdownOpen(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) {
        setMonthDropdownOpen(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setYearDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    const debit = isSeller ? 0 : totalPayments; 
    const credit = isSeller ? totalPayments : 0; 
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
    <div className="max-w-5xl mx-auto pt-16 lg:pt-8 px-4 lg:px-8 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Party Ledger / Account Statement</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Custom Party Dropdown */}
        <div className="md:col-span-2 relative" ref={partyDropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Party</label>
          <button
            type="button"
            onClick={() => setPartyDropdownOpen(!partyDropdownOpen)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm flex items-center justify-between text-left transition-colors hover:bg-gray-50"
          >
            <span className={selectedPartyId ? 'text-gray-900 font-medium truncate pr-4' : 'text-gray-400'}>
              {selectedPartyId ? parties.find(p => p.id === selectedPartyId)?.legalName : '-- Select Party --'}
            </span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${partyDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {partyDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto py-1">
              <button
                type="button"
                onClick={() => { setSelectedPartyId(''); setPartyDropdownOpen(false); }}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${!selectedPartyId ? 'bg-rose-50 text-rose-700 font-medium' : 'text-gray-700'}`}
              >
                <span>-- Select Party --</span>
                {!selectedPartyId && <Check size={14} className="text-rose-600" />}
              </button>
              {parties.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setSelectedPartyId(p.id); setPartyDropdownOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${selectedPartyId === p.id ? 'bg-rose-50 text-rose-700 font-medium' : 'text-gray-700'}`}
                >
                  <span className="truncate pr-2">{p.legalName}</span>
                  {selectedPartyId === p.id && <Check size={14} className="text-rose-600 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom Month Dropdown */}
        <div className="relative" ref={monthDropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <button
            type="button"
            onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm flex items-center justify-between text-left transition-colors hover:bg-gray-50"
          >
            <span className="text-gray-900 font-medium">{months[selectedMonth]}</span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${monthDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {monthDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto py-1">
              {months.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setSelectedMonth(i); setMonthDropdownOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${selectedMonth === i ? 'bg-rose-50 text-rose-700 font-medium' : 'text-gray-700'}`}
                >
                  <span>{m}</span>
                  {selectedMonth === i && <Check size={14} className="text-rose-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom Year Dropdown */}
        <div className="relative" ref={yearDropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <button
            type="button"
            onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm flex items-center justify-between text-left transition-colors hover:bg-gray-50"
          >
            <span className="text-gray-900 font-medium">{selectedYear}</span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {yearDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto py-1">
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setSelectedYear(y); setYearDropdownOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${selectedYear === y ? 'bg-rose-50 text-rose-700 font-medium' : 'text-gray-700'}`}
                >
                  <span>{y}</span>
                  {selectedYear === y && <Check size={14} className="text-rose-600" />}
                </button>
              ))}
            </div>
          )}
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
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors"
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
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Description</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Type</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Qty</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Price</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Total Value</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Brokerage</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Payments</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledgerRows.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{format(new Date(row.date), 'dd MMM')}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{row.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${row.type === 'Sale' ? 'bg-amber-50 text-amber-700 border border-amber-200/50' : 'bg-blue-50 text-blue-700 border border-blue-200/50'}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{row.quantity}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">Rs. {row.price.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">Rs. {row.totalValue.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-rose-600 font-medium whitespace-nowrap">Rs. {row.brokerage.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium whitespace-nowrap">Rs. {row.payments.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">Rs. {row.balance.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                <td colSpan={6} className="px-4 py-4 text-right text-gray-700">Totals:</td>
                <td className="px-4 py-4 text-right text-rose-600">Rs. {totalBrokerage.toLocaleString('en-IN')}</td>
                <td className="px-4 py-4 text-right text-green-600">Rs. {totalPayments.toLocaleString('en-IN')}</td>
                <td className="px-4 py-4 text-right text-gray-900">Rs. {runningBalance.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </div>
  );
}

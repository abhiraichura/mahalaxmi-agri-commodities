import { useState, useMemo } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Contract, Party, BillPayment } from '../types';
import { generateBrokerageBillPDF, downloadPDF } from '../utils/pdfGenerator';
import { Calendar, Download, ChevronLeft, ChevronRight, Eye, DollarSign, CheckCircle, Clock, AlertCircle, Plus, X, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface BillGroup {
  party: Party;
  contracts: Contract[];
  totalBrokerage: number;
  totalQuantity: number;
  status: 'pending' | 'paid' | 'partial';
  paidAmount: number;
  balanceAmount: number;
  payments: BillPayment[];
  billType: 'buyer' | 'seller'; // NEW: distinguish bill type
}

export default function BrokerageBills() {
  const { contracts, parties, settings } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewingBill, setViewingBill] = useState<BillGroup | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState<Partial<BillPayment>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    mode: 'bank_transfer',
    reference: '',
    notes: ''
  });

  // Date range filter for custom bill generation
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [showDateRange, setShowDateRange] = useState(false);
  const [selectedPartyForRange, setSelectedPartyForRange] = useState<string>('all');

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  const monthContracts = contracts.filter(c => {
    const d = new Date(c.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  // Load saved payment status from localStorage
  const getSavedPayments = (partyId: string, billType: 'buyer' | 'seller', month: number, year: number): BillPayment[] => {
    const key = `bill_payments_${partyId}_${billType}_${month}_${year}`;
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  };

  const savePayments = (partyId: string, billType: 'buyer' | 'seller', month: number, year: number, payments: BillPayment[]) => {
    const key = `bill_payments_${partyId}_${billType}_${month}_${year}`;
    localStorage.setItem(key, JSON.stringify(payments));
  };

  // Generate BOTH buyer and seller bills
  const bills = useMemo(() => {
    const byParty: Record<string, BillGroup> = {};

    monthContracts.forEach(c => {
      // SELLER BILL
      if (c.sellerBrokerageAmount > 0) {
        const sellerKey = `${c.sellerId}_seller`;
        if (!byParty[sellerKey]) {
          const savedPayments = getSavedPayments(c.sellerId, 'seller', selectedMonth, selectedYear);
          const paidAmount = savedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          byParty[sellerKey] = {
            party: c.seller,
            contracts: [],
            totalBrokerage: 0,
            totalQuantity: 0,
            status: paidAmount >= 0 ? 'pending' : 'pending',
            paidAmount,
            balanceAmount: 0,
            payments: savedPayments,
            billType: 'seller'
          };
        }
        byParty[sellerKey].contracts.push(c);
        byParty[sellerKey].totalBrokerage += c.sellerBrokerageAmount || 0;
        byParty[sellerKey].totalQuantity += c.quantity || 0;
      }

      // BUYER BILL
      if (c.buyerBrokerageAmount > 0) {
        const buyerKey = `${c.buyerId}_buyer`;
        if (!byParty[buyerKey]) {
          const savedPayments = getSavedPayments(c.buyerId, 'buyer', selectedMonth, selectedYear);
          const paidAmount = savedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          byParty[buyerKey] = {
            party: c.buyer,
            contracts: [],
            totalBrokerage: 0,
            totalQuantity: 0,
            status: 'pending',
            paidAmount,
            balanceAmount: 0,
            payments: savedPayments,
            billType: 'buyer'
          };
        }
        byParty[buyerKey].contracts.push(c);
        byParty[buyerKey].totalBrokerage += c.buyerBrokerageAmount || 0;
        byParty[buyerKey].totalQuantity += c.quantity || 0;
      }
    });

    // Recalculate status and balance
    Object.values(byParty).forEach(bill => {
      bill.balanceAmount = Math.max(0, bill.totalBrokerage - bill.paidAmount);
      bill.status = bill.paidAmount >= bill.totalBrokerage ? 'paid' : bill.paidAmount > 0 ? 'partial' : 'pending';
    });

    return Object.values(byParty);
  }, [monthContracts, selectedMonth, selectedYear]);

  const handleDownloadBill = (bill: BillGroup) => {
    const doc = generateBrokerageBillPDF(
      {
        ...bill,
        month: selectedMonth + 1,
        year: selectedYear,
        generatedAt: new Date(),
        status: bill.status,
        paidAmount: bill.paidAmount,
        balanceAmount: bill.balanceAmount,
        payments: bill.payments
      },
      settings,
      bill.billType // pass bill type to PDF generator
    );
    const typeLabel = bill.billType === 'buyer' ? 'Buyer' : 'Seller';
    downloadPDF(doc, `Brokerage_Bill_${typeLabel}_${bill.party.legalName}_${months[selectedMonth]}_${selectedYear}.pdf`);
    toast.success('Bill downloaded');
  };

  const handleAddPayment = () => {
    if (!viewingBill) return;
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      toast.error('Enter valid amount');
      return;
    }

    const newPayment: BillPayment = {
      id: crypto.randomUUID(),
      date: paymentForm.date || format(new Date(), 'yyyy-MM-dd'),
      amount: paymentForm.amount || 0,
      mode: paymentForm.mode || 'bank_transfer',
      reference: paymentForm.reference || '',
      notes: paymentForm.notes || '',
      createdAt: new Date().toISOString()
    };

    const updatedPayments = [...viewingBill.payments, newPayment];
    savePayments(viewingBill.party.id, viewingBill.billType, selectedMonth, selectedYear, updatedPayments);

    // Update the bill in view
    const updatedBill = { ...viewingBill };
    updatedBill.payments = updatedPayments;
    updatedBill.paidAmount = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    updatedBill.balanceAmount = Math.max(0, updatedBill.totalBrokerage - updatedBill.paidAmount);
    updatedBill.status = updatedBill.paidAmount >= updatedBill.totalBrokerage ? 'paid' : updatedBill.paidAmount > 0 ? 'partial' : 'pending';

    setViewingBill(updatedBill);
    setShowPaymentModal(false);
    setPaymentForm({ date: format(new Date(), 'yyyy-MM-dd'), amount: 0, mode: 'bank_transfer', reference: '', notes: '' });
    toast.success('Payment recorded');
  };

  // Custom date range bill generation - also generates BOTH types
  const handleCustomRangeDownload = () => {
    const fromDate = parseISO(dateRange.from);
    const toDate = parseISO(dateRange.to);

    const rangeContracts = contracts.filter(c => {
      const d = parseISO(c.date);
      return isWithinInterval(d, { start: fromDate, end: toDate });
    });

    if (rangeContracts.length === 0) {
      toast.error('No contracts in selected date range');
      return;
    }

    const byParty: Record<string, BillGroup> = {};
    rangeContracts.forEach(c => {
      // SELLER
      if (c.sellerBrokerageAmount > 0) {
        const key = `${c.sellerId}_seller`;
        if (selectedPartyForRange !== 'all' && key !== `${selectedPartyForRange}_seller`) return;
        if (!byParty[key]) {
          byParty[key] = {
            party: c.seller,
            contracts: [],
            totalBrokerage: 0,
            totalQuantity: 0,
            status: 'pending',
            paidAmount: 0,
            balanceAmount: 0,
            payments: [],
            billType: 'seller'
          };
        }
        byParty[key].contracts.push(c);
        byParty[key].totalBrokerage += c.sellerBrokerageAmount || 0;
        byParty[key].totalQuantity += c.quantity || 0;
      }

      // BUYER
      if (c.buyerBrokerageAmount > 0) {
        const key = `${c.buyerId}_buyer`;
        if (selectedPartyForRange !== 'all' && key !== `${selectedPartyForRange}_buyer`) return;
        if (!byParty[key]) {
          byParty[key] = {
            party: c.buyer,
            contracts: [],
            totalBrokerage: 0,
            totalQuantity: 0,
            status: 'pending',
            paidAmount: 0,
            balanceAmount: 0,
            payments: [],
            billType: 'buyer'
          };
        }
        byParty[key].contracts.push(c);
        byParty[key].totalBrokerage += c.buyerBrokerageAmount || 0;
        byParty[key].totalQuantity += c.quantity || 0;
      }
    });

    if (Object.keys(byParty).length === 0) {
      toast.error('No contracts for selected party in date range');
      return;
    }

    Object.values(byParty).forEach(bill => {
      const doc = generateBrokerageBillPDF(
        {
          ...bill,
          month: 0,
          year: selectedYear,
          generatedAt: new Date(),
          status: bill.status,
          paidAmount: bill.paidAmount,
          balanceAmount: bill.balanceAmount,
          payments: bill.payments
        },
        settings,
        bill.billType
      );
      const fromStr = format(fromDate, 'ddMMM');
      const toStr = format(toDate, 'ddMMM');
      const typeLabel = bill.billType === 'buyer' ? 'Buyer' : 'Seller';
      downloadPDF(doc, `Brokerage_Bill_${typeLabel}_${bill.party.legalName}_${fromStr}_${toStr}.pdf`);
    });

    toast.success(`Downloaded ${Object.keys(byParty).length} bill(s)`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={16} className="text-green-600" />;
      case 'partial': return <Clock size={16} className="text-amber-600" />;
      default: return <AlertCircle size={16} className="text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-50 text-green-700 border-green-200';
      case 'partial': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Brokerage Bills</h1>
            <p className="text-sm text-gray-500 mt-1">Auto-generated monthly statements with payment tracking</p>
          </div>

          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-1">
            <button
              onClick={() => {
                if (selectedMonth === 0) {
                  setSelectedMonth(11);
                  setSelectedYear(y => y - 1);
                } else {
                  setSelectedMonth(m => m - 1);
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2 px-3">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
                {months[selectedMonth]} {selectedYear}
              </span>
            </div>
            <button
              onClick={() => {
                if (selectedMonth === 11) {
                  setSelectedMonth(0);
                  setSelectedYear(y => y + 1);
                } else {
                  setSelectedMonth(m => m + 1);
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Custom Date Range Download */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-6">
          <button
            onClick={() => setShowDateRange(!showDateRange)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-rose-600"
          >
            <Filter size={16} />
            {showDateRange ? 'Hide' : 'Show'} Custom Date Range Download
          </button>
          {showDateRange && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Party</label>
                <select value={selectedPartyForRange} onChange={e => setSelectedPartyForRange(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  <option value="all">All Parties</option>
                  {parties.map(p => <option key={p.id} value={p.id}>{p.legalName}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={handleCustomRangeDownload} className="w-full py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700">
                  Download Bills
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bills List */}
        {bills.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <DollarSign size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No brokerage bills for {months[selectedMonth]} {selectedYear}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {bills.map(bill => (
              <div key={`${bill.party.id}_${bill.billType}`} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(bill.status)}`}>
                        {bill.status.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${bill.billType === 'buyer' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                        {bill.billType === 'buyer' ? 'BUYER BILL' : 'SELLER BILL'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{bill.party.legalName}</h3>
                    <p className="text-sm text-gray-500">{bill.contracts.length} contract(s) | {bill.totalQuantity.toFixed(2)} MT total</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total Brokerage</p>
                      <p className="text-lg font-bold text-gray-900">₹{bill.totalBrokerage.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Balance</p>
                      <p className="text-lg font-bold text-rose-600">₹{bill.balanceAmount.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingBill(bill)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleDownloadBill(bill)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bill Detail Modal */}
      {viewingBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{viewingBill.party.legalName}</h2>
                  <p className="text-sm text-gray-500">
                    {months[selectedMonth]} {selectedYear} | 
                    <span className={viewingBill.billType === 'buyer' ? 'text-blue-600' : 'text-purple-600'}>
                      {viewingBill.billType === 'buyer' ? ' Buyer Bill' : ' Seller Bill'}
                    </span>
                  </p>
                </div>
                <button onClick={() => setViewingBill(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Contracts */}
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2">Contracts</h3>
                <div className="space-y-2">
                  {viewingBill.contracts.map(c => (
                    <div key={c.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{c.contractNo}</span>
                        <span>₹{viewingBill.billType === 'buyer' ? c.buyerBrokerageAmount.toFixed(2) : c.sellerBrokerageAmount.toFixed(2)}</span>
                      </div>
                      <p className="text-gray-500">{c.product?.name} | {c.quantity} {c.quantityUnit}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm text-gray-700">Payments</h3>
                  <button onClick={() => setShowPaymentModal(true)} className="text-sm text-rose-600 hover:text-rose-700 font-medium">
                    + Add Payment
                  </button>
                </div>
                {viewingBill.payments.length === 0 ? (
                  <p className="text-sm text-gray-400">No payments recorded</p>
                ) : (
                  <div className="space-y-2">
                    {viewingBill.payments.map(p => (
                      <div key={p.id} className="flex justify-between p-3 bg-green-50 rounded-lg text-sm">
                        <div>
                          <span className="font-medium">₹{p.amount}</span>
                          <span className="text-gray-500 ml-2">{p.mode} | {p.date}</span>
                        </div>
                        {p.reference && <span className="text-gray-400">Ref: {p.reference}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Brokerage</span>
                  <span className="font-medium">₹{viewingBill.totalBrokerage.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Paid Amount</span>
                  <span className="font-medium text-green-600">₹{viewingBill.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                  <span className="text-gray-600">Balance</span>
                  <span className="font-bold text-rose-600">₹{viewingBill.balanceAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && viewingBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Payment</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <select value={paymentForm.mode} onChange={e => setPaymentForm({...paymentForm, mode: e.target.value as any})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input value={paymentForm.notes} onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAddPayment} className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700">Add</button>
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

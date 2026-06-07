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
  billType: 'buyer' | 'seller';
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

  const getSavedPayments = (partyId: string, month: number, year: number, billType: 'buyer' | 'seller'): BillPayment[] => {
    const key = `bill_payments_${partyId}_${month}_${year}_${billType}`;
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  };

  const savePayments = (partyId: string, month: number, year: number, billType: 'buyer' | 'seller', payments: BillPayment[]) => {
    const key = `bill_payments_${partyId}_${month}_${year}_${billType}`;
    localStorage.setItem(key, JSON.stringify(payments));
  };

  const bills = useMemo(() => {
    const byParty: Record<string, BillGroup> = {};

    monthContracts.forEach(c => {
      // Seller brokerage bill
      const sellerBrokerage = c.sellerBrokerageAmount || 0;
      if (sellerBrokerage > 0) {
        const key = `${c.sellerId}_seller`;
        if (!byParty[key]) {
          const savedPayments = getSavedPayments(c.sellerId, selectedMonth, selectedYear, 'seller');
          const paidAmount = savedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          byParty[key] = {
            party: c.seller,
            contracts: [],
            totalBrokerage: 0,
            totalQuantity: 0,
            status: 'pending',
            paidAmount,
            balanceAmount: 0,
            payments: savedPayments,
            billType: 'seller'
          };
        }
        byParty[key].contracts.push(c);
        byParty[key].totalBrokerage += sellerBrokerage;
        byParty[key].totalQuantity += c.quantity || 0;
      }

      // Buyer brokerage bill
      const buyerBrokerage = c.buyerBrokerageAmount || 0;
      if (buyerBrokerage > 0) {
        const key = `${c.buyerId}_buyer`;
        if (!byParty[key]) {
          const savedPayments = getSavedPayments(c.buyerId, selectedMonth, selectedYear, 'buyer');
          const paidAmount = savedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          byParty[key] = {
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
        byParty[key].contracts.push(c);
        byParty[key].totalBrokerage += buyerBrokerage;
        byParty[key].totalQuantity += c.quantity || 0;
      }
    });

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
      settings
    );
    const typeLabel = bill.billType === 'buyer' ? 'Buyer' : 'Seller';
    downloadPDF(doc, `Brokerage_Bill_${typeLabel}_${bill.party.legalName}_${months[selectedMonth]}_${selectedYear}.pdf`);
    toast.success(`${typeLabel} bill downloaded`);
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
    savePayments(viewingBill.party.id, selectedMonth, selectedYear, viewingBill.billType, updatedPayments);

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
      if (c.sellerBrokerageAmount > 0) {
        const partyId = c.sellerId;
        if (selectedPartyForRange !== 'all' && partyId !== selectedPartyForRange) return;
        const key = `${partyId}_seller`;
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
        byParty[key].totalBrokerage += c.sellerBrokerageAmount;
        byParty[key].totalQuantity += c.quantity || 0;
      }

      if (c.buyerBrokerageAmount > 0) {
        const partyId = c.buyerId;
        if (selectedPartyForRange !== 'all' && partyId !== selectedPartyForRange) return;
        const key = `${partyId}_buyer`;
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
        byParty[key].totalBrokerage += c.buyerBrokerageAmount;
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
        settings
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

        <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-6">
          <button
            onClick={() => setShowDateRange(!showDateRange)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-rose-600"
          >
            <Filter size={16} />
            {showDateRange ? 'Hide' : 'Custom Date Range Download'}
          </button>

          {showDateRange && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Party (optional)</label>
                <select
                  value={selectedPartyForRange}
                  onChange={e => setSelectedPartyForRange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="all">All Parties</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.legalName}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCustomRangeDownload}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700"
                >
                  <Download size={16} />
                  Download Bills
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-6">
          <p className="text-sm text-gray-600">
            {monthContracts.length} contracts this month • {bills.length} bill{bills.length !== 1 ? 's' : ''} generated
          </p>
        </div>

        {bills.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
            <DollarSign size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No brokerage bills for {months[selectedMonth]} {selectedYear}</p>
            <p className="text-sm text-gray-400 mt-1">Create contracts to generate bills</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bills.map((bill, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                        <span className="text-sm font-bold text-rose-700">{bill.party.legalName.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{bill.party.legalName}</h3>
                        <p className="text-xs text-gray-500">{bill.contracts.length} Contracts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        bill.billType === 'seller' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {bill.billType === 'seller' ? 'Seller Brokerage' : 'Buyer Brokerage'}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(bill.status)}`}>
                        {getStatusIcon(bill.status)}
                        {bill.status === 'paid' ? 'Paid' : bill.status === 'partial' ? 'Partial' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Total Brokerage</p>
                      <p className="text-lg font-bold text-gray-900">Rs. {bill.totalBrokerage.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Paid Amount</p>
                      <p className="text-lg font-bold text-green-600">Rs. {bill.paidAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Balance</p>
                      <p className="text-lg font-bold text-red-600">Rs. {bill.balanceAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Total Qty</p>
                      <p className="text-lg font-bold text-gray-900">{bill.totalQuantity} MT</p>
                    </div>
                  </div>

                  {bill.payments.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-700 mb-2">Payment History:</p>
                      <div className="space-y-1.5">
                        {bill.payments.map(payment => (
                          <div key={payment.id} className="flex items-center justify-between text-sm bg-green-50 px-3 py-2 rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle size={14} className="text-green-600" />
                              <span>{format(new Date(payment.date), 'dd MMM yyyy')}</span>
                              <span className="text-gray-500">• {payment.mode.replace('_', ' ')}</span>
                              {payment.reference && <span className="text-gray-400">• Ref: {payment.reference}</span>}
                            </div>
                            <span className="font-medium text-green-700">Rs. {payment.amount.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setViewingBill(bill)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
                    >
                      <Eye size={16} />
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        setViewingBill(bill);
                        setShowPaymentModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100"
                    >
                      <DollarSign size={16} />
                      Add Payment
                    </button>
                    <button
                      onClick={() => handleDownloadBill(bill)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium hover:bg-rose-100"
                    >
                      <Download size={16} />
                      Download Bill
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewingBill && !showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewingBill(null)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{viewingBill.party.legalName}</h2>
                  <p className="text-sm text-gray-500">
                    {viewingBill.billType === 'seller' ? 'Seller Brokerage' : 'Buyer Brokerage'} Bill Details
                  </p>
                </div>
                <button onClick={() => setViewingBill(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-gray-900">Rs. {viewingBill.totalBrokerage.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="text-lg font-bold text-green-600">Rs. {viewingBill.paidAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">Balance</p>
                    <p className="text-lg font-bold text-red-600">Rs. {viewingBill.balanceAmount.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Contract#</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                          {viewingBill.billType === 'seller' ? 'Seller Brokerage' : 'Buyer Brokerage'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewingBill.contracts.map((c: any) => (
                        <tr key={c.id}>
                          <td className="px-4 py-2 font-medium">#{c.contractNo}</td>
                          <td className="px-4 py-2 text-gray-500">{c.date}</td>
                          <td className="px-4 py-2">{c.product?.name || 'N/A'}</td>
                          <td className="px-4 py-2 text-right">{c.quantity} {c.quantityUnit}</td>
                          <td className="px-4 py-2 text-right font-medium">
                            Rs. {(viewingBill.billType === 'seller' ? c.sellerBrokerageAmount : c.buyerBrokerageAmount)?.toLocaleString('en-IN') || '0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {viewingBill.payments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Payment History</h3>
                    <div className="space-y-2">
                      {viewingBill.payments.map(payment => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium">Rs. {payment.amount.toLocaleString('en-IN')}</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(payment.date), 'dd MMM yyyy')} • {payment.mode.replace('_', ' ')}
                              {payment.reference && ` • Ref: ${payment.reference}`}
                            </p>
                            {payment.notes && <p className="text-xs text-gray-400 mt-1">{payment.notes}</p>}
                          </div>
                          <CheckCircle size={18} className="text-green-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"
                >
                  <DollarSign size={16} />
                  Add Payment
                </button>
                <button
                  onClick={() => handleDownloadBill(viewingBill)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
                >
                  <Download size={16} />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {showPaymentModal && viewingBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPaymentModal(false)}>
            <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
                <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600">Party: <span className="font-medium text-gray-900">{viewingBill.party.legalName}</span></p>
                <p className="text-sm text-gray-600">Type: <span className="font-medium text-gray-900">{viewingBill.billType === 'seller' ? 'Seller Brokerage' : 'Buyer Brokerage'}</span></p>
                <p className="text-sm text-gray-600">Balance: <span className="font-medium text-red-600">Rs. {viewingBill.balanceAmount.toLocaleString('en-IN')}</span></p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    value={paymentForm.amount || ''}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentForm.mode}
                    onChange={e => setPaymentForm({ ...paymentForm, mode: e.target.value as any })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Cheque No / UTR</label>
                  <input
                    type="text"
                    value={paymentForm.reference || ''}
                    onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    placeholder="Reference number"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={paymentForm.notes || ''}
                    onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="Any notes about this payment"
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddPayment}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

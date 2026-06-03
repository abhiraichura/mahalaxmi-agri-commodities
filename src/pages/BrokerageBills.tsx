import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Receipt, 
  Download, 
  Calendar, 
  ChevronDown,
  FileText,
  IndianRupee
} from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import { generateBrokerageBillPDF, downloadPDF } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';

export default function BrokerageBills() {
  const navigate = useNavigate();
  const { parties, settings } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedParty, setSelectedParty] = useState<string>('all');
  const [generating, setGenerating] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Mock brokerage data
  const mockBills = [
    {
      id: '1',
      month: 6,
      year: 2026,
      party: parties[0] || { legalName: 'K.V. Agro Products', gstin: '24AAOFK1278N1ZT' },
      totalBrokerage: 3150,
      totalQuantity: 10,
      contracts: 1,
      status: 'pending'
    },
    {
      id: '2',
      month: 6,
      year: 2026,
      party: parties[1] || { legalName: 'Krishna Agribrokers', gstin: '24ACEPR5988A1ZH' },
      totalBrokerage: 5200,
      totalQuantity: 15,
      contracts: 2,
      status: 'pending'
    }
  ];

  const handleGenerateBill = async (bill: any) => {
    setGenerating(true);
    try {
      const doc = generateBrokerageBillPDF(bill, settings);
      downloadPDF(doc, `Brokerage_Bill_${bill.party.legalName}_${months[bill.month]}_${bill.year}.pdf`);
      toast.success('Brokerage bill generated!');
    } catch (error) {
      toast.error('Failed to generate bill');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      // Generate all bills for the month
      for (const bill of mockBills) {
        const doc = generateBrokerageBillPDF(bill, settings);
        downloadPDF(doc, `Brokerage_Bill_${bill.party.legalName}_${months[bill.month]}_${bill.year}.pdf`);
      }
      toast.success('All brokerage bills generated!');
    } catch (error) {
      toast.error('Failed to generate bills');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brokerage Bills</h1>
          <p className="text-sm text-gray-500 mt-1">
            Auto-generated monthly brokerage statements
          </p>
        </div>
        <button
          onClick={handleGenerateAll}
          disabled={generating}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {generating ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Download All
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            >
              <option value="all">All Parties</option>
              {parties.map(party => (
                <option key={party.id} value={party.id}>{party.legalName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bills List */}
      <div className="space-y-4">
        {mockBills.map((bill) => (
          <div
            key={bill.id}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{bill.party.legalName}</h3>
                  <p className="text-sm text-gray-500">{bill.party.gstin}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {bill.contracts} Contracts
                    </span>
                    <span className="flex items-center gap-1">
                      <IndianRupee className="w-4 h-4" />
                      {bill.totalBrokerage.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                  bill.status === 'paid' ? 'bg-green-50 text-green-700' :
                  bill.status === 'sent' ? 'bg-blue-50 text-blue-700' :
                  'bg-amber-50 text-amber-700'
                }`}>
                  {bill.status === 'pending' ? 'Pending' : bill.status === 'sent' ? 'Sent' : 'Paid'}
                </span>
                <p className="text-sm text-gray-500 mt-2">
                  {months[bill.month]} {bill.year}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total Quantity: <span className="font-medium">{bill.totalQuantity} MT</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleGenerateBill(bill)}
                  className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    // Share via WhatsApp
                    const text = `Brokerage Bill for ${bill.party.legalName} - ${months[bill.month]} ${bill.year}. Amount: ₹${bill.totalBrokerage.toLocaleString('en-IN')}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                >
                  Share on WhatsApp
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

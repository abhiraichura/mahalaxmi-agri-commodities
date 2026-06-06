import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, Plus, Filter, AlertTriangle, Clock, FileText, ChevronDown } from 'lucide-react';
import { format, isPast, parseISO, isTomorrow } from 'date-fns';

export default function AllContracts() {
  const navigate = useNavigate();
  const { contracts, parties, currentFinancialYear, settings } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [fyFilter, setFyFilter] = useState<string>(currentFinancialYear);

  const filtered = contracts.filter(c => {
    const fy = c.financialYear || `${c.year}-${c.year + 1}`;
    const matchesSearch =
      (c.contractNo || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.seller?.legalName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.buyer?.legalName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.product?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesFY = fyFilter === 'all' || fy === fyFilter;
    return matchesSearch && matchesStatus && matchesFY;
  });

  const getDeadlineStatus = (c: any) => {
    if (!c.loadingDeadline || c.status === 'completed' || c.status === 'cancelled') return null;
    const deadline = parseISO(c.loadingDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isPast(deadline) && deadline.getTime() < today.getTime()) {
      return { type: 'overdue', text: `Overdue: ${format(deadline, 'dd MMM')}` };
    }
    if (isTomorrow(deadline)) {
      return { type: 'urgent', text: `Tomorrow: ${format(deadline, 'dd MMM')}` };
    }
    return null;
  };

  return (
<div className="page-container">
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">All Contracts</h1>
          <p className="text-sm text-gray-500">{filtered.length} contracts</p>
        </div>
        <button
          onClick={() => navigate('/contracts/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
        >
          <Plus className="w-4 h-4" /> New Contract
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contracts..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm"
        >
          <option value="all">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={fyFilter}
          onChange={e => setFyFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm"
        >
          <option value="all">All Years</option>
          {settings.financialYears?.map(fy => (
            <option key={fy} value={fy}>{fy}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-2xl">
          <FileText className="w-12 h-12 mx-auto mb-3" />
          <p>No contracts found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Contract#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Seller</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Buyer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Qty</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Price</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Alert</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const alert = getDeadlineStatus(c);
                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/contracts/${c.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">#{c.contractNo}</td>
                    <td className="px-4 py-3 text-gray-600">{format(new Date(c.date), 'dd MMM yy')}</td>
                    <td className="px-4 py-3">{c.seller?.legalName || '-'}</td>
                    <td className="px-4 py-3">{c.buyer?.legalName || '-'}</td>
                    <td className="px-4 py-3">{c.product?.name || '-'}</td>
                    <td className="px-4 py-3 text-right">{c.quantity} {c.quantityUnit}</td>
                    <td className="px-4 py-3 text-right">Rs. {c.price.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                        c.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                        c.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                        c.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {alert && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${
                          alert.type === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {alert.type === 'overdue' ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {alert.text}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
</div>
  );
}

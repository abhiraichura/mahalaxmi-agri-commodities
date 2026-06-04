import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, Plus, Filter, ArrowUpDown } from 'lucide-react';

export default function AllContracts() {
  const navigate = useNavigate();
  const { contracts, currentYear } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const yearContracts = contracts.filter(c => c.financialYear === currentYear);

  const filtered = yearContracts.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.contractNo?.toLowerCase().includes(q) ||
      c.seller?.legalName?.toLowerCase().includes(q) ||
      c.buyer?.legalName?.toLowerCase().includes(q) ||
      c.product?.name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-sm text-gray-500 mt-1">{yearContracts.length} contracts in FY {currentYear}</p>
        </div>
        <button
          onClick={() => navigate('/contracts/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Contract
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contracts..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No contracts found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Contract#</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Seller</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Buyer</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Product</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Qty</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Value</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/contracts/${c.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-rose-600">#{c.contractNo}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(c.date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-gray-900">{c.seller?.legalName}</td>
                    <td className="px-4 py-3 text-gray-900">{c.buyer?.legalName}</td>
                    <td className="px-4 py-3 text-gray-900">{c.product?.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{c.quantity} {c.quantityUnit}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{(c.totalValue || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        c.status === 'active' ? 'bg-green-100 text-green-700' :
                        c.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

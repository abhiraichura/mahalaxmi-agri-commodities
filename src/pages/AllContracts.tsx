import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, Filter, Plus, FileText, Calendar, IndianRupee } from 'lucide-react';
import { Contract } from '../types';

export default function AllContracts() {
  const { contracts } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = contracts.filter((c: Contract) => {
    const matchesSearch = 
      c.contractNo.toLowerCase().includes(search.toLowerCase()) ||
      c.seller?.legalName?.toLowerCase().includes(search.toLowerCase()) ||
      c.buyer?.legalName?.toLowerCase().includes(search.toLowerCase()) ||
      c.product?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: contracts.length,
    active: contracts.filter((c: Contract) => c.status === 'active').length,
    completed: contracts.filter((c: Contract) => c.status === 'completed').length,
    cancelled: contracts.filter((c: Contract) => c.status === 'cancelled').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Contracts</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all your contracts</p>
        </div>
        <Link
          to="/contracts/new"
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Contract
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-blue-50 text-blue-700' },
          { label: 'Active', value: stats.active, color: 'bg-green-50 text-green-700' },
          { label: 'Completed', value: stats.completed, color: 'bg-gray-50 text-gray-700' },
          { label: 'Cancelled', value: stats.cancelled, color: 'bg-red-50 text-red-700' },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 rounded-2xl ${stat.color}`}>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs font-medium opacity-75">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contracts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Contracts List */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No contracts found</h3>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((contract: Contract) => (
              <Link
                key={contract.id}
                to={`/contracts/${contract.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Contract #{contract.contractNo}</div>
                    <div className="text-sm text-gray-500">
                      {contract.seller?.legalName || 'Unknown'} → {contract.buyer?.legalName || 'Unknown'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    ₹{(contract.quantity * contract.price).toLocaleString('en-IN')}
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded-full inline-block mt-1 ${
                    contract.status === 'active' ? 'bg-green-50 text-green-700' :
                    contract.status === 'completed' ? 'bg-gray-50 text-gray-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {contract.status}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

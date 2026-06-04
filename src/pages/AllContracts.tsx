import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2, Edit2, Eye, Calendar, IndianRupee, Search, Filter } from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import { Contract } from '../types';
import toast from 'react-hot-toast';

export default function AllContracts() {
  const navigate = useNavigate();
  const { contracts, loadContracts, deleteContract } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    const init = async () => {
      await loadContracts();
      setIsLoading(false);
    };
    init();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    try {
      await deleteContract(id);
      toast.success('Contract deleted');
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const filtered = contracts.filter((contract: Contract) => {
    const matchesSearch = 
      contract.contractNo.toLowerCase().includes(search.toLowerCase()) ||
      contract.seller?.legalName?.toLowerCase().includes(search.toLowerCase()) ||
      contract.buyer?.legalName?.toLowerCase().includes(search.toLowerCase()) ||
      contract.product?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    const d = new Date(contract.date);
    const matchesMonth = monthFilter === 'all' || d.getMonth() === monthFilter;
    const matchesYear = yearFilter === 'all' || d.getFullYear() === yearFilter;
    return matchesSearch && matchesStatus && matchesMonth && matchesYear;
  });

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const years = [2024, 2025, 2026, 2027, 2028];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Contracts</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} of {contracts.length} contracts</p>
        </div>
        <button onClick={() => navigate('/contract/new')}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> New Contract
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by contract no., party name, product..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
            <option value="all">All Months</option>
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
            <option value="all">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {(search || statusFilter !== 'all' || monthFilter !== 'all' || yearFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setStatusFilter('all'); setMonthFilter('all'); setYearFilter('all'); }}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg font-medium">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Contracts List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No contracts found</p>
          <button onClick={() => navigate('/contract/new')}
            className="mt-3 text-gray-900 text-sm font-medium hover:underline">
            Create your first contract
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contract</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Seller</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Buyer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Value</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((contract: Contract) => {
                  const totalValue = contract.quantity * contract.price;
                  return (
                    <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">#{contract.contractNo}</td>
                      <td className="px-4 py-3 text-gray-600">{contract.date}</td>
                      <td className="px-4 py-3 text-gray-600">{contract.seller?.legalName || 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-600">{contract.buyer?.legalName || 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-600">{contract.product?.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{contract.quantity} {contract.quantityUnit}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">Rs.{totalValue.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          contract.status === 'confirmed' ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {contract.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/contract/${contract.id}`)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => navigate(`/contract/${contract.id}/edit`)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(contract.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

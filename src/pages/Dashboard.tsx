import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, Package, Receipt, Plus, Trash2, Edit2, Eye, Calendar, IndianRupee, ArrowRight } from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import { Contract } from '../types';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const { contracts, parties, products, loadContracts, deleteContract } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

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

  const stats = [
    { label: 'Total Parties', value: parties.length, icon: Users, color: 'bg-gray-100 text-gray-600' },
    { label: 'Products', value: products.length, icon: Package, color: 'bg-gray-100 text-gray-600' },
    { label: 'Contracts', value: contracts.length, icon: FileText, color: 'bg-gray-900 text-white' },
    { label: 'This Month', value: contracts.filter(c => {
      const d = new Date(c.date);
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    }).length, icon: Receipt, color: 'bg-gray-100 text-gray-600' },
  ];

  const recentContracts = [...contracts].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Your business overview</p>
        </div>
        <button onClick={() => navigate('/contract/new')}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> New Contract
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all cursor-pointer"
              onClick={() => {
                if (stat.label === 'Total Parties') navigate('/parties');
                else if (stat.label === 'Products') navigate('/products');
                else if (stat.label === 'Contracts' || stat.label === 'This Month') navigate('/contracts');
              }}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Contracts */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent Contracts</h2>
            <p className="text-sm text-gray-500">{contracts.length} total</p>
          </div>
          <button onClick={() => navigate('/contracts')}
            className="text-sm text-gray-900 font-medium hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {contracts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No contracts yet</p>
            <button onClick={() => navigate('/contract/new')}
              className="mt-3 text-gray-900 text-sm font-medium hover:underline">
              Create your first contract
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentContracts.map((contract: Contract) => (
              <div key={contract.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Contract #{contract.contractNo}</p>
                      <p className="text-sm text-gray-500">
                        {contract.seller?.legalName || 'Unknown'} ↔ {contract.buyer?.legalName || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {contract.date}</span>
                        <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" /> {(contract.quantity * contract.price).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/contract/${contract.id}`)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => navigate(`/contract/${contract.id}/edit`)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(contract.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

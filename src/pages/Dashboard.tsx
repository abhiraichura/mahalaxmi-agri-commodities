import { useAppStore } from '../hooks/useAuthStore';
import { Link } from 'react-router-dom';
import { FileText, Users, Package, TrendingUp, AlertCircle } from 'lucide-react';
import { Contract } from '../types';

export default function Dashboard() {
  const { contracts, parties, products, settings } = useAppStore();

  const activeContracts = contracts.filter((c: Contract) => c.status === 'active');
  const completedContracts = contracts.filter((c: Contract) => c.status === 'completed');
  const cancelledContracts = contracts.filter((c: Contract) => c.status === 'cancelled');

  const stats = [
    { label: 'Total Contracts', value: contracts.length, icon: FileText, color: 'bg-blue-50 text-blue-700' },
    { label: 'Active', value: activeContracts.length, icon: TrendingUp, color: 'bg-green-50 text-green-700' },
    { label: 'Parties', value: parties.length, icon: Users, color: 'bg-purple-50 text-purple-700' },
    { label: 'Products', value: products.length, icon: Package, color: 'bg-orange-50 text-orange-700' },
  ];

  const totalValue = contracts.reduce((sum: number, c: Contract) => sum + (c.quantity * c.price), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your business overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`p-4 rounded-2xl ${stat.color}`}>
              <Icon className="w-6 h-6 mb-2 opacity-75" />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs font-medium opacity-75">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Total Value */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Contract Value</p>
            <p className="text-3xl font-bold text-gray-900">₹{totalValue.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-red-600" />
          </div>
        </div>
      </div>

      {/* Recent Contracts */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Recent Contracts</h2>
          <Link to="/contracts" className="text-sm text-red-600 hover:underline">View all</Link>
        </div>
        {contracts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No contracts yet</h3>
            <p className="text-sm text-gray-500 mt-1">Create your first contract to get started</p>
            <Link
              to="/contracts/new"
              className="inline-flex items-center mt-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              New Contract
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {contracts.slice(0, 5).map((contract: Contract) => (
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
                  <div className="text-xs text-gray-500">{contract.date}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

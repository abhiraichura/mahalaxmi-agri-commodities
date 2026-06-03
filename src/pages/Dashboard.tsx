import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Users, 
  Package, 
  Receipt, 
  TrendingUp, 
  Plus,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const { parties, products, settings, currentYear } = useAppStore();

  // Mock stats - in real app, calculate from actual data
  const stats = [
    { label: 'Total Parties', value: parties.length || 12, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Products', value: products.length || 5, icon: Package, color: 'bg-green-50 text-green-600' },
    { label: 'This Month', value: '8', icon: FileText, color: 'bg-rose-50 text-rose-600' },
    { label: 'Brokerage', value: '₹45,200', icon: Receipt, color: 'bg-amber-50 text-amber-600' },
  ];

  const recentContracts = [
    { id: '1', no: '4328', buyer: 'K.V. Agro Products', seller: 'Krishna Agribrokers', date: '29/07/2020', amount: '₹6,30,000' },
    { id: '2', no: '4329', buyer: 'Patel Traders', seller: 'Mahalaxmi Agri', date: '15/08/2020', amount: '₹12,50,000' },
    { id: '3', no: '4330', buyer: 'Shree Ram Enterprises', seller: 'Krishna Agribrokers', date: '22/08/2020', amount: '₹8,75,000' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back! Here's your business overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">FY {currentYear}-{currentYear + 1}</span>
          <button
            onClick={() => navigate('/contract/new')}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Contract
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <TrendingUp className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/contract/new')}
          className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-6 text-white text-left hover:shadow-lg transition-shadow group"
        >
          <FileText className="w-8 h-8 mb-3 opacity-80" />
          <h3 className="font-semibold text-lg">Create Contract</h3>
          <p className="text-rose-100 text-sm mt-1">Generate contract note in seconds</p>
          <ArrowRight className="w-5 h-5 mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <button
          onClick={() => navigate('/parties')}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white text-left hover:shadow-lg transition-shadow group"
        >
          <Users className="w-8 h-8 mb-3 opacity-80" />
          <h3 className="font-semibold text-lg">Party Directory</h3>
          <p className="text-blue-100 text-sm mt-1">Manage buyers and sellers</p>
          <ArrowRight className="w-5 h-5 mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <button
          onClick={() => navigate('/brokerage')}
          className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white text-left hover:shadow-lg transition-shadow group"
        >
          <Receipt className="w-8 h-8 mb-3 opacity-80" />
          <h3 className="font-semibold text-lg">Brokerage Bills</h3>
          <p className="text-amber-100 text-sm mt-1">View and download bills</p>
          <ArrowRight className="w-5 h-5 mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* Recent Contracts */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Contracts</h2>
          <button className="text-sm text-rose-600 hover:text-rose-700 font-medium">
            View All
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {recentContracts.map((contract) => (
            <div
              key={contract.id}
              onClick={() => navigate(`/contract/${contract.id}`)}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Contract #{contract.no}</p>
                  <p className="text-sm text-gray-500">
                    {contract.buyer} ← {contract.seller}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{contract.amount}</p>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {contract.date}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

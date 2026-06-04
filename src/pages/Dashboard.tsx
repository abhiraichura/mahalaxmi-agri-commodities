import { useAppStore } from '../hooks/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, Package, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const { contracts, parties, products, settings } = useAppStore();

  const activeContracts = contracts.filter(c => c.status === 'active');
  const completedContracts = contracts.filter(c => c.status === 'completed');
  const cancelledContracts = contracts.filter(c => c.status === 'cancelled');

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthBrokerage = contracts
    .filter(c => {
      const d = new Date(c.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && c.status !== 'cancelled';
    })
    .reduce((sum, c) => sum + (c.brokerageAmount || 0), 0);

  const monthContracts = contracts.filter(c => {
    const d = new Date(c.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const overdueContracts = contracts.filter(c => {
    return c.loadingDeadline && new Date(c.loadingDeadline) < new Date() && c.status === 'active';
  });

  const upcomingDeadlines = contracts.filter(c => {
    if (!c.loadingDeadline || c.status !== 'active') return false;
    const deadline = new Date(c.loadingDeadline);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return deadline <= tomorrow && deadline >= new Date();
  });

  const stats = [
    { label: 'Active Contracts', value: activeContracts.length, icon: FileText, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total Parties', value: parties.length, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Products', value: products.length, icon: Package, color: 'bg-purple-50 text-purple-600' },
    { label: 'Completed', value: completedContracts.length, icon: TrendingUp, color: 'bg-gray-50 text-gray-600' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Your business overview</p>
      </div>

      {/* Brokerage Summary Widget */}
      <div className="bg-gradient-to-r from-rose-600 to-rose-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-rose-100 text-sm font-medium">This Month's Brokerage</p>
            <p className="text-3xl font-bold mt-1">Rs. {monthBrokerage.toLocaleString('en-IN')}</p>
            <p className="text-rose-200 text-sm mt-1">from {monthContracts} contracts</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <TrendingUp size={32} className="text-white" />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(overdueContracts.length > 0 || upcomingDeadlines.length > 0) && (
        <div className="space-y-3">
          {overdueContracts.map(c => (
            <div key={c.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">
                  OVERDUE: Contract #{c.contractNo} - {c.product.name}
                </p>
                <p className="text-xs text-red-600">
                  Loading deadline was {format(new Date(c.loadingDeadline!), 'dd MMM yyyy')} 
                  ({c.seller.legalName} → {c.buyer.legalName})
                </p>
              </div>
              <button onClick={() => navigate(`/contracts/${c.id}`)}
                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">View</button>
            </div>
          ))}
          {upcomingDeadlines.map(c => (
            <div key={c.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <Clock size={20} className="text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  DUE TOMORROW: Contract #{c.contractNo} - {c.product.name}
                </p>
                <p className="text-xs text-amber-600">
                  Loading deadline: {format(new Date(c.loadingDeadline!), 'dd MMM yyyy')}
                </p>
              </div>
              <button onClick={() => navigate(`/contracts/${c.id}`)}
                className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700">View</button>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => {
                if (stat.label === 'Active Contracts') navigate('/contracts');
                if (stat.label === 'Total Parties') navigate('/parties');
                if (stat.label === 'Products') navigate('/products');
              }}>
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                <Icon size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Contracts */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Contracts</h2>
          <button onClick={() => navigate('/contracts')} className="text-sm text-rose-600 hover:text-rose-700">View all</button>
        </div>
        {contracts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No contracts yet</p>
            <button onClick={() => navigate('/contracts/new')} className="mt-2 text-sm text-rose-600">Create first contract</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {contracts.slice(0, 5).map(contract => (
              <div key={contract.id} onClick={() => navigate(`/contracts/${contract.id}`)}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Contract #{contract.contractNo}</p>
                  <p className="text-sm text-gray-500">{contract.seller?.legalName || 'Unknown'} → {contract.buyer?.legalName || 'Unknown'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-900">{contract.date}</p>
                  <p className="text-xs text-gray-500">Rs. {(contract.quantity * contract.price).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

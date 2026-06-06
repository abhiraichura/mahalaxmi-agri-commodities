import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import {
  FileText, Users, Package,
  AlertTriangle, Clock, ArrowRight
} from 'lucide-react';
import { format, isPast, parseISO, isTomorrow } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const { contracts, parties, products, currentFinancialYear } = useAppStore();

  const fyContracts = contracts.filter(c => c.financialYear === currentFinancialYear || (!c.financialYear && c.year === parseInt(currentFinancialYear.split('-')[0])));

  // Loading deadline alerts
  const overdueContracts = fyContracts.filter(c => {
    if (!c.loadingDeadline || c.status === 'completed' || c.status === 'cancelled') return false;
    const deadline = parseISO(c.loadingDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isPast(deadline) && deadline.getTime() < today.getTime();
  });

  const urgentContracts = fyContracts.filter(c => {
    if (!c.loadingDeadline || c.status === 'completed' || c.status === 'cancelled') return false;
    return isTomorrow(parseISO(c.loadingDeadline));
  });

  const stats = [
    { label: 'Contracts', value: fyContracts.length, icon: FileText, color: 'bg-blue-50 text-blue-600', path: '/contracts' },
    { label: 'Parties', value: parties.length, icon: Users, color: 'bg-purple-50 text-purple-600', path: '/parties' },
    { label: 'Products', value: products.length, icon: Package, color: 'bg-amber-50 text-amber-600', path: '/products' },
  ];

  return (
    <div className="pt-16 lg:pt-8 px-4 lg:px-8 pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500">Financial Year: {currentFinancialYear}</p>
      </div>

      {/* Loading Deadline Alerts */}
      {(overdueContracts.length > 0 || urgentContracts.length > 0) && (
        <div className="mb-6 space-y-3">
          {overdueContracts.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <span className="font-medium">OVERDUE:</span> Contract #{c.contractNo} — Loading deadline was {format(parseISO(c.loadingDeadline), 'dd MMM yyyy')}
              </div>
              <button
                onClick={() => navigate(`/contracts/${c.id}`)}
                className="text-xs font-medium underline hover:no-underline"
              >
                View
              </button>
            </div>
          ))}
          {urgentContracts.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
              <Clock className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <span className="font-medium">URGENT:</span> Contract #{c.contractNo} — Loading deadline is tomorrow ({format(parseISO(c.loadingDeadline), 'dd MMM yyyy')})
              </div>
              <button
                onClick={() => navigate(`/contracts/${c.id}`)}
                className="text-xs font-medium underline hover:no-underline"
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid - CLICKABLE */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              onClick={() => navigate(stat.path)}
              className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer hover:shadow-md hover:border-rose-200 transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Contracts */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold">Recent Contracts</h2>
          <button
            onClick={() => navigate('/contracts')}
            className="text-sm text-rose-600 hover:text-rose-700 font-medium"
          >
            View All
          </button>
        </div>

        {fyContracts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3" />
            <p>No contracts yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {fyContracts.slice(0, 5).map((contract) => (
              <div
                key={contract.id}
                onClick={() => navigate(`/contracts/${contract.id}`)}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">Contract #{contract.contractNo}</p>
                  <p className="text-xs text-gray-500">
                    {contract.seller?.legalName || 'Unknown'} → {contract.buyer?.legalName || 'Unknown'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Rs. {(contract.quantity * contract.price).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500">{format(new Date(contract.date), 'dd MMM yyyy')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

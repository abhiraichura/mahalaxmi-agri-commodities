import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { FileText, Users, Package, Receipt, TrendingUp, AlertTriangle, Calendar, ChevronDown, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const { contracts, parties, products, settings, currentYear, setCurrentYear } = useAppStore();
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [showAddYear, setShowAddYear] = useState(false);

  const yearContracts = contracts.filter(c => c.financialYear === currentYear);
  const activeContracts = yearContracts.filter(c => c.status === 'active');
  const completedContracts = yearContracts.filter(c => c.status === 'completed');

  // Monthly brokerage summary
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthContracts = contracts.filter(c => {
    const d = parseISO(c.date);
    return isWithinInterval(d, { start: monthStart, end: monthEnd });
  });
  const monthBrokerage = monthContracts.reduce((sum, c) => sum + (c.brokerageAmount || 0), 0);

  // Loading deadline alerts
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const alerts = contracts.filter(c => {
    if (!c.loadingDeadline || c.status !== 'active') return false;
    const deadline = new Date(c.loadingDeadline);
    return deadline <= tomorrow && deadline >= today;
  });
  const overdue = contracts.filter(c => {
    if (!c.loadingDeadline || c.status !== 'active') return false;
    return new Date(c.loadingDeadline) < today;
  });

  const stats = [
    { label: 'Contracts', value: yearContracts.length, icon: FileText, color: 'bg-blue-50 text-blue-600', path: '/contracts' },
    { label: 'Parties', value: parties.length, icon: Users, color: 'bg-emerald-50 text-emerald-600', path: '/parties' },
    { label: 'Products', value: products.length, icon: Package, color: 'bg-amber-50 text-amber-600', path: '/products' },
    { label: 'Bills', value: 0, icon: Receipt, color: 'bg-purple-50 text-purple-600', path: '/bills' },
  ];

  const handleAddYear = () => {
    if (!newYearInput.match(/^\d{4}-\d{4}$/)) {
      alert('Format: 2026-2027');
      return;
    }
    const years = [...(settings.financialYears || []), newYearInput];
    useAppStore.getState().updateSettings({ financialYears: years });
    setCurrentYear(newYearInput);
    setShowAddYear(false);
    setNewYearInput('');
  };

  const allYears = settings.financialYears || ['2024-2025', '2025-2026'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Your business overview</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            FY {currentYear}
            <ChevronDown className={`w-4 h-4 transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {yearDropdownOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              {allYears.map(year => (
                <button
                  key={year}
                  onClick={() => { setCurrentYear(year); setYearDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                    year === currentYear ? 'text-rose-600 font-medium bg-rose-50' : 'text-gray-700'
                  }`}
                >
                  FY {year}
                </button>
              ))}
              <div className="border-t border-gray-100 p-2">
                {!showAddYear ? (
                  <button
                    onClick={() => setShowAddYear(true)}
                    className="w-full text-left px-2 py-2 text-sm text-rose-600 font-medium hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Year
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      value={newYearInput}
                      onChange={e => setNewYearInput(e.target.value)}
                      placeholder="2026-2027"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddYear}
                        className="flex-1 px-3 py-1.5 bg-rose-600 text-white text-xs rounded-lg font-medium"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setShowAddYear(false); setNewYearInput(''); }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Brokerage Summary Widget */}
      <div className="bg-gradient-to-r from-rose-600 to-rose-700 rounded-xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-rose-100 text-sm font-medium">This Month's Brokerage</p>
            <p className="text-3xl font-bold mt-1">Rs. {monthBrokerage.toLocaleString('en-IN')}</p>
            <p className="text-rose-200 text-sm mt-1">from {monthContracts.length} contracts</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              onClick={() => navigate(stat.path)}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-rose-200 transition-all text-left"
            >
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {(alerts.length > 0 || overdue.length > 0) && (
        <div className="space-y-3">
          {overdue.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-800">Overdue Loading Deadlines</h3>
              </div>
              <div className="space-y-2">
                {overdue.map(c => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-red-700">Contract #{c.contractNo} - {c.product.name}</span>
                    <span className="text-red-600 font-medium">{new Date(c.loadingDeadline!).toLocaleDateString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {alerts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-800">Due Tomorrow</h3>
              </div>
              <div className="space-y-2">
                {alerts.map(c => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-amber-700">Contract #{c.contractNo} - {c.product.name}</span>
                    <span className="text-amber-600 font-medium">{new Date(c.loadingDeadline!).toLocaleDateString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Contracts */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Contracts</h2>
          <button onClick={() => navigate('/contracts')} className="text-sm text-rose-600 hover:text-rose-700 font-medium">
            View All
          </button>
        </div>
        {yearContracts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No contracts for FY {currentYear}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {yearContracts.slice(0, 5).map(contract => (
              <div
                key={contract.id}
                onClick={() => navigate(`/contracts/${contract.id}`)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">Contract #{contract.contractNo}</p>
                  <p className="text-sm text-gray-500">
                    {contract.seller?.legalName || 'Unknown'} → {contract.buyer?.legalName || 'Unknown'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{(contract.totalValue || 0).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500">{contract.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

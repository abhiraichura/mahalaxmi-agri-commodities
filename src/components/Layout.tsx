import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, useAppStore } from '../hooks/useAuthStore';
import {
  LayoutDashboard, FileText, Users, Package, Settings,
  LogOut, Menu, X, IndianRupee, BookOpen, StickyNote,
  ChevronDown
} from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { currentFinancialYear, setCurrentFinancialYear, settings } = useAppStore();
  const [fyOpen, setFyOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/contracts', label: 'Contracts', icon: FileText },
    { path: '/parties', label: 'Parties', icon: Users },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/bills', label: 'Brokerage Bills', icon: IndianRupee },
    { path: '/ledger', label: 'Party Ledger', icon: BookOpen },
    { path: '/notes', label: 'Notes', icon: StickyNote },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h1 className="font-bold text-rose-600 text-lg">Mahalaxmi</h1>
            <p className="text-xs text-gray-500">Agri Commodities</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Year Selector */}
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => setFyOpen(!fyOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl text-sm"
          >
            <span className="font-medium">{currentFinancialYear}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${fyOpen ? 'rotate-180' : ''}`} />
          </button>
          {fyOpen && (
            <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              {(settings.financialYears || []).map(fy => (
                <button
                  key={fy}
                  onClick={() => { setCurrentFinancialYear(fy); setFyOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${currentFinancialYear === fy ? 'bg-rose-50 text-rose-700 font-medium' : ''}`}
                >
                  {fy}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-rose-50 text-rose-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <LogOut className="w-4.5 h-4.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-rose-600">Mahalaxmi</h1>
        </header>
        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

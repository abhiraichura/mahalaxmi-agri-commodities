import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  LayoutDashboard, FileText, Users, Package, Receipt, Settings, LogOut,
  BookOpen, StickyNote, ChevronDown, ChevronRight, FolderOpen, Menu, X, RefreshCw
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { checkForUpdate, markVersionSeen, clearAppCache } from '../utils/cacheManager';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [partiesOpen, setPartiesOpen] = useState(
    location.pathname.startsWith('/parties') || location.pathname.startsWith('/gulfood')
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useEffect(() => {
    if (checkForUpdate()) {
      setShowUpdateBanner(true);
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const handleUpdateNow = async () => {
    markVersionSeen();
    setShowUpdateBanner(false);
    await clearAppCache();
  };

  const handleDismiss = () => {
    markVersionSeen();
    setShowUpdateBanner(false);
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/contracts', icon: FileText, label: 'Contracts' },
    { to: '/products', icon: Package, label: 'Products' },
    { to: '/brokerage', icon: Receipt, label: 'Brokerage Bills' },
    { to: '/ledger', icon: BookOpen, label: 'Party Ledger' },
    { to: '/notes', icon: StickyNote, label: 'Notes' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Update Banner */}
      {showUpdateBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 text-sm font-medium">
            <RefreshCw className="w-4 h-4" />
            New version available. Please update to see latest changes.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDismiss}
              className="text-xs underline opacity-90 hover:opacity-100"
            >
              Dismiss
            </button>
            <button
              onClick={handleUpdateNow}
              className="px-3 py-1 text-xs font-semibold bg-white text-amber-600 rounded hover:bg-gray-100"
            >
              Update Now
            </button>
            <button onClick={() => setShowUpdateBanner(false)} className="opacity-80 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-700 hover:bg-gray-50"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-gray-200 flex flex-col fixed h-full z-40 transition-transform duration-300 ease-in-out
          w-64
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-lg font-bold text-rose-700">Mahalaxmi Agri</h1>
          <p className="text-xs text-gray-500">Contract Manager</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Regular nav items */}
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-rose-50 text-rose-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}

          {/* Parties with submenu */}
          <div>
            <button
              onClick={() => setPartiesOpen(!partiesOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                (location.pathname.startsWith('/parties') || location.pathname.startsWith('/gulfood'))
                  ? 'bg-rose-50 text-rose-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={18} />
                Parties
              </div>
              {partiesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {partiesOpen && (
              <div className="ml-4 mt-1 space-y-1">
                <NavLink
                  to="/parties"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                      isActive && location.pathname === '/parties'
                        ? 'bg-rose-50 text-rose-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`
                  }
                >
                  <Users size={16} />
                  Party Directory
                </NavLink>
                <NavLink
                  to="/gulfood"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                      isActive
                        ? 'bg-rose-50 text-rose-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`
                  }
                >
                  <FolderOpen size={16} />
                  Gulfood Directory
                </NavLink>
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="px-4 py-2 mb-2">
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 lg:ml-64 min-w-0 ${showUpdateBanner ? 'pt-10' : ''}`}>
        {children}
      </main>
    </div>
  );
}

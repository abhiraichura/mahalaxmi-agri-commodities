import { useState, useEffect } from 'react';
import { Menu, X, ArrowLeft, Home, FileText, Box, Settings, Users, Notebook, LogOut, ChevronRight, BookOpen, Calculator, Globe } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import toast from 'react-hot-toast';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
  };

  const menuItems = [
    { name: 'Dashboard', icon: Home, path: '/dashboard' },
    { name: 'Contracts', icon: FileText, path: '/contracts' },
    { name: 'Products', icon: Box, path: '/products' },
    { name: 'Brokerage Bills', icon: Calculator, path: '/brokerage-bills' },
    { name: 'Party Ledger', icon: BookOpen, path: '/party-ledger' },
    { name: 'Notes', icon: Notebook, path: '/notes' },
    { name: 'Gulf Food', icon: Globe, path: '/gulf-food-directory' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const navigationItems = [
    { name: 'Parties', icon: Users, path: '/parties' },
  ];

  useEffect(() => {
    setShowMobileMenu(false);
  }, [location]);

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <div className={`flex flex-col border-r border-gray-200 bg-white static z-10 ${
        collapsed ? 'w-16 items-center px-2 py-4' : 'w-64 px-4 py-5'
      } transition-all duration-300 ease-in-out hidden md:flex`}>
        <div className="flex items-center justify-between mb-8">
          <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? "" : ""}`}>
            <div className={`w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center flex-shrink-0 ${collapsed ? "" : ""}`}>
              <span className="text-white font-bold text-xl">M</span>
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-xl font-bold text-rose-600 whitespace-nowrap">Mahalaxmi</h1>
                <p className="text-xs text-gray-500">Contract Manager</p>
              </div>
            )}
          </div>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 hover:bg-gray-100 rounded-xl">
            {collapsed ? <ChevronRight size={18} /> : <ArrowLeft size={18} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  location.pathname === item.path ? 'bg-rose-50 text-rose-600' : 'text-gray-700 hover:bg-rose-50 hover:text-rose-600'
                }`}
              >
                <item.icon size={collapsed ? 20 : 18} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-200 mt-4 pt-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Navigation</p>
            <nav className="space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${ location.pathname === item.path ? 'bg-rose-50 text-rose-600' : 'text-gray-700 hover:bg-rose-50 hover:text-rose-600' }`}
                >
                  <item.icon size={collapsed ? 20 : 18} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-auto">
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
            <Users size={16} />
            {!collapsed && <span className="truncate">{user?.email}</span>}
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg text-sm font-medium transition-colors">
            <LogOut size={16} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Mobile Menu Toggle */}
      <div className="flex md:hidden">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="fixed top-4 left-4 z-50 p-3 bg-rose-600 text-white rounded-full shadow-lg"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur z-20" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed inset-y-0 left-0 w-64 max-w-sm bg-white z-30 flex flex-col h-full shadow-xl">
            <div className="flex items-center justify-between p-4 py-5 border-b border-gray-200">
              <div>
                <h1 className="text-xl font-bold text-rose-600">Mahalaxmi Agri</h1>
                <p className="text-xs text-gray-500">Contract Manager</p>
              </div>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-1">
                {[...menuItems, ...navigationItems].map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${ location.pathname === item.path ? 'bg-rose-50 text-rose-600' : 'text-gray-700 hover:bg-rose-50 hover:text-rose-600' }`}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                ))}
              </nav>
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
                  <Users size={16} />
                  <span className="truncate">{user?.email}</span>
                </div>
                <button onClick={() => { handleLogout(); setShowMobileMenu(false); }} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg text-sm font-medium transition-colors">
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

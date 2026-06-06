import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  LayoutDashboard, FileText, Users, Package, Receipt, Settings, LogOut,
  BookOpen, StickyNote, ChevronDown, ChevronRight, FolderOpen
} from 'lucide-react';
import { useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [partiesOpen, setPartiesOpen] = useState(
    location.pathname.startsWith('/parties') || location.pathname.startsWith('/gulfood')
  );

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
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
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
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}

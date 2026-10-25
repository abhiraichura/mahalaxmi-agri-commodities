// src/components/Layout.tsx
// The frame of the whole app.
//   Phone:    a slim top bar (find / reminders), the page, and a bottom tab bar: Today, Contracts, [+], Parties, More
//   Computer: a grouped menu on the left, a top bar with "find anything" and "New contract"
// Forms and other focused screens hide the bottom tabs so the Save button is never covered.
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, FileText, Users, Plus, Menu, Search, Bell, LogOut, RefreshCw, X, TrendingUp, StickyNote, UserCog, ChevronRight } from 'lucide-react';
import { useAuthStore, useAppStore } from '../hooks/useAuthStore';
import { checkForUpdate, markVersionSeen, clearAppCache } from '../utils/cacheManager';
import { Sheet } from '../ui';
import GlobalSearch from './GlobalSearch';
import { NAV_GROUPS, SETTINGS_ITEM } from './nav';
import { todaySummary } from '../../server/reminders/plan.js';
import { useToday } from '../reminders/useToday';

const FOCUS_ROUTES = [/^\/contracts\/(new|edit\/)/, /^\/parties\/(new|edit\/)/];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const contracts = useAppStore(s => s.contracts);
  const location = useLocation();
  const navigate = useNavigate();
  const today = useToday();
  const [moreOpen, setMoreOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useEffect(() => { if (checkForUpdate()) setShowUpdateBanner(true); }, []);
  useEffect(() => { setMoreOpen(false); setCreateOpen(false); }, [location.pathname]);

  // "/" or Ctrl/Cmd+K opens the search on a computer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey)) { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const needs = useMemo(() => todaySummary(contracts, today).needs.length, [contracts, today]);
  const path = location.pathname;
  const focused = FOCUS_ROUTES.some(r => r.test(path));
  const inTab = path === '/' || path.startsWith('/contracts') || path.startsWith('/parties') || path.startsWith('/gulfood');

  const handleUpdateNow = async () => { markVersionSeen(); setShowUpdateBanner(false); await clearAppCache(); };
  const handleDismiss = () => { markVersionSeen(); setShowUpdateBanner(false); };

  const side = (isActive: boolean, sub = false) =>
    `flex items-center gap-3 rounded-xl text-sm transition-colors ${sub ? 'px-3 py-2 ml-7' : 'px-3 py-2.5 font-medium'} ${isActive ? 'bg-rose-50 text-rose-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`;

  const tab = (to: string, label: string, Icon: typeof FileText, on: boolean, exact = false) => (
    <NavLink to={to} end={exact} aria-label={label}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[11px] font-medium ${on ? 'text-rose-700' : 'text-gray-500'}`}>
      <span className={`relative flex items-center justify-center w-12 h-7 rounded-full transition-colors ${on ? 'bg-rose-50' : ''}`}>
        <Icon size={21} strokeWidth={on ? 2.4 : 2} />
        {to === '/' && needs > 0 && <span className="absolute -top-1 right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[10px] leading-[17px] text-center font-semibold">{needs > 9 ? '9+' : needs}</span>}
      </span>
      {label}
    </NavLink>
  );

  return (
    <div className="min-h-screen flex">
      {/* ===== computer: menu on the left ===== */}
      <aside className="hidden lg:flex bg-white border-r border-gray-200 flex-col fixed h-full z-40 w-64">
        <NavLink to="/" className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <img src="/mahalaxmi-logo.svg" alt="" className="w-9 h-9" />
          <span>
            <span className="block text-base font-bold text-rose-700 leading-tight">Mahalaxmi Agri</span>
            <span className="block text-xs text-gray-500">Commodity broker</span>
          </span>
        </NavLink>
        <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Main menu">
          <NavLink to="/" end className={({ isActive }) => side(isActive)}>
            <CalendarCheck size={18} />Today
            {needs > 0 && <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white text-xs leading-5 text-center font-semibold">{needs}</span>}
          </NavLink>
          {NAV_GROUPS.map(g => (
            <div key={g.label} className="mt-5">
              <p className="section-label px-3 mb-1.5">{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map(it => (
                  <div key={it.to}>
                    <NavLink to={it.to} end={!!it.end} className={({ isActive }) => side(isActive && !(it.children && path !== it.to && it.children.some(c => path.startsWith(c.to) && c.to !== it.to)))}>
                      <it.icon size={18} />{it.label}
                    </NavLink>
                    {it.children && (path.startsWith('/parties') || path.startsWith('/gulfood')) && it.to === '/parties' && (
                      <div className="mt-0.5 space-y-0.5">
                        {it.children.map(ch => (
                          <NavLink key={ch.to} to={ch.to} end={!!ch.end} className={({ isActive }) => side(isActive, true)}>{ch.label}</NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <NavLink to={SETTINGS_ITEM.to} className={({ isActive }) => side(isActive)}><SETTINGS_ITEM.icon size={18} />{SETTINGS_ITEM.label}</NavLink>
          <div className="flex items-center gap-2 px-3 pt-3">
            <p className="text-xs text-gray-500 truncate flex-1" title={user?.email}>{user?.email}</p>
            <button onClick={logout} aria-label="Log out" title="Log out" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 lg:ml-64 flex flex-col min-h-screen">
        {showUpdateBanner && (
          <div className="sticky top-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-2 shadow-md" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
            <div className="flex items-center gap-2 text-sm font-medium"><RefreshCw className="w-4 h-4 shrink-0" />New version available.</div>
            <div className="flex items-center gap-3">
              <button onClick={handleDismiss} className="text-xs underline opacity-90 hover:opacity-100">Later</button>
              <button onClick={handleUpdateNow} className="px-3 py-1.5 text-xs font-semibold bg-white text-amber-700 rounded-lg hover:bg-gray-100">Update now</button>
              <button onClick={() => setShowUpdateBanner(false)} aria-label="Close" className="opacity-80 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {/* ===== top bar ===== */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200" style={{ paddingTop: showUpdateBanner ? 0 : 'env(safe-area-inset-top)' }}>
          <div className="flex items-center gap-3 px-4 lg:px-8 h-14">
            <NavLink to="/" className="lg:hidden flex items-center gap-2 min-w-0">
              <img src="/mahalaxmi-logo.svg" alt="" className="w-8 h-8" />
              <span className="text-base font-bold text-rose-700 truncate">Mahalaxmi Agri</span>
            </NavLink>
            <button onClick={() => setSearchOpen(true)} aria-label="Find anything"
              className="hidden lg:flex items-center gap-2 flex-1 max-w-md h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500 hover:bg-white hover:border-gray-300 transition-colors">
              <Search size={16} /><span className="flex-1 text-left">Find a contract, party or page</span><kbd className="text-[11px] px-1.5 py-0.5 rounded border border-gray-300 bg-white text-gray-500">/</kbd>
            </button>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setSearchOpen(true)} aria-label="Find anything" className="lg:hidden p-2.5 rounded-full text-gray-600 hover:bg-gray-100"><Search size={20} /></button>
              <button onClick={() => navigate('/')} aria-label={needs ? `${needs} things need you today` : 'Nothing needs you today'} className="relative p-2.5 rounded-full text-gray-600 hover:bg-gray-100">
                <Bell size={20} />
                {needs > 0 && <span className="absolute top-1 right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[10px] leading-[17px] text-center font-semibold">{needs > 9 ? '9+' : needs}</span>}
              </button>
              <button onClick={() => navigate('/contracts/new')} className="hidden lg:inline-flex btn btn-primary btn-sm ml-2"><Plus size={16} />New contract</button>
            </div>
          </div>
        </header>

        <main className={`flex-1 min-w-0 ${focused ? '' : 'pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0'}`}>
          {children}
        </main>
      </div>

      {/* ===== phone: tabs at the bottom ===== */}
      {!focused && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 flex items-end" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Main tabs">
          {tab('/', 'Today', CalendarCheck, path === '/', true)}
          {tab('/contracts', 'Contracts', FileText, path.startsWith('/contracts'))}
          <div className="flex-1 flex justify-center pb-2">
            <button onClick={() => setCreateOpen(true)} aria-label="Add new" className="-mt-5 w-14 h-14 rounded-full bg-rose-700 text-white shadow-lg shadow-rose-900/20 flex items-center justify-center active:bg-rose-800"><Plus size={28} /></button>
          </div>
          {tab('/parties', 'Parties', Users, path.startsWith('/parties') || path.startsWith('/gulfood'))}
          <button onClick={() => setMoreOpen(true)} aria-label="More" className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[11px] font-medium ${!inTab ? 'text-rose-700' : 'text-gray-500'}`}>
            <span className={`flex items-center justify-center w-12 h-7 rounded-full ${!inTab ? 'bg-rose-50' : ''}`}><Menu size={21} /></span>More
          </button>
        </nav>
      )}

      {/* ===== phone: the "+" sheet ===== */}
      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="Add new">
        <div className="grid grid-cols-2 gap-3 pb-2">
          {[
            { to: '/contracts/new', label: 'New contract', icon: FileText, tone: 'bg-rose-50 text-rose-700' },
            { to: '/parties/new', label: 'New party', icon: Users, tone: 'bg-violet-50 text-violet-700' },
            { to: '/rates', label: 'Rates update', icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-700' },
            { to: '/party-message', label: 'Message a party', icon: UserCog, tone: 'bg-sky-50 text-sky-700' },
            { to: '/notes', label: 'Quick note', icon: StickyNote, tone: 'bg-amber-50 text-amber-800' },
          ].map(a => (
            <button key={a.to} onClick={() => navigate(a.to)} className="flex flex-col items-start gap-3 p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-left min-h-[96px]">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.tone}`}><a.icon size={20} /></span>
              <span className="text-sm font-semibold text-gray-900">{a.label}</span>
            </button>
          ))}
        </div>
      </Sheet>

      {/* ===== phone: everything else ===== */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="space-y-5 pb-2">
          {NAV_GROUPS.map(g => (
            <div key={g.label}>
              <p className="section-label mb-2">{g.label}</p>
              <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden bg-white">
                {g.items.filter(i => i.to !== '/contracts' && i.to !== '/parties').concat(g.items.some(i => i.to === '/parties') ? [{ to: '/parties/directory', label: 'Party directory', icon: Users, hint: 'Browse and export' }, { to: '/parties/gulfood', label: 'Gulfood directory', icon: Users, hint: 'Gulfood contacts' }] : []).map(it => (
                  <NavLink key={it.to} to={it.to} className="flex items-center gap-3 px-4 py-3 min-h-[56px] active:bg-gray-50">
                    <span className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0"><it.icon size={18} /></span>
                    <span className="flex-1 min-w-0"><span className="block text-sm font-medium text-gray-900">{it.label}</span>{it.hint && <span className="block text-xs text-gray-500 truncate">{it.hint}</span>}</span>
                    <ChevronRight size={16} className="text-gray-300" />
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden bg-white">
            <NavLink to={SETTINGS_ITEM.to} className="flex items-center gap-3 px-4 py-3 min-h-[56px] active:bg-gray-50">
              <span className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center"><SETTINGS_ITEM.icon size={18} /></span>
              <span className="flex-1"><span className="block text-sm font-medium text-gray-900">{SETTINGS_ITEM.label}</span><span className="block text-xs text-gray-500">{SETTINGS_ITEM.hint}</span></span>
              <ChevronRight size={16} className="text-gray-300" />
            </NavLink>
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left active:bg-gray-50">
              <span className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center"><LogOut size={18} /></span>
              <span className="flex-1"><span className="block text-sm font-medium text-gray-900">Log out</span><span className="block text-xs text-gray-500 truncate">{user?.email}</span></span>
            </button>
          </div>
        </div>
      </Sheet>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

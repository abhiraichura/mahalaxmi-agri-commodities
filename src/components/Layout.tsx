// src/components/Layout.tsx
// The frame of the whole app.
//   Phone:    a slim top bar (find / reminders), the page, and a bottom tab bar: Today, Contracts, [+], Parties, More
//   Computer: a grouped menu on the left, a top bar with "find anything" and "New contract"
// Forms and other focused screens hide the bottom tabs so the Save button is never covered.
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { CalendarCheck, FileText, Users, Plus, Menu, Search, Bell, LogOut, RefreshCw, X, TrendingUp, StickyNote, UserCog } from 'lucide-react';
import { useAuthStore, useAppStore } from '../hooks/useAuthStore';
import { checkForUpdate, markVersionSeen, clearAppCache } from '../utils/cacheManager';
import { Sheet, Group, Row, useChrome } from '../ui';
import GlobalSearch from './GlobalSearch';
import { NAV_GROUPS, SETTINGS_ITEM } from './nav';
import { todaySummary } from '../../server/reminders/plan.js';
import { useToday } from '../reminders/useToday';
import { startTasks, useDueCount } from '../tasks/store';

const FOCUS_ROUTES = [/^\/contracts\/(new|edit\/)/, /^\/parties\/(new|edit\/)/];

/** Opening another screen always starts at its top (never "in between"), and the browser does not restore old positions on its own. */
function useScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => { try { window.history.scrollRestoration = 'manual'; } catch { /* old browsers */ } }, []);
  useLayoutEffect(() => { if (!hash) window.scrollTo(0, 0); }, [pathname, hash]);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const contracts = useAppStore(s => s.contracts);
  const location = useLocation();
  const navigate = useNavigate();
  const today = useToday();
  useScrollToTop();
  const { title: pageTitle, compact } = useChrome();
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

  const dealNeeds = useMemo(() => todaySummary(contracts, today).needs.length, [contracts, today]);
  useEffect(() => startTasks(), []);
  const needs = dealNeeds + useDueCount(today);
  const path = location.pathname;
  const focused = FOCUS_ROUTES.some(r => r.test(path));
  const inTab = path === '/' || path.startsWith('/contracts') || path.startsWith('/parties') || path.startsWith('/gulfood');

  const handleUpdateNow = async () => { markVersionSeen(); setShowUpdateBanner(false); await clearAppCache(); };
  const handleDismiss = () => { markVersionSeen(); setShowUpdateBanner(false); };

  const side = (isActive: boolean, sub = false) =>
    `flex items-center gap-3 rounded-xl text-sm transition-all ${sub ? 'px-3 py-1.5 ml-8 text-[13px]' : 'px-3 py-2 font-medium'} ${isActive ? 'bg-white text-rose-700 shadow-sm ring-1 ring-black/5' : 'text-gray-600 hover:bg-black/[0.045] hover:text-gray-900'}`;

  const tab = (to: string, label: string, Icon: typeof FileText, on: boolean, exact = false) => (
    <NavLink to={to} end={exact} aria-label={label}
      className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 h-[52px] rounded-[20px] text-[10.5px] font-semibold transition-colors ${on ? 'text-rose-700 bg-rose-700/10' : 'text-gray-500 active:bg-black/5'}`}>
      <span className="relative">
        <Icon size={22} strokeWidth={on ? 2.4 : 2} />
        {to === '/' && needs > 0 && <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[10px] leading-[17px] text-center font-semibold ring-2 ring-white">{needs > 9 ? '9+' : needs}</span>}
      </span>
      {label}
    </NavLink>
  );

  return (
    <div className="min-h-screen flex">
      {/* ===== computer: a floating glass menu on the left ===== */}
      <aside className="hidden lg:flex glass flex-col fixed z-40 left-3 top-3 bottom-3 w-[15rem] rounded-[28px] overflow-hidden">
        <NavLink to="/" className="flex items-center gap-3 px-5 pt-5 pb-4">
          <img src="/mahalaxmi-logo.svg" alt="" className="w-9 h-9" />
          <span>
            <span className="block text-[15px] font-bold text-rose-700 leading-tight">Mahalaxmi Agri</span>
            <span className="block text-xs text-gray-500">Commodity broker</span>
          </span>
        </NavLink>
        <nav className="flex-1 px-3 pb-3 overflow-y-auto" aria-label="Main menu">
          <NavLink to="/" end className={({ isActive }) => side(isActive)}>
            <CalendarCheck size={18} />Today
            {needs > 0 && <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white text-xs leading-5 text-center font-semibold">{needs}</span>}
          </NavLink>
          {NAV_GROUPS.map(g => (
            <div key={g.label} className="mt-4">
              <p className="section-label px-3 mb-1">{g.label}</p>
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
        <div className="p-3 border-t border-black/5">
          <NavLink to={SETTINGS_ITEM.to} className={({ isActive }) => side(isActive)}><SETTINGS_ITEM.icon size={18} />{SETTINGS_ITEM.label}</NavLink>
          <div className="flex items-center gap-2 px-3 pt-2">
            <p className="text-xs text-gray-500 truncate flex-1" title={user?.email}>{user?.email}</p>
            <button onClick={logout} aria-label="Log out" title="Log out" className="p-2 rounded-lg text-gray-500 hover:bg-black/5"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 lg:ml-[16.5rem] flex flex-col min-h-screen">
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

        {/* ===== top bar: frosted glass. On a phone the app name gives way to the page title once you scroll ===== */}
        <header className="sticky top-0 z-30 bg-[rgba(244,245,249,0.72)] backdrop-blur-xl backdrop-saturate-150 border-b border-black/[0.06]" style={{ paddingTop: showUpdateBanner ? 0 : 'env(safe-area-inset-top)' }}>
          <div className="flex items-center gap-3 px-4 lg:px-8 h-[52px] lg:h-14">
            <div className="lg:hidden relative flex-1 min-w-0 h-full">
              <NavLink to="/" className={`absolute inset-y-0 left-0 flex items-center gap-2 min-w-0 transition-all duration-200 ${compact && pageTitle ? 'opacity-0 -translate-y-1 pointer-events-none' : ''}`}>
                <img src="/mahalaxmi-logo.svg" alt="" className="w-7 h-7" />
                <span className="text-[15px] font-bold text-rose-700 truncate">Mahalaxmi Agri</span>
              </NavLink>
              <span aria-hidden={!(compact && pageTitle)} className={`absolute inset-y-0 left-0 right-0 flex items-center text-[16px] font-semibold text-gray-900 truncate transition-all duration-200 ${compact && pageTitle ? 'opacity-100' : 'opacity-0 translate-y-1 pointer-events-none'}`}>
                <span className="truncate">{pageTitle}</span>
              </span>
            </div>
            <button onClick={() => setSearchOpen(true)} aria-label="Find anything"
              className="hidden lg:flex items-center gap-2 flex-1 max-w-md h-10 px-3 rounded-xl bg-black/[0.05] text-sm text-gray-500 hover:bg-black/[0.08] transition-colors">
              <Search size={16} /><span className="flex-1 text-left">Find a contract, party or page</span><kbd className="text-[11px] px-1.5 py-0.5 rounded-md bg-white/80 text-gray-500 ring-1 ring-black/5">/</kbd>
            </button>
            <div className="ml-auto flex items-center gap-0.5">
              <button onClick={() => setSearchOpen(true)} aria-label="Find anything" className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full text-gray-700 active:bg-black/5"><Search size={20} /></button>
              <button onClick={() => navigate('/')} aria-label={needs ? `${needs} things need you today` : 'Nothing needs you today'} className="relative w-10 h-10 flex items-center justify-center rounded-full text-gray-700 hover:bg-black/5 active:bg-black/5">
                <Bell size={20} />
                {needs > 0 && <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[10px] leading-[17px] text-center font-semibold">{needs > 9 ? '9+' : needs}</span>}
              </button>
              <button onClick={() => navigate('/contracts/new')} className="hidden lg:inline-flex btn btn-primary btn-sm ml-2"><Plus size={16} />New contract</button>
            </div>
          </div>
        </header>

        <main className={`flex-1 min-w-0 ${focused ? '' : 'pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-0'}`}>
          <div key={path} className="page-enter">{children}</div>
        </main>
      </div>

      {/* ===== phone: a floating glass tab bar ===== */}
      {!focused && (
        <nav className="lg:hidden glass !bg-white/[0.88] fixed z-40 inset-x-3 mx-auto max-w-md h-[64px] rounded-[30px] flex items-center gap-0.5 px-1.5" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }} aria-label="Main tabs">
          {tab('/', 'Today', CalendarCheck, path === '/', true)}
          {tab('/contracts', 'Contracts', FileText, path.startsWith('/contracts'))}
          <div className="flex-1 flex justify-center">
            <button onClick={() => setCreateOpen(true)} aria-label="Add new" className="-mt-7 w-[58px] h-[58px] rounded-full text-white flex items-center justify-center ring-4 ring-[#f4f5f9]/90 active:scale-95 transition-transform btn-primary"><Plus size={28} strokeWidth={2.4} /></button>
          </div>
          {tab('/parties', 'Parties', Users, path.startsWith('/parties') || path.startsWith('/gulfood'))}
          <button onClick={() => setMoreOpen(true)} aria-label="More" className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-[52px] rounded-[20px] text-[10.5px] font-semibold transition-colors ${!inTab ? 'text-rose-700 bg-rose-700/10' : 'text-gray-500 active:bg-black/5'}`}>
            <Menu size={22} strokeWidth={!inTab ? 2.4 : 2} />More
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
            { to: '/messages?tab=party', label: 'Message a party', icon: UserCog, tone: 'bg-sky-50 text-sky-700' },
            { to: '/planner?tab=notes', label: 'Quick note', icon: StickyNote, tone: 'bg-amber-50 text-amber-800' },
          ].map(a => (
            <button key={a.to} onClick={() => navigate(a.to)} className="card flex flex-col items-start gap-3 p-4 text-left min-h-[96px] active:scale-[0.97] transition-transform">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.tone}`}><a.icon size={20} /></span>
              <span className="text-sm font-semibold text-gray-900">{a.label}</span>
            </button>
          ))}
        </div>
      </Sheet>

      {/* ===== phone: everything else ===== */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="space-y-4 pb-2">
          {NAV_GROUPS.map(g => (
            <Group key={g.label} title={g.label}>
              {g.items.filter(i => i.to !== '/contracts' && i.to !== '/parties').map(it => (
                <Row key={it.to} to={it.to} icon={<it.icon size={18} />} title={it.label} sub={it.hint} />
              ))}
            </Group>
          ))}
          <Group>
            <Row to={SETTINGS_ITEM.to} icon={<SETTINGS_ITEM.icon size={18} />} title={SETTINGS_ITEM.label} sub={SETTINGS_ITEM.hint} />
            <Row onClick={logout} icon={<LogOut size={18} />} title="Log out" sub={user?.email} chevron={false} />
          </Group>
        </div>
      </Sheet>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

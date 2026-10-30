// src/ui/Hub.tsx
// Several related screens under one title, switched with tabs (for example Messages: Broadcast | Rate message | To a party | Custom).
// The chosen tab is kept in the address (?tab=...), so links and the back button work.
import { ReactNode } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Page, EmbedContext } from './Page';
import { Segmented } from './Segmented';

export interface HubTab { id: string; label: ReactNode; render: () => ReactNode }

export function Hub({ title, subtitle, tabs, width = 'wide' }: { title: string; subtitle?: string; tabs: HubTab[]; width?: 'narrow' | 'default' | 'wide' | 'full' }) {
  const [sp, setSp] = useSearchParams();
  const want = sp.get('tab');
  const active = tabs.find(t => t.id === want) || tabs[0];
  const choose = (id: string) => setSp(prev => { const n = new URLSearchParams(); n.set('tab', id); if (id === active.id) prev.forEach((v, k) => { if (k !== 'tab') n.set(k, v); }); return n; }, { replace: false });
  return (
    <Page title={title} subtitle={subtitle} width={width}>
      <div className="mb-4"><Segmented value={active.id} onChange={choose} label={title} options={tabs.map(t => ({ value: t.id, label: t.label }))} /></div>
      <EmbedContext.Provider value={true}>
        <div key={active.id}>{active.render()}</div>
      </EmbedContext.Provider>
    </Page>
  );
}

/** An old address that now lives inside a hub: goes there, keeping the other parts of the address and any state that was passed. */
export function ToHub({ to, tab }: { to: string; tab: string }) {
  const loc = useLocation();
  const sp = new URLSearchParams(loc.search); sp.set('tab', tab);
  return <Navigate to={{ pathname: to, search: `?${sp.toString()}` }} state={loc.state} replace />;
}

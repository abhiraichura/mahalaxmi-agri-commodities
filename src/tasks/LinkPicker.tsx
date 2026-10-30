// Pick a contract or a party to attach to a task or a note.
import { useMemo, useState } from 'react';
import { FileText, Search, Users } from 'lucide-react';
import { Sheet, filterItems } from '../ui';
import type { PickItem } from '../ui';
import { useAppStore } from '../hooks/useAuthStore';
import { partyName } from '../utils/normalize';
import type { TaskLink } from './model';

export const linkTo = (l: TaskLink) => (l.type === 'contract' ? `/contracts/${l.id}` : `/parties/${l.id}`);

export default function LinkPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (l: TaskLink) => void }) {
  const { contracts, parties } = useAppStore();
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const out: (PickItem & { link: TaskLink })[] = [];
    for (const c of [...contracts].sort((a, b) => String(b.date).localeCompare(String(a.date)))) {
      const label = `#${c.contractNo} · ${c.product?.name || ''}`;
      out.push({ id: `c:${c.id}`, title: label, sub: `${partyName(c.seller)} → ${partyName(c.buyer)}`, search: `contract ${c.contractNo} ${c.product?.name || ''} ${partyName(c.seller)} ${partyName(c.buyer)}`, link: { type: 'contract', id: c.id, label: `Contract #${c.contractNo}` } });
    }
    for (const p of parties) out.push({ id: `p:${p.id}`, title: partyName(p), sub: [p.type, p.city].filter(Boolean).join(' · '), search: `party ${p.city || ''} ${p.phone || ''} ${p.gstin || ''}`, link: { type: 'party', id: p.id, label: partyName(p) } });
    return out;
  }, [contracts, parties]);

  const shown = useMemo(() => {
    const hits = q.trim() ? filterItems(items, q) : items.slice(0, 8);
    return hits.slice(0, 40) as typeof items;
  }, [items, q]);

  return (
    <Sheet open={open} onClose={() => { setQ(''); onClose(); }} title="Link to a contract or party">
      <div className="relative mb-3">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)} autoFocus placeholder="Contract number, party or product" aria-label="Search contracts and parties" className="input-field pl-10" />
      </div>
      <div className="group-list">
        {shown.map(it => (
          <button key={it.id} type="button" className="row w-full text-left" onClick={() => { onPick(it.link); setQ(''); onClose(); }}>
            <span className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${it.link.type === 'contract' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>{it.link.type === 'contract' ? <FileText size={17} /> : <Users size={17} />}</span>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium text-gray-900 truncate">{it.title}</span><span className="block text-xs text-gray-500 truncate">{it.sub}</span></span>
          </button>
        ))}
        {shown.length === 0 && <p className="px-4 py-6 text-sm text-gray-500 text-center">Nothing matches.</p>}
      </div>
      {!q.trim() && <p className="text-xs text-gray-500 mt-2 px-1">Showing your latest contracts. Type to search all contracts and parties.</p>}
    </Sheet>
  );
}

// src/pages/PartyProfile.tsx
// One party on one screen: who they are, how to reach them, how the deals with them have gone. Editing is a button, never the default.
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Phone, MessageCircle, FileText, BookOpen, Pencil, Copy, MapPin, Mail, User, Trash2, ClipboardPaste, Building2, StickyNote, Package, IndianRupee, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../hooks/useAuthStore';
import { Page, Button, Badge, Segmented, EmptyState, Sheet } from '../ui';
import LinkedWork from '../tasks/LinkedWork';
import { inrShort } from '../ui/format';
import { stageInfo } from '../reminders/stage';
import { useToday } from '../reminders/useToday';
import { partyPhones } from '../broadcast/phone';
import { partyName } from '../utils/normalize';
import { partyStats, reliability } from '../crm/partyStats';
import { fmtDay, fmtDayYear } from '../../server/reminders/plan.js';

const copy = async (text: string, what = 'Copied') => {
  if (!text) return;
  try { await navigator.clipboard.writeText(text); toast.success(what); } catch { toast.error('Could not copy'); }
};
const TYPE = { buyer: 'Buyer', seller: 'Seller', both: 'Buyer & seller' } as const;
const mt = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} MT` : `${Math.round(kg).toLocaleString('en-IN')} KG`);

export default function PartyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { parties, contracts, products, deleteParty } = useAppStore();
  const today = useToday();
  const party = parties.find(p => p.id === id);
  const [tab, setTab] = useState<'all' | 'open' | 'paid'>('all');
  const [showAll, setShowAll] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const stats = useMemo(() => (party ? partyStats(contracts, party.id, today) : null), [contracts, party, today]);

  if (!party || !stats) {
    return (
      <Page title="Party not found" back="/parties" width="narrow">
        <div className="card"><EmptyState icon={<Building2 size={24} />} title="This party is not here" action={<Button variant="primary" onClick={() => navigate('/parties')}>Back to parties</Button>}>It may have been deleted, or the list is still loading.</EmptyState></div>
      </Page>
    );
  }

  const phones = partyPhones(party).all;
  const best = partyPhones(party).best;
  const rel = reliability(stats);
  const prodNames = (party.productIds || []).map(pid => products.find(p => p.id === pid)?.name).filter(Boolean) as string[];
  const rows = stats.all.map(c => ({ c, info: stageInfo(c, today) }));
  const filtered = rows.filter(r => tab === 'all' ? true : tab === 'open' ? (r.info.stage === 'to_load' || r.info.stage === 'awaiting_payment') : r.info.stage === 'paid');
  const shown = showAll ? filtered : filtered.slice(0, 6);
  const roleOf = (c: (typeof rows)[number]['c']) => (c.buyerId === party.id ? 'Buys' : 'Sells');
  const address = [party.address, [party.city, party.state, party.pincode].filter(Boolean).join(', ')].filter(Boolean).join('\n');
  const location = [party.city, party.state].filter(Boolean).join(', ');

  const doDelete = async () => {
    try { await deleteParty(party.id); toast.success('Party deleted'); navigate('/parties', { replace: true }); }
    catch { toast.error('Could not delete. Try again.'); }
  };

  return (
    <Page back="/parties" width="default" title={partyName(party)}
      subtitle={<span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1"><Badge tone={party.type === 'buyer' ? 'blue' : party.type === 'seller' ? 'green' : 'violet'}>{TYPE[party.type]}</Badge>{location}</span>}
      actions={<Button icon={<Pencil size={16} />} onClick={() => navigate(`/parties/edit/${party.id}`)}>Edit</Button>}>

      <div className="space-y-4">
        {/* ---- quick actions */}
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Quick actions">
          {[
            { label: 'Call', icon: Phone, href: best ? `tel:+${best.digits}` : party.phone ? `tel:${party.phone}` : '', tone: 'text-sky-700 bg-sky-50' },
            { label: 'WhatsApp', icon: MessageCircle, href: best ? `https://wa.me/${best.digits}` : '', tone: 'text-emerald-700 bg-emerald-50', ext: true },
            { label: 'New deal', icon: FileText, to: `/contracts/new?${party.type === 'buyer' ? 'buyer' : 'seller'}=${party.id}`, tone: 'text-rose-700 bg-rose-50' },
            { label: 'Ledger', icon: BookOpen, to: `/money?tab=ledger&party=${party.id}`, tone: 'text-violet-700 bg-violet-50' },
          ].map(a => {
            const inner = (<><span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${a.tone}`}><a.icon size={20} /></span><span className="text-xs font-semibold text-gray-800">{a.label}</span></>);
            const cls = 'card flex flex-col items-center gap-1.5 py-3 active:scale-[0.97] transition-transform';
            if (a.to) return <Link key={a.label} to={a.to} className={cls}>{inner}</Link>;
            if (!a.href) return <span key={a.label} className={`${cls} opacity-40`} aria-disabled>{inner}</span>;
            return <a key={a.label} href={a.href} {...(a.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={cls}>{inner}</a>;
          })}
        </div>

        {/* ---- how the business has gone */}
        <section className="card p-4 sm:p-5" aria-label="Business with this party">
          <h2 className="section-label mb-3">Business together</h2>
          {stats.deals === 0 ? (
            <p className="text-sm text-gray-500">No contracts with this party yet. <Link to={`/contracts/new?${party.type === 'buyer' ? 'buyer' : 'seller'}=${party.id}`} className="text-rose-700 font-semibold">Make the first one</Link>.</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { k: 'Deals', v: String(stats.deals), s: `${stats.open} open · ${stats.completed} paid` },
                  { k: 'Volume', v: mt(stats.volumeKg), s: stats.products.slice(0, 2).map(p => p.name).join(', ') },
                  { k: 'Value', v: inrShort(stats.value), s: 'goods' },
                  { k: 'Brokerage', v: inrShort(stats.brokerage), s: 'from this party' },
                ].map(x => (
                  <div key={x.k} className="rounded-2xl bg-black/[0.04] px-3 py-2.5"><dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{x.k}</dt><dd className="text-lg font-bold text-gray-900 leading-tight mt-0.5">{x.v}</dd><dd className="text-xs text-gray-500 truncate">{x.s}</dd></div>
                ))}
              </dl>
              <div className="mt-3 space-y-1.5 text-sm">
                {rel && <p className={`flex items-start gap-2 ${rel.tone === 'green' ? 'text-emerald-800' : rel.tone === 'amber' ? 'text-amber-800' : 'text-red-700'}`}><Clock size={15} className="mt-0.5 shrink-0" />{rel.text}</p>}
                {stats.pay.owed > 0 && <p className="flex items-start gap-2 text-gray-800"><IndianRupee size={15} className="mt-0.5 shrink-0 text-gray-500" />Waiting for payment on {inrShort(stats.pay.owed)} of goods{stats.pay.overdueNow ? <span className="text-red-700 font-medium"> · {stats.pay.overdueNow} overdue</span> : null}</p>}
                {stats.load.overdueNow > 0 && <p className="flex items-start gap-2 text-red-700"><Clock size={15} className="mt-0.5 shrink-0" />{stats.load.overdueNow} contract{stats.load.overdueNow === 1 ? '' : 's'} not loaded after the deadline</p>}
                {stats.lastDeal && <p className="text-xs text-gray-500">Last deal {fmtDayYear(stats.lastDeal)}{stats.daysSinceLast != null && stats.daysSinceLast > 0 ? ` (${stats.daysSinceLast} day${stats.daysSinceLast === 1 ? '' : 's'} ago)` : ''}{stats.firstDeal && stats.firstDeal !== stats.lastDeal ? ` · first deal ${fmtDay(stats.firstDeal)}` : ''}</p>}
              </div>
            </>
          )}
        </section>

        {/* ---- details */}
        <section className="card divide-y divide-black/5" aria-label="Details">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-label">Details</h2>
              <Button size="sm" variant="ghost" icon={<ClipboardPaste size={14} />} onClick={() => copy([partyName(party), party.gstin, party.address].filter(Boolean).join('\n'), 'Name, GSTIN and address copied')}>Copy details</Button>
            </div>
            <dl className="space-y-3.5 text-sm">
              {party.contactPerson && <Item icon={<User size={15} />} k="Contact person"><span className="font-medium text-gray-900">{party.contactPerson}</span></Item>}
              {phones.length > 0 ? (
                <Item icon={<Phone size={15} />} k="Phone">
                  <div className="flex flex-wrap gap-2">
                    {phones.map(n => (
                      <span key={n.digits} className="inline-flex items-stretch rounded-xl bg-black/[0.04] overflow-hidden">
                        <a href={`tel:+${n.digits}`} className="px-3 py-2 text-gray-900 font-medium min-h-[40px] inline-flex items-center">{n.display.replace('+91 ', '')}</a>
                        {n.kind !== 'landline' && <a href={`https://wa.me/${n.digits}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${n.display}`} className="px-2.5 inline-flex items-center text-emerald-700 border-l border-white"><MessageCircle size={15} /></a>}
                        <button onClick={() => copy(n.display.replace('+91 ', ''), 'Number copied')} aria-label={`Copy ${n.display}`} className="px-2.5 inline-flex items-center text-gray-500 border-l border-white"><Copy size={14} /></button>
                      </span>
                    ))}
                  </div>
                </Item>
              ) : party.phone ? <Item icon={<Phone size={15} />} k="Phone"><span className="text-gray-900">{party.phone}</span></Item> : null}
              {party.email && <Item icon={<Mail size={15} />} k="Email"><a href={`mailto:${party.email}`} className="text-gray-900 break-all">{party.email}</a>{(party.alternateEmails || []).length > 0 && <span className="block text-xs text-gray-500">{party.alternateEmails.join(' · ')}</span>}</Item>}
              {address && <Item icon={<MapPin size={15} />} k="Address"><span className="whitespace-pre-line text-gray-900">{address}</span><button onClick={() => copy(address, 'Address copied')} className="ml-2 text-xs text-rose-700 font-semibold underline-offset-2 hover:underline">Copy</button></Item>}
              {party.gstin && <Item icon={<Building2 size={15} />} k="GSTIN"><span className="font-mono text-gray-900">{party.gstin}</span><button onClick={() => copy(party.gstin, 'GSTIN copied')} className="ml-2 text-xs text-rose-700 font-semibold">Copy</button>{party.pan && <span className="block text-xs text-gray-500 font-mono">PAN {party.pan}</span>}</Item>}
              {prodNames.length > 0 && <Item icon={<Package size={15} />} k="Deals in"><div className="flex flex-wrap gap-1.5">{prodNames.map(n => <Badge key={n}>{n}</Badge>)}</div></Item>}
              {party.notes && <Item icon={<StickyNote size={15} />} k="Notes"><span className="whitespace-pre-wrap text-gray-800">{party.notes}</span></Item>}
              {!party.contactPerson && phones.length === 0 && !party.phone && !party.email && !address && !party.gstin && <p className="text-gray-500">No details saved yet. <Link to={`/parties/edit/${party.id}`} className="text-rose-700 font-semibold">Add them</Link>.</p>}
            </dl>
          </div>
          {(party.otherContacts || []).length > 0 && (
            <div className="p-4 sm:p-5">
              <h2 className="section-label mb-3">Other people</h2>
              <ul className="space-y-3">
                {party.otherContacts.map(c => (
                  <li key={c.id || c.name} className="flex items-start justify-between gap-3">
                    <span className="min-w-0"><span className="block text-sm font-medium text-gray-900">{c.name}</span><span className="block text-xs text-gray-500">{[c.role, c.email].filter(Boolean).join(' · ')}</span></span>
                    {c.phone && <span className="inline-flex gap-1.5 shrink-0"><a href={`tel:${c.phone.replace(/\s/g, '')}`} className="px-3 py-2 rounded-xl bg-black/[0.04] text-sm font-medium min-h-[40px] inline-flex items-center">{c.phone}</a></span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ---- tasks and notes about this party */}
        <LinkedWork link={{ type: 'party', id: party.id, label: partyName(party) }} />

        {/* ---- contracts with this party */}
        {rows.length > 0 && (
          <section aria-label="Contracts with this party">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="section-label">Contracts · {rows.length}</h2>
              <Segmented<'all' | 'open' | 'paid'> value={tab} onChange={t => { setTab(t); setShowAll(false); }} label="Show" options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'paid', label: 'Paid' }]} />
            </div>
            <div className="group-list">
              {shown.length === 0 && <p className="px-4 py-6 text-sm text-gray-500 text-center">Nothing here.</p>}
              {shown.map(({ c, info }) => (
                <Link key={c.id} to={`/contracts/${c.id}`} className="row !items-start">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="text-[15px] font-semibold text-gray-900">#{c.contractNo}<span className="font-normal text-gray-500"> · {fmtDay(c.date)}</span></span><Badge tone={info.tone}>{info.label}</Badge></span>
                    <span className="block text-sm text-gray-700">{roleOf(c)} · {c.quantity} {c.quantityUnit} {c.product?.name} @ ₹{Number(c.price || 0).toLocaleString('en-IN')}</span>
                    <span className="block text-xs text-gray-500 truncate">{roleOf(c) === 'Buys' ? `from ${partyName(c.seller)}` : `to ${partyName(c.buyer)}`}{info.line ? ` · ${info.line}` : ''}</span>
                  </span>
                </Link>
              ))}
            </div>
            {filtered.length > 6 && <div className="mt-2 text-center"><Button size="sm" variant="ghost" onClick={() => setShowAll(s => !s)}>{showAll ? 'Show fewer' : `Show all ${filtered.length}`}</Button></div>}
          </section>
        )}

        <div className="pt-1 flex justify-end">
          <Button variant="ghost" className="text-red-600 hover:bg-red-50" icon={<Trash2 size={16} />} onClick={() => setConfirmDel(true)}>Delete this party</Button>
        </div>
      </div>

      <Sheet open={confirmDel} onClose={() => setConfirmDel(false)} title="Delete this party?"
        footer={<div className="flex gap-2"><Button className="flex-1" onClick={() => setConfirmDel(false)}>Keep it</Button><Button variant="danger" className="flex-1" icon={<Trash2 size={16} />} onClick={doDelete}>Delete</Button></div>}>
        <p className="text-sm text-gray-700">{partyName(party)} will be removed from your parties.</p>
        {stats.all.length > 0 && <p className="mt-2 text-sm text-amber-800 bg-amber-50 rounded-xl p-3">{stats.all.length} contract{stats.all.length === 1 ? '' : 's'} with this party stay as they are (they keep their own copy of the party details).</p>}
      </Sheet>
    </Page>
  );
}

function Item({ icon, k, children }: { icon: React.ReactNode; k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-7 h-7 rounded-lg bg-black/[0.05] text-gray-500 flex items-center justify-center shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1"><dt className="text-xs text-gray-500">{k}</dt><dd className="mt-0.5">{children}</dd></div>
    </div>
  );
}

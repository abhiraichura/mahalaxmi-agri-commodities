// "Today": what needs you now, what is coming, and the money in motion. Replaces the old dashboard.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Bell, BellOff, TrendingUp, Plus, Truck, IndianRupee, MessageCircle, AlertTriangle, Smartphone, ListTodo, Lightbulb, Receipt, UserRound, FileWarning, Database, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../hooks/useAuthStore';
import { Page, Button, Badge, EmptyState } from '../ui';
import { greeting, inrShort, clockIST } from '../ui/format';
import NextStep from '../reminders/NextStep';
import { useToday } from '../reminders/useToday';
import { useNotifications } from '../reminders/notify';
import { remindersCall, ReminderStatus } from '../reminders/api';
import { ratesCall, RateUpdate } from '../rates/api';
import { addTask, startTasks, useTaskStore } from '../tasks/store';
import { bucketTasks, dueText, parseQuick, type Task } from '../tasks/model';
import TaskRow from '../tasks/TaskRow';
import TaskSheet from '../tasks/TaskSheet';
import { buildInsights, type Insight } from '../crm/insights';
import { billedKeys, issuedBills, useBillVersion } from '../utils/billStore';
import { kvLoad, kvSave, localGet } from '../broadcast/storage';
import { partyPhones } from '../broadcast/phone';
import { goodsValue } from '../billing/calc';
import { todaySummary, planFor, fmtDay, relDay, dealLine } from '../../server/reminders/plan.js';
import { Contract } from '../types';

const nm = (p?: { legalName?: string; name?: string }) => (p && (p.legalName || p.name)) || 'Party';

export default function Today() {
  const navigate = useNavigate();
  const contracts = useAppStore(s => s.contracts);
  const today = useToday();
  const { needs, soon } = useMemo(() => todaySummary(contracts, today, 7), [contracts, today]);
  const taskDue = useTaskStore(st => st.tasks.reduce((n, t) => n + (!t.completed && t.day && t.day <= today ? 1 : 0), 0));
  const total = needs.length + taskDue;

  // ---- money in motion
  const money = useMemo(() => {
    let toLoad = 0, toLoadValue = 0, pay = 0, payValue = 0, overdue = 0;
    for (const c of contracts) {
      const p = planFor(c, today);
      if (!p.eligible) continue;
      const v = goodsValue(c.quantity, c.quantityUnit, c.price, c.priceUnit).value;
      if (p.stage === 'to_load') { toLoad++; toLoadValue += v; if (p.loading.state === 'overdue') overdue++; }
      else if (p.stage === 'awaiting_payment') { pay++; payValue += v; if (p.payment.state === 'overdue') overdue++; }
    }
    return { toLoad, toLoadValue, pay, payValue, overdue };
  }, [contracts, today]);

  return (
    <Page title={greeting()} subtitle={`${fmtDay(today)} · ${total ? `${total} thing${total === 1 ? '' : 's'} need${total === 1 ? 's' : ''} you` : 'nothing is waiting for you'}`} width="wide">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5 min-w-0">
          <TurnOnReminders />
          <section aria-label="Needs you today">
            <h2 className="section-label mb-2">Needs you today</h2>
            {needs.length === 0 ? (
              <div className="card">
                <EmptyState icon={<CheckCircle2 size={24} className="text-emerald-600" />} title="You are all caught up" action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/contracts/new')}>New contract</Button>}>
                  {soon.length ? `Next: ${soon[0].label} for contract ${soon[0].contract.contractNo}, ${fmtDay(soon[0].date)} (${relDay(soon[0].date, today)}).` : 'No loading or payment is waiting. New reminders appear here and arrive as notifications.'}
                </EmptyState>
              </div>
            ) : (
              <div className="space-y-4">
                {needs.map(n => (
                  <div key={n.contract.id + n.ask}>
                    <button onClick={() => navigate(`/contracts/${n.contract.id}`)} className="w-full px-1 pb-1.5 text-left">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">Contract #{n.contract.contractNo} <span className="font-normal text-gray-500">· {dealLine(n.contract)}</span></span>
                        <ChevronRight size={14} className="text-gray-400 shrink-0" />
                      </span>
                      <span className="block text-xs text-gray-500 truncate">{nm(n.contract.seller)} → {nm(n.contract.buyer)}</span>
                    </button>
                    <NextStep contract={n.contract} today={today} compact />
                  </div>
                ))}
              </div>
            )}
          </section>

          <TodayTasks today={today} />

          <WorthALook today={today} />

          <section aria-label="Coming up">
            <h2 className="section-label mb-2">Coming up · next 7 days</h2>
            {soon.length === 0 ? (
              <p className="card p-4 text-sm text-gray-500">Nothing is due in the next 7 days.</p>
            ) : (
              <div className="card divide-y divide-gray-100 overflow-hidden">
                {soon.map(s => (
                  <button key={s.contract.id} onClick={() => navigate(`/contracts/${s.contract.id}`)} className="w-full flex items-center gap-3 px-4 py-3 text-left min-h-[60px] hover:bg-gray-50 active:bg-gray-50">
                    <span className="w-14 shrink-0 text-center rounded-xl bg-gray-100 py-1.5">
                      <span className="block text-[11px] uppercase text-gray-500 leading-none">{fmtDay(s.date).split(' ')[0]}</span>
                      <span className="block text-base font-bold text-gray-900 leading-tight">{fmtDay(s.date).split(' ')[1]}</span>
                      <span className="block text-[11px] text-gray-500 leading-none">{fmtDay(s.date).split(' ')[2]}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900">{s.label} <span className="font-normal text-gray-500">· {relDay(s.date, today)}</span></span>
                      <span className="block text-xs text-gray-500 truncate">#{s.contract.contractNo} · {dealLine(s.contract)} · {nm(s.contract.seller)} → {nm(s.contract.buyer)}</span>
                    </span>
                    {s.plan.stage === 'to_load' ? <Truck size={18} className="text-sky-600 shrink-0" /> : <IndianRupee size={18} className="text-emerald-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5 min-w-0">
          <RatesCard today={today} />
          <section aria-label="Money in motion">
            <h2 className="section-label mb-2">Open contracts</h2>
            <div className="card divide-y divide-gray-100">
              <MoneyRow icon={<Truck size={18} />} tone="bg-sky-50 text-sky-700" label="Waiting to be loaded" count={money.toLoad} value={money.toLoadValue} onClick={() => navigate('/contracts?stage=to_load')} />
              <MoneyRow icon={<IndianRupee size={18} />} tone="bg-emerald-50 text-emerald-700" label="Waiting for payment" count={money.pay} value={money.payValue} onClick={() => navigate('/contracts?stage=awaiting_payment')} />
              {money.overdue > 0 && <MoneyRow icon={<AlertTriangle size={18} />} tone="bg-red-50 text-red-700" label="Overdue" count={money.overdue} onClick={() => navigate('/contracts?stage=overdue')} />}
            </div>
          </section>
          <ReminderHealth />
        </aside>
      </div>
    </Page>
  );
}

/** Things the app noticed by itself: bills not made, bills not paid, parties gone quiet, contracts with no brokerage. */
function WorthALook({ today }: { today: string }) {
  const navigate = useNavigate();
  const contracts = useAppStore(st => st.contracts);
  const parties = useAppStore(st => st.parties);
  const billVersion = useBillVersion();
  const [snoozed, setSnoozed] = useState<Record<string, string>>(() => localGet<Record<string, string>>('insight_snooze', {}));
  useEffect(() => { let live = true; kvLoad<Record<string, string>>('insight_snooze', {}).then(v => { if (live && v) setSnoozed(v); }); return () => { live = false; }; }, []);

  const [lastBackup, setLastBackup] = useState<string | null | undefined>(undefined);
  useEffect(() => { let live = true; kvLoad<string | null>('last_backup', null).then(v => { if (live) setLastBackup(v ?? null); }); return () => { live = false; }; }, []);

  const items = useMemo(
    () => buildInsights({ contracts, parties, billed: billedKeys(), issued: issuedBills(), today, snoozed, lastBackup }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contracts, parties, today, snoozed, billVersion, lastBackup],
  );
  if (!items.length) return null;
  const shown = items.slice(0, 4);

  const hide = (i: Insight) => {
    const until = new Date(`${today}T00:00:00Z`); until.setUTCDate(until.getUTCDate() + i.snooze);
    // forget old snoozes so the saved list stays short
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(snoozed)) if (v > today) next[k] = v;
    next[i.id] = until.toISOString().slice(0, 10);
    setSnoozed(next); void kvSave('insight_snooze', next);
    toast.success(`Hidden for ${i.snooze} days`);
  };
  const whatsapp = (i: Insight) => {
    const party = parties.find(p => p.id === i.partyId);
    const num = party ? partyPhones(party).best?.digits : '';
    window.open(`https://wa.me/${num || ''}?text=${encodeURIComponent(i.message || '')}`, '_blank');
  };
  const task = async (i: Insight) => {
    const party = parties.find(p => p.id === i.partyId);
    if (!i.task) return;
    await addTask({ text: i.task.text, day: i.task.day, priority: 'medium', ...(party ? { link: { type: 'party' as const, id: party.id, label: nm(party) } } : {}) });
    toast.success('Task added for tomorrow');
  };
  const icon = (k: Insight['kind']) => k === 'unsent' ? <Send size={18} /> : k === 'backup' ? <Database size={18} /> : k === 'bills' ? <Receipt size={18} /> : k === 'unpaid' ? <IndianRupee size={18} /> : k === 'quiet' ? <UserRound size={18} /> : <FileWarning size={18} />;
  const tone = (t: Insight['tone']) => t === 'red' ? 'bg-red-50 text-red-700' : t === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700';

  return (
    <section aria-label="Worth a look">
      <div className="flex items-center gap-2 px-1 mb-1.5"><Lightbulb size={14} className="text-amber-500" /><h2 className="section-label">Worth a look · {items.length}</h2></div>
      <div className="group-list">
        {shown.map(i => {
          const hasPhone = !!(i.message && i.partyId && parties.find(p => p.id === i.partyId && partyPhones(p).best));
          return (
            <div key={i.id} className="row !items-start !py-3 gap-3" data-insight={i.kind}>
              <span className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${tone(i.tone)}`}>{icon(i.kind)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-gray-900">{i.title}</p>
                <p className="text-[13px] text-gray-600 mt-0.5">{i.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="soft" onClick={() => navigate(i.to)}>Open</Button>
                  {hasPhone && <Button size="sm" variant="success" icon={<MessageCircle size={14} />} onClick={() => whatsapp(i)}>WhatsApp</Button>}
                  {i.task && <Button size="sm" onClick={() => void task(i)} icon={<ListTodo size={14} />}>Add task</Button>}
                  <Button size="sm" variant="ghost" onClick={() => hide(i)}>Not now</Button>
                </div>
              </div>
            </div>
          );
        })}
        {items.length > shown.length && <p className="px-4 py-2.5 text-xs text-gray-500">+ {items.length - shown.length} more. Press &ldquo;Not now&rdquo; on one to see the next.</p>}
      </div>
    </section>
  );
}

/** Tasks that are late or due today, with a one-line way to add another. */
function TodayTasks({ today }: { today: string }) {
  const navigate = useNavigate();
  const { tasks, loaded } = useTaskStore();
  useEffect(() => startTasks(), []);
  const [quick, setQuick] = useState('');
  const [sheet, setSheet] = useState<Task | null>(null);
  const b = useMemo(() => bucketTasks(tasks, today), [tasks, today]);
  const due = [...b.overdue, ...b.today];
  const shown = due.slice(0, 5);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quick.trim()) return;
    const q = parseQuick(quick, today);
    await addTask({ text: q.text, day: q.day ?? today, priority: q.priority || 'medium', ...(q.time ? { time: q.time } : {}), ...(q.repeat ? { repeat: q.repeat } : {}) });
    toast.success(`Added for ${dueText(q.day ?? today, today).text.toLowerCase()}`);
    setQuick('');
  };
  return (
    <section aria-label="Your tasks">
      <div className="flex items-center justify-between px-1 mb-1.5">
        <h2 className="section-label">Your tasks{due.length ? ` · ${due.length}` : ''}</h2>
        <button type="button" onClick={() => navigate('/planner?tab=tasks')} className="text-[13px] font-semibold text-rose-700 min-h-[32px]">All tasks</button>
      </div>
      <div className="group-list">
        {loaded && shown.map(t => <TaskRow key={t.id} t={t} today={today} showDay={false} onOpen={setSheet} />)}
        {loaded && due.length > shown.length && <button type="button" onClick={() => navigate('/planner?tab=tasks')} className="row w-full text-sm text-gray-600 justify-center">+ {due.length - shown.length} more</button>}
        {loaded && due.length === 0 && <p className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2"><ListTodo size={16} className="text-gray-400" />No task is due today.</p>}
        <form onSubmit={add} className="row !py-1.5" aria-label="Quick add a task">
          <Plus size={18} className="text-gray-400 shrink-0" />
          <input value={quick} onChange={e => setQuick(e.target.value)} placeholder="Add a task, e.g. Call Patel tomorrow" aria-label="New task" className="flex-1 min-w-0 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-gray-400" />
          {quick.trim() && <Button type="submit" size="sm" variant="primary">Add</Button>}
        </form>
      </div>
      <TaskSheet open={!!sheet} onClose={() => setSheet(null)} today={today} task={sheet} />
    </section>
  );
}

function MoneyRow({ icon, tone, label, count, value, onClick }: { icon: React.ReactNode; tone: string; label: string; count: number; value?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-left min-h-[60px] hover:bg-gray-50 active:bg-gray-50">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm text-gray-600">{label}</span>{value != null && <span className="block text-base font-semibold text-gray-900">{inrShort(value)}</span>}</span>
      <span className="text-2xl font-bold text-gray-900">{count}</span>
      <ChevronRight size={16} className="text-gray-300" />
    </button>
  );
}

/** The newest rates update of today, ready to send. */
function RatesCard({ today }: { today: string }) {
  const navigate = useNavigate();
  const [u, setU] = useState<RateUpdate | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    ratesCall<{ updates: RateUpdate[] }>('list', { limit: 6 })
      .then(r => { if (live) setU((r.updates || []).find(x => x.date === today) || null); })
      .catch(() => { if (live) setU(null); });
    return () => { live = false; };
  }, [today]);
  const send = async () => {
    if (!u || !u.text) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(u.text)}`, '_blank');
    try { await ratesCall('sent', { id: u.id, channel: 'whatsapp' }); } catch { /* not critical */ }
  };
  return (
    <section aria-label="Rates">
      <h2 className="section-label mb-2">Rates</h2>
      <div className="card p-4">
        {u === undefined ? <p className="text-sm text-gray-400">Checking the latest rates…</p>
          : u && u.status === 'ready' ? (
            <>
              <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-emerald-600" /><p className="text-sm font-semibold text-gray-900">{(u.slotHour != null ? `${u.slotHour % 12 || 12} ${u.slotHour >= 12 ? 'PM' : 'AM'}` : 'Latest')} update is ready</p><Badge tone="green">{clockIST(u.createdAtMs)}</Badge></div>
              <p className="text-sm text-gray-600">{u.summary}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="success" size="sm" icon={<MessageCircle size={15} />} onClick={send}>Send on WhatsApp</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/rates')}>Open</Button>
              </div>
            </>
          ) : u && (u.status === 'failed' || u.status === 'skipped') ? (
            <>
              <div className="flex items-center gap-2 mb-1"><AlertTriangle size={16} className="text-amber-600" /><p className="text-sm font-semibold text-gray-900">{u.status === 'skipped' ? 'No update today' : 'An update needs you'}</p></div>
              <p className="text-sm text-gray-600">{u.reason || 'The rates did not arrive.'}</p>
              <Button className="mt-3" size="sm" onClick={() => navigate('/rates')}>Open Rates Desk</Button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">No rates update yet today. Updates arrive at 10 AM, 12 PM, 2 PM, 4 PM and 5 PM.</p>
              <Button className="mt-3" size="sm" onClick={() => navigate('/rates')}>Open Rates Desk</Button>
            </>
          )}
      </div>
    </section>
  );
}

/** "Turn on reminders on this device" (only shown when it is not on yet). */
function TurnOnReminders() {
  const n = useNotifications();
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('hide-reminder-card') === '1'; } catch { return false; } });
  if (n.on !== false || hidden) return null;
  const turnOn = async () => {
    try { await n.enable(); toast.success('Reminders are on for this device'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not turn notifications on.'); }
  };
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 flex items-start gap-3">
      <span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">{n.support.isIos && !n.support.installed ? <Smartphone size={20} /> : <Bell size={20} />}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900">Get loading and payment reminders on this device</p>
        {!n.support.supported ? <p className="mt-0.5 text-sm text-gray-600">{n.support.reason}</p>
          : n.denied ? <p className="mt-0.5 text-sm text-gray-600">Notifications are blocked for this app. Allow them in this device's settings, then come back.</p>
            : <p className="mt-0.5 text-sm text-gray-600">I will remind you when loading is due and when to ask for payment, even when the app is closed.</p>}
        <div className="mt-3 flex gap-2">
          {n.support.supported && !n.denied && <Button variant="primary" size="sm" loading={n.busy} icon={<Bell size={15} />} onClick={turnOn}>Turn on reminders</Button>}
          <Button variant="ghost" size="sm" onClick={() => { try { localStorage.setItem('hide-reminder-card', '1'); } catch { /* ignore */ } setHidden(true); }}>Not now</Button>
        </div>
      </div>
    </div>
  );
}

/** A quiet line that says whether the reminder system is working, and loudly says when it is not. */
function ReminderHealth() {
  const navigate = useNavigate();
  const [st, setSt] = useState<ReminderStatus | null | 'error'>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        // opening the app also runs the check (it never repeats a reminder), so a missed scheduler never loses one
        let last = 0; try { last = Number(localStorage.getItem('reminder-check-at') || 0); } catch { /* ignore */ }
        if (Date.now() - last > 3 * 3600_000) { try { localStorage.setItem('reminder-check-at', String(Date.now())); } catch { /* ignore */ } await remindersCall('check').catch(() => null); }
        const s = await remindersCall<ReminderStatus>('status');
        if (live) setSt(s);
      } catch { if (live) setSt('error'); }
    })();
    return () => { live = false; };
  }, []);
  if (st === null) return null;
  const problem = st === 'error' ? 'The reminder server did not answer (the file api/reminders.js may not be uploaded yet).'
    : st.devices === 0 ? 'No device has notifications on, so no reminder can reach you.'
      : !st.last || !st.last.cronAtMs ? 'The daily check has not run yet. It runs at about 9 AM; press "Check now" in Settings to test it.'
        : st.nowMs - st.last.cronAtMs > 36 * 3600_000 ? `The daily check has not run since ${new Date(st.last.cronAtMs).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}.` : null;
  const ok = st !== 'error' && !problem;
  return (
    <section aria-label="Reminder status">
      <button onClick={() => navigate('/settings#reminders')} className={`w-full text-left rounded-2xl border p-3.5 flex items-start gap-3 ${ok ? 'border-gray-200 bg-white' : 'border-amber-300 bg-amber-50'}`}>
        <span className={`mt-0.5 ${ok ? 'text-emerald-600' : 'text-amber-700'}`}>{ok ? <Bell size={18} /> : <BellOff size={18} />}</span>
        <span className="text-sm min-w-0">
          <span className="block font-medium text-gray-900">{ok ? 'Reminders are working' : 'Reminders need attention'}</span>
          <span className="block text-gray-600">{ok ? `Last daily check ${st.last?.cronAtMs ? new Date(st.last.cronAtMs).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : ''} · ${st.devices} device${st.devices === 1 ? '' : 's'} will be notified.` : problem}</span>
        </span>
      </button>
    </section>
  );
}

export type { Contract };

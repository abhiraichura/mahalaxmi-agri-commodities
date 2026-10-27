// src/rates/panels.tsx
// The parts of the Rates Desk that answer "is it working?": the health summary, the method switch and the activity list.
import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, Loader2, Bell, BellOff, XCircle, Circle, Zap, Server, Globe } from 'lucide-react';
import type { Health, HealthFix, HealthSlot, LogEntry, RateSource } from './api';

const timeOf = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
const dayOf = (ms: number) => new Date(ms).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' });
const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// ---------------------------------------------------------------- today at a glance

const SLOT_LOOK: Record<HealthSlot['state'], { text: string; cls: string; icon: React.ReactNode }> = {
  ready: { text: 'Ready', cls: 'bg-green-50 border-green-200 text-green-800', icon: <CheckCircle2 size={13} /> },
  late: { text: 'Not arrived', cls: 'bg-red-50 border-red-200 text-red-800', icon: <XCircle size={13} /> },
  failed: { text: 'Needs you', cls: 'bg-red-50 border-red-200 text-red-800', icon: <XCircle size={13} /> },
  nothing: { text: 'Nothing yet', cls: 'bg-red-50 border-red-200 text-red-800', icon: <XCircle size={13} /> },
  skipped: { text: 'Skipped', cls: 'bg-amber-50 border-amber-200 text-amber-800', icon: <AlertTriangle size={13} /> },
  running: { text: 'Running', cls: 'bg-gray-50 border-gray-200 text-gray-700', icon: <Loader2 size={13} className="animate-spin" /> },
  waiting: { text: 'Waiting', cls: 'bg-blue-50 border-blue-200 text-blue-800', icon: <Clock size={13} /> },
  upcoming: { text: 'Later', cls: 'bg-gray-50 border-gray-200 text-gray-500', icon: <Circle size={13} /> },
  closed: { text: 'Closed', cls: 'bg-gray-50 border-gray-200 text-gray-400', icon: <Circle size={13} /> },
};

export function HealthPanel({
  health, thisDevice, pushSupported, busy, checkedAt, onFix, onTurnOn, onCheck,
}: {
  health: Health | null;
  thisDevice: boolean;
  pushSupported: boolean;
  busy: string | null;
  checkedAt: number | null;
  onFix: (f: HealthFix) => void;
  onTurnOn: () => void;
  onCheck: () => void;
}) {
  if (!health) {
    return <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-sm text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Checking that everything works...</section>;
  }
  const tone = { good: 'border-green-200 bg-green-50 text-green-900', warn: 'border-amber-200 bg-amber-50 text-amber-900', bad: 'border-red-200 bg-red-50 text-red-900' }[health.overall];
  const icon = health.overall === 'good' ? <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" /> : <AlertTriangle size={18} className={`${health.overall === 'bad' ? 'text-red-600' : 'text-amber-600'} shrink-0 mt-0.5`} />;
  const rest = health.problems.filter(p => p.text !== health.headline);
  const headProblem = health.problems.find(p => p.text === health.headline);
  const sched = health.scheduler;
  const note = health.notifications;

  return (
    <section aria-label="Is everything working" className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className={`m-3 sm:m-4 rounded-xl border p-3 flex gap-2.5 ${tone}`}>
        {icon}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{health.overall === 'good' ? 'Everything is working' : health.overall === 'warn' ? 'Check this' : 'Something is not working'}</p>
          <p className="text-sm mt-0.5 break-words">{health.headline}</p>
          {headProblem?.fix && <button onClick={() => onFix(headProblem.fix!)} disabled={busy === 'fix'} className="mt-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium disabled:opacity-50">{headProblem.fix.label}</button>}
        </div>
      </div>

      <div className="px-3 sm:px-4 pb-1">
        <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1.5">Today</p>
        <ul className="grid grid-cols-5 gap-1.5">
          {health.slots.map(s => {
            const look = SLOT_LOOK[s.state];
            return (
              <li key={s.slot} title={s.reason || (s.via ? `From ${s.via}` : '')} className={`rounded-lg border px-1 py-1.5 text-center ${look.cls}`}>
                <p className="text-xs font-semibold">{s.label}</p>
                <p className="mt-0.5 inline-flex items-center justify-center gap-0.5 text-[10px] leading-tight">{look.icon} {look.text}</p>
                {s.state === 'ready' && s.atMs && <p className="text-[10px] opacity-70">{timeOf(s.atMs)}{s.arrivedLate ? ' (late)' : ''}</p>}
              </li>
            );
          })}
        </ul>
      </div>

      {rest.length > 0 && (
        <ul className="px-3 sm:px-4 pt-3 space-y-2">
          {rest.map(p => (
            <li key={p.code} className={`rounded-lg border p-2.5 text-sm ${p.level === 'bad' ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              <p>{p.text}</p>
              {p.fix && <button onClick={() => onFix(p.fix!)} disabled={busy === 'fix'} className="mt-2 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium disabled:opacity-50">{p.fix.label}</button>}
            </li>
          ))}
        </ul>
      )}

      <dl className="px-3 sm:px-4 pt-3 pb-3 sm:pb-4 text-xs text-gray-600 space-y-1">
        <div className="flex flex-wrap gap-x-2"><dt className="font-medium text-gray-700">Method in use:</dt><dd>{health.sourceName}</dd></div>
        {health.source === 'feed' && (
          <div className="flex flex-wrap gap-x-2"><dt className="font-medium text-gray-700">Grok last sent numbers:</dt>
            <dd>{health.feed.lastAtMs ? `${dayOf(health.feed.lastAtMs)} ${timeOf(health.feed.lastAtMs)} (${health.feed.lastResult === 'saved' ? 'accepted' : health.feed.lastResult === 'already' ? 'already had it' : health.feed.lastResult === 'skipped' ? 'skipped' : 'refused'})` : 'never'}</dd></div>
        )}
        {health.source === 'feed' && health.typical && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-x-2"><dt className="font-medium text-gray-700">Grok usually delivers:</dt>
              <dd>about {health.typical.median} minutes past the hour (last {health.typical.count} updates: {health.typical.min} to {health.typical.max} minutes)</dd></div>
            {health.typical.alertsFirst && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-2.5">
                <p>Your alert time is {health.waitMin} minutes, but Grok usually needs longer. So a "rates need you" alert rings first, and then the real "update ready" a few minutes later. Raising the alert time means you are only alerted when something really is wrong.</p>
                {health.typical.fix && <button onClick={() => onFix(health.typical!.fix!)} disabled={busy === 'fix'} className="mt-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium disabled:opacity-50">{health.typical.fix.label}</button>}
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-x-2"><dt className="font-medium text-gray-700">Scheduler last checked:</dt>
          <dd>{sched.lastAtMs ? `${dayOf(sched.lastAtMs)} ${timeOf(sched.lastAtMs)}${sched.lastMessage ? ` (${sched.lastMessage.slice(0, 80)})` : ''}` : 'never'}</dd></div>
        <div className="flex flex-wrap gap-x-2"><dt className="font-medium text-gray-700">Last notification:</dt>
          <dd>{note.last ? `${dayOf(note.last.atMs)} ${timeOf(note.last.atMs)}: ${note.last.message.slice(0, 140)}` : 'none sent yet'}</dd></div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><dt className="font-medium text-gray-700">Devices with notifications:</dt>
          <dd className="inline-flex items-center gap-1.5">{note.devices} · this device {thisDevice ? <span className="inline-flex items-center gap-1 text-green-700"><Bell size={12} /> on</span> : <span className="inline-flex items-center gap-1 text-red-700"><BellOff size={12} /> off</span>}
            {!thisDevice && pushSupported && <button onClick={onTurnOn} disabled={busy === 'push'} className="ml-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-medium disabled:opacity-50">Turn on here</button>}
          </dd></div>
      </dl>
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 -mt-1 flex items-center justify-between text-[11px] text-gray-400">
        <span>{checkedAt ? `Checked ${new Date(checkedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()}. This page looks again by itself, and when you come back to it.` : ''}</span>
        <button onClick={onCheck} disabled={busy === 'check'} className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs disabled:opacity-50">Check now</button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- one method at a time

const METHODS: { id: RateSource; title: string; line: string; tag?: string; icon: React.ReactNode }[] = [
  { id: 'feed', title: 'Grok feed', line: 'Grok reads the NCDEX board and sends the numbers here.', tag: 'Recommended', icon: <Zap size={16} /> },
  { id: 'browser', title: 'My browser', line: 'You press a bookmark on the NCDEX page; it sends the board here.', icon: <Globe size={16} /> },
  { id: 'server', title: 'Server reads NCDEX', line: 'The app fetches NCDEX by itself. NCDEX usually blocks this.', icon: <Server size={16} /> },
];

export function MethodPicker({ value, busy, onChange }: { value: RateSource; busy: boolean; onChange: (v: RateSource) => void }) {
  return (
    <div role="radiogroup" aria-label="How the rates arrive" className="grid sm:grid-cols-3 gap-2">
      {METHODS.map(m => {
        const on = value === m.id;
        return (
          <button key={m.id} role="radio" aria-checked={on} disabled={busy} onClick={() => !on && onChange(m.id)}
            className={`text-left rounded-xl border p-3 transition ${on ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-300' : 'border-gray-200 hover:bg-gray-50'} disabled:opacity-60`}>
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <span className={on ? 'text-rose-600' : 'text-gray-400'}>{m.icon}</span> {m.title}
              {on && <CheckCircle2 size={14} className="ml-auto text-rose-600" />}
            </span>
            <span className="mt-1 block text-xs text-gray-600">{m.line}</span>
            {m.tag && <span className="mt-1.5 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">{m.tag}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- what happened, newest first

const WHO: Record<string, string> = { feed: 'Grok feed', cron: 'Scheduler', browser: 'Your browser', you: 'You', alert: 'Notification' };

function look(e: LogEntry): { label: string; cls: string } {
  if (e.result === 'test') return { label: 'Address check', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (e.result === 'waiting' || e.result === 'idle' || e.result === 'weekend' || e.result === 'busy' || e.result === 'handled') return { label: e.result === 'waiting' ? 'Waiting' : e.result === 'handled' ? 'Already handled' : e.result === 'weekend' ? 'Weekend' : e.result === 'busy' ? 'Busy' : 'Not a slot', cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  if (e.result === 'skipped') return { label: 'Skipped', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (e.result === 'nobody') return { label: 'Nobody notified', cls: 'bg-red-50 text-red-700 border-red-200' };
  if (e.result === 'alerted') return { label: 'Alert sent', cls: 'bg-red-50 text-red-700 border-red-200' };
  if (e.ok) return { label: e.result === 'already' ? 'Already saved' : e.result === 'sent' ? 'Sent' : 'Saved', cls: 'bg-green-50 text-green-700 border-green-200' };
  return { label: e.result === 'refused' ? 'Refused' : e.result === 'error' ? 'Error' : 'Failed', cls: 'bg-red-50 text-red-700 border-red-200' };
}

export function ActivityList({ log }: { log: LogEntry[] }) {
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const today = todayKey();
  const rows = more ? log : log.slice(0, 12);
  if (!log.length) return <p className="text-sm text-gray-500">Nothing yet. Every call from Grok, the scheduler or your browser, and every notification, will be listed here with the time and what happened to it.</p>;
  return (
    <div>
      <ul className="divide-y divide-gray-100">
        {rows.map((e, i) => {
          const l = look(e);
          const key = e.id || `${e.atMs}-${i}`;
          const hasMore = !!(e.values && Object.keys(e.values).length) || !!e.ua;
          return (
            <li key={key} className="py-2">
              <div className="flex items-start gap-2">
                <span className="w-16 shrink-0 text-[11px] text-gray-500 pt-0.5">{e.day === today ? '' : `${dayOf(e.atMs)} `}{timeOf(e.atMs)}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-semibold text-gray-800">{WHO[e.kind] || e.kind}</span>
                    <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${l.cls}`}>{l.label}</span>
                  </p>
                  <p className="text-sm text-gray-700 break-words">{e.message}</p>
                  {hasMore && (
                    <button onClick={() => setOpen(open === key ? null : key)} className="mt-0.5 text-[11px] text-gray-500 underline">{open === key ? 'Hide what was received' : 'Show what was received'}</button>
                  )}
                  {open === key && (
                    <div className="mt-1 rounded-lg bg-gray-50 border border-gray-200 p-2 text-[11px] font-mono text-gray-700 break-words">
                      {e.values && Object.entries(e.values).map(([k, v]) => <span key={k} className="inline-block mr-3">{k}={v}</span>)}
                      {e.ua && <p className="mt-1 font-sans text-gray-500">Called by: {e.ua}</p>}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {log.length > 12 && <button onClick={() => setMore(v => !v)} className="mt-2 text-xs text-gray-600 underline">{more ? 'Show fewer' : `Show all ${log.length}`}</button>}
    </div>
  );
}

// The "Reminders" section of Settings: this device, a test, "check now", the last notifications, and the optional backup scheduler.
import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Copy, Send, RefreshCw, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Badge } from '../ui';
import { remindersCall, ReminderStatus, ReminderRun } from './api';
import { useNotifications } from './notify';
import { ratesCall, RatesStatus } from '../rates/api';

const when = (ms?: number) => ms ? new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : 'not yet';

export default function RemindersSettings() {
  const n = useNotifications();
  const [st, setSt] = useState<ReminderStatus | null | 'error'>(null);
  const [busy, setBusy] = useState<'' | 'test' | 'check'>('');
  const [result, setResult] = useState<string>('');
  const [cronKey, setCronKey] = useState('');

  const load = useCallback(async () => {
    try { setSt(await remindersCall<ReminderStatus>('status')); } catch { setSt('error'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { ratesCall<RatesStatus>('status').then(s => setCronKey(s.cronKey || '')).catch(() => setCronKey('')); }, []);

  const toggle = async () => {
    try {
      if (n.on) { await n.disable(); toast.success('Reminders are off for this device'); }
      else { await n.enable(); toast.success('Reminders are on for this device'); }
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not change notifications.'); }
  };

  const test = async () => {
    setBusy('test'); setResult('');
    try {
      const r = await remindersCall<{ sent?: number; total?: number }>('test');
      setResult(r.total ? `Test sent to ${r.sent ?? 0} of ${r.total} device${r.total === 1 ? '' : 's'}.` : 'No device has notifications on yet. Turn them on above first.');
    } catch (e) { setResult(e instanceof Error ? e.message : 'Could not send the test.'); }
    finally { setBusy(''); }
  };

  const checkNow = async () => {
    setBusy('check'); setResult('');
    try {
      const r = await remindersCall<ReminderRun>('run-now');
      setResult(r.skipped ? `Nothing sent: ${r.skipped}` : r.due === 0 ? 'Checked all contracts. Nothing is due today.' : r.devices === 0 ? `${r.due} reminder${r.due === 1 ? ' is' : 's are'} due, but no device has notifications on.` : `Checked. ${r.sent} notification${r.sent === 1 ? '' : 's'} sent${r.failed ? `, ${r.failed} failed` : ''}.`);
      load();
    } catch (e) { setResult(e instanceof Error ? e.message : 'Could not run the check.'); }
    finally { setBusy(''); }
  };

  const cronUrl = cronKey ? `${window.location.origin}/api/reminders?action=cron&key=${cronKey}` : '';
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast.success('Address copied'); } catch { toast.error('Could not copy. Select it and copy by hand.'); } };

  const stOk = st && st !== 'error' ? st : null;
  const lastCheck = stOk?.last?.cronAtMs || stOk?.last?.checkedAtMs;

  return (
    <section id="reminders" className="card p-4 lg:p-6 space-y-4 scroll-mt-20" aria-label="Reminders">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Bell size={16} className="text-rose-700" /> Reminders</h3>
        {stOk && <Badge tone={stOk.devices > 0 ? 'green' : 'amber'}>{stOk.devices} device{stOk.devices === 1 ? '' : 's'} on</Badge>}
      </div>

      <p className="text-sm text-gray-600">
        For every confirmed contract I ask you once or twice whether the goods are loaded, then, once you give the loading date, when to ask the buyer for payment. Reminders arrive once a day at about 9 AM (never before 8 AM or after 9 PM).
      </p>

      {/* this device */}
      <div className="rounded-xl border border-gray-200 p-3.5 flex items-start gap-3">
        <span className={`mt-0.5 ${n.on ? 'text-emerald-600' : 'text-gray-400'}`}>{n.support.isIos && !n.support.installed ? <Smartphone size={20} /> : n.on ? <Bell size={20} /> : <BellOff size={20} />}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">This device: {n.on === null ? 'checking…' : n.on ? 'reminders are ON' : 'reminders are OFF'}</p>
          {!n.support.supported
            ? <p className="text-xs text-gray-600 mt-0.5">{n.support.reason}</p>
            : n.denied
              ? <p className="text-xs text-gray-600 mt-0.5">Notifications are blocked for this app. Allow them in this device's settings, then come back here.</p>
              : <p className="text-xs text-gray-600 mt-0.5">{n.on ? 'You will get a notification here even when the app is closed.' : 'Turn this on for every phone or computer where you want the reminders.'}</p>}
          {n.support.supported && !n.denied && n.on !== null && (
            <div className="mt-2.5"><Button size="sm" variant={n.on ? 'secondary' : 'primary'} loading={n.busy} onClick={toggle}>{n.on ? 'Turn off on this device' : 'Turn on reminders'}</Button></div>
          )}
        </div>
      </div>

      {/* working? */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-3.5 space-y-2.5">
        <div className="flex items-start gap-2 text-sm">
          {st === 'error' ? <BellOff size={16} className="text-amber-700 mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />}
          <p className="text-gray-700">
            {st === null ? 'Checking the reminder server…'
              : st === 'error' ? 'The reminder server did not answer. The file api/reminders.js may not be uploaded yet.'
                : <>Last check: <strong>{when(lastCheck)}</strong>{stOk?.last?.sent != null && lastCheck ? ` · ${stOk.last.sent} sent` : ''}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" loading={busy === 'check'} icon={<RefreshCw size={14} />} onClick={checkNow}>Check now</Button>
          <Button size="sm" variant="secondary" loading={busy === 'test'} icon={<Send size={14} />} onClick={test}>Send a test notification</Button>
        </div>
        {result && <p className="text-xs text-gray-700" role="status">{result}</p>}
      </div>

      {/* recent */}
      {stOk && stOk.recent.length > 0 && (
        <div>
          <p className="section-label mb-1.5">Recent reminders</p>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {stOk.recent.slice(0, 6).map(r => (
              <li key={r.id || r.key} className="px-3 py-2 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-gray-800">{r.title}</span>
                <span className="text-xs text-gray-500 shrink-0">{when(r.sentAtMs)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-500">
        On iPhone a notification cannot hold Yes / No buttons: tap it and the app opens straight on that contract's question. If many contracts are due on one day you get one combined notification instead of a pile.
      </p>

      {cronUrl && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-700 font-medium select-none py-1">Optional: a second daily scheduler</summary>
          <div className="mt-2 space-y-2 text-xs text-gray-600">
            <p>The daily check already runs by itself on Vercel, and also whenever you open the app. If you want a backup, create a free job on cron-job.org that opens this address once a day at 9:00 AM (India time):</p>
            <div className="flex gap-2">
              <input readOnly value={cronUrl} onFocus={e => e.currentTarget.select()} aria-label="Reminder scheduler address" className="input-field !py-2 !text-xs font-mono flex-1 min-w-0" />
              <Button size="sm" variant="secondary" aria-label="Copy the address" onClick={() => copy(cronUrl)}><Copy size={14} /></Button>
            </div>
            <p>Keep this address private. It only runs the check; it cannot read or change your data.</p>
          </div>
        </details>
      )}
    </section>
  );
}

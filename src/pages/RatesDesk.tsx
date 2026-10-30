// src/pages/RatesDesk.tsx
// Live NCDEX rates -> client message -> phone notification -> one-tap WhatsApp.
// The work is done by the server (api/rates.js). This page shows the result and gives the fall-backs
// (paste the board / type the numbers) so an update can always go out.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Page } from '../ui';
import toast from 'react-hot-toast';
import {
  TrendingUp, RefreshCw, Send, Copy, Share2, Bell, BellOff, CheckCircle2, AlertTriangle, Info, Clipboard, Pencil,
  Wifi, History, Settings2, Clock, Loader2, Zap, Activity as ActivityIcon, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  ratesCall, RatesApiError,
  type Activity, type CommodityKey, type HealthFix, type Picks, type RateSource, type RateUpdate, type RatesConfig, type RatesStatus,
} from '../rates/api';
import { HealthPanel, MethodPicker, ActivityList } from '../rates/panels';
import { pushSupport, currentSubscription, subscribeThisDevice, unsubscribeThisDevice, deviceLabel, subscriptionId } from '../rates/push';

const SLOTS = [10, 12, 14, 16, 17];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NAMES: Record<CommodityKey, string> = { jeera: 'Jeera', dhaniya: 'Dhaniya', turmeric: 'Turmeric' };

const hourLabel = (h: number) => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
const inr = (n: number) => Number(n).toLocaleString('en-IN');
const signed = (n: number) => (n > 0 ? `+${inr(n)}` : n < 0 ? `−${inr(Math.abs(n))}` : '0');

function istNow() {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' });
  const p = Object.fromEntries(f.formatToParts(new Date()).map(x => [x.type, x.value]));
  return { hour: Number(p.hour) % 24, minute: Number(p.minute), weekend: p.weekday === 'Sat' || p.weekday === 'Sun' };
}

function nextSlotText(): string {
  const n = istNow();
  const mins = n.hour * 60 + n.minute;
  if (!n.weekend) {
    const next = SLOTS.find(h => h * 60 > mins);
    if (next !== undefined) return `Next scheduled update: ${hourLabel(next)} today`;
  }
  return 'Next scheduled update: 10 AM on the next trading day';
}

const timeIst = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
const dayIst = (ms: number) => new Date(ms).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' });

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

async function copyWithToast(text: string, ok = 'Copied') {
  if (await copyText(text)) toast.success(ok);
  else toast.error('Could not copy. Select the text and copy it by hand.');
}

function openWhatsApp(text: string) {
  const ua = navigator.userAgent || '';
  const mobile = /android|iPad|iPhone|iPod/i.test(ua);
  const enc = encodeURIComponent(text);
  if (mobile) window.location.href = `whatsapp://send?text=${enc}`;
  else window.open(`https://wa.me/?text=${enc}`, '_blank');
}


const COMMODITY_ON_BOARD: Record<CommodityKey, string> = { jeera: 'JEERAUNJHA (Jeera)', dhaniya: 'DHANIYA (Dhaniya)', turmeric: 'TMCFGRNZM (Turmeric)' };

/** The instructions that go into the Grok automation (they replace the whole old prompt). Grok opens the address once with the numbers filled in. */
function grokInstructions(feedUrl: string, keys: CommodityKey[]): string {
  const fields = keys.map(k => `${k}_exp=[MONTH]&${k}_open=[OPEN]&${k}_prev=[CLOSE]&${k}=[LTP]&${k}_chg=[CHANGE]&${k}_pct=[CHANGE %]&${k}_oi=[OI]`).join('&');
  const names = keys.map(k => COMMODITY_ON_BOARD[k]).join(', ');
  return [
    'Check the current hour in Asia/Kolkata (IST). If the hour is NOT 10, 12, 14, 16 or 17, or if today is Saturday or Sunday, stop immediately and write nothing. Otherwise do this:',
    '',
    '1. Open the NCDEX Live Quotes page: https://www.ncdex.com/market-watch/live_quotes',
    '2. Note the "As on" date and time printed at the top of the board, exactly as written (for example: Friday, Oct 16 2026 10:02 AM).',
    `3. For ${names}, take the nearest expiry that has not passed yet and read these values from its row: expiry month (for example Oct), Open, Close (this is the previous close), LTP, Change (use a minus sign when it is negative), Change %, OI.`,
    '4. Open this web address ONCE, with every [..] replaced by the value you read. Write numbers without commas and without the rupee sign. In the As on text write + instead of spaces:',
    '',
    `${feedUrl}&asof=[AS ON TEXT]&${fields}`,
    '',
    '5. Your whole answer to me is ONLY the one line that address replied (it starts with OK or ERROR). If it starts with ERROR, read the number it complains about again from the board, open the address again, and give the new reply line. If you were not able to open the address at all, answer exactly: CANNOT OPEN ADDRESS.',
    '6. Do not write any message for me and do not calculate or guess any number: copy the values exactly as the board shows them.',
    '7. If the board date is not today (market holiday), still open the address with the As on text exactly as shown.',
  ].join('\n');
}

/** A 10-second check that Grok can reach the app at all (it saves nothing). */
function grokTest(feedUrl: string): string {
  return `Open this web address and write only the reply you get, nothing else:\n\n${feedUrl}&test=1`;
}

// ---------------------------------------------------------------- manual / paste form

interface Row {
  expiryLabel: string;
  expiry?: string;
  ltp: string;
  prevClose: string;
  open: string;
  oi: string;
  change?: number;
  changePct?: number;
}
type Form = Partial<Record<CommodityKey, Row>>;

const emptyRow = (label: string): Row => ({ expiryLabel: label, ltp: '', prevClose: '', open: '', oi: '' });

function picksToForm(picks: Picks): Form {
  const f: Form = {};
  (Object.keys(picks) as CommodityKey[]).forEach(k => {
    const p = picks[k];
    if (!p) return;
    f[k] = {
      expiryLabel: p.expiryLabel, expiry: p.expiry, ltp: String(p.ltp), prevClose: String(p.prevClose), open: String(p.open),
      oi: p.oi == null ? '' : String(p.oi), change: p.change, changePct: p.changePct,
    };
  });
  return f;
}

const numOf = (s: string) => {
  const v = Number(String(s).replace(/[₹,\s]/g, ''));
  return Number.isFinite(v) && String(s).trim() !== '' ? v : null;
};

// ---------------------------------------------------------------- small pieces

function Chip({ tone, children }: { tone: 'green' | 'red' | 'amber' | 'gray' | 'blue'; children: React.ReactNode }) {
  const c = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  }[tone];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c}`}>{children}</span>;
}

function Card({ title, icon, children, right }: { title: string; icon?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">{icon}{title}</h2>
        {right}
      </div>
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">{children}</div>
    </section>
  );
}

function statusChip(u: RateUpdate) {
  if (u.status === 'ready') return <Chip tone="green"><CheckCircle2 size={12} /> Ready</Chip>;
  if (u.status === 'failed') return <Chip tone="red"><AlertTriangle size={12} /> Needs you</Chip>;
  if (u.status === 'skipped') return <Chip tone="amber"><Info size={12} /> Skipped</Chip>;
  return <Chip tone="gray"><Loader2 size={12} className="animate-spin" /> Running</Chip>;
}

const slotName = (u: RateUpdate) => (u.slotHour != null ? hourLabel(u.slotHour) : `Extra ${u.slot.replace(/^x/, '').replace(/(\d\d)(\d\d)/, '$1:$2')}`);

// ---------------------------------------------------------------- page

export default function RatesDesk() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<RatesStatus | null>(null);
  const [setup, setSetup] = useState<{ message: string; missing?: string[] } | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [updates, setUpdates] = useState<RateUpdate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('u'));
  const [slot, setSlot] = useState<string>(params.get('fix') || 'auto');
  const [busy, setBusy] = useState<string | null>(null);
  const [fetchProblem, setFetchProblem] = useState<string | null>(null);
  const [tab, setTab] = useState<'none' | 'paste' | 'type'>(params.get('fix') ? 'paste' : 'none');
  const [pasteText, setPasteText] = useState('');
  const [pasteInfo, setPasteInfo] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({});
  const [diag, setDiag] = useState<any>(null);
  const [cfg, setCfg] = useState<RatesConfig | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [thisId, setThisId] = useState<string | null>(null);
  const [showGrok, setShowGrok] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [backupOpen, setBackupOpen] = useState(!!params.get('fix'));
  const [testNote, setTestNote] = useState<string | null>(null);
  const seen = useRef<Record<string, string> | null>(null);
  const health = activity?.health || null;
  const log = activity?.log || [];
  const support = useMemo(() => pushSupport(), []);
  const formRef = useRef<HTMLDivElement>(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await ratesCall<RatesStatus>('status');
      setStatus(s);
      setCfg(c => c || s.config);
      setSetup(null);
      setFatal(null);
    } catch (e) {
      if (e instanceof RatesApiError && e.code === 'SETUP') setSetup({ message: e.message, missing: e.missing });
      else setFatal(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // one call brings the updates, the activity list and the "is everything working" summary
  const loadAll = useCallback(async () => {
    try {
      const a = await ratesCall<Activity>('activity');
      setActivity(a);
      setUpdates(a.updates || []);
      setCheckedAt(Date.now());
      // an update that was missing (or needed you) and is ready now: say so, even when the page was just left open
      const now: Record<string, string> = {};
      for (const u of a.updates || []) now[u.id] = u.status;
      if (seen.current) {
        for (const u of a.updates || []) {
          if (u.status === 'ready' && seen.current[u.id] !== 'ready') {
            toast.success(`${slotName(u)} update arrived${u.source === 'feed' ? ' from Grok' : ''}${u.arrivedLate ? ' (late)' : ''}`, { duration: 6000 });
          }
        }
      }
      seen.current = now;
    } catch (e) {
      if (e instanceof RatesApiError && e.code === 'BAD') setFatal('This page is newer than the server files. Upload every file from the update zip (including api/rates.js and the server folder), then reload.');
      /* other problems are shown by loadStatus */
    }
  }, []);
  const loadUpdates = loadAll;

  useEffect(() => { loadStatus(); loadAll(); }, [loadStatus, loadAll]);
  // looks again by itself: every 20 s around an update time, every minute otherwise (and at once when the tab is shown again)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (document.visibilityState === 'visible') loadAll();
      const n = istNow();
      const mins = n.hour * 60 + n.minute;
      const hot = !n.weekend && SLOTS.some(h => mins >= h * 60 && mins <= h * 60 + 35);
      timer = setTimeout(tick, hot ? 20000 : 60000);
    };
    timer = setTimeout(tick, 20000);
    const onVis = () => { if (document.visibilityState === 'visible') loadAll(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); };
  }, [loadAll]);
  useEffect(() => { currentSubscription().then(async s => { setSubscribed(!!s); setThisId(await subscriptionId(s)); }); }, []);

  const selected = useMemo(() => {
    if (selectedId) { const u = updates.find(x => x.id === selectedId); if (u) return u; }
    return updates.find(u => u.status === 'ready') || updates[0] || null;
  }, [updates, selectedId]);

  const keys: CommodityKey[] = useMemo(() => {
    const k: CommodityKey[] = ['jeera', 'dhaniya'];
    if (cfg?.includeTurmeric) k.push('turmeric');
    return k;
  }, [cfg?.includeTurmeric]);

  // rows for the "type the numbers" form always exist for the commodities in the message
  // the expiry months of the last update are the sensible starting point when typing by hand
  const lastPicks = useMemo(() => updates.find(u => u.picks && Object.keys(u.picks).length > 0)?.picks, [updates]);
  const defLabel = (k: CommodityKey) => lastPicks?.[k]?.expiryLabel || MONTHS[new Date().getMonth()];
  const row = (k: CommodityKey): Row => form[k] || emptyRow(defLabel(k));
  const setRow = (k: CommodityKey, patch: Partial<Row>) => setForm(f => ({ ...f, [k]: { ...(f[k] || emptyRow(defLabel(k))), ...patch } }));

  const guard = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    try { await fn(); } catch (e) {
      if (e instanceof RatesApiError && e.code === 'SETUP') setSetup({ message: e.message, missing: e.missing });
      else toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  };

  // ---- actions
  // the movement section of one update: 'auto' (worked out by the app), 'manual' (typed) or 'off' (left out)
  const applyMovement = async (mode: 'auto' | 'manual' | 'off', values?: Record<string, number>, label?: string): Promise<boolean> => {
    if (!selected) return false;
    setBusy('move');
    try {
      await ratesCall('movement', { id: selected.id, mode, values, label });
      await loadUpdates();
      toast.success(mode === 'off' ? 'Movement section hidden' : mode === 'auto' ? 'Movement is automatic again' : 'Movement updated');
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      return false;
    } finally { setBusy(null); }
  };

  const fetchNow = (slotOverride?: string) => guard('fetch', async () => {
    setFetchProblem(null);
    const r = await ratesCall<{ ok: boolean; update?: RateUpdate; reason?: string; diag?: any }>('run', { slot: slotOverride ?? slot });
    await loadUpdates();
    if (r.update) setSelectedId(r.update.id);
    if (r.ok) { toast.success('Rates fetched from NCDEX'); setTab('none'); return; }
    setFetchProblem(r.reason || 'Could not get live rates from NCDEX.');
    if (r.diag) setDiag({ ok: false, reason: r.reason, diag: r.diag, log: [] });
    setBackupOpen(true);
    setTab('paste');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  });

  const readPaste = () => guard('paste', () => readPasteText(pasteText));

  // one tap: take whatever is on the clipboard (the copied NCDEX page) and read it
  const pasteFromClipboard = () => guard('paste', async () => {
    let text = '';
    try { text = await navigator.clipboard.readText(); } catch { throw new Error('The phone did not allow reading the clipboard. Touch and hold in the box below, choose Paste, then press "Read the pasted text".'); }
    if (!text.trim()) throw new Error('Nothing is copied yet. Copy the NCDEX page first.');
    setPasteText(text);
    await readPasteText(text);
  });

  const readPasteText = async (text: string) => {
    const r = await ratesCall<{ ok: boolean; errors: string[]; warnings: string[]; picks: Picks; boardTime: string | null; ageMin: number | null }>('paste', { text });
    if (Object.keys(r.picks || {}).length) setForm(f => ({ ...f, ...picksToForm(r.picks) }));
    if (r.ok) {
      const age = r.ageMin != null ? ` (${r.ageMin} min old)` : '';
      setPasteInfo(`Read ${Object.keys(r.picks).length} commodities. Board time: ${r.boardTime || 'not found'}${age}. Check the numbers below, then press Prepare message.${r.warnings.length ? ' Notes: ' + r.warnings.join('; ') : ''}`);
      setTab('type');
    } else {
      setPasteInfo(`Could not read everything: ${r.errors.join('; ')}. Fill in the missing numbers below.`);
      setTab('type');
    }
  };

  const prepareFromForm = () => guard('commit', async () => {
    const picks: Record<string, unknown> = {};
    for (const k of keys) {
      const r = form[k];
      if (!r) throw new Error(`${NAMES[k]}: enter the numbers.`);
      const ltp = numOf(r.ltp), prev = numOf(r.prevClose);
      if (prev === null) throw new Error(`${NAMES[k]}: previous close is needed.`);
      if (ltp === null && r.change === undefined) throw new Error(`${NAMES[k]}: last price (LTP) is needed.`);
      picks[k] = {
        expiryLabel: r.expiryLabel, expiry: r.expiry, ltp, prevClose: prev, open: numOf(r.open), oi: numOf(r.oi),
        change: r.change, changePct: r.changePct,
      };
    }
    const res = await ratesCall<{ ok: boolean; update: RateUpdate }>('commit', { slot, picks, source: pasteInfo ? 'paste' : 'manual' });
    await loadUpdates();
    setSelectedId(res.update.id);
    setFetchProblem(null);
    // start clean for the next update: old numbers must not leak into it
    setPasteInfo(null);
    setPasteText('');
    setForm({});
    setTab('none');
    toast.success('Message ready');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const diagnose = () => guard('diag', async () => { setDiag(await ratesCall('diagnose')); });

  const sendWhatsApp = async (u: RateUpdate) => {
    if (!u.text) return;
    openWhatsApp(u.text);
    try { await ratesCall('sent', { id: u.id, channel: 'whatsapp' }); loadUpdates(); } catch { /* not critical */ }
  };

  const toggleNotifications = () => guard('push', async () => {
    if (!status) return;
    if (subscribed) {
      const ep = await unsubscribeThisDevice();
      if (ep) await ratesCall('unsubscribe', { endpoint: ep });
      setSubscribed(false);
      setThisId(null);
      toast.success('Notifications turned off on this device');
    } else {
      const sub = await subscribeThisDevice(status.vapidPublicKey);
      await ratesCall('subscribe', { subscription: sub.toJSON(), label: deviceLabel() });
      setSubscribed(true);
      setThisId(await subscriptionId(sub));
      toast.success('Notifications are on for this device');
    }
    await loadStatus();
  });

  const removeDevice = (id: string) => guard('device', async () => {
    await ratesCall('remove-device', { id });
    if (id === thisId) { setSubscribed(false); try { await unsubscribeThisDevice(); } catch { /* ignore */ } setThisId(null); }
    toast.success('Device removed');
    await loadStatus();
  });

  const testPush = () => guard('test', async () => {
    const r = await ratesCall<{ sent: number; total: number; message?: string }>('test-push');
    setTestNote(r.message || null);
    if (!r.total) toast.error('No device is subscribed yet. Turn notifications on first.');
    else if (!r.sent) toast.error(r.message || 'The test did not reach any device.');
    else toast.success(`Test sent to ${r.sent} of ${r.total} device(s)`);
    await loadAll();
  });

  // ---- one method at a time
  const chooseSource = (v: RateSource) => guard('source', async () => {
    const r = await ratesCall<{ config: RatesConfig }>('config', { config: { rateSource: v } });
    setCfg(c => (c ? { ...c, rateSource: r.config.rateSource } : r.config));
    await loadAll();
    toast.success(`Now using: ${v === 'feed' ? 'Grok feed' : v === 'browser' ? 'My browser' : 'Server reads NCDEX'}`);
  });
  const applyFix = (f: HealthFix) => guard('fix', async () => {
    const config = f.type === 'set_wait' ? { feedWaitMin: Number(f.value) } : { rateSource: f.value as RateSource };
    const r = await ratesCall<{ config: RatesConfig }>('config', { config });
    setCfg(c => (c ? { ...c, feedWaitMin: r.config.feedWaitMin, rateSource: r.config.rateSource } : r.config));
    await loadAll();
    toast.success('Saved');
  });
  const checkNow = () => guard('check', async () => { await Promise.all([loadStatus(), loadAll()]); });

  const saveConfig = () => guard('cfg', async () => {
    if (!cfg) return;
    const r = await ratesCall<{ config: RatesConfig }>('config', { config: cfg });
    setCfg(r.config);
    await loadStatus();
    toast.success('Saved');
  });


  // the feed address: Grok opens it with the numbers; it has a key of its own that can do nothing else
  const feedUrl = status ? `${window.location.origin}/api/rates?action=feed&format=text&key=${status.feedKey}` : '';
  const checkFeed = () => guard('feedcheck', async () => {
    let text = '';
    try { text = await (await fetch(`${feedUrl}&test=1`)).text(); } catch { throw new Error('Could not reach the server. Check your internet connection.'); }
    if (/^OK/.test(text)) toast.success('The feed address works.'); else toast.error(text.slice(0, 160) || 'The feed address did not answer.');
  });
  const newFeedKey = () => guard('feedkey', async () => {
    if (!window.confirm('Make a new feed key? The old address stops working at once, so the new address must be put into your Grok automation.')) return;
    await ratesCall('regen-feed-key');
    await loadStatus();
    toast.success('New key made. Copy the new instructions into Grok.');
  });

  const cronUrl = status ? `${window.location.origin}/api/rates?action=run&slot=auto&key=${status.cronKey}` : '';
  const sendUrl = status ? `${window.location.origin}/api/rates?action=ingest&slot=auto&key=${status.cronKey}` : '';
  // a bookmark that sends the text of the NCDEX page (as shown in the person's own browser) to this app
  const bookmarklet = sendUrl
    ? `javascript:(function(){var u='${sendUrl}';var t=document.body.innerText;fetch(u,{method:'POST',headers:{'Content-Type':'text/plain'},body:t}).then(function(r){return r.json()}).then(function(j){alert(j.message||(j.ok?'Sent':'Not accepted'))}).catch(function(){try{navigator.clipboard.writeText(t).then(function(){alert('Could not send directly from this page. The page text is copied. In Rates Desk press Paste board text, then Paste from clipboard and read.')})}catch(e){alert('Could not send from this page.')}})})();`
    : '';

  // ------------------------------------------------------------ render
  if (setup) return <SetupNeeded message={setup.message} missing={setup.missing} onRetry={() => { loadStatus(); loadAll(); }} />;

  const source: RateSource = cfg?.rateSource === 'feed' || cfg?.rateSource === 'browser' ? cfg.rateSource : 'server';
  const wait = Math.min(30, Math.max(3, Number(cfg?.feedWaitMin) || 10));
  const cronMinutes = source === 'server' ? '0, 8' : `${wait}, ${wait + 10}`;
  const sourceWord = source === 'feed' ? 'Grok' : 'your browser';

  const viaOf = (u: RateUpdate): string => {
    if (u.status === 'ready') {
      if (u.source === 'feed') return 'Grok feed';
      if (u.source === 'browser') return 'your browser';
      if (u.source === 'ncdex') return u.trigger === 'cron' ? 'scheduler (NCDEX)' : 'NCDEX, started by you';
      if (u.source === 'paste') return 'pasted by you';
      return 'typed by you';
    }
    return u.trigger === 'cron' ? 'scheduler check' : u.trigger === 'feed' ? 'Grok feed' : 'you';
  };

  // the scheduler (cron-job.org): same address for every method, only the minutes differ
  const schedulerBox = status && (
    <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-3">
      <p className="text-sm font-medium text-gray-800">Scheduler on cron-job.org</p>
      <p className="mt-0.5 text-xs text-gray-600">
        {source === 'server'
          ? 'It starts the NCDEX fetch at each update time.'
          : `It does not fetch anything. It only checks that the numbers arrived from ${sourceWord}, and alerts you when they did not.`}
      </p>
      <ul className="mt-1.5 text-xs text-gray-700 list-disc ml-4 space-y-0.5">
        <li>Address: the one below</li>
        <li>Days: Monday to Friday. Time zone: Asia/Kolkata</li>
        <li>Hours: <b>10, 12, 14, 16, 17</b></li>
        <li>Minutes: <b>{cronMinutes}</b>{source !== 'server' ? ` (the first one must not be before your alert time of ${wait} minutes)` : ''}</li>
      </ul>
      <div className="mt-2 flex gap-2">
        <input readOnly value={cronUrl} onFocus={e => e.currentTarget.select()} aria-label="Scheduler address" className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono bg-white" />
        <button onClick={() => copyWithToast(cronUrl, 'Address copied')} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-white text-sm" aria-label="Copy the scheduler address"><Copy size={14} /></button>
      </div>
      <p className="mt-1 text-xs text-gray-400">This address contains a secret key. Do not share it.</p>
    </div>
  );

  return (
    <Page width="narrow">
    <div className="space-y-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900"><TrendingUp size={22} className="text-rose-600" /> Rates Desk</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live NCDEX rates for Jeera and Dhaniya, ready to send to your clients. {nextSlotText()}.</p>
        </div>
        <button onClick={checkNow} className="shrink-0 p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" aria-label="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {fatal && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3">{fatal}</div>}

      {/* ---- is everything working? */}
      <HealthPanel health={health} thisDevice={subscribed} pushSupported={support.supported} busy={busy} checkedAt={checkedAt} onFix={applyFix} onTurnOn={toggleNotifications} onCheck={checkNow} />

      {/* ---- latest update */}
      <Card
        title={selected ? (selected.title || `${slotName(selected)} update`) : 'Latest update'}
        icon={<Send size={16} className="text-green-600" />}
        right={selected ? statusChip(selected) : undefined}
      >
        {!selected && <p className="text-sm text-gray-500">No update yet today. It appears here by itself when the numbers arrive.</p>}

        {selected && selected.status === 'ready' && selected.text && (
          <>
            <div className="text-xs text-gray-500 mb-2 flex flex-wrap gap-x-3 gap-y-1">
              <span>{slotName(selected)} · {dayIst(selected.createdAtMs)} {timeIst(selected.createdAtMs)}</span>
              <span>Source: {selected.source === 'ncdex' ? 'NCDEX board' : selected.source === 'browser' ? 'NCDEX board (sent from your browser)' : selected.source === 'feed' ? 'Grok feed' : selected.source === 'paste' ? 'pasted board' : 'typed by hand'}{selected.arrivedLate ? ' (arrived late, after the alert)' : ''}</span>
              {selected.boardTime && <span>Board time: {selected.boardTime}</span>}
              {selected.sent?.whatsapp && <span className="text-green-700">Opened in WhatsApp {timeIst(selected.sent.whatsapp)}</span>}
            </div>
            <div className="rounded-xl bg-[#e7f6d6] border border-[#cfe8b4] p-3 text-[13px] leading-relaxed text-gray-900 whitespace-pre-wrap break-words max-h-[28rem] overflow-y-auto">
              {selected.text}
            </div>
            {selected.warnings && selected.warnings.length > 0 && (
              <p className="mt-2 text-xs text-amber-700">Notes: {selected.warnings.join('; ')}</p>
            )}
            <MovementEditor key={`${selected.id}-${selected.movement?.mode}`} update={selected} busy={busy === 'move'} onApply={applyMovement} />
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button onClick={() => sendWhatsApp(selected)} className="col-span-2 sm:col-span-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold">
                <Send size={16} /> Send on WhatsApp
              </button>
              <button onClick={() => navigate('/messages?tab=broadcast', { state: { rateMessage: selected.text } })} className="col-span-2 sm:col-span-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-green-600 text-green-700 hover:bg-green-50 text-sm font-semibold">
                Send to my client lists
              </button>
              <button onClick={() => copyWithToast(selected.text!)} className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm">
                <Copy size={15} /> Copy
              </button>
              {typeof navigator.share === 'function' && (
                <button onClick={() => navigator.share({ text: selected.text! }).catch(() => undefined)} className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm">
                  <Share2 size={15} /> Share
                </button>
              )}
            </div>
          </>
        )}

        {selected && selected.status !== 'ready' && (
          <div className={`rounded-xl border p-3 text-sm ${selected.status === 'skipped' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            <p className="font-medium">{slotName(selected)} update: {selected.status === 'skipped' ? 'skipped' : 'could not be made automatically'} <span className="font-normal text-xs opacity-75">({viaOf(selected)})</span></p>
            <p className="mt-1">{selected.reason || 'No reason recorded.'}</p>
            {selected.status === 'failed' && source !== 'server' && (
              <p className="mt-1 text-xs">If {sourceWord} sends the numbers later, this card turns into the message by itself. Nothing to press.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {source === 'server'
                ? <button onClick={() => { setSlot(selected.slot); fetchNow(selected.slot); }} className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-800 text-sm">Try again</button>
                : <button onClick={checkNow} className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-800 text-sm">Check again</button>}
              <button onClick={() => { setSlot(selected.slot); setBackupOpen(true); setTab('paste'); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }} className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-800 text-sm">Paste the board</button>
              <button onClick={() => { setSlot(selected.slot); setBackupOpen(true); setTab('type'); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }} className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-800 text-sm">Type the numbers</button>
            </div>
          </div>
        )}
      </Card>

      {/* ---- the method: one at a time */}
      {status && cfg && (
        <Card title="How the rates arrive" icon={<Zap size={16} className="text-rose-600" />} right={<Chip tone="blue">One method at a time</Chip>}>
          <p className="text-sm text-gray-600 mb-3">Choose one. Only its steps are shown below, and the app only watches that one.</p>
          <MethodPicker value={source} busy={busy === 'source'} onChange={chooseSource} />

          {/* ---- Grok feed */}
          {source === 'feed' && (
            <div className="mt-4 space-y-3 text-sm" data-testid="method-feed">
              <p className="text-gray-600">Grok reads the NCDEX board in its own browser and opens a private address of this app with the numbers. The app checks that they add up, builds the message and notifies your devices. Late numbers are accepted too.</p>
              <ol className="list-decimal ml-5 text-gray-700 space-y-1">
                <li>Press <b>Show the Grok instructions</b>, then <b>Copy the instructions</b>.</li>
                <li>Open your Grok automation, delete everything in its prompt, paste these instructions and save.</li>
                <li>Press <b>Copy the 10-second Grok test</b>, paste it into a normal Grok chat. Grok must answer <i>OK: the feed address works…</i>. Then look at <b>Activity</b> below: an "Address check" line proves Grok reached the app.</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowGrok(v => !v)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold">{showGrok ? 'Hide the Grok instructions' : 'Show the Grok instructions'}</button>
                <button onClick={() => copyWithToast(grokTest(feedUrl), 'Test copied. Paste it into a Grok chat.')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"><Copy size={14} /> Copy the 10-second Grok test</button>
                <button onClick={checkFeed} disabled={busy === 'feedcheck'} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-50">{busy === 'feedcheck' && <Loader2 size={14} className="animate-spin" />} Check that the address works</button>
              </div>
              {showGrok && (
                <div>
                  <p className="text-xs text-gray-600 mb-1.5">This replaces the whole prompt of your Grok automation (the hourly schedule stays as it is). Grok skips the hours that are not update times.</p>
                  <textarea readOnly value={grokInstructions(feedUrl, keys)} rows={15} onFocus={e => e.currentTarget.select()} aria-label="Instructions for Grok" className="w-full p-3 border border-gray-300 rounded-xl text-xs font-mono bg-gray-50" />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => copyWithToast(grokInstructions(feedUrl, keys), 'Instructions copied. Paste them into Grok.')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium"><Copy size={14} /> Copy the instructions</button>
                    <button onClick={() => copyWithToast(feedUrl, 'Address copied')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"><Copy size={14} /> Copy only the address</button>
                    <button onClick={newFeedKey} disabled={busy === 'feedkey'} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-50">Make a new key</button>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">The address contains a secret key that can only send rates, nothing else. Do not share it. After "Make a new key" the instructions in Grok must be replaced again.</p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span>Alert me if nothing has arrived</span>
                <input type="number" min={3} max={30} value={cfg.feedWaitMin ?? 10} onChange={e => setCfg({ ...cfg, feedWaitMin: Number(e.target.value) })} className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg" aria-label="Minutes to wait for the feed" />
                <span>minutes after the update time</span>
                <button onClick={saveConfig} disabled={busy === 'cfg'} className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium disabled:opacity-50">Save</button>
              </div>
            </div>
          )}

          {/* ---- own browser */}
          {source === 'browser' && (
            <div className="mt-4 space-y-3 text-sm" data-testid="method-browser">
              <p className="text-gray-600">Your own browser passes NCDEX's "checking your browser" page, so you send the board from there with one click. The app then makes the message and notifies your devices.</p>
              <ol className="list-decimal ml-5 text-xs text-gray-700 space-y-1">
                <li>Press <b>Copy the bookmark</b>. In Brave or Chrome open Bookmarks &gt; Add bookmark, name it <i>Send rates</i> and paste into the address box.</li>
                <li>At each update time open the NCDEX Live Quotes page, check it shows today's time, and click that bookmark. A message tells you if the update is ready.</li>
                <li>iPhone: the same address is used by a Share-sheet Shortcut (steps are in the guide).</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => copyWithToast(bookmarklet, 'Bookmark copied. Paste it as the address of a new bookmark.')} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium"><Copy size={14} /> Copy the bookmark</button>
                <button onClick={() => copyWithToast(sendUrl, 'Address copied')} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-white text-sm"><Copy size={14} /> Copy the address</button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span>Alert me if nothing has been sent</span>
                <input type="number" min={3} max={30} value={cfg.feedWaitMin ?? 10} onChange={e => setCfg({ ...cfg, feedWaitMin: Number(e.target.value) })} className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg" aria-label="Minutes to wait for the browser" />
                <span>minutes after the update time</span>
                <button onClick={saveConfig} disabled={busy === 'cfg'} className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium disabled:opacity-50">Save</button>
              </div>
            </div>
          )}

          {/* ---- server reads NCDEX */}
          {source === 'server' && (
            <div className="mt-4 space-y-3 text-sm" data-testid="method-server">
              <p className="text-gray-600">The app's server opens the NCDEX page itself. NCDEX shows servers a "checking your browser" page, so this usually does not work. If it fails, switch to the Grok feed above.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => fetchNow()} disabled={busy === 'fetch'} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-60">
                  {busy === 'fetch' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Fetch from NCDEX now
                </button>
                <button onClick={diagnose} disabled={busy === 'diag'} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-50">
                  {busy === 'diag' && <Loader2 size={14} className="animate-spin" />} Check the NCDEX connection
                </button>
              </div>
              {fetchProblem && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm p-3">
                  <p className="font-medium">The server could not get live rates.</p>
                  <p className="mt-0.5">{fetchProblem}</p>
                  <p className="mt-1">No problem: open the NCDEX Live Quotes page on your phone or computer, copy the table, and paste it in the box further down (it has opened for you). Or type the numbers.</p>
                </div>
              )}
              {diag && <DiagView diag={diag} />}
            </div>
          )}

          {schedulerBox}
          {status.telegram && <p className="mt-2 text-xs text-green-700">Telegram posting is on: each update is also posted to your Telegram chat.</p>}
        </Card>
      )}

      {/* ---- what happened */}
      <Card title="Activity" icon={<ActivityIcon size={16} className="text-rose-600" />}
        right={<button onClick={checkNow} disabled={busy === 'check'} className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs disabled:opacity-50">Check now</button>}>
        <p className="text-xs text-gray-500 mb-2">Every call from Grok, the scheduler or your browser, and every notification, newest first. It shows the time, who it was and what happened. Tap "Show what was received" to see the numbers Grok sent.</p>
        <ActivityList log={log} />
      </Card>

      {/* ---- notifications */}
      <Card title="Notifications on this device" icon={subscribed ? <Bell size={16} className="text-rose-600" /> : <BellOff size={16} className="text-gray-400" />}
        right={status ? <Chip tone={status.subscribers ? 'green' : 'gray'}>{status.subscribers} device{status.subscribers === 1 ? '' : 's'}</Chip> : undefined}>
        <p className="text-sm text-gray-600">You get a notification when an update is ready, and when one did not arrive in time. Tap it and the message opens, ready to send.</p>
        {!support.supported && <p className="mt-2 text-sm rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-2.5">{support.reason}</p>}
        {!subscribed && support.supported && !!(navigator as unknown as { brave?: unknown }).brave && (
          <p className="mt-2 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-2.5">Brave only delivers notifications when this is switched on: Brave Settings &gt; Privacy and security &gt; <b>Use Google services for push messaging</b>. Switch it on, restart Brave, then press Turn on notifications.</p>
        )}
        {status?.devices && status.devices.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-700">Devices that get a notification for every update</p>
            <ul className="mt-1.5 divide-y divide-gray-100 rounded-xl border border-gray-200">
              {status.devices.map((d, i) => (
                <li key={d.id || i} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-gray-900">{d.label || 'Device'}</span>
                    {d.host ? <span className="text-gray-500"> · {d.host}</span> : null}
                    {d.createdAtMs ? <span className="block text-xs text-gray-400">added {new Date(d.createdAtMs).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}</span> : null}
                  </span>
                  {d.id && d.id === thisId && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">This device</span>}
                  {d.id && <button onClick={() => removeDevice(d.id!)} disabled={busy === 'device'} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50">Remove</button>}
                </li>
              ))}
            </ul>
            {status.devices.length > 1 && <p className="mt-1.5 text-xs text-gray-500">Each entry rings separately. A phone that has both the Home Screen app and the browser turned on appears twice. Remove the one you do not use, and you get one notification per update on that phone.</p>}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={toggleNotifications} disabled={!support.supported || busy === 'push' || !status} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 ${subscribed ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}>
            {busy === 'push' && <Loader2 size={14} className="animate-spin" />}
            {subscribed ? 'Turn off on this device' : 'Turn on notifications'}
          </button>
          <button onClick={testPush} disabled={busy === 'test'} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-50">Send a test notification</button>
        </div>
        {testNote && <p className="mt-2 text-xs text-gray-600">Test result: {testNote}</p>}
      </Card>

      {/* ---- backup: by hand */}
      <div ref={formRef} />
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <button onClick={() => setBackupOpen(v => !v)} aria-expanded={backupOpen} className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-800"><Wifi size={16} className="text-rose-600" /> If an update is missing: enter it by hand</span>
          {backupOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>
        {backupOpen && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5">
            <p className="text-sm text-gray-600 mb-3">The way to send an update when nothing arrived: paste the NCDEX page text, or type the numbers. The same checks apply.</p>
            <select value={slot} onChange={e => setSlot(e.target.value)} aria-label="Which update is this for" className="w-full sm:w-auto px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white">
              <option value="auto">For the current time (automatic)</option>
              {SLOTS.map(h => <option key={h} value={String(h)}>{hourLabel(h)} update</option>)}
              <option value="adhoc">Extra update (not a scheduled one)</option>
            </select>

            <div className="mt-4 flex gap-2 text-sm">
              <button onClick={() => setTab(tab === 'paste' ? 'none' : 'paste')} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border ${tab === 'paste' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                <Clipboard size={14} /> Paste board text
              </button>
              <button onClick={() => setTab(tab === 'type' ? 'none' : 'type')} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border ${tab === 'type' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                <Pencil size={14} /> Type the numbers
              </button>
            </div>

            {tab === 'paste' && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1.5">Open ncdex.com &gt; Market Watch &gt; Live Quotes, select the table (or the whole page) and copy it. Paste it here.</p>
                <button onClick={pasteFromClipboard} disabled={busy === 'paste'} className="mb-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium disabled:opacity-50">
                  {busy === 'paste' ? <Loader2 size={14} className="animate-spin" /> : <Clipboard size={14} />} Paste from clipboard and read
                </button>
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={6} placeholder="Or paste the NCDEX Live Quotes text here..." className="w-full p-3 border border-gray-300 rounded-xl text-xs font-mono" />
                <button onClick={readPaste} disabled={!pasteText.trim() || busy === 'paste'} className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-800 text-sm font-medium disabled:opacity-50">
                  {busy === 'paste' && <Loader2 size={14} className="animate-spin" />} Read the pasted text
                </button>
              </div>
            )}

            {tab === 'type' && (
              <div className="mt-3 space-y-3">
                {pasteInfo && <div className="rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs p-2.5">{pasteInfo}</div>}
                {keys.map(k => {
                  const r = row(k);
                  const l = numOf(r.ltp), p = numOf(r.prevClose);
                  const ch = r.change !== undefined ? r.change : l !== null && p !== null ? Math.round((l - p) * 100) / 100 : null;
                  const pct = r.changePct !== undefined ? r.changePct : ch !== null && p ? Math.round((ch / p) * 10000) / 100 : null;
                  return (
                    <div key={k} className="rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <b className="text-sm text-gray-800">{NAMES[k]}</b>
                        {ch !== null && <span className={`text-xs font-medium ${ch > 0 ? 'text-green-700' : ch < 0 ? 'text-red-700' : 'text-gray-500'}`}>{signed(ch)}{pct !== null ? ` (${pct}%)` : ''}</span>}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <Field label="Expiry month" value={r.expiryLabel} onChange={v => setRow(k, { expiryLabel: v })} placeholder="Oct" />
                        <Field label="Last price (LTP)" value={r.ltp} onChange={v => setRow(k, { ltp: v, change: undefined, changePct: undefined })} inputMode="decimal" />
                        <Field label="Previous close" value={r.prevClose} onChange={v => setRow(k, { prevClose: v, change: undefined, changePct: undefined })} inputMode="decimal" />
                        <Field label="Open (optional)" value={r.open} onChange={v => setRow(k, { open: v })} inputMode="decimal" />
                        <Field label="OI (optional)" value={r.oi} onChange={v => setRow(k, { oi: v })} inputMode="numeric" />
                      </div>
                    </div>
                  );
                })}
                <button onClick={prepareFromForm} disabled={busy === 'commit'} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-60">
                  {busy === 'commit' && <Loader2 size={14} className="animate-spin" />} Prepare message
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---- history */}
      <Card title="Recent updates" icon={<History size={16} className="text-rose-600" />}>
        {updates.length === 0 && <p className="text-sm text-gray-500">Nothing yet.</p>}
        <p className="text-xs text-gray-500 mb-1">Every update the app has made or tried is saved in your database, so you can open an earlier one at any time.</p>
        <ul className="divide-y divide-gray-100">
          {updates.slice(0, 20).map(u => (
            <li key={u.id}>
              <button onClick={() => { setSelectedId(u.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`w-full text-left py-2.5 flex items-center justify-between gap-3 ${selected?.id === u.id ? 'bg-rose-50/50 -mx-2 px-2 rounded-lg' : ''}`}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{dayIst(u.createdAtMs)} · {slotName(u)} <span className="text-xs font-normal text-gray-400">· {viaOf(u)}{u.arrivedLate ? ' · late' : ''}</span></p>
                  <p className="text-xs text-gray-500 truncate">{u.summary || u.reason || ''}</p>
                </div>
                {statusChip(u)}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* ---- settings */}
      {cfg && (
        <Card title="Message settings" icon={<Settings2 size={16} className="text-rose-600" />}>
          <div className="space-y-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.includeTurmeric} onChange={e => setCfg({ ...cfg, includeTurmeric: e.target.checked })} /> Include Turmeric in the message</label>
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={cfg.showMovement !== false} onChange={e => setCfg({ ...cfg, showMovement: e.target.checked })} /> <span>Include the "Movement Since Previous Update" section in new messages (you can still edit or hide it on each update)</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.requireBoardTime !== false} onChange={e => setCfg({ ...cfg, requireBoardTime: e.target.checked })} /> Only send when the NCDEX board shows today's time (recommended)</label>
            <div className="flex items-center gap-2">
              <span>Board may be at most</span>
              <input type="number" min={5} max={240} value={cfg.maxBoardAgeMin} onChange={e => setCfg({ ...cfg, maxBoardAgeMin: Number(e.target.value) })} className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg" />
              <span>minutes old</span>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone numbers shown at the bottom of the message</label>
              <input value={cfg.company.phones} onChange={e => setCfg({ ...cfg, company: { ...cfg.company, phones: e.target.value } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <button onClick={saveConfig} disabled={busy === 'cfg'} className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium disabled:opacity-50">Save settings</button>
          </div>
        </Card>
      )}
    </div>
    </Page>
  );
}

function Field({ label, value, onChange, placeholder, inputMode }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; inputMode?: 'decimal' | 'numeric' | 'text' }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-gray-500 mb-0.5">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm" />
    </label>
  );
}

function DiagView({ diag }: { diag: any }) {
  const d = diag.diag;
  const copy = () => copyWithToast(JSON.stringify(diag, null, 2), 'Details copied. You can send them to your developer.');
  return (
    <div className="mt-3 rounded-xl border border-gray-200 text-xs">
      <div className={`px-3 py-2 rounded-t-xl font-medium ${diag.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
        {diag.ok ? 'Connected: the server can read the live board.' : `Not working: ${diag.reason || 'unknown'}`}
      </div>
      <div className="p-3 space-y-1 text-gray-700">
        {(diag.log || []).map((l: any, i: number) => (
          <div key={i}>
            <p>Try {i + 1}: {l.error ? l.error : `HTTP ${l.status}, ${l.bytes ?? 0} bytes`}{l.ms ? `, ${l.ms} ms` : ''}</p>
            {l.note && <p className="text-amber-800">{l.note}</p>}
            {l.head && <p className="text-gray-500 break-words">What the server saw: {String(l.head).slice(0, 220)}{String(l.head).length > 220 ? '...' : ''}</p>}
          </div>
        ))}
        {diag.region && <p className="text-gray-500">Server location: {diag.region}</p>}
        {d && (
          <>
            <p>Board time: {d.boardTime || 'not found'}{d.ageMin != null ? ` (${d.ageMin} min old)` : ''}</p>
            <p>Commodities read: {d.found && d.found.length ? d.found.join(', ') : 'none'}</p>
            {d.errors && d.errors.length > 0 && <p className="text-red-700">Problems: {d.errors.join('; ')}</p>}
          </>
        )}
        <button onClick={copy} className="mt-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">Copy details</button>
      </div>
    </div>
  );
}

const rupee = (v: number) => (v > 0 ? `+₹${inr(v)}` : v < 0 ? `−₹${inr(Math.abs(v))}` : '₹0');

/** Movement since the previous update: worked out by the app, but the owner can change the numbers, hide it, or go back. */
function MovementEditor({ update, busy, onApply }: {
  update: RateUpdate; busy: boolean;
  onApply: (mode: 'auto' | 'manual' | 'off', values?: Record<string, number>, label?: string) => Promise<boolean>;
}) {
  const keys = (update.keys && update.keys.length ? update.keys : (update.text || '').includes('*Turmeric ') ? ['jeera', 'dhaniya', 'turmeric'] : ['jeera', 'dhaniya']) as CommodityKey[];
  const m = update.movement;
  const auto = update.movementAuto || update.movement;
  const hidden = m?.mode === 'off';
  const manual = m?.mode === 'manual';
  const start = (m && m.mode !== 'off' && m.values ? m : auto) || undefined;
  const [open, setOpen] = useState(false);
  const [dir, setDir] = useState<Record<string, 'up' | 'down'>>({});
  const [amt, setAmt] = useState<Record<string, string>>({});

  const begin = () => {
    const d: Record<string, 'up' | 'down'> = {}; const a: Record<string, string> = {};
    for (const k of keys) { const v = start?.values?.[k] ?? 0; d[k] = v < 0 ? 'down' : 'up'; a[k] = String(Math.abs(v)); }
    setDir(d); setAmt(a); setOpen(true);
  };
  const save = async () => {
    const values: Record<string, number> = {};
    for (const k of keys) {
      const n = Number(String(amt[k] ?? '').replace(/[,\s₹]/g, ''));
      if (!Number.isFinite(n) || String(amt[k] ?? '').trim() === '') { toast.error(`${NAMES[k]}: type the amount in rupees (for example 40).`); return; }
      values[k] = (dir[k] === 'down' ? -1 : 1) * Math.abs(n);
    }
    if (await onApply('manual', values)) setOpen(false);
  };

  const line = keys.map(k => `${NAMES[k]} ${m?.values?.[k] != null ? rupee(m.values[k]) : '—'}`).join(' · ');
  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3 text-sm">
      <p className="font-medium text-gray-800">Movement since previous update</p>
      {hidden && <p className="text-xs text-gray-500">Hidden: this message does not include the movement section.</p>}
      {!hidden && m?.mode === 'unavailable' && <p className="text-xs text-amber-700">Could not be worked out (no earlier reading). You can type it.</p>}
      {!hidden && m?.mode !== 'unavailable' && <p className="text-xs text-gray-600">{manual ? 'Typed by you' : `Worked out automatically (compared with ${m?.label}; this is not written in the message)`}: {line}</p>}

      {!open && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={begin} disabled={busy} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium disabled:opacity-50">Edit the numbers</button>
          {hidden
            ? <button onClick={() => onApply('auto')} disabled={busy} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium disabled:opacity-50">Show it again</button>
            : <button onClick={() => onApply('off')} disabled={busy} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium disabled:opacity-50">Leave it out of the message</button>}
          {(manual || (hidden && update.movementEdited)) && !hidden && <button onClick={() => onApply('auto')} disabled={busy} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium disabled:opacity-50">Back to automatic</button>}
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-3">
          {keys.map(k => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-20 text-sm text-gray-800">{NAMES[k]}</span>
              <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden text-xs">
                <button type="button" onClick={() => setDir(d => ({ ...d, [k]: 'up' }))} className={`px-3 py-2 ${dir[k] === 'up' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'}`}>▲ Up</button>
                <button type="button" onClick={() => setDir(d => ({ ...d, [k]: 'down' }))} className={`px-3 py-2 ${dir[k] === 'down' ? 'bg-red-600 text-white' : 'bg-white text-gray-700'}`}>▼ Down</button>
              </div>
              <span className="text-gray-500">₹</span>
              <input value={amt[k] ?? ''} onChange={e => setAmt(a => ({ ...a, [k]: e.target.value }))} inputMode="numeric" aria-label={`${NAMES[k]} movement in rupees`} className="w-24 px-2 py-2 border border-gray-300 rounded-lg" />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />} Save movement</button>
            <button onClick={() => setOpen(false)} disabled={busy} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm">Cancel</button>
            <button onClick={async () => { if (await onApply('auto')) setOpen(false); }} disabled={busy} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm">Use the automatic numbers</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SetupNeeded({ message, missing, onRetry }: { message: string; missing?: string[]; onRetry: () => void }) {
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
        <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900"><AlertTriangle className="text-amber-500" size={20} /> One-time setup needed</h1>
        <p className="mt-2 text-sm text-gray-700">{message}</p>
        {missing && missing.length > 0 && <p className="mt-2 text-sm text-gray-700">Missing setting: <code className="px-1.5 py-0.5 bg-gray-100 rounded">{missing.join(', ')}</code></p>}
        <ol className="mt-3 text-sm text-gray-700 list-decimal ml-5 space-y-1.5">
          <li>Open your Firebase project &gt; Project settings &gt; Service accounts &gt; <b>Generate new private key</b>. A file is downloaded.</li>
          <li>Open the file with Notepad and copy everything inside it.</li>
          <li>Open Vercel &gt; your project &gt; Settings &gt; Environment Variables. Add a variable named <code className="px-1 bg-gray-100 rounded">FIREBASE_SERVICE_ACCOUNT</code> and paste the text as its value. Save.</li>
          <li>In Vercel open Deployments, press the three dots on the latest one and choose <b>Redeploy</b>.</li>
        </ol>
        <p className="mt-3 text-xs text-gray-500">The full guide with pictures-in-words is in RATES_DESK_GUIDE.md.</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium">I have done this, check again</button>
      </div>
    </div>
  );
}

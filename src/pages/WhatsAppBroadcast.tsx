// src/pages/WhatsAppBroadcast.tsx
// Send one message to many clients using only the normal WhatsApp (no Business account, no API).
//
//   One by one   : opens each client's chat with the message typed; when you come back from WhatsApp the app
//                  ticks that client and is ready for the next one (the fastest "click, send, back" loop).
//   Broadcast list: sets up a real WhatsApp broadcast list (contacts file, steps) so every update is ONE paste.
//   Channel      : a free one-way WhatsApp Channel; clients follow once, you post once.
//
// Lists, members and "sent" ticks are kept in the same Firebase collection as before (whatsapp_lists).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Send, Copy, Share2, Download, Undo2, SkipForward, Users, Megaphone, Rss, Trash2, Pencil, Check, CheckCircle2,
  AlertTriangle, Info, RefreshCw, Plus, ExternalLink, ListChecks, Bookmark, History as HistoryIcon, Zap, Smartphone, UserPlus,
} from 'lucide-react';
import { db } from '../utils/firebase';
import { useAppStore } from '../hooks/useAuthStore';
import { Page } from '../ui';
import { ratesCall, type RateUpdate } from '../rates/api';
import {
  partyPhones, personalize, generic, usesFields, istStamp, messageKey, buildVcf, chunk, fileSafe, type PartyPhones,
} from '../broadcast/phone';
import { kvLoad, kvSave, localGet, localSet, localDel } from '../broadcast/storage';
import { isBcId, newBcId, type BcContact } from '../broadcast/contacts';
import ContactSheet, { type SaveResult } from '../broadcast/ContactSheet';

interface Party {
  id: string;
  name: string;
  phone?: string;
  mobile?: string;
  type?: string;
  partyType?: string;
  contactPerson?: string;
  city?: string;
  alternatePhones?: string[];
  otherContacts?: { phone?: string }[];
  isSent?: boolean;
}

interface ContactList {
  id: string;
  name: string;
  memberIds: string[];
  sentStatuses: Record<string, boolean>;
  lastResetDate: string;
  /** which message the ticks belong to (a new message starts with no ticks) */
  sentKey?: string;
}

type Member = Party & { ph: PartyPhones };
type Mode = 'queue' | 'list' | 'channel';

interface Template { id: string; title: string; text: string }
interface HistoryItem { id: string; at: number; listName: string; mode: Mode; sent: number; total: number; preview: string }
interface Prefs { mode: Mode; channelLink: string; cardName: string; cardPhone: string }

const DEFAULT_PREFS: Prefs = { mode: 'queue', channelLink: '', cardName: '', cardPhone: '' };
const MODE_NAME: Record<Mode, string> = { queue: 'One by one', list: 'Broadcast list', channel: 'Channel' };
const LIST_LIMIT = 256; // WhatsApp's limit for one broadcast list

const isMobileDevice = () => /android|iPad|iPhone|iPod/i.test(navigator.userAgent || '');
const typeOf = (p: Party) => String(p.type || p.partyType || 'party').toLowerCase();
const firstLine = (s: string) => s.split('\n').map(x => x.replace(/[*_~]/g, '').trim()).find(Boolean) || '';
const when = (ms: number) => new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
const todayIst = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

function chatUrl(digits: string, text: string): string {
  const t = encodeURIComponent(text);
  return isMobileDevice() ? `whatsapp://send?phone=${digits}&text=${t}` : `https://web.whatsapp.com/send?phone=${digits}&text=${t}`;
}

function openWhatsApp(url: string) {
  if (isMobileDevice()) window.location.href = url;
  else window.open(url, 'mac_whatsapp'); // the same tab every time, so tabs do not pile up
}

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }
}

function downloadFile(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const WaIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

export default function WhatsAppBroadcast() {
  const settings = useAppStore(s => s.settings);
  const [activeTab, setActiveTab] = useState<'broadcast' | 'manage'>('broadcast');

  const [directory, setDirectory] = useState<Party[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const listsRef = useRef<ContactList[]>([]);
  useEffect(() => { listsRef.current = lists; }, [lists]);

  const [selectedListId, setSelectedListId] = useState<string>(() => localGet('list', ''));
  const [editingListId, setEditingListId] = useState<string>('');
  const [message, setMessage] = useState<string>(() => localGet('draft', ''));
  const [newListName, setNewListName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [prefs, setPrefs] = useState<Prefs>(() => ({ ...DEFAULT_PREFS, mode: localGet<Mode>('mode', 'queue') }));
  const [templates, setTemplates] = useState<Template[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesNote, setRatesNote] = useState('');

  const [broadcastSearch, setBroadcastSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [skipped, setSkipped] = useState<string[]>([]);
  const [lastDone, setLastDone] = useState<{ listId: string; partyId: string; key: string; name: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [manageSearch, setManageSearch] = useState('');
  const [contacts, setContacts] = useState<BcContact[]>([]);          // people added for broadcasts only
  const [contactSheet, setContactSheet] = useState<null | { listId: string; edit?: BcContact }>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'buyer' | 'seller' | 'both' | 'broadcast'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in' | 'out' | 'nonumber'>('all');
  const [renamingId, setRenamingId] = useState('');
  const [renameValue, setRenameValue] = useState('');

  // the Rates Desk can hand over a ready rate message ("Send to my client lists")
  const location = useLocation();
  useEffect(() => {
    const m = (location.state as { rateMessage?: string } | null)?.rateMessage;
    if (typeof m === 'string' && m) setMessage(m);
  }, [location.state]);

  // a half-written message must survive the phone switching to WhatsApp and back
  useEffect(() => { localSet('draft', message); }, [message]);
  useEffect(() => { localSet('list', selectedListId); }, [selectedListId]);

  const updatePrefs = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    if (patch.mode) localSet('mode', patch.mode);
    void kvSave('prefs', next);
  };

  // ---------------------------------------------------------------- data
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'parties'));
        const fetchedParties = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Party[];
        fetchedParties.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        setDirectory(fetchedParties);

        const listsSnapshot = await getDocs(collection(db, 'whatsapp_lists'));
        const fetchedLists = listsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ContactList[];
        const currentDate = new Date().toDateString();

        const processedLists = await Promise.all(fetchedLists.map(async (list) => {
          const base: ContactList = { ...list, memberIds: list.memberIds || [], sentStatuses: list.sentStatuses || {} };
          if (list.lastResetDate !== currentDate) {
            const updated = { ...base, sentStatuses: {}, lastResetDate: currentDate, sentKey: '' };
            try { await updateDoc(doc(db, 'whatsapp_lists', list.id), { sentStatuses: {}, lastResetDate: currentDate, sentKey: '' }); } catch (e) { console.error(e); }
            return updated;
          }
          return base;
        }));
        setLists(processedLists);
        listsRef.current = processedLists;
        setSelectedListId(cur => (cur && processedLists.some(l => l.id === cur) ? cur : processedLists[0]?.id || ''));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
      const [p, t, h, c] = await Promise.all([kvLoad<Prefs>('prefs', DEFAULT_PREFS), kvLoad<Template[]>('templates', []), kvLoad<HistoryItem[]>('history', []), kvLoad<BcContact[]>('contacts', [])]);
      setPrefs(cur => ({ ...DEFAULT_PREFS, ...p, mode: localGet<Mode>('mode', p.mode || cur.mode) }));
      setTemplates(Array.isArray(t) ? t : []);
      setHistory(Array.isArray(h) ? h : []);
      setContacts(Array.isArray(c) ? c.filter(x => x && x.id && x.name) : []);
    };
    void initializeData();
  }, []);

  const phonesById = useMemo(() => {
    const m = new Map<string, Member>();
    for (const p of directory) m.set(p.id, { ...p, ph: partyPhones(p) });
    // people added just for broadcasts sit beside the parties
    for (const c of contacts) { const p: Party = { id: c.id, name: c.name, phone: c.phone, city: c.city, type: 'broadcast' }; m.set(c.id, { ...p, ph: partyPhones(p) }); }
    return m;
  }, [directory, contacts]);

  // every number we already have: digits -> who
  const knownNumbers = useMemo(() => {
    const k = new Map<string, { id: string; name: string }>();
    for (const m of phonesById.values()) for (const n of m.ph.all) if (!k.has(n.digits)) k.set(n.digits, { id: m.id, name: m.name });
    return k;
  }, [phonesById]);

  // numbers that appear on more than one party (usually a double entry)
  const duplicates = useMemo(() => {
    const seen = new Map<string, number>();
    for (const m of phonesById.values()) if (m.ph.best) seen.set(m.ph.best.digits, (seen.get(m.ph.best.digits) || 0) + 1);
    return new Set([...seen].filter(([, n]) => n > 1).map(([d]) => d));
  }, [phonesById]);

  const activeList = lists.find(l => l.id === selectedListId);
  const editingList = lists.find(l => l.id === editingListId);
  const msgKey = useMemo(() => messageKey(message), [message]);

  const members: Member[] = useMemo(() => {
    if (!activeList) return [];
    return activeList.memberIds.map(id => phonesById.get(id)).filter((m): m is Member => !!m);
  }, [activeList, phonesById]);

  // ticks belong to the message they were made for: a new message starts clean
  const ticksMatch = !!activeList && (!activeList.sentKey || activeList.sentKey === msgKey);
  const sent: Record<string, boolean> = ticksMatch && activeList ? activeList.sentStatuses : {};
  const ticksFromOtherMessage = !!activeList && !!msgKey && !!activeList.sentKey && activeList.sentKey !== msgKey && Object.values(activeList.sentStatuses).some(Boolean);

  const ready = members.filter(m => m.ph.best);
  const noNumber = members.length - ready.length;
  const doneCount = ready.filter(m => sent[m.id]).length;

  const queue = useMemo(() => {
    const todo = ready.filter(m => !sent[m.id]);
    return [...todo.filter(m => !skipped.includes(m.id)), ...todo.filter(m => skipped.includes(m.id))];
  }, [ready, sent, skipped]);
  const current = queue[0];

  // ---------------------------------------------------------------- ticks
  const setSent = useCallback(async (listId: string, partyId: string, value: boolean, key: string) => {
    const l = listsRef.current.find(x => x.id === listId);
    if (!l) return;
    const base = !l.sentKey || l.sentKey === key ? l.sentStatuses : {};
    const next = { ...base, [partyId]: value };
    const updated = listsRef.current.map(x => (x.id === listId ? { ...x, sentStatuses: next, sentKey: key } : x));
    listsRef.current = updated;
    setLists(updated);
    try { await updateDoc(doc(db, 'whatsapp_lists', listId), { sentStatuses: next, sentKey: key }); } catch (e) { console.error('Error updating status:', e); }
  }, []);

  const nameOf = useCallback((id: string) => phonesById.get(id)?.name || 'client', [phonesById]);

  const confirmSent = useCallback(async (listId: string, partyId: string, key: string, note = '') => {
    await setSent(listId, partyId, true, key);
    setSkipped(s => s.filter(x => x !== partyId));
    setLastDone({ listId, partyId, key, name: nameOf(partyId) });
    if (note) toast(note, { icon: '✅' });
  }, [setSent, nameOf]);

  const undoLast = async () => {
    if (!lastDone) return;
    await setSent(lastDone.listId, lastDone.partyId, false, lastDone.key);
    toast(`${lastDone.name} is back in the queue`);
    setLastDone(null);
  };

  // ---------------------------------------------------------------- sending one by one
  const pendingRef = useRef<{ listId: string; partyId: string; key: string; openedAt: number; hiddenAt: number | null } | null>(null);

  const mergeFor = (m: Member) => ({ name: (m.contactPerson || m.name || '').trim(), firm: (m.name || '').trim(), ...istStamp() });

  const openChat = (m: Member) => {
    if (!message.trim()) { toast.error('Type or load the message first.'); return; }
    if (!m.ph.best || !activeList) { toast.error('This client has no WhatsApp number.'); return; }
    pendingRef.current = { listId: activeList.id, partyId: m.id, key: msgKey, openedAt: Date.now(), hiddenAt: null };
    setLastDone(null);
    openWhatsApp(chatUrl(m.ph.best.digits, personalize(message, mergeFor(m))));
  };

  // when you come back from WhatsApp the client you just opened is ticked
  useEffect(() => {
    const away = () => {
      const p = pendingRef.current;
      if (!p || p.hiddenAt != null) return;
      if (Date.now() - p.openedAt > 3 * 60 * 1000) { pendingRef.current = null; return; } // WhatsApp never opened: forget it
      p.hiddenAt = Date.now();
      localSet('pending', { listId: p.listId, partyId: p.partyId, key: p.key, at: p.hiddenAt });
    };
    const back = () => {
      const p = pendingRef.current;
      if (!p || p.hiddenAt == null) return;
      const gone = Date.now() - p.hiddenAt;
      p.hiddenAt = null;
      localDel('pending');
      if (gone >= 1500) { pendingRef.current = null; void confirmSent(p.listId, p.partyId, p.key); }
    };
    const onVis = () => (document.visibilityState === 'hidden' ? away() : back());
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', away);
    window.addEventListener('focus', back);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', away);
      window.removeEventListener('focus', back);
    };
  }, [confirmSent]);

  // the phone may close this page while WhatsApp is open: when it opens again, finish the tick
  const restoredRef = useRef(false);
  useEffect(() => {
    if (isLoading || restoredRef.current) return;
    restoredRef.current = true;
    const p = localGet<{ listId: string; partyId: string; key: string; at: number } | null>('pending', null);
    if (!p) return;
    localDel('pending');
    if (Date.now() - p.at > 20 * 60 * 1000) return;
    if (!listsRef.current.some(l => l.id === p.listId)) return;
    void confirmSent(p.listId, p.partyId, p.key, 'Ticked the client you opened in WhatsApp. Press Undo if it was not sent.');
  }, [isLoading, confirmSent]);

  // desktop: Enter opens the next client
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || isMobileDevice() || activeTab !== 'broadcast' || prefs.mode !== 'queue' || !current) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName)) return;
      e.preventDefault();
      openChat(current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // "skip for now" belongs to one round: a new message or another list starts fresh
  useEffect(() => { setSkipped([]); }, [msgKey, selectedListId]);

  const skipCurrent = () => { if (current) setSkipped(s => [...s.filter(x => x !== current.id), current.id]); };

  const resetTicks = async () => {
    if (!activeList) return;
    if (!window.confirm(`Start "${activeList.name}" again from the first client?`)) return;
    const updated = listsRef.current.map(x => (x.id === activeList.id ? { ...x, sentStatuses: {}, sentKey: msgKey } : x));
    listsRef.current = updated; setLists(updated); setSkipped([]); setLastDone(null);
    try { await updateDoc(doc(db, 'whatsapp_lists', activeList.id), { sentStatuses: {}, sentKey: msgKey }); } catch (e) { console.error(e); }
  };

  // the message was edited after some clients were ticked: keep the ticks for the edited text
  const keepTicks = async () => {
    if (!activeList) return;
    const updated = listsRef.current.map(x => (x.id === activeList.id ? { ...x, sentKey: msgKey } : x));
    listsRef.current = updated; setLists(updated);
    try { await updateDoc(doc(db, 'whatsapp_lists', activeList.id), { sentKey: msgKey }); } catch (e) { console.error(e); }
  };

  // ---------------------------------------------------------------- history
  const logHistory = useCallback((item: Omit<HistoryItem, 'id' | 'at'>) => {
    const entry: HistoryItem = { ...item, id: `${Date.now()}`, at: Date.now() };
    setHistory(h => { const next = [entry, ...h].slice(0, 40); void kvSave('history', next); return next; });
  }, []);

  // a finished round of one-by-one is written down once
  useEffect(() => {
    if (!activeList || !ready.length || doneCount !== ready.length || !msgKey || activeList.sentKey !== msgKey) return;
    const tag = `${activeList.id}|${msgKey}`;
    const logged = localGet<string[]>('logged', []);
    if (logged.includes(tag)) return;
    localSet('logged', [tag, ...logged].slice(0, 60));
    logHistory({ listName: activeList.name, mode: 'queue', sent: doneCount, total: ready.length, preview: firstLine(message) });
  }, [activeList, ready.length, doneCount, msgKey, message, logHistory]);

  // ---------------------------------------------------------------- message helpers
  const loadLatestRates = async () => {
    setLoadingRates(true);
    try {
      const r = await ratesCall<{ updates: RateUpdate[] }>('list', { limit: 12 });
      const u = (r.updates || []).find(x => x.status === 'ready' && x.text);
      if (!u) { toast.error('No ready rates message yet. Open the Rates Desk.'); return; }
      setMessage(u.text || '');
      const label = u.slotHour != null ? `${u.slotHour % 12 || 12} ${u.slotHour >= 12 ? 'PM' : 'AM'} update` : 'latest update';
      const old = u.date !== todayIst();
      setRatesNote(`Loaded the ${label}${u.boardTime ? ` (board time ${u.boardTime})` : ''}${old ? ` from ${u.date}` : ''}.`);
      if (old) toast.error(`This rates message is from ${u.date}, not today. Check the Rates Desk.`);
      else toast.success(`Loaded the ${label}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load the rates.');
    } finally { setLoadingRates(false); }
  };

  const insertField = (f: string) => setMessage(m => `${m}${m && !/\s$/.test(m) ? ' ' : ''}{${f}}`);

  const saveTemplate = () => {
    const text = message.trim();
    if (!text) { toast.error('Type a message first.'); return; }
    const title = templateTitle.trim() || firstLine(text).slice(0, 40) || 'Message';
    const next = [{ id: `${Date.now()}`, title, text }, ...templates].slice(0, 40);
    setTemplates(next); setTemplateTitle('');
    void kvSave('templates', next).then(ok => { if (!ok) toast('Saved on this device only (Firebase did not accept it).', { icon: 'ℹ️' }); });
    toast.success('Saved');
  };
  const deleteTemplate = (id: string) => {
    const next = templates.filter(t => t.id !== id);
    setTemplates(next); void kvSave('templates', next);
  };

  // ---------------------------------------------------------------- broadcast list (native WhatsApp)
  const genericText = useMemo(() => generic(message), [message]);
  const parts = useMemo(() => chunk(ready, LIST_LIMIT), [ready]);

  const downloadContacts = (part: Member[], label: string) => {
    const vcf = buildVcf(part.map(m => ({ name: m.name, phone: m.ph.best!.digits })));
    downloadFile(`${fileSafe(label)}.vcf`, vcf, 'text/vcard;charset=utf-8');
    toast.success(`${part.length} contacts file downloaded. Open it to save them in your phone.`);
  };

  const shareContactCard = async () => {
    const name = (prefs.cardName || settings?.name || '').trim();
    const phone = (prefs.cardPhone || settings?.phone || '').trim();
    const num = partyPhones({ phone }).best;
    if (!name || !num) { toast.error('Type your company name and mobile number in the box first.'); return; }
    const vcf = buildVcf([{ name, phone: num.digits }]);
    const file = new File([vcf], `${fileSafe(name)}.vcf`, { type: 'text/vcard' });
    const text = `Please save our number (${num.display}) to keep receiving our daily NCDEX rate updates on WhatsApp.\n- ${name}`;
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    } catch { /* the person closed the share sheet */ return; }
    downloadFile(file.name, vcf, 'text/vcard;charset=utf-8');
    await copyText(text);
    toast.success('Contact card downloaded and the request text copied. Send both to your clients.');
  };

  const copyAndOpenWhatsApp = async () => {
    if (!message.trim()) { toast.error('Type or load the message first.'); return; }
    const ok = await copyText(genericText);
    toast.success(ok ? 'Message copied' : 'Could not copy. Select the message and copy it by hand.');
    if (isMobileDevice()) window.location.href = `whatsapp://send?text=${encodeURIComponent(genericText)}`;
    else window.open('https://web.whatsapp.com/', 'mac_whatsapp');
  };

  const shareSheet = async () => {
    if (!message.trim()) { toast.error('Type or load the message first.'); return; }
    if (typeof navigator.share !== 'function') { await copyAndOpenWhatsApp(); return; }
    try { await navigator.share({ text: genericText }); } catch { /* closed */ }
  };

  const markListSent = () => {
    if (!message.trim()) return;
    logHistory({ listName: activeList?.name || 'Broadcast list', mode: 'list', sent: ready.length, total: ready.length, preview: firstLine(message) });
    toast.success('Written in Recent broadcasts');
  };

  // ---------------------------------------------------------------- channel
  const channelOk = /^https?:\/\/(www\.)?(whatsapp\.com|wa\.me)\//i.test(prefs.channelLink.trim());
  const openChannel = () => { if (channelOk) { if (isMobileDevice()) window.location.href = prefs.channelLink.trim(); else window.open(prefs.channelLink.trim(), '_blank'); } };
  const copyAndOpenChannel = async () => {
    if (!message.trim()) { toast.error('Type or load the message first.'); return; }
    const ok = await copyText(genericText);
    toast.success(ok ? 'Message copied. Paste it in your channel.' : 'Could not copy.');
    openChannel();
  };
  const markChannelPosted = () => {
    if (!message.trim()) return;
    logHistory({ listName: 'Channel', mode: 'channel', sent: 1, total: 1, preview: firstLine(message) });
    toast.success('Written in Recent broadcasts');
  };
  const putInviteMessage = () => {
    if (!channelOk) { toast.error('Paste your channel link first.'); return; }
    setMessage(`🙏 Namaste {name},\nFollow ${settings?.name || 'our'} free daily NCDEX rate updates on WhatsApp:\n${prefs.channelLink.trim()}\n(Tap the link and press Follow.)`);
    updatePrefs({ mode: 'queue' });
    toast.success('Invite message is ready. Now send it to your list one by one.');
  };

  // ---------------------------------------------------------------- manage lists
  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const newListId = Date.now().toString();
    const newList: ContactList = { id: newListId, name: newListName.trim(), memberIds: [], sentStatuses: {}, lastResetDate: new Date().toDateString() };
    setLists(prev => [...prev, newList]);
    setEditingListId(newList.id);
    setNewListName('');
    if (!selectedListId) setSelectedListId(newList.id);
    try { await setDoc(doc(db, 'whatsapp_lists', newListId), newList); } catch (error) { console.error('Error creating list:', error); }
  };

  const handleDeleteList = async (id: string) => {
    if (!window.confirm('Delete this list completely? This cannot be undone.')) return;
    const updated = lists.filter(l => l.id !== id);
    setLists(updated);
    if (selectedListId === id) setSelectedListId(updated[0]?.id || '');
    if (editingListId === id) setEditingListId('');
    try { await deleteDoc(doc(db, 'whatsapp_lists', id)); } catch (error) { console.error('Error deleting list:', error); }
  };

  const saveMembers = async (listId: string, memberIds: string[]) => {
    setLists(prev => prev.map(l => (l.id === listId ? { ...l, memberIds } : l)));
    try { await updateDoc(doc(db, 'whatsapp_lists', listId), { memberIds }); } catch (error) { console.error('Error updating members:', error); }
  };

  const toggleMemberInList = (listId: string, partyId: string) => {
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    void saveMembers(listId, list.memberIds.includes(partyId) ? list.memberIds.filter(id => id !== partyId) : [...list.memberIds, partyId]);
  };

  const filteredDirectory: Member[] = useMemo(() => {
    const term = manageSearch.trim().toLowerCase();
    return [...phonesById.values()].filter(p => {
      if (term && !(String(p.name).toLowerCase().includes(term) || String(p.phone || '').includes(term) || String(p.mobile || '').includes(term) || String(p.city || '').toLowerCase().includes(term))) return false;
      if (typeFilter !== 'all' && typeOf(p) !== typeFilter) return false;
      const inList = !!editingList && editingList.memberIds.includes(p.id);
      if (statusFilter === 'in' && !inList) return false;
      if (statusFilter === 'out' && inList) return false;
      if (statusFilter === 'nonumber' && p.ph.best) return false;
      return true;
    });
  }, [phonesById, manageSearch, typeFilter, statusFilter, editingList]);

  const addAllShown = () => {
    if (!editingList) return;
    const add = filteredDirectory.filter(p => p.ph.best).map(p => p.id);
    const ids = [...new Set([...editingList.memberIds, ...add])];
    if (ids.length === editingList.memberIds.length) { toast('Nothing new to add (clients without a WhatsApp number are skipped).'); return; }
    void saveMembers(editingList.id, ids);
    toast.success(`Added ${ids.length - editingList.memberIds.length} clients`);
  };
  const removeAllShown = () => {
    if (!editingList) return;
    const gone = new Set(filteredDirectory.map(p => p.id));
    const ids = editingList.memberIds.filter(id => !gone.has(id));
    if (ids.length === editingList.memberIds.length) return;
    if (!window.confirm(`Remove ${editingList.memberIds.length - ids.length} clients from "${editingList.name}"?`)) return;
    void saveMembers(editingList.id, ids);
  };

  // ---- people added for broadcasts only
  const persistContacts = (next: BcContact[]) => {
    setContacts(next);
    void kvSave('contacts', next).then(ok => { if (!ok) toast('Saved on this device only (Firebase did not accept it).', { icon: 'ℹ️' }); });
  };

  const handleSaveContacts = async (r: SaveResult, listId: string, editId?: string) => {
    if (editId) {
      const c = r.add[0];
      if (!c) return;
      persistContacts(contacts.map(x => (x.id === editId ? { ...x, name: c.name, phone: c.phone, city: c.city || undefined } : x)));
      toast.success('Contact updated');
      setContactSheet(null);
      return;
    }
    const made: BcContact[] = r.add.map(c => ({ id: newBcId(), name: c.name, phone: c.phone, ...(c.city ? { city: c.city } : {}), createdAt: Date.now() }));
    if (made.length) persistContacts([...contacts, ...made]);
    const list = listId ? listsRef.current.find(l => l.id === listId) : undefined;
    let added = 0;
    if (list) {
      const ids = [...new Set([...list.memberIds, ...made.map(m => m.id), ...r.existing])];
      added = ids.length - list.memberIds.length;
      if (added) await saveMembers(list.id, ids);
    }
    const parts = [made.length ? `${made.length} saved` : '', list ? `${added} added to "${list.name}"` : '', r.existing.length && !list ? `${r.existing.length} already saved` : ''].filter(Boolean);
    toast.success(parts.join(' · ') || 'Nothing new to add');
    setContactSheet(null);
  };

  const deleteContact = async (c: BcContact) => {
    if (!window.confirm(`Delete ${c.name}? They will also be taken out of every list.`)) return;
    persistContacts(contacts.filter(x => x.id !== c.id));
    for (const l of listsRef.current.filter(x => x.memberIds.includes(c.id))) await saveMembers(l.id, l.memberIds.filter(id => id !== c.id));
    toast.success(`${c.name} deleted`);
  };

  const startRename = (l: ContactList) => { setRenamingId(l.id); setRenameValue(l.name); };
  const finishRename = async () => {
    const name = renameValue.trim();
    const id = renamingId;
    setRenamingId('');
    if (!id || !name) return;
    setLists(prev => prev.map(l => (l.id === id ? { ...l, name } : l)));
    try { await updateDoc(doc(db, 'whatsapp_lists', id), { name }); } catch (e) { console.error(e); }
  };

  // ---------------------------------------------------------------- views
  const gridMembers = useMemo(() => {
    let list = members;
    const term = broadcastSearch.trim().toLowerCase();
    if (term) list = list.filter(m => String(m.name).toLowerCase().includes(term) || m.ph.all.some(n => n.digits.includes(term.replace(/\D/g, '') || '§')) || String(m.city || '').toLowerCase().includes(term));
    if (queueFilter === 'todo') list = list.filter(m => !sent[m.id]);
    if (queueFilter === 'done') list = list.filter(m => sent[m.id]);
    // clients still to be sent come first, sent ones drop to the bottom
    return [...list].sort((a, b) => Number(!!sent[a.id]) - Number(!!sent[b.id]));
  }, [members, broadcastSearch, queueFilter, sent]);

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <svg className="animate-spin h-8 w-8 mb-4 text-rose-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading Data from Firebase...
      </div>
    );
  }

  const hasMessage = !!message.trim();
  const pct = ready.length ? Math.round((doneCount / ready.length) * 100) : 0;

  return (
    <Page title="WhatsApp broadcast" subtitle="Send one message to a whole list, one tap per person" width="wide">
      <div className="flex space-x-1 bg-gray-200/70 p-1 rounded-xl mb-5 w-fit max-w-full">
        {(['broadcast', 'manage'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 sm:px-6 min-h-[44px] rounded-lg text-sm font-medium transition-all ${activeTab === t ? 'bg-white shadow text-rose-700' : 'text-gray-600 hover:bg-gray-200'}`}>
            {t === 'broadcast' ? 'Broadcast Message' : 'Manage Lists'}
          </button>
        ))}
      </div>

      {activeTab === 'broadcast' && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ------------------------------------------------ left: list + message */}
          <div className="w-full lg:w-5/12 space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="wa-list">Select List</label>
              <select id="wa-list" className="w-full p-2 border border-gray-300 rounded-md focus:ring-rose-500 focus:border-rose-500"
                value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}>
                <option value="" disabled>-- Choose a List --</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.memberIds.length} members)</option>)}
              </select>
              {activeList && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">{ready.length} can get WhatsApp</span>
                  {noNumber > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{noNumber} without a usable number</span>}
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <label htmlFor="wa-message" className="block text-sm font-bold text-gray-700">Message</label>
                <span className="text-xs text-gray-400">{message.length} characters</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                <button onClick={loadLatestRates} disabled={loadingRates} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-60">
                  {loadingRates ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />} Latest rates
                </button>
                <button onClick={() => setShowTemplates(v => !v)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${showTemplates ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  <Bookmark size={13} /> Saved messages{templates.length ? ` (${templates.length})` : ''}
                </button>
                {message && <button onClick={() => { setMessage(''); setRatesNote(''); }} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs">Clear</button>}
              </div>
              {ratesNote && <p className="mb-2 text-xs text-green-700">{ratesNote}</p>}

              {showTemplates && (
                <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm">
                  {templates.length === 0 && <p className="text-xs text-gray-500 mb-2">Nothing saved yet. Type a message, give it a name and press Save.</p>}
                  <ul className="space-y-1 mb-2 max-h-44 overflow-y-auto">
                    {templates.map(t => (
                      <li key={t.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-2 py-1.5">
                        <button onClick={() => { setMessage(t.text); setRatesNote(''); setShowTemplates(false); }} className="flex-1 min-w-0 text-left">
                          <span className="block text-xs font-semibold text-gray-800 truncate">{t.title}</span>
                          <span className="block text-[11px] text-gray-500 truncate">{firstLine(t.text)}</span>
                        </button>
                        <button onClick={() => deleteTemplate(t.id)} aria-label={`Delete ${t.title}`} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <input value={templateTitle} onChange={e => setTemplateTitle(e.target.value)} placeholder="Name for this message" aria-label="Name for this message" className="flex-1 min-w-0 px-2.5 py-1.5 border border-gray-300 rounded-md text-xs" />
                    <button onClick={saveTemplate} className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs font-medium">Save</button>
                  </div>
                </div>
              )}

              <textarea id="wa-message" className="w-full h-36 sm:h-48 p-3 border border-gray-300 rounded-md text-sm focus:ring-rose-500 focus:border-rose-500"
                placeholder="Paste or type your broadcast message here..." value={message} onChange={(e) => setMessage(e.target.value)} />
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                <span>Add:</span>
                {[['name', 'Name'], ['firm', 'Firm'], ['date', 'Date'], ['time', 'Time']].map(([f, l]) => (
                  <button key={f} onClick={() => insertField(f)} className="px-2 py-0.5 rounded-full border border-gray-200 hover:bg-gray-50 font-mono">{`{${f}}`}<span className="sr-only"> {l}</span></button>
                ))}
                <span className="text-gray-400">filled in for each client</span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ right: how to send */}
          <div className="w-full lg:w-7/12 space-y-4">
            <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-lg" role="tablist" aria-label="How to send">
              {([['queue', 'One by one', Send], ['list', 'Broadcast list', Users], ['channel', 'Channel', Rss]] as const).map(([m, label, Icon]) => (
                <button key={m} role="tab" aria-selected={prefs.mode === m} onClick={() => updatePrefs({ mode: m })}
                  className={`px-2 py-2 rounded-md text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-all ${prefs.mode === m ? 'bg-white shadow text-rose-700' : 'text-gray-600 hover:bg-gray-200'}`}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {/* ---------- one by one */}
            {prefs.mode === 'queue' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  {!activeList && <p className="text-sm text-gray-500">Choose a list on the left.</p>}
                  {activeList && ready.length === 0 && <p className="text-sm text-gray-500">No client in this list has a WhatsApp number. Add clients in "Manage Lists".</p>}
                  {activeList && ready.length > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-semibold text-gray-800">{doneCount} of {ready.length} sent</span>
                        <span className="text-gray-500 text-xs">{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-[#25D366] transition-all" style={{ width: `${pct}%` }} /></div>

                      {ticksFromOtherMessage && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs p-2.5">
                          <p><b>New message:</b> the ticks you see are cleared because the earlier ones were for a different message, so everyone is ready to receive this one.</p>
                          <button onClick={keepTicks} className="mt-1.5 underline">I only edited the same message: keep the old ticks</button>
                        </div>
                      )}

                      {current && hasMessage && (
                        <div className="mt-3 rounded-xl border border-green-200 bg-green-50/60 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-green-700 font-semibold">Next client</p>
                          <p className="text-base font-bold text-gray-900 truncate">{current.name}</p>
                          <p className="text-xs text-gray-600">{current.ph.best?.display}{current.contactPerson ? ` · ${current.contactPerson}` : ''}</p>
                          <button onClick={() => openChat(current)} className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold text-sm">
                            <WaIcon /> Open WhatsApp for {current.name.length > 22 ? `${current.name.slice(0, 22)}…` : current.name}
                          </button>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button onClick={skipCurrent} disabled={queue.length < 2} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs disabled:opacity-40"><SkipForward size={13} /> Skip for now</button>
                            <button onClick={() => setShowPreview(v => !v)} className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs">{showPreview ? 'Hide' : 'Show'} what {current.name.split(' ')[0]} gets</button>
                          </div>
                          {showPreview && <pre className="mt-2 whitespace-pre-wrap break-words text-xs bg-white border border-gray-200 rounded-lg p-2.5 max-h-48 overflow-y-auto font-sans">{personalize(message, mergeFor(current))}</pre>}
                          <p className="mt-2 text-xs text-gray-500">
                            {isMobileDevice()
                              ? 'Send it in WhatsApp, then come back here. The client is ticked by itself.'
                              : 'Send it in the WhatsApp tab, then come back here (or just press Enter). The client is ticked by itself.'}
                          </p>
                        </div>
                      )}
                      {current && !hasMessage && <p className="mt-3 text-sm text-amber-700">Type or load the message on the left to start.</p>}
                      {!current && doneCount > 0 && (
                        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex items-center gap-2"><CheckCircle2 size={18} /> Everyone in this list has this message.</div>
                      )}

                      {lastDone && (
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                          <span className="text-gray-700">Ticked <b>{lastDone.name}</b> as sent.</span>
                          <button onClick={undoLast} className="inline-flex items-center gap-1 font-medium text-rose-700"><Undo2 size={13} /> Not sent? Undo</button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {activeList && members.length > 0 && (
                  <>
                    <div className="p-3 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-2 sm:items-center">
                      <input type="text" placeholder="Search members..." aria-label="Search members" className="p-2 border border-gray-300 rounded-md text-sm w-full sm:w-44" value={broadcastSearch} onChange={(e) => setBroadcastSearch(e.target.value)} />
                      <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs bg-white">
                        {([['all', 'All'], ['todo', 'To send'], ['done', 'Sent']] as const).map(([k, l]) => (
                          <button key={k} onClick={() => setQueueFilter(k)} className={`px-3 py-2 ${queueFilter === k ? 'bg-gray-900 text-white' : 'text-gray-700'}`}>{l}</button>
                        ))}
                      </div>
                      <button onClick={() => setContactSheet({ listId: activeList.id })} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 bg-white text-gray-800 text-xs font-medium rounded-md hover:bg-gray-100 whitespace-nowrap"><UserPlus size={14} /> Add contact</button>
                      <button onClick={resetTicks} className="sm:ml-auto px-3 py-2 bg-gray-800 text-white text-xs font-medium rounded-md hover:bg-gray-900 whitespace-nowrap">Reset Statuses</button>
                    </div>
                    <div className="p-3 overflow-y-auto max-h-[560px] bg-gray-50/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {gridMembers.map(member => {
                          const isSent = !!sent[member.id];
                          const num = member.ph.best;
                          return (
                            <div key={member.id} data-testid="member" className={`p-3 rounded-lg border flex items-center justify-between gap-2 transition-all ${isSent ? 'bg-green-50 border-green-200 opacity-70' : 'bg-white border-gray-200 shadow-sm'}`}>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h3 className="font-bold text-gray-900 text-sm leading-tight break-words">{member.name}</h3>
                                  {isSent && <CheckCircle2 size={15} className="text-green-600 shrink-0" />}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  {num ? <span className="text-xs text-gray-600">{num.display}</span>
                                    : <span className="text-xs text-red-600">{member.ph.landlineOnly ? 'Landline only' : member.ph.raw ? `Not a valid number: ${member.ph.raw}` : 'No number'}</span>}
                                  <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{typeOf(member)}</span>
                                  {num && duplicates.has(num.digits) && <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">same number twice</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => activeList && setSent(activeList.id, member.id, !isSent, msgKey)} aria-label={isSent ? `Mark ${member.name} as not sent` : `Mark ${member.name} as sent`} title={isSent ? 'Mark as not sent' : 'Mark as sent'}
                                  className={`p-2 rounded-full border ${isSent ? 'border-green-300 bg-green-100 text-green-700' : 'border-gray-200 text-gray-400 hover:text-gray-700'}`}><Check size={15} /></button>
                                <button onClick={() => openChat(member)} disabled={!hasMessage || !num} aria-label={`Send WhatsApp to ${member.name}`}
                                  className={`p-2.5 rounded-full flex items-center justify-center transition-colors ${!hasMessage || !num ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#25D366] text-white hover:bg-[#128C7E] shadow-sm'}`}
                                  title={isSent ? 'Send again' : 'Send WhatsApp'}><WaIcon /></button>
                              </div>
                            </div>
                          );
                        })}
                        {gridMembers.length === 0 && <p className="text-center text-gray-500 mt-6 col-span-full text-sm">No members match.</p>}
                      </div>
                    </div>
                  </>
                )}
                {activeList && members.length === 0 && (
                  <div className="text-center text-gray-500 py-10 text-sm px-4">
                    <p>This list is empty. Add parties in "Manage Lists", or add someone just for broadcasts.</p>
                    <button onClick={() => setContactSheet({ listId: activeList.id })} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-700 text-white text-sm font-semibold"><UserPlus size={15} /> Add contact</button>
                  </div>
                )}
              </div>
            )}

            {/* ---------- broadcast list */}
            {prefs.mode === 'list' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-gray-800 flex items-center gap-2"><Users size={18} className="text-rose-700" /> WhatsApp Broadcast list: one paste, everyone gets it</h2>
                  <p className="text-sm text-gray-600 mt-1">This is WhatsApp's own broadcast feature (free, no Business account). You set it up once; after that every update is a single message. Each client receives it as a normal private message from you, and replies come to you privately. A list holds up to {LIST_LIMIT} clients.</p>
                  <p className="mt-2 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-900 p-2.5"><b>Important:</b> WhatsApp delivers a broadcast only to clients who have <b>your number saved</b> in their phone. Step 1 below helps with that.</p>
                </div>

                <ol className="space-y-4 text-sm">
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-rose-700 text-white text-xs font-bold flex items-center justify-center">1</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800">Ask clients to save your number (once)</p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input aria-label="Your company name" value={prefs.cardName || settings?.name || ''} onChange={e => setPrefs(p => ({ ...p, cardName: e.target.value }))} onBlur={() => updatePrefs({})} placeholder="Company name" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        <input aria-label="Your mobile number" value={prefs.cardPhone || settings?.phone || ''} onChange={e => setPrefs(p => ({ ...p, cardPhone: e.target.value }))} onBlur={() => updatePrefs({})} placeholder="Your WhatsApp number" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <button onClick={shareContactCard} className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 text-sm"><Share2 size={15} /> Share my contact card</button>
                      <p className="text-xs text-gray-500 mt-1">Sends a contact card with a short request. Use "One by one" to send it to everyone, or share it in your groups.</p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-rose-700 text-white text-xs font-bold flex items-center justify-center">2</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800">Save the clients in your phone (once, only if they are not saved yet)</p>
                      {!activeList || ready.length === 0 ? <p className="text-xs text-gray-500 mt-1">Choose a list with clients first.</p> : (
                        <>
                          <p className="text-xs text-gray-500 mt-1">{ready.length} clients in "{activeList.name}" have a WhatsApp number. Download the contacts file on your phone and open it (Android: tap it, choose Contacts; iPhone: tap it, then Add All Contacts).</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {parts.map((part, i) => (
                              <button key={i} onClick={() => downloadContacts(part, parts.length > 1 ? `${activeList.name}-part-${i + 1}` : activeList.name)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium">
                                <Download size={15} /> {parts.length > 1 ? `Part ${i + 1} (${part.length} clients)` : `Download contacts (${part.length})`}
                              </button>
                            ))}
                          </div>
                          {parts.length > 1 && <p className="text-xs text-gray-500 mt-1">WhatsApp lists hold {LIST_LIMIT} clients, so this list is split into {parts.length} parts. Make one broadcast list per part.</p>}
                        </>
                      )}
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-rose-700 text-white text-xs font-bold flex items-center justify-center">3</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800">Make the broadcast list in WhatsApp (once per part)</p>
                      <ul className="mt-1 text-xs text-gray-600 list-disc ml-4 space-y-0.5">
                        <li><b>Android:</b> WhatsApp, three dots, <b>New broadcast</b>, tick the clients, press the green tick.</li>
                        <li><b>iPhone:</b> WhatsApp, Chats, <b>Broadcast Lists</b> (top left), <b>New List</b>, tick the clients, Create.</li>
                        <li>Tap the list's name to rename it (for example "{activeList?.name || 'Clients'}").</li>
                      </ul>
                      {activeList && parts.length > 0 && (
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer text-rose-700">Show the client names to tick</summary>
                          <div className="mt-1 columns-1 sm:columns-2 gap-4 max-h-48 overflow-y-auto text-gray-700">
                            {ready.map(m => <p key={m.id} className="truncate">{m.name}</p>)}
                          </div>
                        </details>
                      )}
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">4</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800">Every update: send it in one go</p>
                      {!hasMessage && <p className="text-xs text-amber-700 mt-1">Type or load the message on the left (use "Latest rates" for the Rates Desk message).</p>}
                      {usesFields(message) && <p className="text-xs text-gray-500 mt-1">A broadcast sends the same text to everybody, so {'{name}'} and {'{firm}'} become "Sir/Madam".</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button onClick={copyAndOpenWhatsApp} disabled={!hasMessage} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-semibold disabled:opacity-50"><WaIcon className="w-4 h-4" /> Copy and open WhatsApp</button>
                        <button onClick={shareSheet} disabled={!hasMessage} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-50 text-sm disabled:opacity-50"><Share2 size={15} /> Share…</button>
                        <button onClick={async () => { if (await copyText(genericText)) toast.success('Message copied'); }} disabled={!hasMessage} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-50 text-sm disabled:opacity-50"><Copy size={15} /> Copy</button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">Choose your broadcast list from the chats WhatsApp shows (if it is not offered there, open the broadcast list yourself and paste). Press send once.</p>
                      <button onClick={markListSent} disabled={!hasMessage} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs disabled:opacity-50"><ListChecks size={13} /> I sent it (write it in Recent broadcasts)</button>
                    </div>
                  </li>
                </ol>
              </div>
            )}

            {/* ---------- channel */}
            {prefs.mode === 'channel' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-gray-800 flex items-center gap-2"><Rss size={18} className="text-rose-700" /> WhatsApp Channel: post once, all followers see it</h2>
                  <p className="text-sm text-gray-600 mt-1">A free one-way feed inside WhatsApp (no Business account). Clients follow it once with a link. They do not need your number saved, and you do not see theirs. There is no limit on followers.</p>
                  <p className="mt-2 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-900 p-2.5">Channel posts are visible to every follower and can be forwarded, and old posts disappear after 30 days. Good for public rate updates, not for private prices.</p>
                </div>
                <ol className="space-y-4 text-sm">
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-rose-700 text-white text-xs font-bold flex items-center justify-center">1</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800">Create the channel in WhatsApp (once)</p>
                      <p className="text-xs text-gray-600 mt-1">WhatsApp, <b>Updates</b> tab, <b>+</b>, <b>New channel</b>. Then open the channel, tap its name, and <b>Share link</b>. Paste the link here:</p>
                      <input aria-label="Channel link" value={prefs.channelLink} onChange={e => setPrefs(p => ({ ...p, channelLink: e.target.value }))} onBlur={() => updatePrefs({})} placeholder="https://whatsapp.com/channel/..." className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      {prefs.channelLink && !channelOk && <p className="text-xs text-red-600 mt-1">This does not look like a WhatsApp channel link.</p>}
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-rose-700 text-white text-xs font-bold flex items-center justify-center">2</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800">Invite your clients (once)</p>
                      <button onClick={putInviteMessage} className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 text-sm"><Megaphone size={15} /> Put the invite message in the box</button>
                      <p className="text-xs text-gray-500 mt-1">It switches to "One by one" so you can send the invite to everyone in the list.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800">Every update: copy, open the channel, paste, send</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button onClick={copyAndOpenChannel} disabled={!hasMessage || !channelOk} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-semibold disabled:opacity-50"><WaIcon className="w-4 h-4" /> Copy and open my channel</button>
                        <button onClick={openChannel} disabled={!channelOk} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-50 text-sm disabled:opacity-50"><ExternalLink size={15} /> Open only</button>
                      </div>
                      <button onClick={markChannelPosted} disabled={!hasMessage} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs disabled:opacity-50"><ListChecks size={13} /> I posted it (write it in Recent broadcasts)</button>
                    </div>
                  </li>
                </ol>
              </div>
            )}

            {/* ---------- recent broadcasts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><HistoryIcon size={15} className="text-gray-500" /> Recent broadcasts</h2>
              {history.length === 0 ? <p className="text-xs text-gray-500 mt-2">Nothing yet. Finished rounds are written here.</p> : (
                <ul className="mt-2 divide-y divide-gray-100">
                  {history.slice(0, 8).map(h => (
                    <li key={h.id} className="py-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{h.preview || 'Message'}</p>
                        <p className="text-[11px] text-gray-500">{when(h.at)} · {h.listName} · {MODE_NAME[h.mode]}</p>
                      </div>
                      <span className="text-[11px] text-gray-600 whitespace-nowrap">{h.mode === 'channel' ? 'Posted' : `${h.sent}/${h.total}`}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ manage lists */}
      {activeTab === 'manage' && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/3">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold mb-4 text-gray-800">Your Lists</h2>
              <form onSubmit={handleCreateList} className="flex gap-2 mb-6">
                <input type="text" placeholder="New list name..." aria-label="New list name" className="flex-1 min-w-0 p-2 border border-gray-300 rounded-md text-sm focus:ring-rose-500 focus:border-rose-500" value={newListName} onChange={(e) => setNewListName(e.target.value)} />
                <button type="submit" className="bg-rose-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-rose-800">Add</button>
              </form>
              <button onClick={() => setContactSheet({ listId: editingListId })} className="w-full mb-4 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border border-rose-200 bg-rose-50 text-rose-800 text-sm font-semibold hover:bg-rose-100"><UserPlus size={16} /> Add contacts (for broadcasts only)</button>
              {lists.length === 0 ? <p className="text-sm text-gray-500 italic">No lists created yet.</p> : (
                <div className="space-y-2">
                  {lists.map(list => {
                    const readyN = list.memberIds.filter(id => phonesById.get(id)?.ph.best).length;
                    return (
                      <div key={list.id} className={`flex justify-between items-center gap-2 p-3 rounded-md cursor-pointer transition-colors border ${editingListId === list.id ? 'border-rose-500 bg-rose-50' : 'border-gray-200 hover:bg-gray-50'}`} onClick={() => setEditingListId(list.id)}>
                        <div className="min-w-0">
                          {renamingId === list.id ? (
                            <input autoFocus value={renameValue} aria-label="Rename list" onClick={e => e.stopPropagation()} onChange={e => setRenameValue(e.target.value)} onBlur={finishRename} onKeyDown={e => { if (e.key === 'Enter') void finishRename(); if (e.key === 'Escape') setRenamingId(''); }} className="w-full px-2 py-1 border border-rose-400 rounded text-sm" />
                          ) : <span className="font-semibold text-gray-700 block truncate">{list.name}</span>}
                          <div className="text-xs text-gray-500 mt-0.5">{list.memberIds.length} parties · {readyN} with WhatsApp</div>
                        </div>
                        <div className="flex items-center shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); startRename(list); }} aria-label={`Rename ${list.name}`} className="text-gray-400 hover:text-gray-700 p-2"><Pencil size={15} /></button>
                          <button onClick={(e) => { e.stopPropagation(); void handleDeleteList(list.id); }} aria-label={`Delete ${list.name}`} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col min-h-[500px]">
              <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
                <h2 className="text-lg font-bold text-gray-800">{editingList ? `Add/Remove Parties: ${editingList.name}` : 'Select a list to edit'}</h2>
                {editingList && (
                  <>
                    <input type="text" placeholder="Search name, number or city..." aria-label="Search directory" className="p-2 border border-gray-300 rounded-md text-sm focus:ring-rose-500 focus:border-rose-500 w-full" value={manageSearch} onChange={(e) => setManageSearch(e.target.value)} />
                    <div className="flex flex-wrap gap-2 items-center text-xs">
                      <div className="inline-flex rounded-md border border-gray-300 overflow-hidden bg-white">
                        {([['all', 'All'], ['buyer', 'Buyers'], ['seller', 'Sellers'], ['both', 'Both'], ...(contacts.length ? [['broadcast', 'Broadcast only']] : [])] as [typeof typeFilter, string][]).map(([k, l]) => (
                          <button key={k} onClick={() => setTypeFilter(k)} className={`px-3 py-1.5 ${typeFilter === k ? 'bg-gray-900 text-white' : 'text-gray-700'}`}>{l}</button>
                        ))}
                      </div>
                      <div className="inline-flex rounded-md border border-gray-300 overflow-hidden bg-white">
                        {([['all', 'Any'], ['in', 'In list'], ['out', 'Not in list'], ['nonumber', 'No WhatsApp number']] as const).map(([k, l]) => (
                          <button key={k} onClick={() => setStatusFilter(k)} className={`px-3 py-1.5 ${statusFilter === k ? 'bg-gray-900 text-white' : 'text-gray-700'}`}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={addAllShown} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-700 text-white text-xs font-medium hover:bg-rose-800"><Plus size={13} /> Add all {filteredDirectory.length} shown</button>
                      <button onClick={removeAllShown} className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-xs hover:bg-gray-100">Remove all shown</button>
                      <button onClick={() => setContactSheet({ listId: editingList.id })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-800 text-xs font-medium hover:bg-gray-100"><UserPlus size={13} /> Add contact</button>
                    </div>
                  </>
                )}
              </div>

              {editingList ? (
                <div className="p-3 flex-1 overflow-y-auto max-h-[700px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredDirectory.map(party => {
                      const isSelected = editingList.memberIds.includes(party.id);
                      const num = party.ph.best;
                      return (
                        <label key={party.id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-rose-50 border-rose-400 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                          <input type="checkbox" className="w-4 h-4 text-rose-700 rounded border-gray-300 focus:ring-rose-500" checked={isSelected} onChange={() => toggleMemberInList(editingList.id, party.id)} />
                          <div className="ml-3 flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-semibold text-gray-800 truncate">{party.name}</span>
                            <span className="text-xs text-gray-500 truncate">
                              {isBcId(party.id) ? 'broadcast only' : typeOf(party)} • {num ? num.display : <span className="text-red-600">{party.ph.landlineOnly ? 'landline only' : party.ph.raw ? `invalid: ${party.ph.raw}` : 'no number'}</span>}
                              {party.city ? ` • ${party.city}` : ''}
                            </span>
                          </div>
                          {isBcId(party.id) && (
                            <div className="flex shrink-0 -mr-1">
                              <button type="button" aria-label={`Edit ${party.name}`} onClick={e => { e.preventDefault(); e.stopPropagation(); const c = contacts.find(x => x.id === party.id); if (c) setContactSheet({ listId: '', edit: c }); }} className="p-2 text-gray-400 hover:text-gray-700"><Pencil size={14} /></button>
                              <button type="button" aria-label={`Delete ${party.name}`} onClick={e => { e.preventDefault(); e.stopPropagation(); const c = contacts.find(x => x.id === party.id); if (c) void deleteContact(c); }} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                            </div>
                          )}
                        </label>
                      );
                    })}
                    {filteredDirectory.length === 0 && <p className="text-center text-gray-500 mt-10 col-span-full">No parties match.</p>}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-500">Select a list from the left panel to manage its members.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <ContactSheet open={!!contactSheet} onClose={() => setContactSheet(null)} lists={lists.map(l => ({ id: l.id, name: l.name }))}
        defaultListId={contactSheet?.listId || ''} edit={contactSheet?.edit || null} known={knownNumbers} onSave={handleSaveContacts} />
    </Page>
  );
}

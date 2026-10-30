// src/pages/BrokerageBills.tsx
// One brokerage bill per party for a chosen period (all the contracts where the party bought and/or sold),
// with two documents per bill: the "Brokerage Bill" and the "Invoice", both printed on the company letterhead.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle, Calendar, CheckCircle, ChevronLeft, ChevronRight, Clock, DollarSign, Download, Eye, FileText, Loader2,
  Pencil, Printer, Receipt, Search, Share2, Trash2, AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import type { BillPayment, CompanySettings } from '../types';
import { applyLineEdits, billTotals, buildPartyBills, hasEdits, partyName, type BillEdits, type BillTotals, type PartyBill } from '../billing/calc';
import { renderBillDocs, dmy, inr, type BillDoc, type BillKind, type PdfAssets } from '../billing/pdf';
import { loadBillAssets } from '../billing/assets';
import { downloadFile, makeZip, previewPdf, printPdf, safeName, shareFile } from '../billing/output';
import { getStoredFont, onFontChange } from '../contractNote/fontStore';
import LetterheadToggle from '../components/LetterheadToggle';
import { Page, Sheet, Segmented, Button, Badge, EmptyState, Field } from '../ui';
import BillEditor from '../billing/BillEditor';
import { usePlainCopy } from '../utils/usePlainCopy';
import { billedElsewhere, getEdits, getPeriodView, issueBill, savePeriodPayments, useBillVersion, type PeriodView } from '../utils/billStore';

/* ---------- periods ---------- */
type PeriodKind = 'month' | 'quarter' | 'half' | 'fy' | 'custom';
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`;
const todayIso = () => { const t = new Date(); return iso(t.getFullYear(), t.getMonth(), t.getDate()); };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function span(y: number, m0: number, months: number) {
  const s = new Date(y, m0, 1);
  const e = new Date(s.getFullYear(), s.getMonth() + months, 0);
  return { from: iso(s.getFullYear(), s.getMonth(), 1), to: iso(e.getFullYear(), e.getMonth(), e.getDate()) };
}
/** financial year runs April - March */
function rangeFor(kind: Exclude<PeriodKind, 'custom'>, anchor: string) {
  const [y, m1] = anchor.split('-').map(Number);
  const m0 = m1 - 1;
  if (kind === 'month') return span(y, m0, 1);
  if (kind === 'quarter') return span(y, m0 - ((m0 - 3 + 12) % 3), 3);
  if (kind === 'half') return m0 >= 3 && m0 <= 8 ? span(y, 3, 6) : m0 >= 9 ? span(y, 9, 6) : span(y - 1, 9, 6);
  return span(m0 >= 3 ? y : y - 1, 3, 12);
}
function shiftAnchor(kind: Exclude<PeriodKind, 'custom'>, anchor: string, dir: 1 | -1) {
  const [y, m1] = anchor.split('-').map(Number);
  const months = { month: 1, quarter: 3, half: 6, fy: 12 }[kind];
  const d = new Date(y, m1 - 1 + dir * months, 1);
  return iso(d.getFullYear(), d.getMonth(), 1);
}
function periodLabel(kind: PeriodKind, from: string, to: string) {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  if (kind === 'month') return `${MONTHS[fm - 1]} ${fy}`;
  if (kind === 'quarter' || kind === 'half') return `${MONTHS[fm - 1].slice(0, 3)} ${fy} - ${MONTHS[tm - 1].slice(0, 3)} ${ty}`;
  if (kind === 'fy') return `Financial year ${fy}-${String(ty).slice(2)}`;
  return `${dmy(from)} - ${dmy(to)}`;
}

/* ---------- one bill row on screen ---------- */
interface Row {
  bill: PartyBill;         // as it will be printed (hand edits applied)
  calc: PartyBill;         // as worked out from the contracts
  edits: BillEdits;
  edited: boolean;
  gst: number;             // GST % on this bill
  date: string;            // bill date on this bill
  view: PeriodView;
  totals: BillTotals;
  paid: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid';
  invoiceNo?: number;
  stale: boolean;          // contracts or amounts changed after the last PDF was made
  elsewhere: { invoiceNo?: number; from?: string; to?: string; count: number }[];
}

const money = (n: number) => 'Rs. ' + inr(n);
const isMobile = () => /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

interface Ready { bytes: Uint8Array; name: string; title: string }

export default function BrokerageBills() {
  const { contracts, parties, settings } = useAppStore();
  const billVersion = useBillVersion();
  const [plain] = usePlainCopy(); // true = PDFs without header / footer / lotus, for the printed letterhead

  /* ----- period ----- */
  const [kind, setKind] = useState<PeriodKind>('month');
  const [anchor, setAnchor] = useState(() => { const t = new Date(); return iso(t.getFullYear(), t.getMonth(), 1); });
  const [custom, setCustom] = useState(() => span(new Date().getFullYear(), new Date().getMonth(), 1));
  const { from, to } = useMemo(() => (kind === 'custom' ? custom : rangeFor(kind, anchor)), [kind, anchor, custom]);

  /* ----- bill settings for this run ----- */
  const [billDate, setBillDate] = useState('');
  const effectiveBillDate = billDate || (to < todayIso() ? to : todayIso());
  const [gstInput, setGstInput] = useState<string>('');
  const gst = gstInput === '' ? Number(settings.brokerageGstPercent) || 0 : Math.max(0, Number(gstInput) || 0);

  /* ----- list state ----- */
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewId, setViewId] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [payEdit, setPayEdit] = useState<string | null>(null); // id of the payment being changed
  const [showBulk, setShowBulk] = useState(false);
  const [busy, setBusy] = useState<{ label: string; done: number; total: number } | null>(null);
  const [ready, setReady] = useState<Ready | null>(null);
  const busyRef = useRef(false);

  /* ----- font / settings checks ----- */
  const [fontOk, setFontOk] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () => getStoredFont('regular').then(f => alive && setFontOk(!!f)).catch(() => alive && setFontOk(null));
    check();
    const off = onFontChange(check);
    return () => { alive = false; off(); };
  }, []);

  /* ----- the bills ----- */
  const rows: Row[] = useMemo(() => {
    const bills = buildPartyBills(contracts, parties, from, to);
    return bills.map(calc => {
      const edits = getEdits(calc.partyId, from, to);
      const bill = applyLineEdits(calc, edits);
      const rowGst = edits.gst ?? gst;
      const view = getPeriodView(bill.partyId, from, to);
      const totals = billTotals(bill.subtotal, view.adjustment.amount, rowGst, bill.party, settings);
      const paid = Math.round(view.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) * 100) / 100;
      const balance = Math.max(0, Math.round((totals.total - paid) * 100) / 100);
      const status: Row['status'] = totals.total > 0 && paid >= totals.total - 0.005 ? 'paid' : paid > 0 ? 'partial' : 'pending';
      const keys = bill.lines.map(l => `${l.contractId}:${l.side}`);
      const rec = view.record;
      const stale = rec.pdfTotal !== undefined && (
        Math.abs(rec.pdfTotal - totals.total) > 0.004 ||
        !rec.keys || rec.keys.length !== keys.length || keys.some(k => !rec.keys!.includes(k))
      );
      return { bill, calc, edits, edited: hasEdits(edits), gst: rowGst, date: edits.date || effectiveBillDate, view, totals, paid, balance, status, invoiceNo: rec.invoiceNo, stale, elsewhere: billedElsewhere(bill.partyId, from, to, keys) };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
    // billVersion changes whenever a payment / invoice record changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts, parties, from, to, gst, settings, billVersion, effectiveBillDate]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => (statusFilter === 'all' || r.status === statusFilter) && (!q || partyName(r.bill.party).toLowerCase().includes(q)));
  }, [rows, search, statusFilter]);

  const sum = useMemo(() => ({
    parties: rows.length,
    lines: rows.reduce((s, r) => s + r.bill.lines.length, 0),
    total: rows.reduce((s, r) => s + r.totals.total, 0),
    paid: rows.reduce((s, r) => s + r.paid, 0),
    balance: rows.reduce((s, r) => s + r.balance, 0),
  }), [rows]);

  const byId = (id: string | null) => (id ? rows.find(r => r.bill.partyId === id) || null : null);
  const viewRow = byId(viewId);
  const payRow = byId(payId);
  const editRow = byId(editId);

  // changing the period clears the selection
  useEffect(() => { setSelected(new Set()); }, [from, to]);

  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allShownSelected = shown.length > 0 && shown.every(r => selected.has(r.bill.partyId));
  const toggleAll = () => setSelected(allShownSelected ? new Set() : new Set(shown.map(r => r.bill.partyId)));

  /* ================= making the files ================= */
  const missingBank = !settings.bankName || !settings.bankAccount || !settings.bankIfsc;

  const ensureAssets = useCallback(async (): Promise<PdfAssets | null> => {
    try {
      const a = await loadBillAssets(settings as CompanySettings, !plain);
      if (!a) { toast.error('Upload your Verdana font first (Settings > Contract Note font).', { duration: 6000 }); return null; }
      return a;
    } catch (e: any) {
      toast.error(e?.message || 'Could not load the letterhead.', { duration: 6000 });
      return null;
    }
  }, [settings, plain]);

  const docFor = (r: Row, invoiceNo: number): BillDoc => ({
    party: r.bill.party,
    lines: r.bill.lines,
    from, to,
    billNo: String(invoiceNo),
    billDate: r.date,
    adjustment: r.view.adjustment.amount,
    adjustmentNote: r.view.adjustment.note,
    gstPercent: r.gst,
  });

  /** takes the party's invoice number (or the next free one) and remembers what is on this bill */
  const number = (r: Row): number => {
    const { invoiceNo, saved } = issueBill(
      r.bill.partyId, from, to,
      { partyName: partyName(r.bill.party), billDate: r.date, keys: r.bill.lines.map(l => `${l.contractId}:${l.side}`), total: r.totals.total },
      Number(settings.invoiceStartNumber) || 1,
    );
    saved.catch(() => toast.error('Could not save the invoice number to the cloud. Check your connection.'));
    return invoiceNo;
  };

  const suffix = plain ? '_print' : '';
  const fileName = (k: BillKind, no: number, party: string) => `${k === 'bill' ? 'Brokerage_Bill' : 'Invoice'}_${no}_${safeName(party)}${suffix}.pdf`;
  const kindTitle = (k: BillKind, no: number, party: string) => `${k === 'bill' ? 'Brokerage Bill' : 'Invoice'} ${no} - ${party}${plain ? ' (print copy, no letterhead)' : ''}`;

  const showWarnings = (w: string[]) => w.forEach(m => toast(m, { icon: '⚠️', duration: 7000 }));

  /** hands a finished file to the person: share sheet on phones, download on computers */
  const deliver = useCallback(async (bytes: Uint8Array, name: string, title: string) => {
    if (isMobile()) {
      const r = await shareFile(bytes, name, title);
      if (r === 'shared' || r === 'cancelled') return;
      if (r === 'blocked') { setReady({ bytes, name, title }); return; } // the phone wanted a fresh tap
    }
    downloadFile(bytes, name);
    toast.success('Downloaded ' + name);
  }, []);

  /** builds PDFs for these rows. mode "files" = one file per party and document; "combined" = one PDF per document type */
  async function build(rs: Row[], docs: 'bill' | 'invoice' | 'both', mode: 'files' | 'combined'): Promise<{ name: string; bytes: Uint8Array; title: string }[] | null> {
    const assets = await ensureAssets();
    if (!assets) return null;
    const kinds: BillKind[] = docs === 'both' ? ['bill', 'invoice'] : [docs];
    const out: { name: string; bytes: Uint8Array; title: string }[] = [];
    const warnings = new Set<string>();
    const steps = mode === 'files' ? rs.length * kinds.length : kinds.length;
    let done = 0;
    const tick = (label: string) => setBusy({ label, done, total: steps });
    if (mode === 'files') {
      for (const r of rs) {
        const no = number(r);
        const name = partyName(r.bill.party);
        for (const k of kinds) {
          tick(`${k === 'bill' ? 'Brokerage Bill' : 'Invoice'}: ${name}`);
          await new Promise(res => setTimeout(res, 0)); // let the screen update between PDFs
          const title = kindTitle(k, no, name);
          const res = await renderBillDocs(k, [docFor(r, no)], assets, title, { letterhead: !plain });
          res.warnings.forEach(w => warnings.add(w));
          out.push({ name: fileName(k, no, name), bytes: res.bytes, title });
          done++;
        }
      }
    } else {
      const nos = rs.map(number);
      for (const k of kinds) {
        tick(k === 'bill' ? 'Brokerage Bills (one PDF)' : 'Invoices (one PDF)');
        await new Promise(res => setTimeout(res, 0));
        const label = k === 'bill' ? 'Brokerage_Bills' : 'Invoices';
        const title = `${k === 'bill' ? 'Brokerage Bills' : 'Invoices'} ${dmy(from)} - ${dmy(to)}${plain ? ' (print copy, no letterhead)' : ''}`;
        const res = await renderBillDocs(k, rs.map((r, i) => docFor(r, nos[i])), assets, title, { letterhead: !plain });
        res.warnings.forEach(w => warnings.add(w));
        out.push({ name: `${label}_${from}_to_${to}${suffix}.pdf`, bytes: res.bytes, title });
        done++;
      }
    }
    showWarnings([...warnings]);
    return out;
  }

  const guarded = async (label: string, fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy({ label, done: 0, total: 1 });
    try { await fn(); }
    catch (e: any) { console.error(e); toast.error(e?.message || 'Could not make the PDF.'); }
    finally { busyRef.current = false; setBusy(null); }
  };

  /** one party, one document -> straight to share / download */
  const empty = (r: Row) => { if (r.bill.lines.length) return false; toast.error('Every line is left off this bill. Turn a line back on in Edit bill first.'); return true; };
  const makeOne = (r: Row, k: BillKind) => empty(r) ? undefined : guarded('Preparing', async () => {
    const files = await build([r], k, 'files');
    if (files?.[0]) await deliver(files[0].bytes, files[0].name, files[0].title);
  });

  /** one party, one document -> a chosen action (used by the details window) */
  const actOne = (r: Row, k: BillKind, action: 'download' | 'share' | 'preview' | 'print') => {
    if (empty(r)) return;
    // for "preview", open the tab now (inside the tap) so the browser does not block it, and fill it in later
    const win = action === 'preview' ? window.open('', '_blank') : null;
    return guarded('Preparing', async () => {
      const files = await build([r], k, 'files');
      const f = files?.[0];
      if (!f) { win?.close(); return; }
      if (action === 'download') { downloadFile(f.bytes, f.name); toast.success('Downloaded ' + f.name); }
      else if (action === 'share') {
        const res = await shareFile(f.bytes, f.name, f.title);
        if (res === 'unsupported') { downloadFile(f.bytes, f.name); toast('Sharing is not available here - downloaded instead.'); }
        else if (res === 'blocked') setReady(f);
      } else if (action === 'preview') {
        if (win) { win.location.href = URL.createObjectURL(new Blob([f.bytes as BlobPart], { type: 'application/pdf' })); }
        else if (!previewPdf(f.bytes)) setReady(f);
      } else if (!printPdf(f.bytes)) {
        const res = await shareFile(f.bytes, f.name, f.title); // phones: Print is in the share sheet
        if (res === 'unsupported' || res === 'blocked') setReady(f);
      }
    });
  };

  const [bulkDocs, setBulkDocs] = useState<'bill' | 'invoice' | 'both'>('both');
  const [bulkMode, setBulkMode] = useState<'files' | 'combined'>('files');
  const selectedRows = shown.filter(r => selected.has(r.bill.partyId));

  const runBulk = () => {
    setShowBulk(false);
    const rs = selectedRows.filter(r => r.bill.lines.length > 0);
    if (rs.length < selectedRows.length) toast(`${selectedRows.length - rs.length} bill(s) with every line left off were skipped.`, { icon: '⚠️' });
    if (!rs.length) return;
    guarded('Preparing', async () => {
      const files = await build(rs, bulkDocs, bulkMode);
      if (!files?.length) return;
      if (files.length === 1) { await deliver(files[0].bytes, files[0].name, files[0].title); return; }
      setBusy({ label: 'Packing the ZIP', done: files.length, total: files.length });
      await new Promise(res => setTimeout(res, 0));
      const zip = makeZip(files.map(f => ({ name: f.name, bytes: f.bytes })));
      const label = bulkDocs === 'bill' ? 'Brokerage_Bills' : bulkDocs === 'invoice' ? 'Invoices' : 'Bills_and_Invoices';
      await deliver(zip, `${label}_${from}_to_${to}${suffix}.zip`, `${label} ${dmy(from)} - ${dmy(to)}`);
    });
  };

  /* ================= payments ================= */
  const [payForm, setPayForm] = useState<Partial<BillPayment>>({ date: todayIso(), amount: 0, mode: 'bank_transfer', reference: '', notes: '' });

  const openPay = (r: Row, existing?: BillPayment) => {
    setPayEdit(existing ? existing.id : null);
    setPayForm(existing ? { ...existing } : { date: todayIso(), amount: r.balance || 0, mode: 'bank_transfer', reference: '', notes: '' });
    setPayId(r.bill.partyId);
  };
  const savePayment = () => {
    if (!payRow) return;
    const amount = Math.round((Number(payForm.amount) || 0) * 100) / 100;
    if (amount <= 0) { toast.error('Enter a valid amount'); return; }
    const own = payRow.view.record.payments || [];
    const fields = { date: payForm.date || todayIso(), amount, mode: (payForm.mode as BillPayment['mode']) || 'bank_transfer', reference: (payForm.reference || '').trim(), notes: (payForm.notes || '').trim() };
    const next = payEdit
      ? own.map(p => (p.id === payEdit ? { ...p, ...fields } : p))
      : [...own, { id: crypto.randomUUID(), ...fields, createdAt: new Date().toISOString() } as BillPayment];
    savePeriodPayments(payRow.bill.partyId, from, to, next).catch(() => toast.error('Could not save the payment to the cloud. Check your connection.'));
    setPayId(null); setPayEdit(null);
    toast.success(payEdit ? 'Payment updated' : 'Payment recorded');
  };
  const deletePayment = (r: Row, id: string) => {
    if (!window.confirm('Delete this payment?')) return;
    const own = (r.view.record.payments || []).filter(p => p.id !== id);
    savePeriodPayments(r.bill.partyId, from, to, own).catch(() => toast.error('Could not save to the cloud. Check your connection.'));
  };

  /* ================= screen ================= */
  const step = (dir: 1 | -1) => { if (kind !== 'custom') setAnchor(a => shiftAnchor(kind, a, dir)); };
  const STATUS: Record<Row['status'], { tone: 'green' | 'amber' | 'red'; text: string; icon: React.ReactNode }> = {
    paid: { tone: 'green', text: 'Paid', icon: <CheckCircle size={13} /> },
    partial: { tone: 'amber', text: 'Part paid', icon: <Clock size={13} /> },
    pending: { tone: 'red', text: 'Pending', icon: <AlertCircle size={13} /> },
  };
  const stat = (label: string, value: string, cls = 'text-gray-900') => (
    <div className="min-w-0"><p className="text-[11px] text-gray-500">{label}</p><p className={`text-[15px] sm:text-base font-bold tabular-nums truncate ${cls}`}>{value}</p></div>
  );

  return (
    <Page title="Brokerage bills" subtitle="One bill per party for the period. Edit any bill before you send it." width="wide" className="pb-28">
      {fontOk === false && (
        <div className="mb-3 p-3 rounded-2xl bg-amber-50 text-sm text-amber-900 flex gap-2 ring-1 ring-amber-200/60">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>The bill font is not set up yet. Open <Link to="/settings" className="underline font-semibold">Settings</Link> and add your Verdana font once (the same one used for Contract Notes).</span>
        </div>
      )}
      {(missingBank || !settings.pan) && (
        <div className="mb-3 p-3 rounded-2xl bg-amber-50 text-sm text-amber-900 flex gap-2 ring-1 ring-amber-200/60">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>
            {!settings.pan ? 'PAN is empty. ' : ''}{missingBank ? 'Bank details are incomplete, so the Invoice will print without them. ' : ''}
            Fill them in <Link to="/settings" className="underline font-semibold">Settings</Link>.
          </span>
        </div>
      )}

      {/* period + settings for this run */}
      <div className="card p-3.5 sm:p-4 mb-3 space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <Segmented<PeriodKind> value={kind} label="Period" onChange={k => {
            if (k === 'custom') setCustom({ from, to }); else setAnchor(from.slice(0, 8) + '01');
            setKind(k);
          }} options={[{ value: 'month', label: 'Month' }, { value: 'quarter', label: 'Quarter' }, { value: 'half', label: 'Half' }, { value: 'fy', label: 'Year' }, { value: 'custom', label: 'Dates' }]} />
          {kind === 'custom' ? (
            <div className="flex items-center gap-2">
              <input type="date" aria-label="From date" value={custom.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} className="input-field !py-2 !w-auto" />
              <span className="text-gray-400 text-sm">to</span>
              <input type="date" aria-label="To date" value={custom.to} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} className="input-field !py-2 !w-auto" />
            </div>
          ) : (
            <div className="flex items-center rounded-xl bg-black/[0.05]">
              <button onClick={() => step(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-600 hover:bg-black/5" aria-label="Previous period"><ChevronLeft size={18} /></button>
              <div className="flex items-center gap-2 px-1.5 min-w-[150px] justify-center">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-800" aria-live="polite">{periodLabel(kind, from, to)}</span>
              </div>
              <button onClick={() => step(1)} className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-600 hover:bg-black/5" aria-label="Next period"><ChevronRight size={18} /></button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_2fr] gap-3 items-start">
          <Field label={<span className="text-xs text-gray-500">Bill / invoice date</span>}>
            <input type="date" value={effectiveBillDate} onChange={e => setBillDate(e.target.value)} className="input-field !py-2" />
          </Field>
          <Field label={<span className="text-xs text-gray-500">GST on brokerage %</span>}>
            <input type="number" min="0" step="0.5" inputMode="decimal" value={gstInput === '' ? (Number(settings.brokerageGstPercent) || '') : gstInput} placeholder="0"
              onChange={e => setGstInput(e.target.value)} className="input-field !py-2" />
          </Field>
          <div className="col-span-2 sm:col-span-1"><LetterheadToggle /></div>
        </div>
      </div>

      {/* totals */}
      <div className="card p-3.5 sm:p-4 mb-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
        {stat('Parties / lines', `${sum.parties} / ${sum.lines}`)}
        {stat('Total billed', money(sum.total))}
        {stat('Received', money(sum.paid), 'text-emerald-600')}
        {stat('Outstanding', money(sum.balance), sum.balance > 0 ? 'text-red-600' : 'text-gray-900')}
      </div>

      {/* filters */}
      {rows.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mb-3">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search party" aria-label="Search party" className="input-field pl-10" />
          </div>
          <div className="flex items-center gap-2">
            <Segmented<typeof statusFilter> value={statusFilter} label="Payment status" onChange={setStatusFilter}
              options={[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'partial', label: 'Part' }, { value: 'paid', label: 'Paid' }]} />
            <Button size="sm" onClick={toggleAll}>{allShownSelected ? 'Clear' : 'Select all'}</Button>
          </div>
        </div>
      )}

      {/* the bills */}
      {rows.length === 0 ? (
        <div className="card"><EmptyState icon={<DollarSign size={24} />} title={`No brokerage to bill for ${periodLabel(kind, from, to)}`}>Bills appear here as soon as there are contracts with brokerage in the period.</EmptyState></div>
      ) : shown.length === 0 ? (
        <div className="card"><EmptyState icon={<Search size={24} />} title="No party matches" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {shown.map(r => {
            const id = r.bill.partyId;
            const st = STATUS[r.status];
            const off = r.calc.lines.length - r.bill.lines.length;
            return (
              <article key={id} aria-label={`Bill for ${partyName(r.bill.party)}`} className={`card p-3.5 sm:p-4 ${selected.has(id) ? 'ring-2 ring-rose-400/70' : ''}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} className="mt-1 w-5 h-5 accent-rose-700 shrink-0" aria-label={'Select ' + partyName(r.bill.party)} />
                  <button type="button" onClick={() => setViewId(id)} className="min-w-0 flex-1 text-left" aria-label={`Details of ${partyName(r.bill.party)}`}>
                    <span className="block text-[15px] font-semibold text-gray-900 truncate">{partyName(r.bill.party)}</span>
                    <span className="block text-xs text-gray-500">
                      {r.bill.lines.length} line{r.bill.lines.length !== 1 ? 's' : ''} · {r.bill.totalQtyMT.toFixed(3)} MT
                      {r.invoiceNo ? <> · Invoice <span className="font-semibold text-gray-700">{r.invoiceNo}</span></> : null}
                    </span>
                  </button>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge tone={st.tone} icon={st.icon}>{st.text}</Badge>
                    {r.edited && <Badge tone="violet" icon={<Pencil size={11} />}>Edited</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 rounded-xl bg-black/[0.035] px-3 py-2.5">
                  {stat('Bill total', money(r.totals.total))}
                  {stat('Received', money(r.paid), 'text-emerald-600')}
                  {stat('Balance', money(r.balance), r.balance > 0 ? 'text-red-600' : 'text-gray-900')}
                </div>

                {(r.totals.adjustment !== 0 || r.totals.gstPercent > 0 || off > 0) && (
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    Brokerage {money(r.totals.subtotal)}
                    {r.totals.adjustment !== 0 ? ` ${r.totals.adjustment > 0 ? '+' : '−'} adjustment ${inr(Math.abs(r.totals.adjustment))}` : ''}
                    {r.totals.gstPercent > 0 ? ` + GST ${inr(r.totals.cgst + r.totals.sgst + r.totals.igst)}` : ''}
                    {off > 0 ? ` · ${off} line${off > 1 ? 's' : ''} left off` : ''}
                  </p>
                )}
                {r.stale && (
                  <p className="text-xs text-amber-800 bg-amber-50 rounded-xl px-2.5 py-1.5 mt-2 flex gap-1.5">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Changed since the last PDF was made. Make it again before sending.
                  </p>
                )}
                {r.elsewhere.length > 0 && (
                  <p className="text-xs text-sky-800 bg-sky-50 rounded-xl px-2.5 py-1.5 mt-2">
                    {r.elsewhere.map(e => `${e.count} contract line${e.count > 1 ? 's are' : ' is'} also on invoice ${e.invoiceNo ?? '?'} (${e.from ? dmy(e.from) : ''} - ${e.to ? dmy(e.to) : ''})`).join('; ')}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button variant="primary" size="sm" disabled={!!busy} onClick={() => makeOne(r, 'bill')} icon={<FileText size={15} />}>Brokerage Bill</Button>
                  <Button variant="soft" size="sm" disabled={!!busy} onClick={() => makeOne(r, 'invoice')} icon={<Receipt size={15} />}>Invoice</Button>
                  <Button size="sm" onClick={() => setEditId(id)} icon={<Pencil size={15} />}>Edit bill</Button>
                  <Button size="sm" onClick={() => openPay(r)} icon={<DollarSign size={15} />}>Payment</Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* selection bar */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-4 inset-x-3 lg:left-[17.5rem] lg:right-5 z-40 glass rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-700"><strong>{selectedRows.length}</strong> selected</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            <Button size="sm" variant="primary" disabled={!!busy} onClick={() => setShowBulk(true)} icon={<Download size={15} />}>Make for {selectedRows.length}</Button>
          </div>
        </div>
      )}

      {/* busy */}
      {busy && (
        <div className="fixed inset-0 z-[80] bg-slate-900/30 backdrop-blur-[3px] flex items-center justify-center p-4" role="status" aria-live="polite">
          <div className="glass rounded-3xl p-6 w-full max-w-xs text-center">
            <Loader2 className="animate-spin mx-auto text-rose-700 mb-3" size={30} />
            <p className="text-sm font-semibold text-gray-900 break-words">{busy.label}</p>
            {busy.total > 1 && (
              <>
                <div className="h-2 bg-black/10 rounded-full mt-3 overflow-hidden"><div className="h-full bg-rose-700 transition-all" style={{ width: `${Math.round((busy.done / busy.total) * 100)}%` }} /></div>
                <p className="text-xs text-gray-500 mt-1.5">{busy.done} of {busy.total}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* bulk options */}
      <Sheet open={showBulk} onClose={() => setShowBulk(false)} title={`Make for ${selectedRows.length} part${selectedRows.length === 1 ? 'y' : 'ies'}`}
        footer={<Button variant="primary" className="w-full" onClick={runBulk}>Make files</Button>}>
        <p className="text-sm text-gray-500 mb-3">{periodLabel(kind, from, to)} · each bill keeps its own date</p>
        <LetterheadToggle className="mb-4" />
        <p className="section-label px-1 mb-1.5">What to make</p>
        <Segmented<typeof bulkDocs> full value={bulkDocs} onChange={setBulkDocs} label="What to make" options={[{ value: 'bill', label: 'Bills' }, { value: 'invoice', label: 'Invoices' }, { value: 'both', label: 'Both' }]} />
        <p className="section-label px-1 mt-4 mb-1.5">How to get them</p>
        <div className="space-y-2">
          {([['files', 'Separate file for each party (ZIP)', `To send each party their own bill. ${plain ? 'Small files (no letterhead).' : 'About 3 MB per file.'}`], ['combined', 'One PDF with every party (for printing)', 'Each party starts on a new page. Small file.']] as const).map(([v, t, d]) => (
            <button key={v} onClick={() => setBulkMode(v)} className={`w-full text-left px-3.5 py-3 rounded-2xl text-sm ring-1 ${bulkMode === v ? 'ring-2 ring-rose-500 bg-rose-50/70' : 'ring-black/10 bg-white/70'}`}>
              <span className="font-semibold text-gray-900">{t}</span><span className="block text-xs text-gray-500 mt-0.5">{d}</span>
            </button>
          ))}
        </div>
        {bulkMode === 'files' && selectedRows.length * (bulkDocs === 'both' ? 2 : 1) > 24 && (
          <p className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2 mt-3">That is a lot of files for a phone. If it stops, select fewer parties at a time (about 12) or choose the single PDF.</p>
        )}
        <p className="text-xs text-gray-500 mt-3">Invoice numbers are given in party order and stay the same if you make the bill again.</p>
      </Sheet>

      {/* file ready (phones sometimes need one more tap before the share sheet may open) */}
      <Sheet open={!!ready} onClose={() => setReady(null)} title="File is ready">
        {ready && (
          <>
            <p className="text-sm text-gray-600 mb-4 break-all">{ready.name}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="primary" icon={<Share2 size={16} />} onClick={async () => { const r = await shareFile(ready.bytes, ready.name, ready.title); if (r === 'shared') setReady(null); else if (r === 'unsupported') toast('Sharing is not available here. Use Download.'); }}>Share</Button>
              <Button icon={<Download size={16} />} onClick={() => { downloadFile(ready.bytes, ready.name); setReady(null); }}>Download</Button>
            </div>
          </>
        )}
      </Sheet>

      {/* details */}
      <Sheet open={!!viewRow} onClose={() => setViewId(null)} wide title={viewRow ? partyName(viewRow.bill.party) : ''}>
        {viewRow && (
          <>
            <div className="flex items-center justify-between gap-3 -mt-1 mb-3">
              <p className="text-sm text-gray-500">{periodLabel(kind, from, to)}{viewRow.invoiceNo ? ` · Invoice ${viewRow.invoiceNo}` : ''} · {dmy(viewRow.date)}</p>
              <Button size="sm" icon={<Pencil size={14} />} onClick={() => { setViewId(null); setEditId(viewRow.bill.partyId); }}>Edit bill</Button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4 rounded-2xl bg-black/[0.035] px-3 py-3">
              {stat('Bill total', money(viewRow.totals.total))}
              {stat('Received', money(viewRow.paid), 'text-emerald-600')}
              {stat('Balance', money(viewRow.balance), viewRow.balance > 0 ? 'text-red-600' : 'text-gray-900')}
            </div>

            {/* phone: one card per contract line */}
            <div className="sm:hidden group-list mb-3">
              {viewRow.bill.lines.map(l => (
                <div key={l.contractId + l.side} className="px-3.5 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">#{l.contractNo} <span className="text-gray-400 font-normal">· {dmy(l.date)}</span> <span className={`ml-1 px-1.5 py-0.5 rounded text-[11px] ${l.type === 'Buy' ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'}`}>{l.type}</span></p>
                      <p className="text-gray-700 break-words">{l.counterparty.name}{l.counterparty.city ? <span className="text-gray-400"> ({l.counterparty.city})</span> : null}</p>
                      <p className="text-xs text-gray-500">{l.product} · {l.qtyMT.toFixed(3)} MT @ {l.ratePerMT !== null ? inr(l.ratePerMT) + ' / MT' : inr(l.rate) + ' ' + l.rateUnit.toLowerCase()}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900">{inr(l.brokerage)}</p>
                      <p className="text-[11px] text-gray-400">{l.was !== undefined ? `edited (was ${inr(l.was)})` : l.basis}</p>
                    </div>
                  </div>
                </div>
              ))}
              {viewRow.bill.lines.length === 0 && <p className="px-3.5 py-3 text-sm text-gray-500">Every line is left off this bill.</p>}
            </div>
            {/* tablet / computer: table */}
            <div className="hidden sm:block rounded-2xl bg-white/70 ring-1 ring-black/5 overflow-x-auto mb-3">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-black/[0.03]">
                  <tr>
                    {['Cont.', 'Date', 'Other party', 'Item', 'Type', 'MT', 'Rate / MT', 'Brokerage'].map((h, i) => (
                      <th key={h} className={`px-3 py-2 text-xs font-semibold text-gray-500 ${i >= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {viewRow.bill.lines.map(l => (
                    <tr key={l.contractId + l.side}>
                      <td className="px-3 py-2 font-semibold">#{l.contractNo}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{dmy(l.date)}</td>
                      <td className="px-3 py-2">{l.counterparty.name}<span className="block text-xs text-gray-400">{l.counterparty.city}</span></td>
                      <td className="px-3 py-2">{l.product}</td>
                      <td className="px-3 py-2">{l.type}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{l.qtyMT.toFixed(3)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{l.ratePerMT !== null ? inr(l.ratePerMT) : inr(l.rate) + ' ' + l.rateUnit.toLowerCase()}</td>
                      <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{inr(l.brokerage)}<span className="block text-[10px] text-gray-400 font-normal">{l.was !== undefined ? `edited (was ${inr(l.was)})` : l.basis}</span></td>
                    </tr>
                  ))}
                  {viewRow.bill.lines.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-gray-500">Every line is left off this bill.</td></tr>}
                </tbody>
              </table>
            </div>
            {/* totals */}
            <div className="rounded-2xl bg-black/[0.04] px-4 py-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-600">Brokerage ({viewRow.bill.totalQtyMT.toFixed(3)} MT)</span><span className="font-semibold">{inr(viewRow.totals.subtotal)}</span></div>
              {viewRow.totals.adjustment !== 0 && (
                <div className="flex justify-between"><span className="text-gray-600">Adjustment{viewRow.view.adjustment.note ? ` (${viewRow.view.adjustment.note})` : ''}</span><span>{inr(viewRow.totals.adjustment)}</span></div>
              )}
              {viewRow.totals.gstPercent > 0 && (viewRow.totals.intraState ? (
                <>
                  <div className="flex justify-between"><span className="text-gray-600">CGST @ {viewRow.totals.gstPercent / 2}%</span><span>{inr(viewRow.totals.cgst)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">SGST @ {viewRow.totals.gstPercent / 2}%</span><span>{inr(viewRow.totals.sgst)}</span></div>
                </>
              ) : (
                <div className="flex justify-between"><span className="text-gray-600">IGST @ {viewRow.totals.gstPercent}%</span><span>{inr(viewRow.totals.igst)}</span></div>
              ))}
              <div className="flex justify-between border-t border-black/10 pt-1.5 mt-1"><span className="font-semibold">Total</span><span className="font-bold">{inr(viewRow.totals.total)}</span></div>
            </div>

            {(['bill', 'invoice'] as const).map(k => (
              <div key={k} className="rounded-2xl bg-white/70 ring-1 ring-black/5 p-3 mb-2.5">
                <p className="text-sm font-semibold text-gray-900 mb-2">{k === 'bill' ? 'Brokerage Bill' : 'Invoice'}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button variant="primary" size="sm" disabled={!!busy} onClick={() => actOne(viewRow, k, 'download')} icon={<Download size={15} />}>Download</Button>
                  <Button size="sm" disabled={!!busy} onClick={() => actOne(viewRow, k, 'share')} icon={<Share2 size={15} />}>Share</Button>
                  <Button size="sm" disabled={!!busy} onClick={() => actOne(viewRow, k, 'preview')} icon={<Eye size={15} />}>Preview</Button>
                  <Button size="sm" disabled={!!busy} onClick={() => actOne(viewRow, k, 'print')} icon={<Printer size={15} />}>Print</Button>
                </div>
              </div>
            ))}

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="section-label px-1">Payments received</h3>
                <Button size="sm" variant="success" icon={<DollarSign size={14} />} onClick={() => openPay(viewRow)}>Add payment</Button>
              </div>
              {viewRow.view.payments.length === 0 ? <p className="text-sm text-gray-400 px-1">No payment recorded yet.</p> : (
                <div className="group-list">
                  {viewRow.view.payments.map(p => {
                    const legacy = viewRow.view.legacyIds.has(p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{money(p.amount)}</p>
                          <p className="text-xs text-gray-500">{dmy(p.date)} · {p.mode.replace('_', ' ')}{p.reference ? ` · Ref: ${p.reference}` : ''}{legacy ? ' · from an earlier monthly bill' : ''}</p>
                          {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                        </div>
                        {!legacy && (
                          <div className="flex shrink-0">
                            <button onClick={() => openPay(viewRow, p)} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-rose-700" aria-label={`Edit payment of ${inr(p.amount)}`}><Pencil size={16} /></button>
                            <button onClick={() => deletePayment(viewRow, p.id)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600" aria-label={`Delete payment of ${inr(p.amount)}`}><Trash2 size={16} /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </Sheet>

      {/* edit the bill */}
      {editRow && (
        <BillEditor open onClose={() => setEditId(null)} bill={editRow.calc} from={from} to={to} edits={editRow.edits}
          adjustment={editRow.view.adjustment} invoiceNo={editRow.invoiceNo} runGst={gst} runDate={effectiveBillDate} company={settings as CompanySettings} />
      )}

      {/* payment: record a new one or change one */}
      <Sheet open={!!payRow} onClose={() => { setPayId(null); setPayEdit(null); }} title={payEdit ? 'Edit payment' : 'Record payment'}
        footer={<div className="flex gap-2"><Button className="flex-1" onClick={() => { setPayId(null); setPayEdit(null); }}>Cancel</Button><Button variant="success" className="flex-1" onClick={savePayment}>{payEdit ? 'Save changes' : 'Record payment'}</Button></div>}>
        {payRow && (
          <>
            <div className="mb-4 rounded-2xl bg-black/[0.04] px-4 py-3 text-sm text-gray-600">
              <p>Party: <span className="font-semibold text-gray-900">{partyName(payRow.bill.party)}</span></p>
              <p>Balance: <span className="font-semibold text-red-600">{money(payRow.balance)}</span></p>
            </div>
            <div className="space-y-3">
              <Field label="Payment date"><input type="date" value={payForm.date || ''} onChange={e => setPayForm({ ...payForm, date: e.target.value })} className="input-field" /></Field>
              <Field label="Amount"><input type="number" inputMode="decimal" value={payForm.amount || ''} onChange={e => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })} className="input-field" /></Field>
              <Field label="Payment mode">
                <select value={payForm.mode} onChange={e => setPayForm({ ...payForm, mode: e.target.value as BillPayment['mode'] })} className="input-field">
                  <option value="cash">Cash</option><option value="cheque">Cheque</option><option value="bank_transfer">Bank transfer</option><option value="upi">UPI</option><option value="other">Other</option>
                </select>
              </Field>
              <Field label="Reference / cheque no. / UTR"><input type="text" value={payForm.reference || ''} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} className="input-field" /></Field>
              <Field label="Notes"><textarea rows={2} value={payForm.notes || ''} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} className="input-field resize-none" /></Field>
            </div>
          </>
        )}
      </Sheet>
    </Page>
  );
}

// src/pages/BrokerageBills.tsx
// One brokerage bill per party for a chosen period (all the contracts where the party bought and/or sold),
// with two documents per bill: the "Brokerage Bill" and the "Invoice", both printed on the company letterhead.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle, Calendar, CheckCircle, ChevronLeft, ChevronRight, Clock, DollarSign, Download, Edit2, Eye,
  FileText, Loader2, Printer, Receipt, Search, Share2, Trash2, X, AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import type { BillPayment, CompanySettings } from '../types';
import { billTotals, buildPartyBills, partyName, type BillTotals, type PartyBill } from '../billing/calc';
import { renderBillDocs, dmy, inr, type BillDoc, type BillKind, type PdfAssets } from '../billing/pdf';
import { loadBillAssets } from '../billing/assets';
import { downloadFile, makeZip, previewPdf, printPdf, safeName, shareFile } from '../billing/output';
import { getStoredFont, onFontChange } from '../contractNote/fontStore';
import LetterheadToggle from '../components/LetterheadToggle';
import { usePlainCopy } from '../utils/usePlainCopy';
import {
  billedElsewhere, getPeriodView, issueBill, savePeriodAdjustment, savePeriodPayments, setInvoiceNo,
  useBillVersion, type PeriodView,
} from '../utils/billStore';

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
  bill: PartyBill;
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

const statusStyle = (s: string) =>
  s === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : s === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200';
const StatusIcon = ({ s }: { s: string }) =>
  s === 'paid' ? <CheckCircle size={14} className="text-green-600" /> : s === 'partial' ? <Clock size={14} className="text-amber-600" /> : <AlertCircle size={14} className="text-red-500" />;

function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50" onClick={onClose}>
      <div
        className={`bg-white rounded-t-2xl sm:rounded-2xl w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'} max-h-[92vh] overflow-y-auto p-5 sm:p-6`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

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
  const [adjId, setAdjId] = useState<string | null>(null);
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
    return bills.map(bill => {
      const view = getPeriodView(bill.partyId, from, to);
      const totals = billTotals(bill.subtotal, view.adjustment.amount, gst, bill.party, settings);
      const paid = Math.round(view.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) * 100) / 100;
      const balance = Math.max(0, Math.round((totals.total - paid) * 100) / 100);
      const status: Row['status'] = totals.total > 0 && paid >= totals.total - 0.005 ? 'paid' : paid > 0 ? 'partial' : 'pending';
      const keys = bill.lines.map(l => `${l.contractId}:${l.side}`);
      const rec = view.record;
      const stale = rec.pdfTotal !== undefined && (
        Math.abs(rec.pdfTotal - totals.total) > 0.004 ||
        !rec.keys || rec.keys.length !== keys.length || keys.some(k => !rec.keys!.includes(k))
      );
      return { bill, view, totals, paid, balance, status, invoiceNo: rec.invoiceNo, stale, elsewhere: billedElsewhere(bill.partyId, from, to, keys) };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
    // billVersion changes whenever a payment / invoice record changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts, parties, from, to, gst, settings, billVersion]);

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
  const adjRow = byId(adjId);

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
    billDate: effectiveBillDate,
    adjustment: r.view.adjustment.amount,
    adjustmentNote: r.view.adjustment.note,
    gstPercent: gst,
  });

  /** takes the party's invoice number (or the next free one) and remembers what is on this bill */
  const number = (r: Row): number => {
    const { invoiceNo, saved } = issueBill(
      r.bill.partyId, from, to,
      { partyName: partyName(r.bill.party), billDate: effectiveBillDate, keys: r.bill.lines.map(l => `${l.contractId}:${l.side}`), total: r.totals.total },
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
  const makeOne = (r: Row, k: BillKind) => guarded('Preparing', async () => {
    const files = await build([r], k, 'files');
    if (files?.[0]) await deliver(files[0].bytes, files[0].name, files[0].title);
  });

  /** one party, one document -> a chosen action (used by the details window) */
  const actOne = (r: Row, k: BillKind, action: 'download' | 'share' | 'preview' | 'print') => {
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
    const rs = selectedRows;
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

  /* ================= payments / adjustments ================= */
  const [payForm, setPayForm] = useState<Partial<BillPayment>>({ date: todayIso(), amount: 0, mode: 'bank_transfer', reference: '', notes: '' });
  const [adjForm, setAdjForm] = useState({ amount: '', note: '' });
  const [noInput, setNoInput] = useState('');
  useEffect(() => { setNoInput(viewRow?.invoiceNo ? String(viewRow.invoiceNo) : ''); }, [viewId, viewRow?.invoiceNo]);

  const openPay = (r: Row) => {
    setPayForm({ date: todayIso(), amount: r.balance || 0, mode: 'bank_transfer', reference: '', notes: '' });
    setPayId(r.bill.partyId);
  };
  const addPayment = () => {
    if (!payRow) return;
    const amount = Number(payForm.amount) || 0;
    if (amount <= 0) { toast.error('Enter a valid amount'); return; }
    const p: BillPayment = {
      id: crypto.randomUUID(), date: payForm.date || todayIso(), amount, mode: (payForm.mode as BillPayment['mode']) || 'bank_transfer',
      reference: payForm.reference || '', notes: payForm.notes || '', createdAt: new Date().toISOString(),
    };
    const own = payRow.view.record.payments || [];
    savePeriodPayments(payRow.bill.partyId, from, to, [...own, p]).catch(() => toast.error('Could not save the payment to the cloud. Check your connection.'));
    setPayId(null);
    toast.success('Payment recorded');
  };
  const deletePayment = (r: Row, id: string) => {
    if (!window.confirm('Delete this payment?')) return;
    const own = (r.view.record.payments || []).filter(p => p.id !== id);
    savePeriodPayments(r.bill.partyId, from, to, own).catch(() => toast.error('Could not save to the cloud. Check your connection.'));
  };
  const openAdj = (r: Row) => {
    setAdjForm({ amount: r.view.adjustment.amount ? String(r.view.adjustment.amount) : '', note: r.view.adjustment.note });
    setAdjId(r.bill.partyId);
  };
  const saveAdj = () => {
    if (!adjRow) return;
    const amount = Math.round((Number(adjForm.amount) || 0) * 100) / 100;
    savePeriodAdjustment(adjRow.bill.partyId, from, to, { amount, note: adjForm.note.trim() })
      .catch(() => toast.error('Could not save the adjustment to the cloud. Check your connection.'));
    setAdjId(null);
    toast.success('Bill adjusted');
  };
  const saveNo = (r: Row) => {
    setInvoiceNo(r.bill.partyId, from, to, Number(noInput))
      .then(() => toast.success('Invoice number saved'))
      .catch((e: any) => toast.error(e?.message || 'Could not save the number.'));
  };

  /* ================= screen ================= */
  const step = (dir: 1 | -1) => { if (kind !== 'custom') setAnchor(a => shiftAnchor(kind, a, dir)); };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="max-w-6xl mx-auto pt-16 lg:pt-8 px-4 lg:px-8 pb-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Brokerage Bills</h1>
          <p className="text-sm text-gray-500 mt-1">
            One bill per party for the period, covering every contract they bought or sold. Make the Brokerage Bill and the Invoice for one party, or for everyone at once.
          </p>
        </div>

        {fontOk === false && (
          <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800 flex gap-2">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>The bill font is not set up yet. Open <Link to="/settings" className="underline font-medium">Settings</Link> and add your Verdana font once (the same one used for Contract Notes).</span>
          </div>
        )}
        {(missingBank || !settings.pan) && (
          <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800 flex gap-2">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>
              {!settings.pan ? 'PAN is empty. ' : ''}{missingBank ? 'Bank details are incomplete, so the Invoice will print without them. ' : ''}
              Fill them in <Link to="/settings" className="underline font-medium">Settings</Link>.
            </span>
          </div>
        )}

        {/* period + settings for this run */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Period</label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={kind}
                  onChange={e => {
                    const k = e.target.value as PeriodKind;
                    if (k === 'custom') setCustom({ from, to });
                    else setAnchor(from.slice(0, 8) + '01');
                    setKind(k);
                  }}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-base sm:text-sm"
                >
                  <option value="month">Month</option>
                  <option value="quarter">Quarter</option>
                  <option value="half">Half year</option>
                  <option value="fy">Financial year</option>
                  <option value="custom">Custom dates</option>
                </select>
                {kind === 'custom' ? (
                  <>
                    <input type="date" value={custom.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-base sm:text-sm" />
                    <span className="text-gray-400 text-sm">to</span>
                    <input type="date" value={custom.to} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-base sm:text-sm" />
                  </>
                ) : (
                  <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200">
                    <button onClick={() => step(-1)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Previous"><ChevronLeft size={18} /></button>
                    <div className="flex items-center gap-2 px-2 min-w-[170px] justify-center">
                      <Calendar size={15} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{periodLabel(kind, from, to)}</span>
                    </div>
                    <button onClick={() => step(1)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Next"><ChevronRight size={18} /></button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:w-80">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bill / invoice date</label>
                <input type="date" value={effectiveBillDate} onChange={e => setBillDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-base sm:text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">GST on brokerage %</label>
                <input
                  type="number" min="0" step="0.5" inputMode="decimal"
                  value={gstInput === '' ? (Number(settings.brokerageGstPercent) || '') : gstInput}
                  placeholder="0"
                  onChange={e => setGstInput(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-base sm:text-sm"
                />
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <LetterheadToggle className="max-w-md" />
          </div>
        </div>

        {/* totals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">Parties / contract lines</p><p className="text-lg font-bold text-gray-900">{sum.parties} <span className="text-gray-400 text-sm font-normal">/ {sum.lines}</span></p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">Total billed</p><p className="text-lg font-bold text-gray-900">{money(sum.total)}</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">Received</p><p className="text-lg font-bold text-green-600">{money(sum.paid)}</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">Outstanding</p><p className="text-lg font-bold text-red-600">{money(sum.balance)}</p></div>
        </div>

        {/* filters */}
        {rows.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search party" className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-base sm:text-sm" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'pending', 'partial', 'paid'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-sm border capitalize ${statusFilter === s ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{s}</button>
              ))}
              <button onClick={toggleAll} className="px-3 py-2 rounded-lg text-sm border bg-white text-gray-700 border-gray-200 hover:bg-gray-50">
                {allShownSelected ? 'Clear selection' : 'Select all'}
              </button>
            </div>
          </div>
        )}

        {/* the bills */}
        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
            <DollarSign size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No brokerage to bill for {periodLabel(kind, from, to)}</p>
            <p className="text-sm text-gray-400 mt-1">Bills appear here as soon as there are contracts with brokerage in the period.</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center text-sm text-gray-500">No party matches.</div>
        ) : (
          <div className="space-y-3">
            {shown.map(r => {
              const id = r.bill.partyId;
              return (
                <div key={id} className={`bg-white rounded-2xl border overflow-hidden ${selected.has(id) ? 'border-rose-300 ring-1 ring-rose-200' : 'border-gray-200'}`}>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} className="mt-1.5 w-5 h-5 accent-rose-600 shrink-0" aria-label={'Select ' + partyName(r.bill.party)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{partyName(r.bill.party)}</h3>
                            <p className="text-xs text-gray-500">
                              {r.bill.lines.length} contract line{r.bill.lines.length !== 1 ? 's' : ''} • {r.bill.totalQtyMT.toFixed(3)} MT
                              {r.invoiceNo ? <> • Invoice No. <span className="font-medium text-gray-700">{r.invoiceNo}</span></> : null}
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusStyle(r.status)}`}>
                            <StatusIcon s={r.status} />{r.status === 'paid' ? 'Paid' : r.status === 'partial' ? 'Partial' : 'Pending'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div className="bg-gray-50 rounded-xl p-2.5">
                            <p className="text-[11px] text-gray-500">Bill total</p>
                            <p className="text-base font-bold text-gray-900">{money(r.totals.total)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-2.5">
                            <p className="text-[11px] text-gray-500">Received</p>
                            <p className="text-base font-bold text-green-600">{money(r.paid)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-2.5">
                            <p className="text-[11px] text-gray-500">Balance</p>
                            <p className="text-base font-bold text-red-600">{money(r.balance)}</p>
                          </div>
                        </div>

                        {(r.totals.adjustment !== 0 || r.totals.gstPercent > 0) && (
                          <p className="text-[11px] text-gray-500 mt-1.5">
                            Brokerage {money(r.totals.subtotal)}
                            {r.totals.adjustment !== 0 ? ` ${r.totals.adjustment > 0 ? '+' : '-'} adjustment ${inr(Math.abs(r.totals.adjustment))}` : ''}
                            {r.totals.gstPercent > 0 ? ` + GST ${inr(r.totals.cgst + r.totals.sgst + r.totals.igst)}` : ''}
                          </p>
                        )}
                        {r.stale && (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mt-2 flex gap-1.5">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" /> This bill has changed since the last PDF was made. Make it again before sending.
                          </p>
                        )}
                        {r.elsewhere.length > 0 && (
                          <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 mt-2">
                            {r.elsewhere.map(e => `${e.count} contract line${e.count > 1 ? 's are' : ' is'} also on invoice ${e.invoiceNo ?? '?'} (${e.from ? dmy(e.from) : ''} - ${e.to ? dmy(e.to) : ''})`).join('; ')}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-3">
                          <button disabled={!!busy} onClick={() => makeOne(r, 'bill')} className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50">
                            <FileText size={16} /> Brokerage Bill
                          </button>
                          <button disabled={!!busy} onClick={() => makeOne(r, 'invoice')} className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium hover:bg-rose-100 disabled:opacity-50">
                            <Receipt size={16} /> Invoice
                          </button>
                          <button onClick={() => setViewId(id)} className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
                            <Eye size={16} /> Details
                          </button>
                          <button onClick={() => openPay(r)} className="flex items-center gap-1.5 px-3.5 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100">
                            <DollarSign size={16} /> Payment
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* selection bar */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-lg px-4 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <p className="text-sm text-gray-700"><strong>{selectedRows.length}</strong> selected</p>
            <div className="flex gap-2">
              <button onClick={() => setSelected(new Set())} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Clear</button>
              <button disabled={!!busy} onClick={() => setShowBulk(true)} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50">
                <Download size={16} /> Generate for {selectedRows.length}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* busy */}
      {busy && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center">
            <Loader2 className="animate-spin mx-auto text-rose-600 mb-3" size={30} />
            <p className="text-sm font-medium text-gray-900 break-words">{busy.label}</p>
            {busy.total > 1 && (
              <>
                <div className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden"><div className="h-full bg-rose-600 transition-all" style={{ width: `${Math.round((busy.done / busy.total) * 100)}%` }} /></div>
                <p className="text-xs text-gray-500 mt-1.5">{busy.done} of {busy.total}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* bulk options */}
      {showBulk && (
        <Modal onClose={() => setShowBulk(false)}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Generate for {selectedRows.length} part{selectedRows.length === 1 ? 'y' : 'ies'}</h2>
            <button onClick={() => setShowBulk(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
          </div>
          <p className="text-sm text-gray-500 mb-4">{periodLabel(kind, from, to)} • bill date {dmy(effectiveBillDate)}</p>
          <LetterheadToggle className="mb-4" />
          <label className="block text-sm font-medium text-gray-700 mb-1.5">What to make</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {([['bill', 'Brokerage Bills'], ['invoice', 'Invoices'], ['both', 'Both']] as const).map(([v, t]) => (
              <button key={v} onClick={() => setBulkDocs(v)} className={`px-2 py-2.5 rounded-xl text-sm border ${bulkDocs === v ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-gray-700 border-gray-200'}`}>{t}</button>
            ))}
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">How to get them</label>
          <div className="space-y-2 mb-4">
            <button onClick={() => setBulkMode('files')} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border ${bulkMode === 'files' ? 'border-rose-400 bg-rose-50' : 'border-gray-200'}`}>
              <span className="font-medium text-gray-900">Separate file for each party (ZIP)</span>
              <span className="block text-xs text-gray-500">To send each party their own bill. {plain ? 'Small files (no letterhead).' : 'About 3 MB per file.'}</span>
            </button>
            <button onClick={() => setBulkMode('combined')} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border ${bulkMode === 'combined' ? 'border-rose-400 bg-rose-50' : 'border-gray-200'}`}>
              <span className="font-medium text-gray-900">One PDF with every party (for printing)</span>
              <span className="block text-xs text-gray-500">Each party starts on a new page. Small file.</span>
            </button>
          </div>
          {bulkMode === 'files' && selectedRows.length * (bulkDocs === 'both' ? 2 : 1) > 24 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2 mb-4">
              That is a lot of files for a phone. If it stops, select fewer parties at a time (about 12) or choose the single PDF.
            </p>
          )}
          <p className="text-xs text-gray-500 mb-4">Invoice numbers are given in party order and stay the same if you make the bill again.</p>
          <button onClick={runBulk} className="w-full px-4 py-3 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700">Generate</button>
        </Modal>
      )}

      {/* file ready (phones sometimes need one more tap before the share sheet may open) */}
      {ready && (
        <Modal onClose={() => setReady(null)}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-900">File is ready</h2>
            <button onClick={() => setReady(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
          </div>
          <p className="text-sm text-gray-600 mb-4 break-all">{ready.name}</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={async () => { const r = await shareFile(ready.bytes, ready.name, ready.title); if (r === 'shared') setReady(null); else if (r === 'unsupported') toast('Sharing is not available here. Use Download.'); }} className="flex items-center justify-center gap-2 px-3 py-3 bg-rose-600 text-white rounded-xl text-sm font-medium"><Share2 size={16} /> Share</button>
            <button onClick={() => { downloadFile(ready.bytes, ready.name); setReady(null); }} className="flex items-center justify-center gap-2 px-3 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium"><Download size={16} /> Download</button>
          </div>
        </Modal>
      )}

      {/* details */}
      {viewRow && (
        <Modal onClose={() => setViewId(null)} wide>
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 break-words">{partyName(viewRow.bill.party)}</h2>
              <p className="text-sm text-gray-500">{periodLabel(kind, from, to)}</p>
            </div>
            <button onClick={() => setViewId(null)} className="p-2 hover:bg-gray-100 rounded-lg shrink-0"><X size={20} /></button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Bill total</p><p className="text-sm sm:text-base font-bold text-gray-900 whitespace-nowrap">{money(viewRow.totals.total)}</p></div>
            <div className="bg-green-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Received</p><p className="text-sm sm:text-base font-bold text-green-600 whitespace-nowrap">{money(viewRow.paid)}</p></div>
            <div className="bg-red-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Balance</p><p className="text-sm sm:text-base font-bold text-red-600 whitespace-nowrap">{money(viewRow.balance)}</p></div>
          </div>

          {/* phone: one card per contract line */}
          <div className="sm:hidden space-y-2 mb-3">
            {viewRow.bill.lines.map(l => (
              <div key={l.contractId + l.side} className="border rounded-xl p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">#{l.contractNo} <span className="text-gray-400 font-normal">• {dmy(l.date)}</span> <span className={`ml-1 px-1.5 py-0.5 rounded text-[11px] ${l.type === 'Buy' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>{l.type}</span></p>
                    <p className="text-gray-700 break-words">{l.counterparty.name}{l.counterparty.city ? <span className="text-gray-400"> ({l.counterparty.city})</span> : null}</p>
                    <p className="text-xs text-gray-500">{l.product} • {l.qtyMT.toFixed(3)} MT @ {l.ratePerMT !== null ? inr(l.ratePerMT) + ' / MT' : inr(l.rate) + ' ' + l.rateUnit.toLowerCase()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900">{inr(l.brokerage)}</p>
                    <p className="text-[11px] text-gray-400">{l.basis}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* tablet / computer: table */}
          <div className="hidden sm:block border rounded-xl overflow-x-auto mb-3">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-gray-50">
                <tr>
                  {['Cont.', 'Date', 'Other party', 'Item', 'Type', 'MT', 'Rate / MT', 'Brokerage'].map((h, i) => (
                    <th key={h} className={`px-3 py-2 text-xs font-medium text-gray-500 ${i >= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {viewRow.bill.lines.map(l => (
                  <tr key={l.contractId + l.side}>
                    <td className="px-3 py-2 font-medium">#{l.contractNo}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{dmy(l.date)}</td>
                    <td className="px-3 py-2">{l.counterparty.name}<span className="block text-xs text-gray-400">{l.counterparty.city}</span></td>
                    <td className="px-3 py-2">{l.product}</td>
                    <td className="px-3 py-2">{l.type}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{l.qtyMT.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{l.ratePerMT !== null ? inr(l.ratePerMT) : inr(l.rate) + ' ' + l.rateUnit.toLowerCase()}</td>
                    <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{inr(l.brokerage)}<span className="block text-[10px] text-gray-400 font-normal">{l.basis}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* totals */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-sm space-y-1">
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
            <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1"><span className="font-semibold">Total</span><span className="font-bold">{inr(viewRow.totals.total)}</span></div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div className="border rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1.5">Invoice number (shared by the Brokerage Bill and the Invoice)</p>
              {viewRow.invoiceNo || noInput ? (
                <div className="flex gap-2">
                  <input value={noInput} onChange={e => setNoInput(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="flex-1 min-w-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-base sm:text-sm" />
                  <button onClick={() => saveNo(viewRow)} disabled={!noInput || Number(noInput) === viewRow.invoiceNo} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-40">Save</button>
                </div>
              ) : <p className="text-sm text-gray-500">Given automatically the first time you make a PDF.</p>}
            </div>
            <div className="border rounded-xl p-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-gray-500">Adjustment (discount / extra)</p>
                <p className="text-sm font-medium text-gray-900">{viewRow.totals.adjustment ? inr(viewRow.totals.adjustment) : 'None'}</p>
              </div>
              <button onClick={() => openAdj(viewRow)} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"><Edit2 size={14} /> Edit</button>
            </div>
          </div>

          {(['bill', 'invoice'] as const).map(k => (
            <div key={k} className="border rounded-xl p-3 mb-3">
              <p className="text-sm font-semibold text-gray-900 mb-2">{k === 'bill' ? 'Brokerage Bill' : 'Invoice'}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button disabled={!!busy} onClick={() => actOne(viewRow, k, 'download')} className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"><Download size={15} /> Download</button>
                <button disabled={!!busy} onClick={() => actOne(viewRow, k, 'share')} className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50"><Share2 size={15} /> Share</button>
                <button disabled={!!busy} onClick={() => actOne(viewRow, k, 'preview')} className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50"><Eye size={15} /> Preview</button>
                <button disabled={!!busy} onClick={() => actOne(viewRow, k, 'print')} className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50"><Printer size={15} /> Print</button>
              </div>
            </div>
          ))}

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Payments received</h3>
              <button onClick={() => openPay(viewRow)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium"><DollarSign size={14} /> Add payment</button>
            </div>
            {viewRow.view.payments.length === 0 ? <p className="text-sm text-gray-400">No payment recorded yet.</p> : (
              <div className="space-y-2">
                {viewRow.view.payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium">{money(p.amount)}</p>
                      <p className="text-xs text-gray-500">{dmy(p.date)} • {p.mode.replace('_', ' ')}{p.reference ? ` • Ref: ${p.reference}` : ''}{viewRow.view.legacyIds.has(p.id) ? ' • from an earlier monthly bill' : ''}</p>
                      {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                    </div>
                    {!viewRow.view.legacyIds.has(p.id) && (
                      <button onClick={() => deletePayment(viewRow, p.id)} className="p-2 text-gray-400 hover:text-red-600" aria-label="Delete payment"><Trash2 size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* payment */}
      {payRow && (
        <Modal onClose={() => setPayId(null)}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Record payment</h2>
            <button onClick={() => setPayId(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
          </div>
          <div className="mb-4 p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
            <p>Party: <span className="font-medium text-gray-900">{partyName(payRow.bill.party)}</span></p>
            <p>Balance: <span className="font-medium text-red-600">{money(payRow.balance)}</span></p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment date</label>
              <input type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input type="number" inputMode="decimal" value={payForm.amount || ''} onChange={e => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment mode</label>
              <select value={payForm.mode} onChange={e => setPayForm({ ...payForm, mode: e.target.value as BillPayment['mode'] })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-sm">
                <option value="cash">Cash</option><option value="cheque">Cheque</option><option value="bank_transfer">Bank transfer</option><option value="upi">UPI</option><option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference / cheque no. / UTR</label>
              <input type="text" value={payForm.reference || ''} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea rows={2} value={payForm.notes || ''} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-sm resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setPayId(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
            <button onClick={addPayment} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium">Record payment</button>
          </div>
        </Modal>
      )}

      {/* adjustment */}
      {adjRow && (
        <Modal onClose={() => setAdjId(null)}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Adjust the bill</h2>
            <button onClick={() => setAdjId(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
          </div>
          <p className="text-sm text-gray-600 mb-4">For <strong>{partyName(adjRow.bill.party)}</strong>. Use a minus sign for a discount. It is printed on the bill and the invoice.</p>
          <div className="p-3 bg-gray-50 rounded-xl flex justify-between text-sm mb-4">
            <span className="text-gray-500">Calculated brokerage</span><span className="font-semibold">{money(adjRow.totals.subtotal)}</span>
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment amount (+ / -)</label>
          <input type="number" inputMode="decimal" value={adjForm.amount} onChange={e => setAdjForm({ ...adjForm, amount: e.target.value })} placeholder="0" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-base sm:text-sm" />
          <p className="text-xs text-gray-500 mt-1 mb-4">New brokerage: <strong>{money(adjRow.totals.subtotal + (Number(adjForm.amount) || 0))}</strong></p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason (printed)</label>
          <input type="text" value={adjForm.note} onChange={e => setAdjForm({ ...adjForm, note: e.target.value })} placeholder="e.g. Discount" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-base sm:text-sm" />
          <div className="flex gap-3 mt-6">
            <button onClick={() => setAdjId(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
            <button onClick={saveAdj} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium">Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

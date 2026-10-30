import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Download, Share2, Printer, Save, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../hooks/useAuthStore';
import type { Contract } from '../types';
import { useContractNote } from '../contractNote/useContractNote';
import {
  applyOverrides, decodeOverrides, diffOverrides, encodeOverrides, getValue, setValue, type Overrides,
} from '../contractNote/mapping';
import { labelOf, splitEdits } from '../contractNote/writeback';
import { todayIST } from '../../server/reminders/plan.js';
import { v4 as uuid } from 'uuid';
import {
  copyName, downloadBytes, noteFileName, noteTitle, printBytes, shareBytes,
} from '../contractNote/service';
import type { NoteIssue, Tag } from '../contractNote/types';
import LetterheadToggle from './LetterheadToggle';
import { usePlainCopy } from '../utils/usePlainCopy';

interface FieldDef { key: string; label: string; rows?: number; half?: boolean; type?: string; hint?: string }
interface Group { title: string; fields: FieldDef[] }

const GROUPS: Group[] = [
  { title: 'Contract', fields: [
    { key: 'no', label: 'Contract no.', half: true },
    { key: 'date', label: 'Date', half: true, type: 'date' },
  ] },
  { title: 'Buyer', fields: [
    { key: 'buyer.name', label: 'Name' },
    { key: 'buyer.addr', label: 'Address (max 2 lines)', rows: 2 },
    { key: 'buyer.city', label: 'City line', hint: 'e.g. UNAVA, GUJARAT, 384160' },
    { key: 'buyer.gst', label: 'GSTIN' },
  ] },
  { title: 'Seller', fields: [
    { key: 'seller.name', label: 'Name' },
    { key: 'seller.addr', label: 'Address (max 2 lines)', rows: 2 },
    { key: 'seller.city', label: 'City line', hint: 'e.g. BEDI, RAJKOT, GUJARAT, 360003' },
    { key: 'seller.gst', label: 'GSTIN' },
  ] },
  { title: 'Goods', fields: [
    { key: 'product.name', label: 'Product' },
    { key: 'product.spec', label: 'Specification' },
    { key: 'qty.value', label: 'Quantity', half: true },
    { key: 'qty.unit', label: 'Qty unit', half: true },
    { key: 'price.value', label: 'Price (₹)', half: true },
    { key: 'price.unit', label: 'Price unit', half: true },
    { key: 'packing', label: 'Packing' },
  ] },
  { title: 'Terms', fields: [
    { key: 'loading', label: 'Loading condition' },
    { key: 'payment.B', label: 'Payment (buyer copy)' },
    { key: 'payment.S', label: 'Payment (seller copy)' },
    { key: 'brokerage.B', label: 'Brokerage (buyer copy)', half: true, hint: 'a number like 0.25 becomes "0.25% OF BILL VALUE"' },
    { key: 'brokerage.S', label: 'Brokerage (seller copy)', half: true },
    { key: 'other', label: 'Other terms', rows: 2 },
  ] },
];

// some browsers (e.g. headless / older ones) have no built-in PDF viewer, and would download instead of preview
const canInlinePdf = typeof navigator === 'undefined' || (navigator as any).pdfViewerEnabled !== false;

const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-200';

export default function ContractNoteModal({ contract, initialTag = 'B', onClose }: { contract: Contract; initialTag?: Tag; onClose: () => void }) {
  const { updateContract } = useAppStore();
  const gst = useAppStore(st => st.settings.defaultGstPercent);
  const [ov, setOv] = useState<Overrides>(() => decodeOverrides(contract.noteOverrides));
  const [tag, setTag] = useState<Tag>(initialTag);
  const [saving, setSaving] = useState(false);
  const [plain] = usePlainCopy();
  const note = useContractNote(contract, ov, 350, plain);
  const { values, base, issues, blocking, pdfs } = note;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const pdf = pdfs[tag];
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pdf) { setUrl(null); return; }
    const u = URL.createObjectURL(new Blob([pdf as BlobPart], { type: 'application/pdf' }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pdf]);

  const issueByKey = useMemo(() => {
    const m = new Map<string, NoteIssue>();
    for (const i of [...issues.B, ...issues.S]) {
      const prev = m.get(i.key);
      if (!prev || (prev.level === 'warn' && i.level !== 'warn') || (i.level === 'overflow' && prev.level === 'overflow' && (i.over || 0) > (prev.over || 0))) m.set(i.key, i);
    }
    return m;
  }, [issues]);

  const edit = (key: string, val: string) => {
    if (!values) return;
    // store the change relative to what the contract itself says
    const next = setValue(values, key, val);
    setOv(diffOverrides(base!, next));
  };

  const dirty = useMemo(() => {
    if (!base || !values) return false;
    const saved = decodeOverrides(contract.noteOverrides);
    return JSON.stringify(diffOverrides(base, values)) !== JSON.stringify(diffOverrides(base, applyOverrides(base, saved)));
  }, [base, values, contract.noteOverrides]);

  const ready = !!pdf && !blocking[tag] && !note.rendering;
  const fileName = noteFileName(values?.no || contract.contractNo, tag, plain);
  const title = noteTitle(values?.no || contract.contractNo, tag, plain);

  const doShare = async () => {
    if (!pdf) return;
    const r = await shareBytes(pdf, fileName, title);
    if (r === 'unsupported') { downloadBytes(pdf, fileName); toast.success('Downloaded'); }
    else if (r === 'blocked') toast.error('Could not open the share sheet. Tap Share again.');
  };
  const doPrint = async () => {
    if (!pdf) return;
    const r = await printBytes(pdf, fileName, title);
    if (r === 'unsupported') toast.error('Printing is not available in this browser. Download the PDF and print it from there.');
  };
  // what this edit will do: which changes go into the contract, and which stay as wording only on the note
  const split = useMemo(() => (values ? splitEdits(contract, values, { defaultGstPercent: gst }) : null), [contract, values, gst]);
  const noteOnly = useMemo(() => new Set(Object.keys(split?.overrides || {})), [split]);
  const goesToContract = useMemo(() => new Set(split?.moved || []), [split]);

  const save = async () => {
    if (!values || !split) return;
    setSaving(true);
    try {
      const moved = [...new Set(split.moved.map(labelOf))];
      const event = moved.length ? { id: uuid(), type: 'note' as const, date: todayIST(), text: `Contract updated from the contract note: ${moved.join(', ')}`, at: Date.now() } : null;
      await updateContract(contract.id, { ...split.patch, noteOverrides: encodeOverrides(split.overrides), ...(event ? { timeline: [...(contract.timeline || []), event] } : {}) });
      setOv(split.overrides);
      toast.success(moved.length ? 'Saved: the contract is updated too' : 'Saved on this note');
    } catch {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  };
  const resetKey = (key: string) => { if (base && values) setOv(diffOverrides(base, setValue(values, key, getValue(base, key)))); };
  const reset = () => setOv({});

  const tagIssues = issues[tag];

  return (
    <div className="fixed inset-0 z-[60] bg-white overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg" aria-label="Close"><X className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base truncate">Contract Note #{contract.contractNo}</h2>
          <p className="text-xs text-gray-500">{plain ? 'Print copy without letterhead · same placement' : 'Exact original format · Verdana · one page each'}</p>
        </div>
        {dirty && (
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white rounded-xl text-xs font-medium hover:bg-rose-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> Save to contract
          </button>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---------- preview + actions ---------- */}
        <div className="lg:order-2 lg:sticky lg:top-20 self-start space-y-3">
          {note.fontMissing && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <p className="font-medium">The Verdana font has not been added yet.</p>
              <p className="mt-1">Add it once in <Link to="/settings" onClick={onClose} className="underline font-medium">Settings → Contract Note font</Link>. It is saved in your own Firebase, so every device gets it.</p>
            </div>
          )}
          {note.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{note.error}</div>
          )}
          {note.fontProblems.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>The stored font is not identical to the design font: {note.fontProblems.join(' ')} Spacing may differ slightly. Upload the original Verdana in Settings.</span>
            </div>
          )}

          <LetterheadToggle />

          <div className="flex gap-2">
            {(['B', 'S'] as Tag[]).map(t => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border ${tag === t ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                {copyName(t)} copy {blocking[t] ? '⚠' : ''}
              </button>
            ))}
          </div>

          {tagIssues.length > 0 && (
            <ul className="space-y-1">
              {tagIssues.map((i, n) => (
                <li key={n} className={`text-xs px-3 py-2 rounded-lg ${i.level === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700'}`}>{i.msg}</li>
              ))}
            </ul>
          )}

          <div className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden relative" style={{ aspectRatio: '595 / 842' }}>
            {url && canInlinePdf ? (
              <iframe key={url} title="Contract note preview" src={url + '#toolbar=0&navpanes=0&view=Fit'} className="w-full h-full bg-white" />
            ) : url ? (
              <div className="h-full flex items-center justify-center text-center text-sm text-gray-500 p-6">
                This browser cannot show a PDF here. Your PDF is ready: use Share, Download or Print below.
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-500 gap-2">
                {note.loading || note.rendering ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</> : 'No preview'}
              </div>
            )}
            {url && note.rendering && (
              <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1 text-xs text-gray-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Updating</div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button disabled={!ready} onClick={doShare} className="flex items-center justify-center gap-1.5 px-3 py-3 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-40">
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button disabled={!ready} onClick={() => pdf && downloadBytes(pdf, fileName)} className="flex items-center justify-center gap-1.5 px-3 py-3 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium hover:bg-rose-100 disabled:opacity-40">
              <Download className="w-4 h-4" /> Download
            </button>
            <button disabled={!ready} onClick={doPrint} className="flex items-center justify-center gap-1.5 px-3 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-40">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
          {blocking[tag] && <p className="text-xs text-red-600">Fix the highlighted fields to enable these buttons.</p>}
        </div>

        {/* ---------- editable values ---------- */}
        <div className="lg:order-1 space-y-5">
          <p className="text-xs text-gray-500">
            These values come from the contract. Change anything here and the PDF updates. <b>Save to contract</b> writes your changes into the contract itself, so both always agree. Only wording the contract has no place for (such as the city line or the specification line) stays on the note, and is marked.
          </p>
          {GROUPS.map(g => (
            <section key={g.title} className="bg-white border border-gray-200 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-3">{g.title}</h3>
              <div className="grid grid-cols-2 gap-3">
                {g.fields.map(f => {
                  const val = values ? getValue(values, f.key) : '';
                  const issue = issueByKey.get(f.key);
                  const bad = issue && issue.level !== 'warn';
                  const cls = `${inputCls} ${bad ? 'border-red-400 bg-red-50' : issue ? 'border-amber-400' : 'border-gray-200'}`;
                  return (
                    <div key={f.key} className={f.half ? 'col-span-1' : 'col-span-2'}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                      {f.rows ? (
                        <textarea rows={f.rows} value={val} onChange={e => edit(f.key, e.target.value)} className={cls + ' resize-none'} />
                      ) : (
                        <input type={f.type || 'text'} value={f.type === 'date' ? val.slice(0, 10) : val} onChange={e => edit(f.key, e.target.value)} className={cls} />
                      )}
                      {issue ? <p className={`text-xs mt-1 ${bad ? 'text-red-600' : 'text-amber-700'}`}>{issue.msg}</p> : f.hint ? <p className="text-[11px] text-gray-400 mt-1">{f.hint}</p> : null}
                      {base && values && getValue(base, f.key) !== getValue(values, f.key) && (
                        <p className="text-[11px] mt-1 flex flex-wrap items-center gap-x-2 text-gray-500">
                          {noteOnly.has(f.key) ? <span className="text-amber-700">Only on this printed note</span> : goesToContract.has(f.key) ? <span className="text-emerald-700">Will update the contract</span> : null}
                          <button type="button" onClick={() => resetKey(f.key)} className="underline hover:no-underline">Use the contract's value</button>
                        </p>
                      )}
                    </div>
                  );
                })}
                {g.title === 'Goods' && values && (
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                      <input type="checkbox" checked={values.deliverySame} onChange={e => edit('deliverySame', e.target.checked ? '1' : '')} />
                      Delivery at: same as buyer
                    </label>
                    {!values.deliverySame && (
                      <>
                        <textarea rows={3} value={values.delivery} onChange={e => edit('delivery', e.target.value)} placeholder="Up to 3 lines" className={`${inputCls} resize-none ${issueByKey.get('delivery') ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                        {issueByKey.get('delivery') && <p className="text-xs mt-1 text-red-600">{issueByKey.get('delivery')!.msg}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>
          ))}
          <button onClick={reset} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
            <RotateCcw className="w-3.5 h-3.5" /> Reset to the contract's own values
          </button>
        </div>
      </div>
    </div>
  );
}

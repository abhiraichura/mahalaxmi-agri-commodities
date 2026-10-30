// "Edit bill": everything you may want to change on one party's bill for one period.
//  - the invoice number and the bill date
//  - GST % for this bill only
//  - the brokerage of any contract line (a different amount), or a line left off this bill
//  - an adjustment (discount or extra) with the reason that is printed
// Nothing is saved until "Save changes". The PDFs, totals and "changed since last PDF" warning all follow what is saved here.
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { RotateCcw } from 'lucide-react';
import { Sheet, Button, Field } from '../ui';
import type { CompanySettings } from '../types';
import { applyLineEdits, billTotals, lineKey, partyName, round2, type BillEdits, type PartyBill } from './calc';
import { dmy, inr } from './pdf';
import { invoiceNoTaken, periodId, saveEdits, savePeriodAdjustment, setInvoiceNo } from '../utils/billStore';

interface Props {
  open: boolean;
  onClose: () => void;
  bill: PartyBill;                 // with `calculated` = the lines as worked out from the contracts
  from: string; to: string;
  edits: BillEdits;                // what is saved now
  adjustment: { amount: number; note: string };
  invoiceNo?: number;
  runGst: number;                  // the GST % chosen on the screen (used when this bill has none of its own)
  runDate: string;                 // the bill date chosen on the screen
  company: CompanySettings;
}

const money = (n: number) => 'Rs. ' + inr(n);
const numOrNull = (s: string) => { const t = s.trim(); if (t === '') return null; const n = Number(t); return isFinite(n) ? n : null; };

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative w-[46px] h-[28px] rounded-full shrink-0 transition-colors ${on ? 'bg-emerald-500' : 'bg-gray-300'}`}>
      <span className={`absolute top-[2px] left-[2px] w-6 h-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[18px]' : ''}`} />
    </button>
  );
}

export default function BillEditor({ open, onClose, bill, from, to, edits, adjustment, invoiceNo, runGst, runDate, company }: Props) {
  const calc = bill.calculated || bill.lines;
  const [no, setNo] = useState('');
  const [date, setDate] = useState('');
  const [gst, setGst] = useState('');
  const [adj, setAdj] = useState('');
  const [note, setNote] = useState('');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [off, setOff] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // every time the sheet opens it starts from what is saved
  useEffect(() => {
    if (!open) return;
    setNo(invoiceNo ? String(invoiceNo) : '');
    setDate(edits.date || '');
    setGst(edits.gst !== undefined ? String(edits.gst) : '');
    setAdj(adjustment.amount ? String(adjustment.amount) : '');
    setNote(adjustment.note || '');
    const a: Record<string, string> = {}; const o: Record<string, boolean> = {};
    for (const [k, e] of Object.entries(edits.lines)) { if (e.amount !== undefined) a[k] = String(e.amount); if (e.off) o[k] = true; }
    setAmounts(a); setOff(o);
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const draftEdits = useMemo<BillEdits>(() => {
    const lines: BillEdits['lines'] = {};
    for (const l of calc) {
      const k = lineKey(l);
      const amt = numOrNull(amounts[k] ?? '');
      const e: { amount?: number; off?: boolean } = {};
      if (off[k]) e.off = true;
      if (amt !== null && amt >= 0 && Math.abs(amt - l.brokerage) > 0.004) e.amount = round2(amt);
      if (e.off || e.amount !== undefined) lines[k] = e;
    }
    const g = numOrNull(gst);
    return { lines, ...(g !== null && g >= 0 ? { gst: g } : {}), ...(date ? { date } : {}) };
  }, [calc, amounts, off, gst, date]);

  const effective = useMemo(() => applyLineEdits(bill, draftEdits), [bill, draftEdits]);
  const adjAmount = round2(numOrNull(adj) ?? 0);
  const totals = billTotals(effective.subtotal, adjAmount, draftEdits.gst ?? runGst, bill.party, company);
  const before = billTotals(round2(calc.reduce((s, l) => s + l.brokerage, 0)), 0, runGst, bill.party, company);
  const noNum = Number(no);
  const noClash = no !== '' && Number.isInteger(noNum) && noNum > 0 && invoiceNoTaken(noNum, periodId(bill.partyId, from, to));
  const noBad = no !== '' && (!Number.isInteger(noNum) || noNum < 1);

  const save = async () => {
    if (noBad) { toast.error('The invoice number must be a whole number, 1 or more.'); return; }
    if (noClash) { toast.error(`Invoice number ${noNum} is already used by another bill.`); return; }
    setSaving(true);
    try {
      if (no !== '' && noNum !== invoiceNo) await setInvoiceNo(bill.partyId, from, to, noNum);
      await Promise.all([
        saveEdits(bill.partyId, from, to, draftEdits),
        savePeriodAdjustment(bill.partyId, from, to, { amount: adjAmount, note: note.trim() }),
      ]);
      toast.success('Bill updated');
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Could not save to the cloud. Check your connection.');
      setSaving(false);
    }
  };

  const changed = Object.keys(draftEdits.lines).length;
  return (
    <Sheet open={open} onClose={onClose} wide title="Edit bill"
      footer={(
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-gray-500 leading-tight">Bill total</p>
            <p className="text-lg font-bold text-gray-900 leading-tight">{money(totals.total)}</p>
          </div>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>Save changes</Button>
        </div>
      )}>
      <p className="text-sm text-gray-600 -mt-1 mb-4"><strong className="text-gray-900">{partyName(bill.party)}</strong> · {dmy(from)} – {dmy(to)}</p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Invoice no." error={noBad ? 'Whole number only' : noClash ? 'Already used by another bill' : undefined} hint={invoiceNo ? 'Shared by the bill and the invoice' : 'Left empty, the next number is given'}>
          <input value={no} onChange={e => setNo(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Auto" className="input-field" />
        </Field>
        <Field label="Bill date" hint={date ? <button type="button" className="text-rose-700 font-medium" onClick={() => setDate('')}>Use {dmy(runDate)}</button> : `Now ${dmy(runDate)}`}>
          <input type="date" value={date || runDate} onChange={e => setDate(e.target.value === runDate ? '' : e.target.value)} className="input-field" />
        </Field>
        <Field label="GST on brokerage %" hint={gst !== '' ? <button type="button" className="text-rose-700 font-medium" onClick={() => setGst('')}>Use {runGst}%</button> : `Now ${runGst}%`}>
          <input type="number" min="0" step="0.5" inputMode="decimal" value={gst} placeholder={String(runGst)} onChange={e => setGst(e.target.value)} className="input-field" />
        </Field>
        <Field label="Adjustment (+ / −)" hint="Minus sign for a discount">
          <input type="number" inputMode="decimal" value={adj} placeholder="0" onChange={e => setAdj(e.target.value)} className="input-field" />
        </Field>
      </div>
      <Field className="mt-3" label="Reason for the adjustment (printed)">
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Discount" className="input-field" />
      </Field>

      <div className="flex items-end justify-between mt-5 mb-1.5">
        <h3 className="section-label px-1">Contract lines</h3>
        {changed > 0 && <span className="text-xs text-amber-700 font-medium">{changed} changed</span>}
      </div>
      <div className="group-list">
        {calc.map(l => {
          const k = lineKey(l);
          const isOff = !!off[k];
          const amt = amounts[k];
          const edited = !isOff && amt !== undefined && numOrNull(amt) !== null && Math.abs((numOrNull(amt) as number) - l.brokerage) > 0.004;
          return (
            <div key={k} className={`px-4 py-3 ${isOff ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-gray-900">#{l.contractNo} <span className="text-gray-400 font-normal">· {dmy(l.date)}</span> <span className={`ml-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${l.type === 'Buy' ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'}`}>{l.type}</span></p>
                  <p className="text-xs text-gray-500 break-words">{l.counterparty.name}{l.counterparty.city ? ` (${l.counterparty.city})` : ''} · {l.product} · {l.qtyMT.toFixed(3)} MT</p>
                </div>
                <div className="flex items-center gap-2 shrink-0" title={isOff ? 'Left off this bill' : 'On this bill'}>
                  <span className="text-[11px] text-gray-500">{isOff ? 'Off' : 'On'}</span>
                  <Switch on={!isOff} onChange={v => setOff(o => ({ ...o, [k]: !v }))} label={`Include contract ${l.contractNo} on this bill`} />
                </div>
              </div>
              {!isOff && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="relative w-40">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rs.</span>
                    <input type="number" inputMode="decimal" min="0" step="0.01" aria-label={`Brokerage for contract ${l.contractNo}`}
                      value={amt ?? String(l.brokerage)} onChange={e => setAmounts(a => ({ ...a, [k]: e.target.value }))}
                      className={`input-field !py-2 !pl-10 text-right ${edited ? '!bg-amber-50' : ''}`} />
                  </div>
                  <span className="text-[11px] text-gray-500 min-w-0">{edited ? <>Worked out: {money(l.brokerage)}</> : l.basis}</span>
                  {edited && <button type="button" onClick={() => setAmounts(a => { const n = { ...a }; delete n[k]; return n; })} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-rose-700 min-h-[36px] px-1"><RotateCcw size={13} />Reset</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-black/[0.04] px-4 py-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-gray-600">Brokerage ({effective.lines.length} line{effective.lines.length === 1 ? '' : 's'})</span><span className="font-semibold">{money(totals.subtotal)}</span></div>
        {totals.adjustment !== 0 && <div className="flex justify-between"><span className="text-gray-600">Adjustment{note ? ` (${note})` : ''}</span><span>{money(totals.adjustment)}</span></div>}
        {totals.gstPercent > 0 && <div className="flex justify-between"><span className="text-gray-600">GST @ {totals.gstPercent}%</span><span>{money(totals.cgst + totals.sgst + totals.igst)}</span></div>}
        <div className="flex justify-between border-t border-black/10 pt-1.5 mt-1"><span className="font-semibold">Total</span><span className="font-bold">{money(totals.total)}</span></div>
        {Math.abs(totals.total - before.total) > 0.004 && <p className="text-xs text-gray-500">Before your changes: {money(before.total)}</p>}
      </div>
      {effective.lines.length === 0 && <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">Every line is left off, so there is nothing to print on this bill.</p>}
    </Sheet>
  );
}

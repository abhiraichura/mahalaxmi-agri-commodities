// "What is next for this contract": the loading question and the payment question, answered in two taps.
// Used on the Today screen (compact) and on the contract screen (full).
import { useMemo, useState } from 'react';
import { Truck, IndianRupee, Check, Clock, MessageCircle, Undo2, CalendarClock, BellOff, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { Contract } from '../types';
import { useAppStore } from '../hooks/useAuthStore';
import { Button, Sheet, Badge } from '../ui';
import { partyPhones } from '../broadcast/phone';
import { planFor, termsOf, addDays, diffDays, fmtDay, fmtDayYear, relDay, dealLine } from '../../server/reminders/plan.js';
import { loadedUpdate, notLoadedUpdate, paidUpdate, notPaidUpdate, undoLoaded, undoPaid, quickDays } from './actions';

const nameOf = (p?: { legalName?: string; name?: string }) => (p && (p.legalName || p.name)) || 'Party';

type Which = null | 'loaded' | 'not_loaded' | 'paid' | 'not_paid';

export default function NextStep({ contract, today, compact = false, initial = null }: { contract: Contract; today: string; compact?: boolean; initial?: Which }) {
  const { updateContract, parties, settings } = useAppStore();
  const plan = useMemo(() => planFor(contract, today), [contract, today]);
  const t = useMemo(() => termsOf(contract), [contract]);
  const [which, setWhich] = useState<Which>(initial);
  const [date, setDate] = useState(today);
  const [promised, setPromised] = useState<string>('');
  const [note, setNote] = useState('');
  const [close, setClose] = useState(true);
  const [busy, setBusy] = useState(false);

  if (plan.stage === 'draft' || plan.stage === 'cancelled') return null;

  const buyer = parties.find(p => p.id === contract.buyerId) || contract.buyer;
  const seller = parties.find(p => p.id === contract.sellerId) || contract.seller;
  const deal = dealLine(contract);
  const company = settings.name || 'Mahalaxmi Agri Commodities';

  const save = async (updates: Partial<Contract>, okText: string) => {
    setBusy(true);
    try { await updateContract(contract.id, updates); toast.success(okText); setWhich(null); setNote(''); setPromised(''); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save. Check your internet and try again.'); }
    finally { setBusy(false); }
  };
  const open = (w: Which) => { setDate(today); setPromised(''); setNote(''); setClose(true); setWhich(w); };

  const wa = (party: typeof buyer, text: string) => {
    const n = partyPhones(party).best;
    window.open(n ? `https://wa.me/${n.digits}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    if (!n) toast('No WhatsApp number saved for this party: pick the contact in WhatsApp.', { icon: 'ℹ️' });
  };
  const askSeller = () => wa(seller, `Namaste ${nameOf(seller)},\nContract no. ${contract.contractNo} (${deal}${buyer ? `, buyer ${nameOf(buyer)}` : ''}).\nLoading deadline: ${plan.loading.deadline ? fmtDay(plan.loading.deadline) : 'as per contract'}.\nPlease share the loading update (truck number / date).\n\nThank you,\n${company}`);
  const askBuyer = () => wa(buyer, `Namaste ${nameOf(buyer)},\nContract no. ${contract.contractNo} (${deal}, seller ${nameOf(seller)}) was loaded on ${plan.loading.loadedOn ? fmtDayYear(plan.loading.loadedOn) : 'the agreed date'}.\n${plan.payment.to ? `Payment is due by ${fmtDay(plan.payment.to)}.\n` : ''}Please share the payment update.\n\nThank you,\n${company}`);

  // ---------- what to show
  const L = plan.loading; const P = plan.payment;
  let tone: 'amber' | 'red' | 'blue' | 'green' | 'gray' = 'gray';
  let icon = <Truck size={20} />;
  let title = ''; let detail = ''; let badge: string | null = null;

  if (plan.stage === 'to_load') {
    icon = <Truck size={20} />;
    if (plan.ask === 'promised_loading') { tone = 'amber'; title = 'Promised for today: is it loaded?'; detail = `${nameOf(seller)} promised to load today${plan.snooze?.note ? ` (${plan.snooze.note})` : ''}.`; badge = 'Promised today'; }
    else if (plan.ask === 'loading' && L.state === 'overdue') { tone = 'red'; title = 'Is it loaded?'; detail = `The loading deadline was ${fmtDay(L.deadline!)}, ${L.overdueDays} day${L.overdueDays === 1 ? '' : 's'} ago.`; badge = `${L.overdueDays} day${L.overdueDays === 1 ? '' : 's'} overdue`; }
    else if (plan.ask === 'loading' && L.state === 'today') { tone = 'amber'; title = 'Is it loaded?'; detail = 'Today is the last day to load.'; badge = 'Due today'; }
    else if (plan.ask === 'loading') { tone = 'amber'; title = 'Is it loaded?'; detail = `Loading deadline is tomorrow (${fmtDay(L.deadline!)}).`; badge = 'Due tomorrow'; }
    else if (L.deadline) {
      tone = 'blue'; title = 'Waiting for loading';
      const bits = [`Deadline ${fmtDay(L.deadline)} (${relDay(L.deadline, today)})`];
      if (plan.snooze && plan.snooze.kind === 'loading') bits.push(`Promised ${fmtDay(plan.snooze.until)}${plan.snooze.note ? `: ${plan.snooze.note}` : ''}`);
      detail = bits.join(' · ');
    } else { tone = 'gray'; title = 'Waiting for loading'; detail = 'No loading time is set on this contract, so there are no loading reminders. Edit the contract and fill in "Loading within … days".'; }
  } else if (plan.stage === 'awaiting_payment') {
    icon = <IndianRupee size={20} />;
    if (plan.ask === 'promised_payment') { tone = 'amber'; title = `Promised for today: ask ${nameOf(buyer)}`; detail = `${nameOf(buyer)} promised to pay today${plan.snooze?.note ? ` (${plan.snooze.note})` : ''}.`; badge = 'Promised today'; }
    else if (plan.ask === 'payment') {
      title = `Ask ${nameOf(buyer)} for the payment update`;
      if (P.state === 'overdue') { tone = 'red'; detail = `Payment was due by ${fmtDay(P.to!)}, ${P.overdueDays} day${P.overdueDays === 1 ? '' : 's'} ago.`; badge = `${P.overdueDays} day${P.overdueDays === 1 ? '' : 's'} overdue`; }
      else if (P.state === 'last_day') { tone = 'amber'; detail = `Loaded ${fmtDay(L.loadedOn!)}. Today is the last day of the payment window.`; badge = 'Due today'; }
      else { tone = 'amber'; detail = `Loaded ${fmtDay(L.loadedOn!)}. Payment window: ${fmtDay(P.from!)}${P.from !== P.to ? ` to ${fmtDay(P.to!)}` : ''}.`; badge = 'Window open'; }
    } else if (P.from) {
      tone = 'blue'; title = 'Waiting for payment';
      const bits = [`Loaded ${fmtDay(L.loadedOn!)}`, `Payment ${P.from !== P.to ? `${fmtDay(P.from)} to ${fmtDay(P.to!)}` : `due ${fmtDay(P.to!)}`}`];
      if (plan.snooze && plan.snooze.kind === 'payment') bits.push(`Promised ${fmtDay(plan.snooze.until)}${plan.snooze.note ? `: ${plan.snooze.note}` : ''}`);
      detail = bits.join(' · ');
    } else { tone = 'gray'; title = 'Waiting for payment'; detail = `Loaded ${fmtDay(L.loadedOn!)}. No payment days are set on this contract, so there are no payment reminders.`; }
  } else if (plan.stage === 'paid') {
    tone = 'green'; icon = <Check size={20} />; title = 'Payment received';
    detail = P.receivedOn ? `Confirmed on ${fmtDayYear(P.receivedOn)}${L.loadedOn ? ` · loaded ${fmtDay(L.loadedOn)}` : ''}.` : 'This contract is completed.';
  }

  const TONE = {
    amber: 'border-amber-300 bg-amber-50', red: 'border-red-300 bg-red-50', blue: 'border-sky-200 bg-sky-50/60', green: 'border-emerald-200 bg-emerald-50/70', gray: 'border-gray-200 bg-white',
  }[tone];
  const ICON = { amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-700', blue: 'bg-sky-100 text-sky-700', green: 'bg-emerald-100 text-emerald-700', gray: 'bg-gray-100 text-gray-600' }[tone];

  // ---------- the "what happens next" lines inside the sheets
  const loadedPreview = (d: string) => (t.pay
    ? `Payment will be due ${fmtDay(addDays(d, t.pay.min))}${t.pay.max !== t.pay.min ? ` to ${fmtDay(addDays(d, t.pay.max))}` : ''} (${t.pay.min}${t.pay.max !== t.pay.min ? ` to ${t.pay.max}` : ''} day${t.pay.max === 1 ? '' : 's'} after loading). I will remind you then.`
    : 'This contract has no payment days, so there will be no payment reminders. Edit the contract to add them.');
  const dateOk = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
  const dateInput = (value: string, onChange: (v: string) => void, min?: string, label = 'Date') => (
    <input type="date" aria-label={label} value={value} min={min} onChange={e => onChange(e.target.value)} className="input-field" />
  );

  return (
    <>
      <div className={`rounded-2xl border ${TONE} ${compact ? 'p-3.5' : 'p-4 sm:p-5'}`} data-testid="next-step">
        <div className="flex items-start gap-3">
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ICON}`}>{icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-semibold text-gray-900">{title}</p>
              {badge && <Badge tone={tone === 'red' ? 'red' : 'amber'}>{badge}</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-gray-600">{detail}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {plan.stage === 'to_load' && (<>
                <Button variant="success" size={compact ? 'sm' : 'md'} icon={<Check size={16} />} onClick={() => open('loaded')}>{plan.ask ? 'Yes, loaded' : 'Mark as loaded'}</Button>
                {plan.ask && <Button size={compact ? 'sm' : 'md'} icon={<Clock size={16} />} onClick={() => open('not_loaded')}>Not yet</Button>}
                <Button variant="ghost" size={compact ? 'sm' : 'md'} icon={<MessageCircle size={16} />} onClick={askSeller}>Ask seller</Button>
              </>)}
              {plan.stage === 'awaiting_payment' && (<>
                <Button variant="success" size={compact ? 'sm' : 'md'} icon={<Check size={16} />} onClick={() => open('paid')}>{plan.ask ? 'Payment received' : 'Mark payment received'}</Button>
                {plan.ask && <Button size={compact ? 'sm' : 'md'} icon={<Clock size={16} />} onClick={() => open('not_paid')}>Not yet</Button>}
                <Button variant="ghost" size={compact ? 'sm' : 'md'} icon={<MessageCircle size={16} />} onClick={askBuyer}>Ask buyer</Button>
                {!compact && <Button variant="ghost" size="sm" icon={<Undo2 size={14} />} onClick={() => save(undoLoaded(contract, today), 'Loading date removed')}>Not loaded after all</Button>}
              </>)}
              {plan.stage === 'paid' && !compact && (
                <Button variant="ghost" size="sm" icon={<Undo2 size={14} />} onClick={() => save(undoPaid(contract, today), 'Payment confirmation removed')}>Undo</Button>
              )}
            </div>

            {!compact && (plan.eligible || (!!contract.remindersOff && (contract.status || 'confirmed') === 'confirmed')) && (plan.stage === 'to_load' || plan.stage === 'awaiting_payment') && (
              <Reminders contract={contract} today={today} />
            )}
          </div>
        </div>
      </div>

      {/* ---- Yes, loaded */}
      <Sheet open={which === 'loaded'} onClose={() => setWhich(null)} title="When was it loaded?"
        footer={<Button variant="success" className="w-full" loading={busy} disabled={!dateOk(date)} onClick={() => save(loadedUpdate(contract, date), 'Saved: loaded')}>Save loading date</Button>}>
        <p className="text-sm text-gray-600 mb-3">Contract {contract.contractNo} · {deal}</p>
        <div className="flex gap-2 mb-3">
          {[{ l: 'Today', d: today }, { l: 'Yesterday', d: addDays(today, -1) }, { l: '2 days ago', d: addDays(today, -2) }].map(c => (
            <button key={c.l} onClick={() => setDate(c.d)} className={`px-3 py-2 rounded-full text-sm border min-h-[40px] ${date === c.d ? 'bg-rose-700 text-white border-rose-700' : 'bg-white border-gray-200 text-gray-700'}`}>{c.l}</button>
          ))}
        </div>
        {dateInput(date, setDate, contract.date, 'Loading date')}
        {dateOk(date) && diffDays(date, today) < 0 && <p className="mt-2 text-xs text-amber-700">That date is in the future.</p>}
        <div className="mt-4 rounded-xl bg-sky-50 border border-sky-100 p-3 text-sm text-sky-900"><CalendarClock size={15} className="inline -mt-0.5 mr-1" />{dateOk(date) ? loadedPreview(date) : 'Pick the loading date.'}</div>
      </Sheet>

      {/* ---- Not yet (loading / payment) */}
      {(which === 'not_loaded' || which === 'not_paid') && (
        <Sheet open onClose={() => setWhich(null)} title={which === 'not_loaded' ? 'When will it be loaded?' : 'When will the buyer pay?'}
          footer={<div className="flex flex-col gap-2">
            <Button variant="primary" loading={busy} disabled={!dateOk(promised)} onClick={() => save(which === 'not_loaded' ? notLoadedUpdate(contract, today, promised, note) : notPaidUpdate(contract, today, promised, note), `I will remind you on ${fmtDay(promised)}`)}>
              {dateOk(promised) ? `Remind me on ${fmtDay(promised)}` : 'Pick a day'}
            </Button>
            <Button variant="ghost" loading={busy} onClick={() => save(which === 'not_loaded' ? notLoadedUpdate(contract, today, null, note) : notPaidUpdate(contract, today, null, note), 'Noted. I will keep reminding you')}>No promise: keep reminding me as usual</Button>
          </div>}>
          <p className="text-sm text-gray-600 mb-3">{which === 'not_loaded' ? `If ${nameOf(seller)} gave a day, I stay quiet until then and remind you that day.` : `If ${nameOf(buyer)} gave a day, I stay quiet until then and remind you that day.`}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {quickDays(today).map(c => (
              <button key={c.label} onClick={() => setPromised(c.date)} className={`px-3 py-2 rounded-full text-sm border min-h-[40px] ${promised === c.date ? 'bg-rose-700 text-white border-rose-700' : 'bg-white border-gray-200 text-gray-700'}`}>{c.label}</button>
            ))}
          </div>
          {dateInput(promised, setPromised, addDays(today, 1), 'Promised day')}
          <input value={note} onChange={e => setNote(e.target.value)} maxLength={80} placeholder="What was said? (optional)" aria-label="What was said" className="input-field mt-3" />
        </Sheet>
      )}

      {/* ---- Payment received */}
      <Sheet open={which === 'paid'} onClose={() => setWhich(null)} title="When was the payment received?"
        footer={<Button variant="success" className="w-full" loading={busy} disabled={!dateOk(date)} onClick={() => save(paidUpdate(contract, date, close), close ? 'Payment saved and contract completed' : 'Payment saved')}>Save payment</Button>}>
        <p className="text-sm text-gray-600 mb-3">Contract {contract.contractNo} · {nameOf(buyer)} → {nameOf(seller)}</p>
        <div className="flex gap-2 mb-3">
          {[{ l: 'Today', d: today }, { l: 'Yesterday', d: addDays(today, -1) }].map(c => (
            <button key={c.l} onClick={() => setDate(c.d)} className={`px-3 py-2 rounded-full text-sm border min-h-[40px] ${date === c.d ? 'bg-rose-700 text-white border-rose-700' : 'bg-white border-gray-200 text-gray-700'}`}>{c.l}</button>
          ))}
        </div>
        {dateInput(date, setDate, plan.loading.loadedOn || contract.date, 'Payment date')}
        <label className="mt-4 flex items-start gap-3 text-sm text-gray-700"><input type="checkbox" checked={close} onChange={e => setClose(e.target.checked)} className="mt-0.5 w-5 h-5 accent-rose-700" /><span>Mark this contract as completed</span></label>
      </Sheet>
    </>
  );
}

/** "Reminders: half-way Sat 25 Oct, day before Thu 29 Oct ..." with a switch to mute this contract. */
function Reminders({ contract, today }: { contract: Contract; today: string }) {
  const { updateContract } = useAppStore();
  const p = planFor(contract, today);
  const lines: string[] = [];
  if (p.stage === 'to_load' && p.terms.deadline) {
    const L = p.terms;
    const fut = (d: string | null) => d && diffDays(today, d) >= 0;
    if (fut(L.half)) lines.push(`half-way ${fmtDay(L.half!)}`);
    if (fut(L.eve)) lines.push(`day before ${fmtDay(L.eve!)}`);
    if (fut(L.deadline)) lines.push(`deadline day ${fmtDay(L.deadline!)}`);
    if (!lines.length) lines.push('every few days until you answer');
  } else if (p.stage === 'awaiting_payment' && p.payment.from) {
    const fut = (d: string) => diffDays(today, d) >= 0;
    if (fut(p.payment.from) && p.payment.from !== p.payment.to) lines.push(`window opens ${fmtDay(p.payment.from)}`);
    if (fut(p.payment.to!)) lines.push(`last day ${fmtDay(p.payment.to!)}`);
    if (!lines.length) lines.push('every few days until you confirm');
  }
  const off = !!contract.remindersOff;
  const toggle = async () => {
    try { await updateContract(contract.id, { remindersOff: !off }); toast.success(off ? 'Reminders are on for this contract' : 'Reminders are off for this contract'); }
    catch { toast.error('Could not save. Try again.'); }
  };
  return (
    <div className="mt-3 pt-3 border-t border-black/5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
      {off ? <span className="inline-flex items-center gap-1"><BellOff size={13} />Reminders are off for this contract.</span>
        : lines.length ? <span className="inline-flex items-center gap-1"><Bell size={13} />Reminders: {lines.join(' · ')}</span> : null}
      <button onClick={toggle} className="underline hover:no-underline text-gray-700 py-2.5 lg:py-1">{off ? 'Turn reminders on' : 'Stop reminders for this contract'}</button>
    </div>
  );
}

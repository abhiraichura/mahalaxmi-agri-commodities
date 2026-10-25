import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Edit2, Trash2, Printer, Download, Share2, Phone, MessageCircle, FileText, Loader2, BookOpen, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateContractPDF, downloadPDF } from '../utils/pdfGenerator';
import { format } from 'date-fns';
import ContractNoteModal from '../components/ContractNoteModal';
import { useContractNote } from '../contractNote/useContractNote';
import { decodeOverrides } from '../contractNote/mapping';
import { copyName, downloadBytes, noteFileName, noteTitle, printBytes, shareBytes } from '../contractNote/service';
import type { Tag } from '../contractNote/types';
import LetterheadToggle from '../components/LetterheadToggle';
import { usePlainCopy } from '../utils/usePlainCopy';
import { contractBrokerageConfig, describeBrokerage, goodsValue } from '../billing/calc';
import { Page, Button, Badge, EmptyState } from '../ui';
import { inrFull } from '../ui/format';
import { stageInfo } from '../reminders/stage';
import NextStep from '../reminders/NextStep';
import { addNote } from '../reminders/actions';
import { useToday } from '../reminders/useToday';
import { partyPhones } from '../broadcast/phone';
import { termsOf, fmtDay, fmtDayYear } from '../../server/reminders/plan.js';
import { Contract, Party } from '../types';

const safeFmt = (d: string, f: string) => { try { return format(new Date(d), f); } catch { return d || ''; } };

export default function ContractView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contracts, settings, deleteContract, updateContract } = useAppStore();
  const today = useToday();
  const [diaryText, setDiaryText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const contract = contracts.find(c => c.id === id);

  // exact-format Contract Notes (buyer + seller), prepared in the background
  const [noteTag, setNoteTag] = useState<Tag | null>(null);
  const savedOverrides = useMemo(() => decodeOverrides(contract?.noteOverrides), [contract?.noteOverrides]);
  const [plain] = usePlainCopy();
  const note = useContractNote(contract, savedOverrides, 0, plain);

  if (!contract) {
    return (
      <Page title="Contract not found" back="/contracts" width="narrow">
        <div className="card"><EmptyState icon={<FileText size={24} />} title="This contract is not here" action={<Button variant="primary" onClick={() => navigate('/contracts')}>Back to contracts</Button>}>It may have been deleted, or the list is still loading.</EmptyState></div>
      </Page>
    );
  }

  const handleDelete = async () => {
    if (!confirm('Delete this contract?')) return;
    await deleteContract(contract.id);
    toast.success('Deleted');
    navigate('/contracts');
  };

  const handleDownload = (type: 'broker_copy') => {
    const doc = generateContractPDF(contract, settings, type, { showTotalValue: true, isDownload: true });
    downloadPDF(doc, `Contract_${contract.contractNo}_Broker_Copy.pdf`);
    toast.success('Broker copy downloaded');
  };

  const handlePrint = (type: 'broker_copy') => {
    const doc = generateContractPDF(contract, settings, type, { showTotalValue: true });
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    toast.success('Opening Broker copy for print');
  };

  // ----- exact-format Contract Note actions (Buyer = B, Seller = S) -----
  const noteReady = (tag: Tag) => !!note.pdfs[tag] && !note.blocking[tag] && !note.rendering;
  const noteName = (tag: Tag) => noteFileName(contract.contractNo, tag, plain);
  const noteShare = async (tag: Tag) => {
    const bytes = note.pdfs[tag];
    if (!bytes) return;
    const r = await shareBytes(bytes, noteName(tag), noteTitle(contract.contractNo, tag, plain));
    if (r === 'unsupported') { downloadBytes(bytes, noteName(tag)); toast.success('Downloaded'); }
    else if (r === 'blocked') toast.error('Could not open the share sheet. Tap Share again.');
  };
  const noteDownload = (tag: Tag) => {
    const bytes = note.pdfs[tag];
    if (!bytes) return;
    downloadBytes(bytes, noteName(tag));
    toast.success(`${copyName(tag)} copy downloaded`);
  };
  const notePrint = async (tag: Tag) => {
    const bytes = note.pdfs[tag];
    if (!bytes) return;
    const r = await printBytes(bytes, noteName(tag), noteTitle(contract.contractNo, tag, plain));
    if (r === 'unsupported') toast.error('Printing is not available in this browser. Download the PDF and print it from there.');
  };


  const info = stageInfo(contract, today);
  const terms = termsOf(contract);
  const value = goodsValue(contract.quantity, contract.quantityUnit, contract.price, contract.priceUnit).value;
  const cfg = contractBrokerageConfig(contract);
  const diary = [...(contract.timeline || [])].sort((a, b) => (b.at || 0) - (a.at || 0));

  const saveNote = async () => {
    if (!diaryText.trim()) return;
    setSavingNote(true);
    try { await updateContract(contract.id, addNote(contract, today, diaryText)); setDiaryText(''); toast.success('Added to the diary'); }
    catch { toast.error('Could not save. Check your internet and try again.'); }
    finally { setSavingNote(false); }
  };

  return (
    <Page back="/contracts" width="default"
      title={<span className="flex flex-wrap items-center gap-x-3 gap-y-1">Contract #{contract.contractNo}<Badge tone={info.tone} className="!text-xs align-middle">{info.label}</Badge></span>}
      subtitle={`${safeFmt(contract.date, 'dd MMM yyyy')} · ${contract.financialYear || contract.year}`}
      actions={<Button icon={<Edit2 size={16} />} onClick={() => navigate(`/contracts/edit/${contract.id}`)}>Edit</Button>}>

      <div className="space-y-5">
        <NextStep contract={contract} today={today} />

        {/* ---- the contract in one glance */}
        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="section-label">Goods</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{contract.quantity} {contract.quantityUnit} {contract.product.name}</p>
              {contract.qualityName && <p className="text-sm text-rose-700 font-medium">Quality: {contract.qualityName}</p>}
            </div>
            <div className="text-right">
              <p className="section-label">Value (internal)</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{inrFull(value)}</p>
              <p className="text-xs text-gray-500">₹{Number(contract.price).toLocaleString('en-IN')} per {contract.priceUnit}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PartyBox label="Seller" party={contract.seller} />
            <PartyBox label="Buyer" party={contract.buyer} />
          </div>
        </section>

        {/* ---- documents */}
        <section>
          <h2 className="section-label mb-2">Documents</h2>
          <LetterheadToggle className="mb-3 max-w-md" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(['B', 'S'] as Tag[]).map(tag => (
              <div key={tag} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">{copyName(tag)} copy</h3>
                  <span className="text-[11px] text-gray-400">{plain ? 'Print copy · no letterhead' : 'Contract note PDF'}</span>
                </div>
                {note.fontMissing ? (
                  <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    Add the Verdana font once in <Link to="/settings" className="underline font-medium">Settings</Link> to create the exact-format note.
                  </div>
                ) : note.error && !note.pdfs[tag] ? (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{note.error}</div>
                ) : note.blocking[tag] ? (
                  <div className="space-y-2">
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{note.issues[tag].find(i => i.level !== 'warn')?.msg || 'Something does not fit the note.'}</p>
                    <Button variant="primary" size="sm" className="w-full" icon={<FileText size={14} />} onClick={() => setNoteTag(tag)}>Fix &amp; review</Button>
                  </div>
                ) : (
                  <>
                    <Button variant="primary" className="w-full" disabled={!noteReady(tag)} onClick={() => noteShare(tag)} icon={noteReady(tag) ? <Share2 size={16} /> : <Loader2 size={16} className="animate-spin" />}>{noteReady(tag) ? 'Share PDF' : 'Preparing…'}</Button>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="flex-1" disabled={!noteReady(tag)} onClick={() => notePrint(tag)} icon={<Printer size={14} />}>Print</Button>
                      <Button size="sm" variant="soft" className="flex-1" disabled={!noteReady(tag)} onClick={() => noteDownload(tag)} icon={<Download size={14} />}>Download</Button>
                    </div>
                  </>
                )}
                {!note.fontMissing && !note.blocking[tag] && note.issues[tag].some(i => i.level === 'warn') && (
                  <p className="mt-2 text-[11px] text-amber-700">⚠ {note.issues[tag].find(i => i.level === 'warn')!.msg}</p>
                )}
                {!note.fontMissing && <Button variant="ghost" size="sm" className="w-full mt-2" icon={<FileText size={14} />} onClick={() => setNoteTag(tag)}>Preview &amp; edit text</Button>}
              </div>
            ))}
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Broker copy <span className="font-normal text-gray-400">(internal)</span></h3>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => handlePrint('broker_copy')} icon={<Printer size={14} />}>Print</Button>
                <Button size="sm" variant="soft" className="flex-1" onClick={() => handleDownload('broker_copy')} icon={<Download size={14} />}>Download</Button>
              </div>
            </div>
          </div>
        </section>

        {/* ---- terms */}
        <section className="card divide-y divide-gray-100">
          <div className="p-4 sm:p-5">
            <h2 className="section-label mb-3">Terms</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <KV k="Loading">{contract.loadingCondition || '—'}{terms.deadline && <span className="block text-xs text-gray-500">Last day {fmtDayYear(terms.deadline)}{terms.source.loading === 'days' || terms.source.loading === 'text' ? ` · ${terms.loadingDays} days from the contract date` : ''}</span>}</KV>
              <KV k="Payment">{contract.paymentTerms || '—'}{terms.pay && <span className="block text-xs text-gray-500">{terms.pay.min === terms.pay.max ? `${terms.pay.min} day${terms.pay.min === 1 ? '' : 's'}` : `${terms.pay.min} to ${terms.pay.max} days`} after loading</span>}</KV>
              <KV k="Packing">{contract.packing || '—'}</KV>
              <KV k="Delivery">{contract.deliveryLocation || '—'}{contract.deliveryAddress ? <span className="block text-xs text-gray-500">{contract.deliveryAddress}</span> : null}</KV>
              <KV k="GST">{contract.gstPercent}% extra</KV>
            </dl>
            {contract.otherTerms && <div className="mt-4 p-3 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 mb-1">Other terms</p><p className="text-sm text-gray-700">{contract.otherTerms}</p></div>}
          </div>

          {((contract.contractSpecs && contract.contractSpecs.length > 0) || (!contract.contractSpecs && contract.product.specs && contract.product.specs.length > 0)) && (
            <div className="p-4 sm:p-5">
              <h2 className="section-label mb-3">Specifications</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[...((contract.contractSpecs && contract.contractSpecs.length ? contract.contractSpecs : contract.product.specs) || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map(spec => (
                  <div key={spec.id} className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">{spec.label}</p><p className="text-sm font-medium text-gray-900">{spec.value} {spec.unit}</p></div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 sm:p-5">
            <h2 className="section-label mb-3">Brokerage (internal)</h2>
            <div className="flex flex-wrap gap-2 text-xs text-gray-700">
              <span className="px-2.5 py-1.5 bg-amber-50 rounded-lg">Buyer: ₹{(contract.buyerBrokerageAmount || 0).toLocaleString('en-IN')} ({describeBrokerage(cfg.buyer)})</span>
              <span className="px-2.5 py-1.5 bg-amber-50 rounded-lg">Seller: ₹{(contract.sellerBrokerageAmount || 0).toLocaleString('en-IN')} ({describeBrokerage(cfg.seller)})</span>
              <span className="px-2.5 py-1.5 bg-rose-50 text-rose-700 rounded-lg font-semibold">Total ₹{(contract.brokerageAmount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {contract.notes && <div className="p-4 sm:p-5"><h2 className="section-label mb-2">Internal notes</h2><p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.notes}</p></div>}
        </section>

        {/* ---- diary */}
        <section className="card p-4 sm:p-5" aria-label="Diary">
          <h2 className="section-label mb-1 flex items-center gap-1.5"><BookOpen size={13} />Diary</h2>
          <p className="text-xs text-gray-500 mb-3">A dated record of what happened on this deal: useful if the seller and buyer ever disagree about dates.</p>
          <div className="flex gap-2 mb-4">
            <input value={diaryText} onChange={e => setDiaryText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveNote(); }} placeholder="Add a note, e.g. truck number MH-12-AB-1234" aria-label="Add a diary note" className="input-field" />
            <Button variant="primary" loading={savingNote} disabled={!diaryText.trim()} onClick={saveNote} icon={<Plus size={16} />}>Add</Button>
          </div>
          {diary.length === 0 ? <p className="text-sm text-gray-500">Nothing yet. Loading and payment answers are recorded here automatically.</p> : (
            <ol className="relative border-l-2 border-gray-200 ml-2 space-y-4">
              {diary.map(e => (
                <li key={e.id} className="pl-4 relative">
                  <span className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${e.type === 'loaded' || e.type === 'paid' ? 'bg-emerald-500' : e.type === 'not_loaded' || e.type === 'not_paid' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                  <p className="text-sm text-gray-900">{e.text}</p>
                  <p className="text-xs text-gray-500">{fmtDay(e.date)} · written {new Date(e.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="pt-2 flex justify-end">
          <Button variant="ghost" className="text-red-600 hover:bg-red-50" icon={<Trash2 size={16} />} onClick={handleDelete}>Delete this contract</Button>
        </div>
      </div>

      {noteTag && <ContractNoteModal contract={contract} initialTag={noteTag} onClose={() => setNoteTag(null)} />}
    </Page>
  );
}

function KV({ k, children }: { k: string; children: React.ReactNode }) {
  return <div><dt className="text-xs text-gray-500">{k}</dt><dd className="mt-0.5 text-gray-900">{children}</dd></div>;
}

function PartyBox({ label, party }: { label: string; party: Party }) {
  const phones = partyPhones(party).all;
  return (
    <div className="rounded-xl bg-gray-50 p-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">{label}</p>
      <p className="mt-1 font-semibold text-gray-900">{party.legalName || party.name}</p>
      <p className="text-sm text-gray-600">{[party.city, party.state].filter(Boolean).join(', ')}</p>
      {party.gstin && <p className="text-xs text-gray-500 mt-0.5">GSTIN {party.gstin}</p>}
      {phones.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {phones.slice(0, 3).map(n => (
            <span key={n.digits} className="inline-flex items-stretch rounded-lg border border-gray-200 bg-white overflow-hidden text-sm">
              <a href={`tel:+${n.digits}`} className="inline-flex items-center gap-1.5 px-2.5 py-2 text-gray-800 hover:bg-gray-50 min-h-[40px]"><Phone size={14} />{n.display.replace('+91 ', '')}</a>
              {n.kind !== 'landline' && <a href={`https://wa.me/${n.digits}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${n.display}`} className="inline-flex items-center px-2.5 text-emerald-700 border-l border-gray-200 hover:bg-emerald-50"><MessageCircle size={15} /></a>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export type { Contract };

// The "Files" box on a contract: add photos or PDFs (bills, loading slips, weighment slips ...), look at them, share, delete.
import { useEffect, useRef, useState } from 'react';
import { Camera, FileText, FolderOpen, Download, Share2, Trash2, Paperclip, Plus, ExternalLink, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuid } from 'uuid';
import { Contract, ContractFile, ContractFileKind, TimelineEvent } from '../types';
import { useAppStore } from '../hooks/useAuthStore';
import { Button, Sheet, Badge } from '../ui';
import { FILE_KINDS, MAX_FILE_BYTES, deleteContractFiles, guessKind, isImage, isPdf, kindLabel, loadContractFile, loadThumb, prettySize, saveContractFile } from './files';

const fmtWhen = (ms: number) => new Date(ms).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
const ev = (date: string, text: string): TimelineEvent => ({ id: uuid(), type: 'note', date, text, at: Date.now() });
const latest = (id: string) => useAppStore.getState().contracts.find(c => c.id === id);

function Thumb({ contractId, file }: { contractId: string; file: ContractFile }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (isImage(file)) loadThumb(contractId, file).then(v => { if (live) setSrc(v); });
    return () => { live = false; };
  }, [contractId, file]);
  if (src) return <img src={src} alt="" className="w-full h-full object-cover" />;
  return <div className="w-full h-full flex items-center justify-center text-gray-400">{isPdf(file) ? <FileText size={26} /> : isImage(file) ? <ImageIcon size={26} /> : <Paperclip size={26} />}</div>;
}

export default function ContractFiles({ contract, stage, today }: { contract: Contract; stage: string; today: string }) {
  const { updateContract } = useAppStore();
  const files = contract.files || [];
  const [pending, setPending] = useState<File[] | null>(null);
  const [kind, setKind] = useState<ContractFileKind>(guessKind(stage));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<ContractFile | null>(null);
  const [dragging, setDragging] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const choose = (list: FileList | File[] | null) => {
    const arr = Array.from(list || []).filter(f => f.size > 0);
    if (!arr.length) return;
    setKind(guessKind(stage)); setNote(''); setPending(arr);
  };

  const saveAll = async () => {
    if (!pending?.length) return;
    setSaving(true);
    const done: ContractFile[] = [];
    const left: File[] = [];
    for (const f of pending) {
      try { done.push(await saveContractFile(contract.id, { file: f, kind, note })); }
      catch (e) { left.push(f); toast.error(e instanceof Error ? e.message : `Could not save "${f.name}".`, { duration: 7000 }); }
    }
    try {
      if (done.length) {
        const c = latest(contract.id) || contract;
        const text = `Added ${done.length === 1 ? kindLabel(kind).toLowerCase() : `${done.length} files (${kindLabel(kind).toLowerCase()})`}: ${done.map(d => d.name).join(', ')}`;
        await updateContract(contract.id, { files: [...(c.files || []), ...done], timeline: [...(c.timeline || []), ev(today, text)] });
        toast.success(done.length === 1 ? 'File saved with this contract' : `${done.length} files saved`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save. Check your internet and try again.');
      setSaving(false);
      return;
    }
    setSaving(false);
    setPending(left.length ? left : null);
  };

  return (
    <section aria-label="Files" className="card p-4 sm:p-5"
      onDragOver={e => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files); }}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="section-label flex items-center gap-1.5"><Paperclip size={13} />Files{files.length > 0 && <span className="text-gray-400 normal-case tracking-normal font-medium">· {files.length}</span>}</h2>
        <div className="flex gap-2">
          <Button size="sm" icon={<Camera size={15} />} onClick={() => camera.current?.click()}>Photo</Button>
          <Button size="sm" variant="soft" icon={<Plus size={15} />} onClick={() => picker.current?.click()}>Add file</Button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-3">Bills, loading slips, weighment slips, LR copy, payment proof. Photos or PDFs. Kept safely with this contract.</p>

      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { choose(e.target.files); e.target.value = ''; }} />
      <input ref={picker} type="file" multiple accept="image/*,application/pdf,.pdf,.xls,.xlsx,.doc,.docx" className="hidden" onChange={e => { choose(e.target.files); e.target.value = ''; }} />

      {files.length === 0 ? (
        <button onClick={() => picker.current?.click()} className={`w-full rounded-2xl border-2 border-dashed py-8 px-4 text-center transition-colors ${dragging ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:bg-gray-50'}`}>
          <FolderOpen className="mx-auto text-gray-400 mb-2" size={26} />
          <span className="block text-sm font-medium text-gray-700">Add the first file</span>
          <span className="block text-xs text-gray-500 mt-0.5">Tap to choose, or drop files here</span>
        </button>
      ) : (
        <ul className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 rounded-2xl ${dragging ? 'ring-2 ring-rose-300 ring-offset-4' : ''}`}>
          {[...files].sort((a, b) => b.addedAt - a.addedAt).map(f => (
            <li key={f.id}>
              <button onClick={() => setOpen(f)} className="w-full text-left rounded-2xl overflow-hidden bg-white ring-1 ring-black/5 shadow-sm active:scale-[0.98] transition-transform">
                <div className="aspect-[4/3] bg-gray-100 overflow-hidden"><Thumb contractId={contract.id} file={f} /></div>
                <div className="p-2.5">
                  <Badge tone={f.kind === 'bill' ? 'violet' : f.kind === 'payment' ? 'green' : f.kind === 'loading_slip' || f.kind === 'weighment' || f.kind === 'lr' ? 'blue' : 'gray'}>{kindLabel(f.kind)}</Badge>
                  <p className="mt-1.5 text-xs font-medium text-gray-800 truncate">{f.note || f.name}</p>
                  <p className="text-[11px] text-gray-500">{fmtWhen(f.addedAt)} · {prettySize(f.size)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ---- what are these files? */}
      <Sheet open={!!pending} onClose={() => !saving && setPending(null)} title={pending && pending.length > 1 ? `Add ${pending.length} files` : 'Add this file'}
        footer={<Button variant="primary" className="w-full" loading={saving} onClick={saveAll}>{pending && pending.length > 1 ? `Save ${pending.length} files` : 'Save file'}</Button>}>
        <ul className="mb-4 space-y-1.5">
          {(pending || []).map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-700"><FileText size={15} className="text-gray-400 shrink-0" /><span className="truncate flex-1">{f.name}</span><span className="text-xs text-gray-500 shrink-0">{prettySize(f.size)}</span>{f.size > MAX_FILE_BYTES && !/^image\//.test(f.type) && <span className="text-xs text-red-600">too big</span>}</li>
          ))}
        </ul>
        <p className="section-label mb-2">What is it?</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {FILE_KINDS.map(k => (
            <button key={k.value} onClick={() => setKind(k.value)} className={`px-3.5 py-2 rounded-full text-sm font-medium min-h-[40px] transition-colors ${kind === k.value ? 'bg-rose-700 text-white shadow-sm' : 'bg-black/[0.05] text-gray-700'}`}>{k.label}</button>
          ))}
        </div>
        <input value={note} onChange={e => setNote(e.target.value)} maxLength={80} placeholder="A short note (optional), e.g. truck GJ-03-AB-1234" aria-label="A short note" className="input-field" />
        <p className="mt-3 text-xs text-gray-500">Photos are made smaller automatically. Largest PDF: {prettySize(MAX_FILE_BYTES)}.</p>
      </Sheet>

      {open && <Viewer contract={contract} file={open} today={today} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Viewer({ contract, file, today, onClose }: { contract: Contract; file: ContractFile; today: string; onClose: () => void }) {
  const { updateContract } = useAppStore();
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [err, setErr] = useState('');
  const [kind, setKind] = useState<ContractFileKind>(file.kind);
  const [note, setNote] = useState(file.note || '');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    let live = true; let u: string | null = null;
    loadContractFile(contract.id, file).then(b => { if (!live) return; u = URL.createObjectURL(b); setBlob(b); setUrl(u); }, e => live && setErr(e instanceof Error ? e.message : 'Could not open this file.'));
    return () => { live = false; if (u) URL.revokeObjectURL(u); };
  }, [contract.id, file]);

  const changed = kind !== file.kind || note.trim() !== (file.note || '');
  const saveMeta = async () => {
    setBusy(true);
    try {
      const c = latest(contract.id) || contract;
      await updateContract(contract.id, { files: (c.files || []).map(f => { if (f.id !== file.id) return f; const { note: _old, ...rest } = f; return { ...rest, kind, ...(note.trim() ? { note: note.trim() } : {}) }; }) });
      toast.success('Saved'); onClose();
    } catch { toast.error('Could not save. Try again.'); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try {
      const c = latest(contract.id) || contract;
      await updateContract(contract.id, { files: (c.files || []).filter(f => f.id !== file.id), timeline: [...(c.timeline || []), ev(today, `Removed ${kindLabel(file.kind).toLowerCase()}: ${file.name}`)] });
      await deleteContractFiles(contract.id, [file]);
      toast.success('File removed'); onClose();
    } catch { toast.error('Could not remove it. Try again.'); } finally { setBusy(false); }
  };
  const download = () => { if (!url) return; const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); };
  const share = async () => {
    if (!blob) return;
    const f = new File([blob], file.name, { type: file.mime });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    try {
      if (nav.canShare?.({ files: [f] })) await nav.share({ files: [f], title: `${kindLabel(file.kind)} · contract ${contract.contractNo}` });
      else { download(); toast('This browser cannot share files directly, so it was downloaded.', { icon: 'ℹ️' }); }
    } catch (e) { if ((e as Error)?.name !== 'AbortError') toast.error('Could not open the share sheet.'); }
  };

  return (
    <Sheet open onClose={onClose} wide title={<span className="flex items-center gap-2 min-w-0"><span className="truncate">{file.note || file.name}</span></span>}
      footer={confirmDel ? (
        <div className="flex gap-2"><Button className="flex-1" onClick={() => setConfirmDel(false)}>Keep it</Button><Button variant="danger" className="flex-1" loading={busy} icon={<Trash2 size={15} />} onClick={remove}>Yes, remove</Button></div>
      ) : (
        <div className="flex gap-2">
          <Button variant="ghost" className="text-red-600" icon={<Trash2 size={16} />} onClick={() => setConfirmDel(true)} aria-label="Remove file" />
          <Button className="flex-1" icon={<Download size={16} />} disabled={!url} onClick={download}>Download</Button>
          <Button variant="primary" className="flex-1" icon={<Share2 size={16} />} disabled={!blob} onClick={share}>Share</Button>
        </div>
      )}>
      <div className="rounded-2xl bg-gray-100 overflow-hidden min-h-[200px] flex items-center justify-center">
        {err ? <p className="p-6 text-sm text-red-700 text-center">{err}</p>
          : !url ? <Loader2 className="animate-spin text-gray-400" />
          : isImage(file) ? <img src={url} alt={file.name} className="max-h-[60vh] w-full object-contain" />
          : isPdf(file) ? (
            <div className="w-full">
              <iframe title={file.name} src={url} className="w-full h-[55vh] bg-white hidden sm:block" />
              <div className="sm:hidden p-8 text-center"><FileText className="mx-auto text-gray-400 mb-3" size={36} /><Button icon={<ExternalLink size={16} />} onClick={() => window.open(url, '_blank')}>Open the PDF</Button></div>
            </div>
          ) : <div className="p-8 text-center text-sm text-gray-600"><Paperclip className="mx-auto text-gray-400 mb-2" size={30} />This kind of file cannot be shown here. Use Download.</div>}
      </div>
      <p className="mt-2 text-xs text-gray-500">{file.name} · {prettySize(file.size)} · added {fmtWhen(file.addedAt)}</p>
      <p className="section-label mt-4 mb-2">What is it?</p>
      <div className="flex flex-wrap gap-2">
        {FILE_KINDS.map(k => (
          <button key={k.value} onClick={() => setKind(k.value)} className={`px-3 py-1.5 rounded-full text-[13px] font-medium min-h-[36px] ${kind === k.value ? 'bg-rose-700 text-white' : 'bg-black/[0.05] text-gray-700'}`}>{k.short}</button>
        ))}
      </div>
      <input value={note} onChange={e => setNote(e.target.value)} maxLength={80} placeholder="A short note (optional)" aria-label="A short note" className="input-field mt-3" />
      {changed && <div className="mt-3 flex justify-end"><Button variant="soft" size="sm" loading={busy} icon={<Check size={15} />} onClick={saveMeta}>Save changes</Button></div>}
    </Sheet>
  );
}

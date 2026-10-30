// src/pages/Notes.tsx
// Notes: quick, searchable, saved as you type. Pin the important ones, add tick-box steps, tag them,
// link one to a contract or a party, or turn it into a task.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Cloud, Download, FileText, ListChecks, Link2, Pin, PinOff, Plus, Search, ListTodo, Trash2, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { useAppStore } from '../hooks/useAuthStore';
import { Sheet, Button, EmptyState, useEmbedded } from '../ui';
import { useToday } from '../reminders/useToday';
import Checklist from '../tasks/Checklist';
import LinkPicker, { linkTo } from '../tasks/LinkPicker';
import TaskSheet from '../tasks/TaskSheet';
import type { CheckItem, TaskLink } from '../tasks/model';
import type { Note } from '../types';

/** a Firestore timestamp, an ISO string or a Date, as milliseconds (0 if it is none of those) */
const ms = (v: any): number => {
  if (!v) return 0;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (typeof v?.seconds === 'number') return v.seconds * 1000;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
};
const when = (v: any, withTime = false) => { const t = ms(v); return t ? format(new Date(t), withTime ? 'd MMM yyyy, h:mm a' : 'd MMM') : ''; };
const lowStr = (v: unknown) => (v == null ? '' : String(v)).toLowerCase();

interface Draft { title: string; content: string; tags: string[]; checklist: CheckItem[]; link: TaskLink | null; pinned: boolean }
const draftOf = (n: Note): Draft => ({ title: n.title || '', content: n.content || '', tags: n.tags || [], checklist: n.checklist || [], link: n.link || null, pinned: !!n.pinned });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isBlank = (n: Note) => !n.title.trim() && !n.content.trim() && !(n.checklist || []).some(c => c.text.trim()) && !(n.tags || []).length;

/** the title shown in the list: the title, else the first line of the text */
const shownTitle = (n: Note) => n.title.trim() || n.content.split('\n').find(l => l.trim())?.trim() || 'Untitled note';
const preview = (n: Note) => {
  const lines = n.content.split('\n').map(l => l.trim()).filter(Boolean);
  const rest = n.title.trim() ? lines : lines.slice(1);
  return rest.join(' ').slice(0, 140);
};

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote } = useAppStore();
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const embedded = useEmbedded();

  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [listOnPhone, setListOnPhone] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [tagText, setTagText] = useState('');
  const [showSteps, setShowSteps] = useState(false);
  const [picking, setPicking] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [taskFrom, setTaskFrom] = useState(false);

  const notesRef = useRef(notes); notesRef.current = notes;
  const draftRef = useRef<Draft | null>(null); draftRef.current = draft;
  const activeRef = useRef<string | null>(null); activeRef.current = activeId;
  const opening = useRef(false);
  const dirty = useRef(false);
  const body = useRef<HTMLTextAreaElement>(null);

  const active = useMemo(() => notes.find(n => n.id === activeId) || null, [notes, activeId]);

  /** write what changed to the saved note (only the fields that changed; never an undefined) */
  const flush = useCallback(async () => {
    const id = activeRef.current; const d = draftRef.current;
    if (!id || !d || !dirty.current) return;
    const stored = notesRef.current.find(n => n.id === id);
    if (!stored) { dirty.current = false; return; }
    const was = draftOf(stored);
    const changes: Record<string, unknown> = {};
    (Object.keys(d) as (keyof Draft)[]).forEach(k => { if (!same(d[k], was[k])) changes[k] = d[k]; });
    dirty.current = false;
    if (!Object.keys(changes).length) { setSaving(false); return; }
    try { await updateNote(id, changes as Partial<Note>); } catch (e) { console.error('Auto-save failed', e); toast.error('Could not save the note. Check the connection.'); }
    setSaving(false);
  }, [updateNote]);

  /** leave an empty note behind? then remove it, so the list does not fill up with blanks */
  const dropIfBlank = useCallback(async (id: string | null) => {
    if (!id) return;
    const n = notesRef.current.find(x => x.id === id);
    const d = draftRef.current;
    if (n && activeRef.current === id && d && isBlank({ ...n, ...d } as Note)) { dirty.current = false; try { await deleteNote(id); } catch { /* ignore */ } }
  }, [deleteNote]);

  const open = useCallback(async (id: string) => {
    if (id === activeRef.current) { setListOnPhone(false); return; }
    await flush(); await dropIfBlank(activeRef.current);
    const n = notesRef.current.find(x => x.id === id);
    activeRef.current = id; setActiveId(id);
    setDraft(n ? draftOf(n) : null); draftRef.current = n ? draftOf(n) : null;
    setShowSteps(!!n?.checklist?.length); setTagText(''); setConfirmDel(false); setSaving(false);
    setListOnPhone(false);
  }, [flush, dropIfBlank]);

  const backToList = async () => { await flush(); await dropIfBlank(activeRef.current); setListOnPhone(true); };

  // save shortly after the last keystroke
  useEffect(() => {
    if (!draft || !dirty.current) return;
    setSaving(true);
    const t = setTimeout(() => { void flush(); }, 600);
    return () => clearTimeout(t);
  }, [draft, flush]);

  // save when leaving the page or hiding the app
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') void flush(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { document.removeEventListener('visibilitychange', onHide); void flush(); };
  }, [flush]);

  // open a note named in the address (/notes?open=<id>) once the notes have loaded
  useEffect(() => {
    const want = params.get('open');
    if (want && notes.some(n => n.id === want)) {
      opening.current = true; // so the "show the first note" step below does not jump in while this note is being opened
      void open(want).finally(() => { opening.current = false; });
      setParams(prev => { const n = new URLSearchParams(prev); n.delete('open'); return n; }, { replace: true });
    }
  }, [params, notes, open, setParams]);

  // on a wide screen show the first note when nothing is open
  useEffect(() => {
    if (activeId || activeRef.current || opening.current || !notes.length) return;
    if (window.matchMedia?.('(min-width: 1024px)').matches && !params.get('open')) {
      const first = [...notes].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (ms(b.updatedAt) || ms(b.createdAt)) - (ms(a.updatedAt) || ms(a.createdAt)))[0];
      if (first) { setActiveId(first.id); activeRef.current = first.id; const d = draftOf(first); setDraft(d); draftRef.current = d; setShowSteps(!!first.checklist?.length); }
    }
  }, [notes, activeId, params]);

  // if the open note disappears (deleted elsewhere), close it
  useEffect(() => {
    if (activeId && notes.length && !notes.some(n => n.id === activeId)) { setActiveId(null); activeRef.current = null; setDraft(null); draftRef.current = null; setListOnPhone(true); }
  }, [notes, activeId]);

  const edit = (patch: Partial<Draft>) => { dirty.current = true; setDraft(d => (d ? { ...d, ...patch } : d)); };

  // the text box grows with its text
  useEffect(() => {
    const el = body.current; if (!el) return;
    el.style.height = 'auto'; el.style.height = `${Math.max(el.scrollHeight, 160)}px`;
  }, [draft?.content, activeId, listOnPhone]);

  const startCreate = async () => {
    await flush(); await dropIfBlank(activeRef.current);
    const id = uuidv4(); const now = new Date().toISOString();
    const blank: Note = { id, title: '', content: '', tags: tag ? [tag] : [], pinned: false, checklist: [], link: null, createdAt: now, updatedAt: now };
    try { await addNote(blank); } catch { toast.error('Could not create the note'); return; }
    activeRef.current = id; setActiveId(id);
    const d = draftOf(blank); setDraft(d); draftRef.current = d; dirty.current = false;
    setShowSteps(false); setTagText(''); setConfirmDel(false); setListOnPhone(false); setSearch('');
  };

  const removeActive = async () => {
    const id = activeRef.current; if (!id) return;
    dirty.current = false;
    try { await deleteNote(id); toast.success('Note deleted'); } catch { toast.error('Could not delete the note'); return; }
    setConfirmDel(false); setActiveId(null); activeRef.current = null; setDraft(null); draftRef.current = null; setListOnPhone(true);
  };

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '');
    if (!t || !draft) { setTagText(''); return; }
    if (!draft.tags.some(x => x.toLowerCase() === t.toLowerCase())) edit({ tags: [...draft.tags, t] });
    setTagText('');
  };

  // ---- the list
  const allTags = useMemo(() => {
    const c = new Map<string, number>();
    notes.forEach(n => (n.tags || []).forEach(t => c.set(t, (c.get(t) || 0) + 1)));
    return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [notes]);

  const visible = useMemo(() => {
    const q = lowStr(search).trim();
    let list = notes.map(n => (n.id === activeId && draft ? ({ ...n, ...draft } as Note) : n));
    if (tag) list = list.filter(n => (n.tags || []).includes(tag));
    if (q) list = list.filter(n => lowStr(n.title).includes(q) || lowStr(n.content).includes(q) || (n.tags || []).some(t => lowStr(t).includes(q)) || (n.checklist || []).some(c => lowStr(c.text).includes(q)) || lowStr(n.link?.label).includes(q));
    return list.sort((a, b) => (ms(b.updatedAt) || ms(b.createdAt)) - (ms(a.updatedAt) || ms(a.createdAt)));
  }, [notes, search, tag, activeId, draft]);
  const pinned = visible.filter(n => n.pinned);
  const others = visible.filter(n => !n.pinned);

  const exportCsv = () => {
    if (!notes.length) { toast.error('No notes to export'); return; }
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = notes.map(n => [n.id, n.title || 'Untitled', n.content, (n.tags || []).join(', '), n.pinned ? 'Yes' : '', n.link?.label || '', (n.checklist || []).map(c => `${c.done ? '[x]' : '[ ]'} ${c.text}`).join('; '), when(n.createdAt, true), when(n.updatedAt, true)].map(cell).join(','));
    const csv = ['ID,Title,Content,Tags,Pinned,About,Steps,Created,Updated', ...rows].join('\n');
    try {
      const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a'); a.href = url; a.download = `mahalaxmi_notes_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success('Notes downloaded');
    } catch { toast.error('Could not download the notes'); }
  };

  const noteRow = (n: Note) => {
    const prog = (n.checklist || []).length ? `${(n.checklist || []).filter(c => c.done).length}/${(n.checklist || []).length}` : '';
    const sel = n.id === activeId;
    return (
      <button key={n.id} type="button" onClick={() => void open(n.id)} aria-label={`Open note: ${shownTitle(n)}`} aria-current={sel ? 'true' : undefined}
        className={`row w-full text-left !items-start !py-3 ${sel ? 'lg:bg-rose-50/70' : ''}`}>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {n.pinned && <Pin size={12} className="text-amber-500 shrink-0 fill-amber-500" />}
            <span className="block text-[15px] font-semibold text-gray-900 truncate">{shownTitle(n)}</span>
          </span>
          {preview(n) && <span className="block text-[13px] text-gray-500 line-clamp-1 mt-0.5">{preview(n)}</span>}
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400">
            <span>{when(n.updatedAt) || when(n.createdAt)}</span>
            {(n.tags || []).slice(0, 2).map(t => <span key={t} className="chip !py-0 bg-gray-100 text-gray-600">{t}</span>)}
            {(n.tags || []).length > 2 && <span>+{(n.tags || []).length - 2}</span>}
            {prog && <span className="inline-flex items-center gap-0.5"><ListChecks size={11} />{prog}</span>}
            {n.link && <span className="inline-flex items-center gap-0.5 text-sky-600 max-w-[9rem] truncate"><Link2 size={11} className="shrink-0" /><span className="truncate">{n.link.label}</span></span>}
          </span>
        </span>
      </button>
    );
  };

  const stepsDone = (draft?.checklist || []).filter(c => c.done).length;
  const editorVisible = !!(activeId && draft && active);

  return (
    <div className={embedded ? '' : 'page-container'}>
      <div className="mx-auto max-w-6xl">
        <header className={`mb-4 items-end justify-between gap-3 ${listOnPhone ? 'flex' : 'hidden lg:flex'}`}>
          <div>
            {!embedded && <h1 className="text-[28px] lg:text-[26px] leading-[1.1] font-bold text-gray-900 tracking-tight">Notes</h1>}
            <p className={`${embedded ? '' : 'mt-1 '}text-[13px] text-gray-500`}>{notes.length ? `${notes.length} note${notes.length === 1 ? '' : 's'}, saved as you type` : 'Jot things down. They are saved as you type.'}</p>
          </div>
          <div className="flex items-center gap-2">
            {notes.length > 0 && <Button size="sm" variant="ghost" icon={<Download size={15} />} onClick={exportCsv} aria-label="Download all notes as a spreadsheet">Export</Button>}
            <Button variant="primary" icon={<Plus size={17} />} onClick={() => void startCreate()} aria-label="Create note">New note</Button>
          </div>
        </header>

        <div className="lg:grid lg:grid-cols-[minmax(300px,360px)_1fr] lg:gap-5 lg:items-start">
          {/* the list */}
          <div className={`${listOnPhone ? 'block' : 'hidden lg:block'} space-y-3 lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto lg:pr-1 lg:sticky lg:top-20`}>
            <div className="relative">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes" aria-label="Search notes" className="input-field !pl-10 !pr-10" />
              {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600"><X size={15} /></button>}
            </div>

            {allTags.length > 0 && (
              <div className="flex gap-2 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-0.5 scrollbar-hide" role="group" aria-label="Filter by tag">
                {[['', 'All', notes.length] as const, ...allTags.map(([t, c]) => [t, t, c] as const)].map(([t, label, c]) => (
                  <button key={t || 'all'} type="button" aria-pressed={tag === t} onClick={() => setTag(tag === t ? '' : t)}
                    className={`chip min-h-[34px] px-3 ring-1 ${tag === t ? 'bg-rose-700 text-white ring-rose-700' : 'bg-white/80 text-gray-700 ring-black/10'}`}>{label}<span className={tag === t ? 'text-white/70' : 'text-gray-400'}>{c}</span></button>
                ))}
              </div>
            )}

            {visible.length === 0 ? (
              <div className="card">
                {notes.length === 0
                  ? <EmptyState icon={<FileText size={24} />} title="No notes yet" action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => void startCreate()}>New note</Button>}>Keep rates, phone calls and ideas in one place. Tick-box steps, tags, and a link to a contract or party are there when you need them.</EmptyState>
                  : <EmptyState icon={<Search size={24} />} title="No note matches" action={<Button onClick={() => { setSearch(''); setTag(''); }}>Show all notes</Button>}>Try a different word or clear the filter.</EmptyState>}
              </div>
            ) : (
              <>
                {pinned.length > 0 && <section><h2 className="section-label px-1 mb-1.5">Pinned</h2><div className="group-list">{pinned.map(noteRow)}</div></section>}
                {others.length > 0 && <section>{pinned.length > 0 && <h2 className="section-label px-1 mb-1.5">Notes</h2>}<div className="group-list">{others.map(noteRow)}</div></section>}
              </>
            )}
          </div>

          {/* the note */}
          <div className={listOnPhone ? 'hidden lg:block' : 'fixed inset-0 z-50 overflow-y-auto bg-[#f4f5f9] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:static lg:z-auto lg:overflow-visible lg:bg-transparent lg:pb-0'}>
            {!editorVisible ? (
              <div className="card hidden lg:block"><EmptyState icon={<FileText size={24} />} title="Pick a note or start a new one" action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => void startCreate()}>New note</Button>}>Everything is saved as you type.</EmptyState></div>
            ) : (
              <article className="card !p-0 overflow-hidden max-lg:!rounded-none max-lg:!shadow-none max-lg:min-h-full" aria-label="Note">
                <div className="flex items-center gap-1 px-2 sm:px-3 h-14 border-b border-black/5 max-lg:sticky max-lg:top-0 max-lg:z-10 max-lg:bg-white/95 max-lg:backdrop-blur">
                  <button type="button" onClick={() => void backToList()} aria-label="Back to notes" className="lg:hidden flex items-center gap-0.5 text-rose-700 font-medium text-[15px] min-h-[44px] pl-1 pr-3"><ChevronLeft size={22} strokeWidth={2.4} />Notes</button>
                  <span className="text-xs text-gray-400 flex items-center gap-1.5 px-2" role="status" aria-live="polite">
                    <Cloud size={13} className={saving ? 'text-amber-500 animate-pulse' : 'text-emerald-500'} />{saving ? 'Saving' : 'Saved'}
                  </span>
                  <span className="flex-1" />
                  <button type="button" onClick={() => edit({ pinned: !draft!.pinned })} aria-label={draft!.pinned ? 'Unpin note' : 'Pin note'} aria-pressed={draft!.pinned}
                    className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 ${draft!.pinned ? 'text-amber-500' : 'text-gray-500'}`}>{draft!.pinned ? <PinOff size={19} /> : <Pin size={19} />}</button>
                  <button type="button" onClick={() => setShowSteps(true)} aria-label="Add steps" className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-black/5"><ListChecks size={19} /></button>
                  <button type="button" onClick={() => setPicking(true)} aria-label="Link to a contract or party" className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-black/5"><Link2 size={19} /></button>
                  <button type="button" onClick={() => setTaskFrom(true)} aria-label="Make a task from this note" className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-black/5"><ListTodo size={19} /></button>
                  <button type="button" onClick={() => setConfirmDel(true)} aria-label="Delete this note" className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50"><Trash2 size={19} /></button>
                </div>

                <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3">
                  <input value={draft!.title} onChange={e => edit({ title: e.target.value })} placeholder="Title" aria-label="Note title"
                    className="w-full bg-transparent text-[26px] sm:text-[30px] font-bold text-gray-900 tracking-tight leading-tight outline-none placeholder:text-gray-300" />

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-400">{when(active!.updatedAt, true) || when(active!.createdAt, true)}</span>
                    {draft!.link && (
                      <span className={`inline-flex items-center rounded-full pl-2.5 pr-1 py-0.5 font-semibold ${draft!.link.type === 'contract' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>
                        <Link to={linkTo(draft!.link)} className="inline-flex items-center gap-1 min-h-[28px]" aria-label={`Open ${draft!.link.label}`}>
                          {draft!.link.type === 'contract' ? <FileText size={12} /> : <Users size={12} />}{draft!.link.label}
                        </Link>
                        <button type="button" onClick={() => edit({ link: null })} aria-label="Remove the link" className="w-7 h-7 flex items-center justify-center opacity-60 hover:opacity-100"><X size={13} /></button>
                      </span>
                    )}
                    {draft!.tags.map(t => (
                      <span key={t} className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 pl-2.5 pr-1 py-0.5 font-medium">
                        {t}<button type="button" onClick={() => edit({ tags: draft!.tags.filter(x => x !== t) })} aria-label={`Remove tag ${t}`} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700"><X size={12} /></button>
                      </span>
                    ))}
                    <input value={tagText} onChange={e => { const v = e.target.value; if (v.endsWith(',')) addTag(v.slice(0, -1)); else setTagText(v); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagText); } else if (e.key === 'Backspace' && !tagText && draft!.tags.length) edit({ tags: draft!.tags.slice(0, -1) }); }} onBlur={() => addTag(tagText)}
                      placeholder="+ Add tag" aria-label="Add a tag" list="note-tags" className="bg-transparent outline-none text-gray-600 placeholder:text-gray-400 min-h-[28px] w-24" />
                    <datalist id="note-tags">{allTags.filter(([t]) => !draft!.tags.includes(t)).map(([t]) => <option key={t} value={t} />)}</datalist>
                  </div>

                  <textarea ref={body} value={draft!.content} onChange={e => edit({ content: e.target.value })} placeholder="Start typing" aria-label="Note text"
                    className="block w-full min-h-[160px] bg-transparent text-[16px] text-gray-800 leading-relaxed outline-none resize-none placeholder:text-gray-400 overflow-hidden" />

                  {(showSteps || draft!.checklist.length > 0) && (
                    <section className="rounded-2xl bg-black/[0.035] px-3.5 py-2" aria-label="Steps">
                      <div className="flex items-center justify-between pt-1.5">
                        <h3 className="section-label">Steps</h3>
                        {draft!.checklist.length > 0 && <span className="text-xs text-gray-500">{stepsDone} of {draft!.checklist.length} done</span>}
                      </div>
                      <Checklist items={draft!.checklist} onChange={checklist => edit({ checklist })} />
                    </section>
                  )}
                </div>
              </article>
            )}
          </div>
        </div>
      </div>

      <LinkPicker open={picking} onClose={() => setPicking(false)} onPick={link => edit({ link })} />
      <TaskSheet open={taskFrom} onClose={() => setTaskFrom(false)} today={today}
        preset={{ text: draft ? shownTitle({ ...(active as Note), ...draft } as Note) : '', details: draft ? draft.content.trim().slice(0, 300) : '', link: draft?.link ?? null, day: today, checklist: draft ? draft.checklist.map(c => ({ ...c, done: false })) : [] }} />
      <Sheet open={confirmDel} onClose={() => setConfirmDel(false)} title="Delete this note?"
        footer={<div className="flex gap-2 justify-end"><Button onClick={() => setConfirmDel(false)}>Keep it</Button><Button variant="danger" onClick={() => void removeActive()}>Delete note</Button></div>}>
        <p className="text-sm text-gray-600">&ldquo;{draft ? shownTitle({ ...(active as Note), ...draft } as Note) : ''}&rdquo; will be removed for good. Use Export first if you want a copy.</p>
      </Sheet>
    </div>
  );
}

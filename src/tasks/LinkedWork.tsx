// src/tasks/LinkedWork.tsx
// "Tasks and notes" on a contract or a party: what is still to do about it, notes written about it, and one tap to add either.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListTodo, NotebookPen, StickyNote } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { Button } from '../ui';
import { useAppStore } from '../hooks/useAuthStore';
import { useToday } from '../reminders/useToday';
import { byUrgency, type Task, type TaskLink } from './model';
import { startTasks, useTaskStore } from './store';
import TaskRow from './TaskRow';
import TaskSheet from './TaskSheet';
import type { Note } from '../types';

export default function LinkedWork({ link }: { link: TaskLink }) {
  const navigate = useNavigate();
  const today = useToday();
  const tasks = useTaskStore(s => s.tasks);
  const notes = useAppStore(s => s.notes);
  const addNote = useAppStore(s => s.addNote);
  const [sheet, setSheet] = useState<null | { task?: Task }>(null);
  useEffect(() => startTasks(), []);

  const mine = useMemo(() => tasks.filter(t => !t.completed && t.link?.type === link.type && t.link.id === link.id).sort(byUrgency), [tasks, link.type, link.id]);
  const myNotes = useMemo(() => notes.filter(n => n.link?.type === link.type && n.link.id === link.id), [notes, link.type, link.id]);

  const newNote = async () => {
    const id = uuidv4(); const now = new Date().toISOString();
    const note: Note = { id, title: '', content: '', tags: [], pinned: false, checklist: [], link, createdAt: now, updatedAt: now };
    try { await addNote(note); navigate(`/planner?tab=notes&open=${id}`); } catch { toast.error('Could not create the note'); }
  };

  return (
    <section aria-label="Tasks and notes">
      <div className="flex items-center justify-between gap-3 mb-1.5 px-1">
        <h2 className="section-label">Tasks and notes{mine.length + myNotes.length > 0 ? ` · ${mine.length + myNotes.length}` : ''}</h2>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" icon={<ListTodo size={15} />} onClick={() => setSheet({})}>Add task</Button>
          <Button size="sm" variant="ghost" icon={<NotebookPen size={15} />} onClick={() => void newNote()}>Add note</Button>
        </div>
      </div>
      {mine.length + myNotes.length === 0 ? (
        <p className="card px-4 py-3 text-sm text-gray-500">Nothing yet. Add a task to remember to follow up, or a note for something you were told.</p>
      ) : (
        <div className="group-list">
          {mine.map(t => <TaskRow key={t.id} t={t} today={today} showDay onOpen={task => setSheet({ task })} hideLink />)}
          {myNotes.map(n => (
            <button key={n.id} type="button" className="row w-full text-left" onClick={() => navigate(`/planner?tab=notes&open=${n.id}`)} aria-label={`Open note: ${n.title || 'Untitled note'}`}>
              <span className="w-9 h-9 rounded-[10px] bg-amber-50 text-amber-700 flex items-center justify-center shrink-0"><StickyNote size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-gray-900 truncate">{n.title || n.content.split('\n').find(l => l.trim()) || 'Untitled note'}</span>
                {n.content.trim() && <span className="block text-xs text-gray-500 truncate">{n.title ? n.content.replace(/\s+/g, ' ').slice(0, 100) : n.content.split('\n').filter(l => l.trim()).slice(1).join(' ').slice(0, 100)}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
      <TaskSheet open={!!sheet} onClose={() => setSheet(null)} today={today} task={sheet?.task} preset={{ link, day: today }} />
    </section>
  );
}

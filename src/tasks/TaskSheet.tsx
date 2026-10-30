// src/tasks/TaskSheet.tsx
// Add a task or change one: what, when, how important, whether it repeats, which contract / party it is about, steps.
import { useEffect, useState } from 'react';
import { FileText, Link2, Trash2, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Sheet, Button, Field, Segmented } from '../ui';
import { addDays, REPEAT_LABEL, type CheckItem, type Priority, type Repeat, type Task, type TaskLink } from './model';
import { addTask, removeTask, updateTask } from './store';
import Checklist from './Checklist';
import LinkPicker from './LinkPicker';

interface Props {
  open: boolean;
  onClose: () => void;
  today: string;
  /** a task to change; leave out to make a new one */
  task?: Task | null;
  /** starting values for a new task (a date, a link, the text) */
  preset?: Partial<Task>;
}

interface Draft { text: string; day: string; time: string; priority: Priority; repeat: Repeat; details: string; checklist: CheckItem[]; link: TaskLink | null }

const blank = (today: string, p?: Partial<Task>): Draft => ({
  text: p?.text || '', day: p?.day ?? today, time: p?.time || '', priority: p?.priority || 'medium', repeat: p?.repeat || '', details: p?.details || '', checklist: p?.checklist || [], link: p?.link ?? null,
});
const fromTask = (t: Task): Draft => ({ text: t.text, day: t.day, time: t.time || '', priority: t.priority, repeat: t.repeat || '', details: t.details || '', checklist: t.checklist || [], link: t.link ?? null });

export default function TaskSheet({ open, onClose, today, task, preset }: Props) {
  const [d, setD] = useState<Draft>(() => blank(today, preset));
  const [picking, setPicking] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setD(task ? fromTask(task) : blank(today, preset));
    setConfirmDel(false); setSaving(false); setPicking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id]);

  const set = (f: Partial<Draft>) => setD(x => ({ ...x, ...f }));

  const save = async () => {
    if (!d.text.trim()) { toast.error('Write what needs to be done'); return; }
    setSaving(true);
    const day = d.repeat && !d.day ? today : d.day;
    const fields: Partial<Task> = { text: d.text.trim(), day, time: d.day || day ? d.time : '', priority: d.priority, repeat: d.repeat, details: d.details.trim(), checklist: d.checklist.filter(c => c.text.trim()), link: d.link };
    if (task) await updateTask(task.id, fields); else await addTask({ ...fields, text: fields.text as string });
    toast.success(task ? 'Task updated' : 'Task added');
    onClose();
  };

  const chip = (label: string, day: string) => (
    <button key={label} type="button" onClick={() => set({ day })} aria-pressed={d.day === day}
      className={`chip min-h-[34px] px-3 ring-1 ${d.day === day ? 'bg-rose-700 text-white ring-rose-700' : 'bg-white text-gray-700 ring-black/10 hover:bg-gray-50'}`}>{label}</button>
  );

  return (
    <>
      <Sheet open={open} onClose={onClose} wide title={task ? 'Edit task' : 'New task'}
        footer={(
          <div className="flex items-center gap-2">
            {task && (confirmDel
              ? <><Button variant="danger" size="sm" onClick={async () => { await removeTask(task.id); toast.success('Task deleted'); onClose(); }}>Yes, delete</Button><Button size="sm" onClick={() => setConfirmDel(false)}>Keep</Button></>
              : <Button variant="ghost" size="sm" className="!text-red-600" icon={<Trash2 size={15} />} onClick={() => setConfirmDel(true)} aria-label="Delete task">Delete</Button>)}
            <span className="flex-1" />
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={save}>{task ? 'Save changes' : 'Add task'}</Button>
          </div>
        )}>
        <div className="space-y-4">
          <Field label="What needs to be done">
            <textarea value={d.text} onChange={e => set({ text: e.target.value })} rows={2} autoFocus={!task} placeholder="e.g. Ask Patel Exports for the payment update" aria-label="Task" className="input-field resize-none" />
          </Field>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">When</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {chip('Today', today)}{chip('Tomorrow', addDays(today, 1))}{chip('Next week', addDays(today, 7))}{chip('No date', '')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={d.day} onChange={e => set({ day: e.target.value })} aria-label="Date" className="input-field !py-2" />
              <input type="time" value={d.time} onChange={e => set({ time: e.target.value })} aria-label="Time (optional)" className="input-field !py-2" disabled={!d.day} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">Priority</p>
              <Segmented<Priority> full value={d.priority} onChange={priority => set({ priority })} label="Priority" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
            </div>
            <Field label="Repeat">
              <select value={d.repeat} onChange={e => set({ repeat: e.target.value as Repeat })} className="input-field" aria-label="Repeat">
                <option value="">Does not repeat</option>
                {(Object.keys(REPEAT_LABEL) as Exclude<Repeat, ''>[]).map(k => <option key={k} value={k}>{REPEAT_LABEL[k]}</option>)}
              </select>
            </Field>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">About</p>
            {d.link ? (
              <div className="flex items-center gap-2 rounded-2xl bg-black/[0.035] px-3 py-2.5">
                <span className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 ${d.link.type === 'contract' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>{d.link.type === 'contract' ? <FileText size={16} /> : <Users size={16} />}</span>
                <span className="min-w-0 flex-1 text-sm font-medium text-gray-900 truncate">{d.link.label}</span>
                <button type="button" onClick={() => set({ link: null })} aria-label="Remove the link" className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600"><X size={16} /></button>
              </div>
            ) : (
              <Button size="sm" icon={<Link2 size={15} />} onClick={() => setPicking(true)}>Link a contract or party</Button>
            )}
          </div>

          <Field label="Notes">
            <textarea value={d.details} onChange={e => set({ details: e.target.value })} rows={2} placeholder="Anything to remember" aria-label="Notes" className="input-field resize-none" />
          </Field>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Steps</p>
            <div className="rounded-2xl bg-black/[0.035] px-3 py-1">
              <Checklist items={d.checklist} onChange={checklist => set({ checklist })} />
            </div>
          </div>
        </div>
      </Sheet>
      <LinkPicker open={picking} onClose={() => setPicking(false)} onPick={link => set({ link })} />
    </>
  );
}

// src/pages/Todos.tsx  (shown as the Tasks tab of Tasks & notes)
// Tasks: type one line ("Call Patel about payment tomorrow !!") and it is planned.
//   Today = what is overdue and what is due today   Week = the next 7 days   Later = further ahead and undated   Done
// A task can have steps, a time, a repeat (for example the GST dates every month), and a link to a contract or party.
import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CalendarDays, Check, ChevronLeft, ChevronRight, Plus, Sparkles, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Segmented, Sheet, EmptyState, Badge } from '../ui';
import type { Tone } from '../ui';
import { useToday } from '../reminders/useToday';
import { addDays, bucketTasks, COMMON_REMINDERS, dayText, dueText, nextDom, parseQuick, type Task } from '../tasks/model';
import { addTask, removeTask, startTasks, useTaskStore } from '../tasks/store';
import TaskRow from '../tasks/TaskRow';
import TaskSheet from '../tasks/TaskSheet';

type View = 'today' | 'week' | 'later' | 'done';

function Section({ title, tone, count, children, action }: { title: string; tone?: Tone; count?: number; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between px-1 mb-1.5">
        <h2 className="section-label flex items-center gap-2">{title}{count != null && <Badge tone={tone || 'gray'}>{count}</Badge>}</h2>
        {action}
      </div>
      <div className="group-list">{children}</div>
    </section>
  );
}

export function TasksView() {
  const today = useToday();
  const { tasks, loaded } = useTaskStore();
  useEffect(() => startTasks(), []);

  const [view, setView] = useState<View>('today');
  const [weekOffset, setWeekOffset] = useState(0);
  const [quick, setQuick] = useState('');
  const [sheet, setSheet] = useState<null | { task?: Task; preset?: Partial<Task> }>(null);
  const [common, setCommon] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const b = useMemo(() => bucketTasks(tasks, today), [tasks, today]);
  const open = (t: Task) => setSheet({ task: t });

  const submitQuick = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!quick.trim()) return;
    const q = parseQuick(quick, today);
    await addTask({ text: q.text, day: q.day ?? today, priority: q.priority || 'medium', ...(q.time ? { time: q.time } : {}), ...(q.repeat ? { repeat: q.repeat } : {}) });
    toast.success(`Added for ${dueText(q.day ?? today, today).text.toLowerCase()}`);
    setQuick('');
  };
  const quickMore = () => {
    const q = parseQuick(quick, today);
    setSheet({ preset: { text: q.text, day: q.day ?? today, ...(q.priority ? { priority: q.priority } : {}), ...(q.time ? { time: q.time } : {}), ...(q.repeat ? { repeat: q.repeat } : {}) } });
    setQuick('');
  };

  const weekStart = addDays(today, weekOffset * 7);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const later = useMemo(() => b.upcoming.filter(t => t.day >= addDays(today, 7)), [b.upcoming, today]);

  const rows = (list: Task[], showDay: boolean) => list.map(t => <TaskRow key={t.id} t={t} today={today} showDay={showDay} onOpen={open} />);

  const counts = { today: b.overdue.length + b.today.length, week: b.upcoming.filter(t => t.day < addDays(today, 7)).length + b.overdue.length + b.today.length, later: later.length + b.someday.length };

  return (
    <div className="space-y-4">
      {/* type a task */}
      <form onSubmit={submitQuick} className="card p-3.5 sm:p-4" aria-label="Quick add a task">
        <div className="flex gap-2">
          <input value={quick} onChange={e => setQuick(e.target.value)} placeholder="Add a task, e.g. Call Patel about payment tomorrow !!" aria-label="New task" className="input-field flex-1 min-w-0" />
          <Button type="submit" variant="primary" icon={<Plus size={16} />} disabled={!quick.trim()}>Add</Button>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span>Type the day (<b>tomorrow</b>, <b>fri</b>, <b>5 nov</b>), <b>!!</b> for high priority, <b>every month</b> to repeat.</span>
          <button type="button" onClick={quickMore} className="ml-auto text-[13px] font-semibold text-rose-700 min-h-[32px]">More options</button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Segmented<View> value={view} onChange={setView} label="Show" options={[
          { value: 'today', label: 'Today', count: counts.today || undefined }, { value: 'week', label: 'Week' }, { value: 'later', label: 'Later', count: counts.later || undefined }, { value: 'done', label: 'Done' },
        ]} />
        <Button size="sm" variant="ghost" className="ml-auto" icon={<Sparkles size={14} />} onClick={() => setCommon(true)}>Repeating reminders</Button>
      </div>

      {!loaded && <div className="card"><div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-rose-700 border-t-transparent rounded-full animate-spin" /></div></div>}

      {loaded && view === 'today' && (
        counts.today === 0 ? (
          <div className="card"><EmptyState icon={<CalendarCheck size={24} />} title="You are clear for today" action={<Button onClick={() => setView('week')}>See the week</Button>}>
            {b.upcoming.length ? `Next up: ${b.upcoming[0].text} (${dueText(b.upcoming[0].day, today).text.toLowerCase()}).` : 'Nothing is waiting. Type a task above.'}
          </EmptyState></div>
        ) : (
          <>
            {b.overdue.length > 0 && <Section title="Overdue" tone="red" count={b.overdue.length}>{rows(b.overdue, true)}</Section>}
            {b.today.length > 0 && <Section title="Today" tone="amber" count={b.today.length}>{rows(b.today, false)}</Section>}
          </>
        )
      )}

      {loaded && view === 'week' && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => setWeekOffset(o => o - 1)} aria-label="Previous week" className="w-10 h-10 rounded-full bg-white/70 ring-1 ring-black/5 flex items-center justify-center text-gray-600"><ChevronLeft size={18} /></button>
            <p className="text-sm font-semibold text-gray-800">{dayText(weekDays[0])} – {dayText(weekDays[6])}{weekOffset !== 0 && <button className="ml-2 text-rose-700 text-xs font-semibold" onClick={() => setWeekOffset(0)}>This week</button>}</p>
            <button onClick={() => setWeekOffset(o => o + 1)} aria-label="Next week" className="w-10 h-10 rounded-full bg-white/70 ring-1 ring-black/5 flex items-center justify-center text-gray-600"><ChevronRight size={18} /></button>
          </div>
          {weekOffset === 0 && b.overdue.length > 0 && <Section title="Overdue" tone="red" count={b.overdue.length}>{rows(b.overdue, true)}</Section>}
          {weekDays.map(day => {
            const list = tasks.filter(t => !t.completed && t.day === day).sort((a, c) => (a.time || '99').localeCompare(c.time || '99'));
            const label = day === today ? 'Today' : day === addDays(today, 1) ? 'Tomorrow' : dayText(day);
            return (
              <Section key={day} title={`${label}${label === 'Today' || label === 'Tomorrow' ? ` · ${dayText(day)}` : ''}`} count={list.length || undefined}
                action={<button onClick={() => setSheet({ preset: { day } })} aria-label={`Add a task on ${dayText(day)}`} className="w-8 h-8 rounded-full flex items-center justify-center text-rose-700 hover:bg-rose-50"><Plus size={17} /></button>}>
                {list.length ? rows(list, false) : <p className="px-4 py-3 text-sm text-gray-400">Nothing planned</p>}
              </Section>
            );
          })}
        </>
      )}

      {loaded && view === 'later' && (
        later.length + b.someday.length === 0 ? (
          <div className="card"><EmptyState icon={<CalendarDays size={24} />} title="Nothing further ahead">Tasks more than a week away, and tasks without a date, show here.</EmptyState></div>
        ) : (
          <>
            {later.length > 0 && <Section title="Coming up" count={later.length}>{rows(later, true)}</Section>}
            {b.someday.length > 0 && <Section title="No date" count={b.someday.length}>{rows(b.someday, true)}</Section>}
          </>
        )
      )}

      {loaded && view === 'done' && (
        b.done.length === 0 ? (
          <div className="card"><EmptyState icon={<Check size={24} />} title="Nothing finished yet">Tasks you tick off are kept here.</EmptyState></div>
        ) : (
          <Section title="Finished" count={b.done.length} action={
            confirmClear
              ? <span className="flex items-center gap-2"><Button size="sm" variant="danger" onClick={async () => { for (const t of b.done) await removeTask(t.id); setConfirmClear(false); toast.success('Cleared'); }}>Delete {b.done.length}</Button><Button size="sm" onClick={() => setConfirmClear(false)}>Keep</Button></span>
              : <Button size="sm" variant="ghost" className="!text-red-600" icon={<Trash2 size={14} />} onClick={() => setConfirmClear(true)}>Clear all</Button>}>
            {rows(b.done.slice(0, 80), false)}
          </Section>
        )
      )}

      <TaskSheet open={!!sheet} onClose={() => setSheet(null)} today={today} task={sheet?.task} preset={sheet?.preset} />

      {/* the dates a broker repeats every month */}
      <Sheet open={common} onClose={() => setCommon(false)} title="Repeating reminders">
        <p className="text-sm text-gray-600 -mt-1 mb-3">One tap adds a task that comes back by itself each month, with the right date.</p>
        <div className="group-list">
          {COMMON_REMINDERS.map(r => {
            const have = tasks.some(t => !t.completed && t.series === `tpl_${r.key}`);
            return (
              <div key={r.key} className="row !py-3 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-gray-900">{r.text}</p>
                  <p className="text-xs text-gray-500">{r.details}</p>
                </div>
                {have
                  ? <Badge tone="green" icon={<Check size={12} />}>Added</Badge>
                  : <Button size="sm" variant="soft" aria-label={`Add reminder: ${r.text}`} onClick={async () => { await addTask({ text: r.text, day: nextDom(today, r.dom), repeat: r.repeat, priority: r.priority, details: r.details, series: `tpl_${r.key}` }); toast.success('Reminder added'); }}>Add</Button>}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-3">Check the dates against your own filing schedule (quarterly filers and TDS rules differ). You can change any of them after adding.</p>
      </Sheet>
    </div>
  );
}

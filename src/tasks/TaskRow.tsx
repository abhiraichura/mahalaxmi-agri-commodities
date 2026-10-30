// src/tasks/TaskRow.tsx
// One task in a list: tick circle, text, when it is due, priority / repeat / steps, and a chip that opens the linked contract or party.
import { Link } from 'react-router-dom';
import { Check, FileText, Flag, ListChecks, Repeat as RepeatIcon, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { checkProgress, dayText, dueText, REPEAT_LABEL, type Task } from './model';
import { toggleTask } from './store';
import { linkTo } from './LinkPicker';

export default function TaskRow({ t, today, showDay, onOpen, hideLink }: { t: Task; today: string; showDay: boolean; onOpen: (t: Task) => void; hideLink?: boolean }) {
  const due = dueText(t.day, today);
  const prog = checkProgress(t);
  const toneCls: Record<'red' | 'amber' | 'blue' | 'gray', string> = { red: 'text-red-600', amber: 'text-amber-700', blue: 'text-sky-700', gray: 'text-gray-500' };
  const onToggle = async () => {
    const r = await toggleTask(t, today);
    if (r.next) toast.success(`Done. Next one: ${dayText(r.next)}`);
  };
  return (
    <div className="row !items-start !py-3 gap-3">
      <button type="button" onClick={onToggle} role="checkbox" aria-checked={t.completed} aria-label={`${t.completed ? 'Mark not done' : 'Mark done'}: ${t.text}`}
        className={`mt-0.5 w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all active:scale-90 ${t.completed ? 'bg-emerald-500 border-emerald-500 text-white' : t.priority === 'high' ? 'border-rose-400 text-transparent hover:text-rose-300' : 'border-gray-300 text-transparent hover:text-gray-300'}`}>
        <Check size={15} strokeWidth={3.2} />
      </button>
      <button type="button" onClick={() => onOpen(t)} className="min-w-0 flex-1 text-left" aria-label={`Open task: ${t.text}`}>
        <span className={`block text-[15px] font-medium break-words ${t.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.text}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
          {!t.completed && (showDay || t.day < today) && t.day !== '' && <span className={`font-semibold ${toneCls[due.tone]}`}>{due.text}</span>}
          {!t.completed && !t.day && showDay && <span className="text-gray-500">No date</span>}
          {t.time && <span className="text-gray-500">{t.time}</span>}
          {t.priority === 'high' && !t.completed && <span className="inline-flex items-center gap-0.5 text-rose-600 font-semibold"><Flag size={11} />High</span>}
          {t.repeat && <span className="inline-flex items-center gap-0.5 text-gray-500" title={REPEAT_LABEL[t.repeat]}><RepeatIcon size={11} />{REPEAT_LABEL[t.repeat]}</span>}
          {prog && <span className="inline-flex items-center gap-0.5 text-gray-500"><ListChecks size={12} />{prog.done}/{prog.total}</span>}
        </span>
        {t.details && !t.completed && <span className="block text-xs text-gray-500 mt-0.5 line-clamp-1">{t.details}</span>}
      </button>
      {t.link && !hideLink && (
        <Link to={linkTo(t.link)} onClick={e => e.stopPropagation()} aria-label={`Open ${t.link.label}`}
          className={`shrink-0 max-w-[40%] inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold truncate ${t.link.type === 'contract' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>
          {t.link.type === 'contract' ? <FileText size={11} className="shrink-0" /> : <Users size={11} className="shrink-0" />}<span className="truncate">{t.link.label}</span>
        </Link>
      )}
    </div>
  );
}


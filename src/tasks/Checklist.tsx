// A small list of steps with tick boxes (used inside tasks and notes).
import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type { CheckItem } from './model';

const uid = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export default function Checklist({ items, onChange, placeholder = 'Add a step' }: { items: CheckItem[]; onChange: (items: CheckItem[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, { id: uid(), text, done: false }]);
    setDraft('');
  };
  return (
    <div>
      <ul className="space-y-0.5">
        {items.map(it => (
          <li key={it.id} className="flex items-center gap-2 group">
            <button type="button" role="checkbox" aria-checked={it.done} aria-label={`${it.done ? 'Untick' : 'Tick'} ${it.text}`}
              onClick={() => onChange(items.map(x => (x.id === it.id ? { ...x, done: !x.done } : x)))}
              className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${it.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 text-transparent'}`}>
              <Check size={13} strokeWidth={3.2} />
            </button>
            <input value={it.text} onChange={e => onChange(items.map(x => (x.id === it.id ? { ...x, text: e.target.value } : x)))} aria-label="Step"
              className={`flex-1 min-w-0 bg-transparent py-2.5 text-[15px] outline-none ${it.done ? 'line-through text-gray-400' : 'text-gray-800'}`} />
            <button type="button" aria-label={`Remove ${it.text}`} onClick={() => onChange(items.filter(x => x.id !== it.id))}
              className="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-red-600 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100"><X size={15} /></button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 mt-0.5">
        <Plus size={16} className="text-gray-400 ml-[3px] shrink-0" />
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={placeholder} aria-label={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} onBlur={add}
          className="flex-1 min-w-0 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-gray-400" />
      </div>
    </div>
  );
}

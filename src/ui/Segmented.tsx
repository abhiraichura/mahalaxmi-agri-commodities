import { ReactNode } from 'react';

/** A row of choices (filters / tabs). On a phone it scrolls sideways instead of wrapping. */
export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 pb-0.5">
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} role="tab" aria-selected={on} onClick={() => onChange(o.value)}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium border transition-colors min-h-[40px] ${on ? 'bg-rose-700 border-rose-700 text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            {o.label}
            {o.count != null && <span className={`text-xs rounded-full px-1.5 ${on ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'}`}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

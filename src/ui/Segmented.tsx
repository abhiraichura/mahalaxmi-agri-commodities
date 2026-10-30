import { ReactNode } from 'react';

/** A row of choices (filters / tabs) in the iPhone "segmented control" style. On a small screen it scrolls sideways instead of wrapping. */
export function Segmented<T extends string>({ value, onChange, options, label, full }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; label?: string; full?: boolean;
}) {
  return (
    <div role="tablist" aria-label={label} className={`seg ${full ? 'w-full' : ''}`}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.value)} className={`seg-item ${full ? 'flex-1 justify-center' : ''}`}>
            {o.label}
            {o.count != null && <span className={`text-[11px] leading-none rounded-full px-1.5 py-[3px] ${on ? 'bg-rose-100 text-rose-700' : 'bg-black/[0.07] text-gray-500'}`}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

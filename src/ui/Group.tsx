import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { TONES, Tone } from './Badge';

/** A rounded block of rows separated by hairlines (like iPhone Settings). Optional small heading above and a note below. */
export function Group({ title, note, children, className = '' }: { title?: ReactNode; note?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      {title && <h3 className="section-label px-1 mb-1.5">{title}</h3>}
      <div className="group-list">{children}</div>
      {note && <p className="px-1 mt-1.5 text-xs text-gray-500">{note}</p>}
    </section>
  );
}

/** One row. Give it `to` to make it a link, `onClick` to make it a button, or neither for a plain row. */
export function Row({ to, onClick, icon, tone = 'gray', title, sub, right, chevron, className = '' }: {
  to?: string; onClick?: () => void; icon?: ReactNode; tone?: Tone; title: ReactNode; sub?: ReactNode; right?: ReactNode; chevron?: boolean; className?: string;
}) {
  const inner = (
    <>
      {icon && <span className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${TONES[tone]}`}>{icon}</span>}
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[15px] font-medium text-gray-900 truncate">{title}</span>
        {sub && <span className="block text-xs text-gray-500 truncate mt-px">{sub}</span>}
      </span>
      {right}
      {(chevron ?? !!(to || onClick)) && <ChevronRight size={16} className="text-gray-300 shrink-0" />}
    </>
  );
  const cls = `row ${className}`;
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`${cls} w-full`}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * A panel that slides up from the bottom on a phone and sits in the middle on a computer.
 * Closes with the X, the dark area around it, or the Escape key. The page behind does not scroll.
 */
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className={`relative bg-white w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col`}>
        <div className="sm:hidden mx-auto mt-2 h-1.5 w-10 rounded-full bg-gray-300" />
        {(title || true) && (
          <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="-mr-2 -mt-1 p-2 rounded-full text-gray-500 hover:bg-gray-100"><X size={20} /></button>
          </div>
        )}
        <div className="px-5 pb-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 pt-3 border-t border-gray-100" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>{footer}</div>}
        {!footer && <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />}
      </div>
    </div>
  );
}

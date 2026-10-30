import { ReactNode, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * A panel that slides up from the bottom on a phone (drag it down to close) and pops up in the middle on a computer.
 * Closes with the X, a tap on the dimmed area, the Escape key, or a swipe down. The page behind does not scroll.
 */
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const [dy, setDy] = useState(0);
  const drag = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  useEffect(() => { if (!open) { setDy(0); drag.current = null; } }, [open]);
  if (!open) return null;

  // the top strip (grabber + title) can be dragged down with a finger
  const down = (e: React.PointerEvent) => { if (e.pointerType === 'mouse') return; drag.current = e.clientY; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); };
  const move = (e: React.PointerEvent) => { if (drag.current != null) setDy(Math.max(0, e.clientY - drag.current)); };
  const up = () => { if (drag.current == null) return; drag.current = null; if (dy > 110) onClose(); else setDy(0); };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[3px] animate-fade" onClick={onClose} style={{ opacity: dy ? Math.max(0.2, 1 - dy / 400) : undefined }} />
      <div
        className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} rounded-t-[28px] sm:rounded-[28px] max-h-[92vh] flex flex-col animate-sheet sm:animate-pop bg-[rgba(250,250,253,0.94)] backdrop-blur-2xl ring-1 ring-white/70 shadow-2xl`}
        style={{ transform: dy ? `translateY(${dy}px)` : undefined, transition: drag.current == null ? 'transform .3s cubic-bezier(0.32,0.72,0,1)' : 'none' }}
      >
        <div className="touch-none select-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="sm:hidden mx-auto mt-2.5 h-[5px] w-9 rounded-full bg-gray-300/90" />
          <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2">
            <h2 className="text-[19px] font-bold text-gray-900 tracking-tight min-w-0 truncate">{title}</h2>
            <button onClick={onClose} onPointerDown={e => e.stopPropagation()} aria-label="Close" className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-500 bg-black/[0.06] hover:bg-black/10 active:scale-95 transition"><X size={17} strokeWidth={2.4} /></button>
          </div>
        </div>
        <div className="px-5 pb-4 overflow-y-auto overscroll-contain">{children}</div>
        {footer
          ? <div className="px-5 pt-3 border-t border-black/5" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>{footer}</div>
          : <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />}
      </div>
    </div>
  );
}

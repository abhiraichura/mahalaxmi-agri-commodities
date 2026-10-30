import { createContext, ReactNode, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useChrome } from './chrome';

/** True while a page is shown inside a hub (tabs under one title): the page then drops its own title and outer padding. */
export const EmbedContext = createContext(false);
export const useEmbedded = () => useContext(EmbedContext);

const WIDTH = { narrow: 'max-w-3xl', default: 'max-w-5xl', wide: 'max-w-7xl', full: '' } as const;

/**
 * The frame of every screen: a large title (with a back button when it is a detail screen), optional actions on the right,
 * and a comfortable width. When the large title scrolls away, the top bar shows it small. The top bar and the bottom tabs
 * are handled by the layout, so no page needs its own top spacing.
 */
export function Page({ title, subtitle, back, actions, width = 'default', children, className = '' }: {
  title?: ReactNode; subtitle?: ReactNode; back?: string | boolean; actions?: ReactNode; width?: keyof typeof WIDTH; children: ReactNode; className?: string;
}) {
  const navigate = useNavigate();
  const embedded = useEmbedded();
  const h1 = useRef<HTMLHeadingElement>(null);
  const text = embedded ? '' : typeof title === 'string' ? title : '';

  useEffect(() => {
    const set = useChrome.getState().set;
    const el = h1.current;
    if (!text || !el || typeof IntersectionObserver === 'undefined') { set(text, false); return () => set('', false); }
    // "gone" = the title has moved up under the top bar
    const io = new IntersectionObserver(([e]) => set(text, !e.isIntersecting && e.boundingClientRect.bottom < 80), { rootMargin: '-56px 0px 0px 0px', threshold: 0 });
    io.observe(el);
    return () => { io.disconnect(); set('', false); };
  }, [text]);

  if (embedded) {
    return (
      <div className={`mx-auto ${WIDTH[width]} ${className}`}>
        {(subtitle || actions) && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {subtitle ? <p className="text-[13px] text-gray-500 min-w-0 flex-1 basis-[12rem]">{subtitle}</p> : <span />}
            {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className={`page-container ${className}`}>
      <div className={`mx-auto ${WIDTH[width]}`}>
        {(title || actions) && (
          <header className="mb-4 lg:mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className="flex items-center gap-2 min-w-0 flex-1 basis-[11rem]">
              {back && (
                <button onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))} aria-label="Back"
                  className="-ml-1.5 w-9 h-9 rounded-full flex items-center justify-center text-rose-700 bg-white/70 shadow-sm ring-1 ring-black/5 active:scale-95 transition shrink-0">
                  <ChevronLeft size={22} strokeWidth={2.4} />
                </button>
              )}
              <div className="min-w-0">
                {title && <h1 ref={h1} className={`${text.length > 24 ? 'text-[22px] lg:text-[24px] leading-tight' : 'text-[28px] lg:text-[26px] leading-[1.1]'} font-bold text-gray-900 tracking-tight`}>{title}</h1>}
                {subtitle && <p className="mt-1 text-[13px] text-gray-500">{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}

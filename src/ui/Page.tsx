import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const WIDTH = { narrow: 'max-w-3xl', default: 'max-w-5xl', wide: 'max-w-7xl', full: '' } as const;

/**
 * The frame of every screen: a title (with a back arrow when it is a detail screen), optional actions on the right,
 * and a comfortable width. The top bar and the bottom tabs are handled by the layout, so no page needs its own top spacing.
 */
export function Page({ title, subtitle, back, actions, width = 'default', children, className = '' }: {
  title?: ReactNode; subtitle?: ReactNode; back?: string | boolean; actions?: ReactNode; width?: keyof typeof WIDTH; children: ReactNode; className?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className={`page-container ${className}`}>
      <div className={`mx-auto ${WIDTH[width]}`}>
        {(title || actions) && (
          <header className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="flex items-start gap-2 min-w-0">
              {back && (
                <button onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))} aria-label="Back" className="-ml-2 mt-0.5 p-2 rounded-full text-gray-600 hover:bg-gray-200/60 shrink-0">
                  <ArrowLeft size={20} />
                </button>
              )}
              <div className="min-w-0">
                {title && <h1 className="text-xl lg:text-2xl font-bold text-gray-900 leading-tight">{title}</h1>}
                {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}

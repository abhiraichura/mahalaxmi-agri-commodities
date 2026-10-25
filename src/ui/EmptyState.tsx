import { ReactNode } from 'react';

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-6">
      {icon && <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">{icon}</div>}
      <p className="font-semibold text-gray-800">{title}</p>
      {children && <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

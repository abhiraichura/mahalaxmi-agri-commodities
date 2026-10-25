import { ReactNode } from 'react';

/** A label above a field, with an optional hint and error underneath. */
export function Field({ label, hint, error, children, className = '' }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {error ? <span className="block mt-1 text-xs text-red-600">{error}</span> : hint ? <span className="block mt-1 text-xs text-gray-500">{hint}</span> : null}
    </label>
  );
}

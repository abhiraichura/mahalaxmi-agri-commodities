import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type Tone = 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'rose' | 'violet';
const TONES: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-800',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-sky-50 text-sky-700',
  rose: 'bg-rose-50 text-rose-700',
  violet: 'bg-violet-50 text-violet-700',
};

export function Badge({ tone = 'gray', icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return <span className={twMerge('chip', TONES[tone], className)}>{icon}{children}</span>;
}

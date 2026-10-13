import { usePlainCopy } from '../utils/usePlainCopy';

/** "With letterhead" (digital copy) / "Without letterhead" (for printing on the printed letterhead) */
export default function LetterheadToggle({ className = '' }: { className?: string }) {
  const [plain, setPlain] = usePlainCopy();
  const btn = (on: boolean) =>
    `flex-1 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${on ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`;
  return (
    <div className={className}>
      <div className="flex p-1 bg-gray-100 rounded-xl gap-1" role="group" aria-label="Letterhead">
        <button type="button" onClick={() => setPlain(false)} className={btn(!plain)} aria-pressed={!plain}>With letterhead</button>
        <button type="button" onClick={() => setPlain(true)} className={btn(plain)} aria-pressed={plain}>Without letterhead</button>
      </div>
      <p className="text-[11px] text-gray-500 mt-1.5 px-1">
        {plain
          ? 'No header, footer or lotus. Everything else is in the same place, so it lines up on your printed letterhead.'
          : 'Full page with your letterhead, for sending digitally.'}
      </p>
    </div>
  );
}

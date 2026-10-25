import { useEffect, useState } from 'react';
import { todayIST } from '../../server/reminders/plan.js';

/** Today's date in India ("YYYY-MM-DD"); changes by itself at midnight while the app stays open. */
export function useToday(): string {
  const [today, setToday] = useState(() => todayIST());
  useEffect(() => {
    const t = setInterval(() => { const n = todayIST(); setToday(p => (p === n ? p : n)); }, 60_000);
    const onVis = () => { if (document.visibilityState === 'visible') { const n = todayIST(); setToday(p => (p === n ? p : n)); } };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  return today;
}

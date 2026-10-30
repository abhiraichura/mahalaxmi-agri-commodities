// A page tells the top bar its title, and whether the big title at the top of the page has scrolled out of sight.
// On a phone the top bar then shows the small title instead of the app name (like iPhone apps do).
import { create } from 'zustand';

interface ChromeState { title: string; compact: boolean; set: (title: string, compact: boolean) => void }

export const useChrome = create<ChromeState>(set => ({
  title: '',
  compact: false,
  set: (title, compact) => set(s => (s.title === title && s.compact === compact ? s : { title, compact })),
}));

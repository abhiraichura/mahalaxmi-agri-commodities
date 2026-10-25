// The map of the app: one list used by the desktop menu, the phone "More" sheet and the search box.
import { FileText, Users, Package, Receipt, BookOpen, TrendingUp, Megaphone, MessageSquare, UserCog, Type, StickyNote, CheckSquare, Settings, Search, FolderOpen, LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
  end?: boolean;
  keywords?: string;
  children?: NavItem[];
}
export interface NavGroup { label: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Work',
    items: [
      { to: '/contracts', label: 'Contracts', icon: FileText, hint: 'All your deals', keywords: 'deal bargain' },
      {
        to: '/parties', label: 'Parties', icon: Users, hint: 'Buyers and sellers', keywords: 'buyer seller client',
        children: [
          { to: '/parties', label: 'Find a party', icon: Search, end: true },
          { to: '/parties/directory', label: 'Party directory', icon: Users },
          { to: '/parties/gulfood', label: 'Gulfood directory', icon: FolderOpen },
        ],
      },
      { to: '/products', label: 'Products', icon: Package, hint: 'Specs and brokerage rates', keywords: 'jeera dhaniya turmeric spec quality' },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/brokerage', label: 'Brokerage bills', icon: Receipt, hint: 'Your commission bills', keywords: 'invoice commission' },
      { to: '/ledger', label: 'Party ledger', icon: BookOpen, hint: 'Statement by party', keywords: 'statement account' },
    ],
  },
  {
    label: 'Market',
    items: [
      { to: '/rates', label: 'Rates Desk', icon: TrendingUp, hint: 'Live NCDEX rates to WhatsApp', keywords: 'ncdex price rate update' },
      { to: '/broadcast', label: 'WhatsApp broadcast', icon: Megaphone, hint: 'Send to many parties', keywords: 'send message group' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/message-generator', label: 'Message generator', icon: MessageSquare, hint: 'Contract and rate messages' },
      { to: '/party-message', label: 'Party message', icon: UserCog, hint: 'Message for one party' },
      { to: '/custom-message', label: 'Custom message', icon: Type, hint: 'Write your own template' },
      { to: '/notes', label: 'Notes', icon: StickyNote, hint: 'Quick notes' },
      { to: '/todos', label: 'Task planner', icon: CheckSquare, hint: 'To-dos and reminders', keywords: 'todo task' },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { to: '/settings', label: 'Settings', icon: Settings, hint: 'Company, defaults, notifications' };

/** every page, flat (for the search box) */
export const ALL_PAGES: NavItem[] = [
  { to: '/', label: 'Today', icon: FileText, hint: 'What needs you today', keywords: 'home dashboard' },
  ...NAV_GROUPS.flatMap(g => g.items.flatMap(i => (i.children ? [i, ...i.children.filter(c => c.to !== i.to)] : [i]))),
  SETTINGS_ITEM,
];

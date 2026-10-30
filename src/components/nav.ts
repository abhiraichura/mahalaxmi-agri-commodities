// The map of the app: one list used by the desktop menu, the phone "More" sheet and the search box.
import { FileText, Users, Package, Receipt, BookOpen, TrendingUp, Megaphone, MessageSquare, UserCog, Type, StickyNote, CheckSquare, Settings, LucideIcon } from 'lucide-react';

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
      { to: '/parties', label: 'Parties', icon: Users, hint: 'Buyers, sellers and Gulfood contacts', keywords: 'buyer seller client directory gulfood' },
      { to: '/products', label: 'Products', icon: Package, hint: 'Specs and brokerage rates', keywords: 'jeera dhaniya turmeric spec quality' },
    ],
  },
  {
    label: 'Money',
    items: [
      {
        to: '/money', label: 'Bills & ledger', icon: Receipt, hint: 'Brokerage bills and party statements', keywords: 'money invoice commission statement account',
        children: [
          { to: '/money?tab=bills', label: 'Brokerage bills', icon: Receipt, hint: 'Your commission bills', keywords: 'invoice commission' },
          { to: '/money?tab=ledger', label: 'Party ledger', icon: BookOpen, hint: 'Statement by party', keywords: 'statement account' },
        ],
      },
    ],
  },
  {
    label: 'Market',
    items: [
      { to: '/rates', label: 'Rates Desk', icon: TrendingUp, hint: 'Live NCDEX rates to WhatsApp', keywords: 'ncdex price rate update' },
      {
        to: '/messages', label: 'Messages', icon: Megaphone, hint: 'WhatsApp broadcasts, rate and party messages', keywords: 'whatsapp send group list',
        children: [
          { to: '/messages?tab=broadcast', label: 'WhatsApp broadcast', icon: Megaphone, hint: 'Send to many parties', keywords: 'send message group list contacts' },
          { to: '/messages?tab=rate', label: 'Rate message', icon: MessageSquare, hint: 'Draft a rate message', keywords: 'message generator' },
          { to: '/messages?tab=party', label: 'Message a party', icon: UserCog, hint: 'A message for one party', keywords: 'party message' },
          { to: '/messages?tab=custom', label: 'Custom message', icon: Type, hint: 'Write your own template', keywords: 'template' },
        ],
      },
    ],
  },
  {
    label: 'Organise',
    items: [
      {
        to: '/planner', label: 'Tasks & notes', icon: CheckSquare, hint: 'To-dos, repeating reminders and notes', keywords: 'todo task planner reminder',
        children: [
          { to: '/planner?tab=tasks', label: 'Tasks', icon: CheckSquare, hint: 'To-dos and repeating reminders', keywords: 'todo planner' },
          { to: '/planner?tab=notes', label: 'Notes', icon: StickyNote, hint: 'Quick notes', keywords: 'note jot' },
        ],
      },
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

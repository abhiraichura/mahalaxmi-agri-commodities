// Types for plan.js (the reminder rules shared by the server and the screens)
export type DateKey = string; // "YYYY-MM-DD"
export const isKey: (k: unknown) => boolean;
export const cleanKey: (k: unknown) => DateKey | null;
export function addDays(key: DateKey, n: number): DateKey;
export function diffDays(a: DateKey, b: DateKey): number;
export function todayIST(now?: Date): DateKey;
export function fmtDay(key: DateKey): string;
export function fmtDayYear(key: DateKey): string;
export function relDay(key: DateKey, today: DateKey): string;
export function parseLoadingDays(text: string): number | null;
export function parsePaymentDays(text: string): { min: number; max: number } | null;
export function nudgeDay(n: number): boolean;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContractLike = any;

export interface Terms {
  date: DateKey | null;
  loadingDays: number | null;
  deadline: DateKey | null;
  half: DateKey | null;
  eve: DateKey | null;
  pay: { min: number; max: number } | null;
  source: { loading: 'deadline' | 'days' | 'text' | null; payment: 'days' | 'text' | null };
}
export function termsOf(c: ContractLike): Terms;

export type Stage = 'draft' | 'cancelled' | 'to_load' | 'awaiting_payment' | 'paid';
export type Ask = null | 'loading' | 'payment' | 'promised_loading' | 'promised_payment';
export interface Plan {
  eligible: boolean;
  stage: Stage;
  terms: Terms;
  loading: { deadline: DateKey | null; half: DateKey | null; eve: DateKey | null; daysLeft: number | null; overdueDays: number; state: 'none' | 'upcoming' | 'today' | 'overdue' | 'loaded'; loadedOn: DateKey | null };
  payment: { from: DateKey | null; to: DateKey | null; daysToDue: number | null; overdueDays: number; state: 'none' | 'not_started' | 'window' | 'last_day' | 'overdue' | 'received'; receivedOn: DateKey | null };
  snooze: { kind: 'loading' | 'payment'; until: DateKey; note?: string } | null;
  ask: Ask;
  next: { kind: string; date: DateKey; label: string } | null;
  attention: 'none' | 'soon' | 'today' | 'overdue';
}
export function planFor(c: ContractLike, today: DateKey): Plan;
export function dealLine(c: ContractLike): string;

export interface Due {
  key: string; kind: string; date: DateKey; title: string; body: string; url: string; tag: string; priority: number; contractId: string;
}
export function dueReminders(c: ContractLike, today: DateKey): Due[];
export function todaySummary(contracts: ContractLike[], today: DateKey, days?: number): {
  needs: { contract: ContractLike; plan: Plan; ask: Exclude<Ask, null>; over: number }[];
  soon: { contract: ContractLike; plan: Plan; date: DateKey; label: string }[];
};

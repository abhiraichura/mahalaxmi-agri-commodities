// Talks to the reminders server (/api/reminders) with the signed-in user's login token.
import { auth } from '../utils/firebase';

export interface ReminderSent {
  id: string; key: string; kind: string; contractId: string; date: string; title: string; sentAtMs: number;
  pushed?: { sent: number; failed: number; total: number }; digest?: boolean;
}
export interface ReminderStatus {
  ok: boolean; nowMs: number; today: string; devices: number;
  last: { atMs?: number; checkedAtMs?: number; cronAtMs?: number; trigger?: string; skipped?: string | null; checked?: number; due?: number; sent?: number; failed?: number; devices?: number | null } | null;
  recent: ReminderSent[];
}
export interface ReminderRun {
  ok: boolean; trigger: string; today: string; skipped?: string; checked: number; due: number; pending: number; sent: number; failed: number;
  devices?: number | null; error?: string; notifications: { title: string; sent: number; total: number }[];
}

export class ReminderApiError extends Error {
  code: string;
  constructor(message: string, code: string) { super(message); this.code = code; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function remindersCall<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new ReminderApiError('Please sign in again.', 'AUTH');
  const token = await user.getIdToken();
  let res: Response;
  try {
    res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...body }),
    });
  } catch {
    throw new ReminderApiError('Could not reach the server. Check your internet connection.', 'NETWORK');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any;
  try { json = await res.json(); } catch { throw new ReminderApiError('The reminders server did not answer. The file api/reminders.js may not be uploaded yet.', 'NOSERVER'); }
  if (res.status === 503 && json && json.code === 'SETUP') throw new ReminderApiError(json.error || 'Server setup is incomplete.', 'SETUP');
  if (res.status === 401) throw new ReminderApiError(json.error || 'Please sign in again.', 'AUTH');
  if (json && json.ok === false) throw new ReminderApiError(json.error || 'Something went wrong.', String(json.code || 'ERROR'));
  return json as T;
}

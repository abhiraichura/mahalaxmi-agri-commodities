// Talks to the Rates Desk server (/api/rates) with the signed-in user's login token.
import { auth } from '../utils/firebase';

export type CommodityKey = 'jeera' | 'dhaniya' | 'turmeric';

export interface RatePick {
  key: CommodityKey;
  expiry: string;
  expiryLabel: string;
  open: number;
  prevClose: number;
  ltp: number;
  change: number;
  changePct: number;
  oi: number | null;
  ltpSource?: string;
  warnings?: string[];
}
export type Picks = Partial<Record<CommodityKey, RatePick>>;

export interface RateUpdate {
  id: string;
  date: string;
  slot: string;
  slotHour: number | null;
  status: 'ready' | 'failed' | 'skipped' | 'running';
  title?: string;
  text?: string;
  summary?: string;
  source?: string;
  trigger?: string;
  createdAtMs: number;
  boardTime?: string | null;
  picks?: Picks;
  movement?: { mode: string; label?: string; values?: Record<string, number> };
  movementAuto?: { mode: string; label?: string; values?: Record<string, number> };
  movementEdited?: boolean;
  keys?: CommodityKey[];
  warnings?: string[];
  reason?: string | null;
  kind?: string | null;
  sent?: Record<string, number>;
  arrivedLate?: boolean;
  pushed?: { sent: number; failed: number; total: number; atMs: number; title?: string; error?: string; errors?: string[] };
  telegram?: { ok: boolean; atMs: number };
}

export type RateSource = 'feed' | 'server' | 'browser';

export interface RatesConfig {
  includeTurmeric: boolean;
  maxBoardAgeMin: number;
  requireBoardTime: boolean;
  showMovement?: boolean;
  rateSource?: RateSource;
  feedWaitMin?: number;
  company: { name: string; tagline: string; place: string; phones: string };
}

export interface RatesStatus {
  ok: boolean;
  config: RatesConfig;
  subscribers: number;
  devices?: { id?: string; label: string; createdAtMs: number | null; host?: string }[];
  cronKey: string;
  feedKey: string;
  vapidPublicKey: string;
  telegram: boolean;
  slots: number[];
  nowIst: { dateKey: string; hour: number; minute: number; weekday: number };
}

export class RatesApiError extends Error {
  code: string;
  missing?: string[];
  constructor(message: string, code: string, missing?: string[]) {
    super(message);
    this.code = code;
    this.missing = missing;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ratesCall<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new RatesApiError('Please sign in again.', 'AUTH');
  const token = await user.getIdToken();
  let res: Response;
  try {
    res = await fetch('/api/rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...body }),
    });
  } catch {
    throw new RatesApiError('Could not reach the server. Check your internet connection.', 'NETWORK');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new RatesApiError('The server did not answer properly. The Rates Desk server file may not be uploaded yet.', 'NOSERVER');
  }
  if (res.status === 503 && json && json.code === 'SETUP') throw new RatesApiError(json.error || 'Server setup is incomplete.', 'SETUP', json.missing);
  if (res.status === 401) throw new RatesApiError(json.error || 'Please sign in again.', 'AUTH');
  if (json && json.ok === false && json.code) throw new RatesApiError(json.error || 'Something went wrong.', String(json.code));
  return json as T;
}

// ---- the activity log and the "is everything working" summary

export interface LogEntry {
  /** the database's own id for this line */
  id?: string;
  /** the update this line is about, when there is one */
  updateId?: string | null;
  atMs: number;
  day: string;
  time: string;
  kind: 'feed' | 'cron' | 'browser' | 'you' | 'alert';
  result: string;
  ok: boolean;
  message: string;
  slot?: string | null;
  offset?: number | null;
  values?: Record<string, string>;
  ua?: string;
  pushed?: { sent: number; failed: number; total: number; error?: string; errors?: string[] };
}

export interface HealthSlot {
  slot: string;
  hour: number;
  label: string;
  state: 'ready' | 'failed' | 'skipped' | 'running' | 'late' | 'nothing' | 'waiting' | 'upcoming' | 'closed';
  via: string | null;
  atMs: number | null;
  reason: string | null;
  arrivedLate: boolean;
}

export interface HealthFix { type: 'set_wait' | 'set_source'; value: number | string; label: string }
export interface HealthProblem { level: 'bad' | 'warn' | 'info'; code: string; text: string; fix?: HealthFix | null }

export interface Health {
  source: RateSource;
  sourceName: string;
  waitMin: number;
  weekday: boolean;
  overall: 'good' | 'warn' | 'bad';
  headline: string;
  problems: HealthProblem[];
  slots: HealthSlot[];
  /** when the Grok feed usually delivers (minutes after the hour), from the last updates; null until there are 3 */
  typical?: { count: number; median: number; min: number; max: number; alertsFirst: boolean; suggest: number | null; fix: HealthFix | null } | null;
  feed: { lastAtMs: number | null; lastResult: string | null; lastMessage: string | null; todayCount: number; lastTestAtMs: number | null };
  scheduler: { lastAtMs: number | null; lastResult: string | null; lastMessage: string | null; callsToday: { atMs: number; time: string; result: string; offset: number | null }[] };
  notifications: { devices: number; last: { atMs: number; message: string; sent?: number; total?: number; failed?: number; error?: string } | null };
  wrongKey: { atMs: number; count: number } | null;
}

export interface Activity { ok: boolean; log: LogEntry[]; updates: RateUpdate[]; health: Health }

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
  pushed?: { sent: number; failed: number; total: number; atMs: number };
  telegram?: { ok: boolean; atMs: number };
}

export interface RatesConfig {
  includeTurmeric: boolean;
  maxBoardAgeMin: number;
  requireBoardTime: boolean;
  showMovement?: boolean;
  rateSource?: 'server' | 'feed';
  feedWaitMin?: number;
  company: { name: string; tagline: string; place: string; phones: string };
}

export interface RatesStatus {
  ok: boolean;
  config: RatesConfig;
  subscribers: number;
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

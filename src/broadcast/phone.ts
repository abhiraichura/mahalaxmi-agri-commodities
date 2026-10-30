// src/broadcast/phone.ts
// Small, self-contained helpers for the WhatsApp Broadcast page (no React, no Firebase, easy to test):
// phone numbers -> WhatsApp numbers, contact files (.vcf), message merge fields, "same message" key.

export type PhoneKind = 'mobile' | 'landline' | 'international';

export interface PhoneInfo {
  /** digits with country code, no plus sign: 919909971301 */
  digits: string;
  kind: PhoneKind;
  /** +91 99099 71301 */
  display: string;
}

function show(digits: string): string {
  if (digits.startsWith('91') && digits.length === 12) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return `+${digits}`;
}

function indian(ten: string): PhoneInfo {
  const digits = `91${ten}`;
  return { digits, kind: /^[6-9]/.test(ten) ? 'mobile' : 'landline', display: show(digits) };
}

function one(raw: string): PhoneInfo | null {
  let plus = /^\s*\+/.test(raw);
  let d = raw.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) { d = d.slice(2); plus = true; } // 0091 99099 71301
  if (!plus) {
    if (d.length === 11 && d[0] === '0') d = d.slice(1); // 099099 71301
    if (d.length === 13 && d.startsWith('091')) d = d.slice(1);
    if (d.length === 10) return indian(d);
  }
  if (d.length === 12 && d.startsWith('91')) return indian(d.slice(2));
  if (d.length >= 8 && d.length <= 15 && (plus || d.length >= 11)) return { digits: d, kind: 'international', display: show(d) };
  return null;
}

/** Every phone number found in a text such as "99099 71301, 90330 00032 / 0281-2345678". */
export function extractNumbers(raw: unknown): PhoneInfo[] {
  const text = String(raw ?? '').trim();
  if (!text) return [];
  const out: PhoneInfo[] = [];
  for (const piece of text.split(/[\n,;/|]+|\s+(?:or|and)\s+|\s(?=\+)/i)) {
    const p = piece.trim();
    if (!p) continue;
    const digits = p.replace(/\D/g, '');
    // two numbers written one after the other: 9909971301 9033000032
    if (!/^\s*\+/.test(p) && (digits.length === 20 || digits.length === 24)) {
      const h = digits.length / 2;
      for (const half of [digits.slice(0, h), digits.slice(h)]) { const x = one(half); if (x) out.push(x); }
      continue;
    }
    const x = one(p);
    if (x) out.push(x);
  }
  return out;
}

export interface PartyPhones {
  all: PhoneInfo[];
  /** the number to message: the first mobile (or international) number */
  best: PhoneInfo | null;
  /** it has numbers, but none that WhatsApp can use (only landlines) */
  landlineOnly: boolean;
  /** the text shown when nothing usable was found */
  raw: string;
}

/** Collects every number of a party (phone, mobile, other numbers, contact persons) and picks the best one. */
export function partyPhones(p: {
  phone?: unknown; mobile?: unknown; alternatePhones?: unknown; otherContacts?: unknown;
}): PartyPhones {
  const sources: unknown[] = [p.mobile, p.phone];
  if (Array.isArray(p.alternatePhones)) sources.push(...p.alternatePhones);
  if (Array.isArray(p.otherContacts)) for (const c of p.otherContacts) sources.push(c && typeof c === 'object' ? (c as { phone?: unknown }).phone : null);
  const all: PhoneInfo[] = [];
  const seen = new Set<string>();
  for (const s of sources) for (const n of extractNumbers(s)) if (!seen.has(n.digits)) { seen.add(n.digits); all.push(n); }
  const best = all.find(n => n.kind !== 'landline') || null;
  const raw = [p.mobile, p.phone].map(x => String(x ?? '').trim()).filter(Boolean).join(', ');
  return { all, best, landlineOnly: !best && all.length > 0, raw };
}

// ---------------------------------------------------------------- message merge fields

export interface MergeValues { name?: string; firm?: string; date?: string; time?: string }

const FIELD = /\{\s*(name|firm|date|time)\s*\}/gi;

export const usesFields = (text: string): boolean => { FIELD.lastIndex = 0; return FIELD.test(text); };

/** {name} {firm} {date} {time} -> the real values. Unknown fields are left as they are. */
export function personalize(text: string, v: MergeValues): string {
  return text.replace(FIELD, (_all, f: string) => {
    const val = v[f.toLowerCase() as keyof MergeValues];
    return val == null ? '' : val;
  });
}

/** today's date and time on an Indian clock */
export function istStamp(now: Date = new Date()): { date: string; time: string } {
  return {
    date: new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(now),
    time: new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).format(now),
  };
}

/** One message for everybody (broadcast list / channel): names become "Sir/Madam". */
export function generic(text: string, now: Date = new Date()): string {
  const s = istStamp(now);
  return personalize(text, { name: 'Sir/Madam', firm: 'Sir/Madam', date: s.date, time: s.time });
}

/** a short fingerprint of a message: the same text gives the same key, any change gives a new one */
export function messageKey(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `${h.toString(36)}-${t.length}`;
}

// ---------------------------------------------------------------- contact files (vCard)

const esc = (s: string | undefined) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');

export interface Card { name: string; phone: string; org?: string }

/** A .vcf file text. Phones and other apps (Android, iPhone, Google Contacts) can import it. phone = digits with country code. */
export function buildVcf(cards: Card[]): string {
  const lines: string[] = [];
  for (const c of cards) {
    const digits = String(c.phone ?? '').replace(/\D/g, '');
    if (!digits) continue;
    lines.push('BEGIN:VCARD', 'VERSION:3.0', `N:${esc(c.name)};;;;`, `FN:${esc(c.name)}`);
    if (c.org) lines.push(`ORG:${esc(c.org)}`);
    lines.push(`TEL;TYPE=CELL:+${digits}`, 'END:VCARD');
  }
  return lines.join('\r\n') + (lines.length ? '\r\n' : '');
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** safe file name part */
export const fileSafe = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'list';

// src/broadcast/contacts.ts
// People you only message in broadcasts (they are not parties). Kept in the same small settings store as the
// saved messages ("whatsapp_extras"), so they never show up in Parties, Ledger or the contract pickers.
import { partyPhones } from './phone';

export interface BcContact { id: string; name: string; phone: string; city?: string; createdAt: number }

export const isBcId = (id: string) => id.startsWith('bc_');
export const newBcId = () => 'bc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export interface ParsedLine { line: string; name: string; phone: string; digits: string | null }

const PHONE = /\+?\d[\d\s().-]{6,}\d/;
const EDGE = /^[\s,;:|\-–—]+|[\s,;:|\-–—]+$/g;

/** "Ramesh Patel, 98250 12345" / "98250 12345 Ramesh" / one pair per line, copied from Excel or WhatsApp. */
export function parseContactLines(text: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  const seen = new Set<string>();
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = PHONE.exec(line);
    const phone = m ? m[0].trim() : '';
    const rest = (m ? line.replace(m[0], ' ') : line).replace(/\t/g, ' ').replace(EDGE, '').replace(/\s{2,}/g, ' ').trim();
    const digits = phone ? partyPhones({ phone }).best?.digits || null : null;
    if (digits && seen.has(digits)) continue; // the same number twice in the paste
    if (digits) seen.add(digits);
    out.push({ line, name: rest, phone, digits });
  }
  return out;
}

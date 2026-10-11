// Types for the exact-format Contract Note (the Canva-designed Buyer / Seller PDFs).

export type Tag = 'B' | 'S'; // B = buyer copy (buyer printed first), S = seller copy (seller printed first)

export interface NoteParty {
  name: string;
  addr: string; // may contain a line break (buyer: up to 2 lines, seller: 1 line)
  city: string; // "CITY, STATE, PINCODE" line
  gst: string;
}

export interface NoteValues {
  no: string;
  date: string; // yyyy-mm-dd (or dd-mm-yyyy)
  buyer: NoteParty;
  seller: NoteParty;
  product: { name: string; spec: string };
  qty: { value: string; unit: string };
  price: { value: string; unit: string };
  packing: string;
  deliverySame: boolean; // delivery at = buyer's name + address + city
  delivery: string; // used when deliverySame is false (up to 3 lines)
  loading: string;
  payment: Record<Tag, string>;
  brokerage: Record<Tag, string>;
  other: string;
}

export interface FieldSpec {
  x: number;
  y: number; // measured from the top of the page
  size: number;
  maxX: number; // right edge of the cell
  k?: number; // glyph advance scale for the few fields the original placed glyph by glyph
}

export interface PageFields {
  singleAddrSlot: string;
  fields: Record<string, FieldSpec>;
  geo: { left: number; right: number; boxL: number; boxR: number; boxT: number; boxB: number };
}

export interface FieldsData {
  mediaTop: number;
  pages: Record<Tag, PageFields>;
}

export interface FontRef {
  unitsPerEm: number;
  advances: Record<string, number>;
}

/** The small part of a fontkit font that we use. */
export interface FontLike {
  unitsPerEm: number;
  familyName?: string;
  fullName?: string;
  subfamilyName?: string;
  hasGlyphForCodePoint(cp: number): boolean;
  glyphForCodePoint(cp: number): { advanceWidth: number };
}

export interface NoteItem {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  k: number;
  maxX: number;
  width?: number;
}

export type IssueLevel = 'error' | 'overflow' | 'warn';

export interface NoteIssue {
  level: IssueLevel;
  slot: string;
  key: string; // which form field to look at, e.g. "buyer.addr"
  msg: string;
  over?: number;
  label?: string;
}

export interface ComposeOptions {
  upper?: boolean;
  grouping?: 'indian' | 'intl';
}

export interface Measurer {
  missing(text: string): string[];
  width(text: string, size: number, k?: number): number;
}

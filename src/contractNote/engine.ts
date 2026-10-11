/* Contract Note engine
 *
 *  compose()  form values  ->  positioned text items + validation issues
 *  render()   template PDF + Verdana + items -> finished one-page PDF
 *
 * Nothing here changes the design. Every position, size and spacing comes from data.ts, which was
 * measured from the original Canva contract notes; the template PDFs are those originals with only the
 * variable values removed, so header, footer, T&C, lines and colours are the original vector artwork.
 */
import type {
  ComposeOptions, FontLike, FontRef, FieldsData, Measurer, NoteIssue, NoteItem, NoteValues, Tag,
} from './types';

export const LABELS: Record<string, string> = {
  no: 'Contract number', date: 'Date',
  buyer_name: 'Buyer name', buyer_addr_a: 'Buyer address', buyer_addr_b: 'Buyer address', buyer_city: 'Buyer city', buyer_gst: 'Buyer GSTIN',
  seller_name: 'Seller name', seller_addr: 'Seller address', seller_city: 'Seller city', seller_gst: 'Seller GSTIN',
  product1: 'Product', product2: 'Specification', qty: 'Quantity', price: 'Price', packing: 'Packing',
  delivery1: 'Delivery at (line 1)', delivery2: 'Delivery at (line 2)', delivery3: 'Delivery at (line 3)',
  loading: 'Loading condition', payment: 'Payment', brokerage: 'Brokerage', other: 'Other terms',
};

/** which form field the user should look at for a given slot */
export const FORMKEY: Record<string, string> = {
  no: 'no', date: 'date',
  buyer_name: 'buyer.name', buyer_addr_a: 'buyer.addr', buyer_addr_b: 'buyer.addr', buyer_city: 'buyer.city', buyer_gst: 'buyer.gst',
  seller_name: 'seller.name', seller_addr: 'seller.addr', seller_city: 'seller.city', seller_gst: 'seller.gst',
  product1: 'product.name', product2: 'product.spec', qty: 'qty', price: 'price', packing: 'packing',
  delivery1: 'delivery', delivery2: 'delivery', delivery3: 'delivery', loading: 'loading',
  payment: 'payment', brokerage: 'brokerage', other: 'other',
};

/* ---------- formatting helpers ---------- */
function groupDigits(intStr: string, style: 'indian' | 'intl'): string {
  if (style === 'intl' || intStr.length <= 3) return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const last3 = intStr.slice(-3);
  const rest = intStr.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}
function isNum(s: string): boolean { return /^\s*\d+(\.\d+)?\s*$/.test(s); }

export function fmtQty(q: { value: string; unit: string }, grouping: 'indian' | 'intl' = 'indian'): string {
  const v = (q.value || '').trim();
  const unit = (q.unit || '').trim();
  if (!v) return '';
  if (!isNum(v)) return v; // typed in full by the user -> used exactly as typed
  const [i, d] = v.replace(/^0+(?=\d)/, '').split('.');
  return groupDigits(i || '0', grouping) + (d ? '.' + d : '') + (unit ? ' ' + unit : '');
}
export function fmtPrice(p: { value: string; unit: string }): string {
  const v = (p.value || '').trim();
  const unit = (p.unit || '').trim();
  if (!v) return '';
  if (!isNum(v)) return v;
  return Number(v).toFixed(2) + (unit ? ' ' + unit : '');
}
export function fmtDate(d: string): string {
  d = (d || '').trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (m) return m[3] + '-' + m[2] + '-' + m[1];
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(d);
  if (m) return m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') + '-' + m[3];
  return d;
}
export function fmtBrokerage(b: string): string {
  const v = (b || '').trim();
  return isNum(v) ? v + '% OF BILL VALUE' : v; // "0.25" -> "0.25% OF BILL VALUE"
}
export function clean(s: unknown): string {
  return String(s == null ? '' : s).replace(/[ \t]/g, ' ').replace(/\s+/g, ' ').trim();
}
export function lines(s: unknown): string[] {
  const a = String(s == null ? '' : s).split(/\r?\n/).map(clean);
  while (a.length && !a[a.length - 1]) a.pop();
  while (a.length && !a[0]) a.shift();
  return a;
}
export const GST_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/* ---------- text measuring (plain glyph advances: no kerning, same as the originals) ---------- */
export function makeMeasurer(font: FontLike | null | undefined): Measurer | null {
  if (!font) return null;
  const upem = font.unitsPerEm;
  return {
    missing(text: string) {
      const bad: string[] = [];
      for (const ch of text) {
        if (!font.hasGlyphForCodePoint(ch.codePointAt(0)!) && !bad.includes(ch)) bad.push(ch);
      }
      return bad;
    },
    width(text: string, size: number, k?: number) {
      let w = 0;
      for (const ch of text) w += (font.glyphForCodePoint(ch.codePointAt(0)!).advanceWidth / upem) * size * (k || 1);
      return w;
    },
  };
}

/** Break one long line at a word boundary so the first part fits `maxWidth`. Returns [first, rest]. */
function splitToFit(text: string, maxWidth: number, size: number, m: Measurer): [string, string] {
  if (m.width(text, size) <= maxWidth) return [text, ''];
  const words = text.split(' ');
  let first = '';
  let i = 0;
  for (; i < words.length; i++) {
    const cand = first ? first + ' ' + words[i] : words[i];
    if (m.width(cand, size) > maxWidth && first) break;
    first = cand;
  }
  return [first, words.slice(i).join(' ')];
}

const endsWithPunct = (s: string) => /[,.;:]$/.test(s);

/* ---------- compose ---------- */
export function compose(
  values: NoteValues,
  tag: Tag,
  FIELDS: FieldsData,
  options?: ComposeOptions,
  measurer?: Measurer | null,
): { items: NoteItem[]; issues: NoteIssue[] } {
  const opt = { upper: true, grouping: 'indian' as const, ...(options || {}) };
  const P = FIELDS.pages[tag].fields;
  const items: NoteItem[] = [];
  const issues: NoteIssue[] = [];
  const U = (s: string) => (opt.upper ? s.toUpperCase() : s);

  function add(id: string, text: string) {
    text = clean(text);
    if (!text) return;
    const spec = P[id];
    const it: NoteItem = { id, text, x: spec.x, y: spec.y, size: spec.size, k: spec.k || 1, maxX: spec.maxX };
    items.push(it);
    if (measurer) {
      const bad = measurer.missing(text);
      if (bad.length) {
        issues.push({ level: 'error', slot: id, key: FORMKEY[id], msg: LABELS[id] + ': the font has no character ' + bad.map(c => '“' + c + '”').join(' ') });
      } else {
        const w = measurer.width(text, it.size, it.k);
        const over = it.x + w - it.maxX;
        it.width = w;
        if (over > 0.01) {
          issues.push({ level: 'overflow', slot: id, key: FORMKEY[id], over, label: LABELS[id], msg: LABELS[id] + ' is ' + over.toFixed(1) + ' pt too long for its cell. Shorten it.' });
        }
      }
    }
  }

  const v = values;
  add('no', U(v.no));
  add('date', fmtDate(v.date));

  /* ----- buyer: 5 line slots (name, address x2, city, GSTIN) ----- */
  let bl = lines(v.buyer.addr).map(U);
  let autoWrapped = false;
  if (measurer && bl.length === 1) {
    // one long address line -> wrap it onto the 2 address lines at a word boundary
    const spec = P[tagSingle(FIELDS, tag)];
    const [a, b] = splitToFit(bl[0], spec.maxX - spec.x, spec.size, measurer);
    if (b) { bl = [a, b]; autoWrapped = true; }
  }
  if (bl.length > 2) issues.push({ level: 'error', slot: 'buyer_addr_a', key: 'buyer.addr', msg: 'Buyer address: at most 2 lines fit.' });
  // the original ends the address with a comma before the city line; a line we broke ourselves keeps no comma at the break
  bl = bl.map((l, i) => (endsWithPunct(l) || (autoWrapped && i < bl.length - 1) ? l : l + ','));
  add('buyer_name', U(v.buyer.name));
  if (bl.length === 1) add(tagSingle(FIELDS, tag), bl[0]);
  else if (bl.length >= 2) { add('buyer_addr_a', bl[0]); add('buyer_addr_b', bl[1]); }
  add('buyer_city', U(v.buyer.city));
  add('buyer_gst', U(v.buyer.gst));

  /* ----- seller: 4 line slots (name, one address line, city, GSTIN) ----- */
  let sl = lines(v.seller.addr).map(U);
  if (sl.length > 1) issues.push({ level: 'error', slot: 'seller_addr', key: 'seller.addr', msg: 'Seller address: the cell has room for 1 line only.' });
  sl = sl.map(l => (endsWithPunct(l) ? l : l + ','));
  add('seller_name', U(v.seller.name));
  if (sl.length) add('seller_addr', sl[0]);
  add('seller_city', U(v.seller.city));
  add('seller_gst', U(v.seller.gst));

  for (const [who, g] of [['buyer', v.buyer.gst], ['seller', v.seller.gst]] as const) {
    const t = clean(g).toUpperCase();
    if (t && !GST_RE.test(t)) {
      issues.push({ level: 'warn', slot: who + '_gst', key: who + '.gst', msg: (who === 'buyer' ? 'Buyer' : 'Seller') + ' GSTIN does not look like a valid 15-character GSTIN.' });
    }
  }

  add('product1', U(v.product.name));
  add('product2', U(v.product.spec));
  add('qty', U(fmtQty(v.qty, opt.grouping)));
  add('price', fmtPrice(v.price)); // unit keeps the case typed (e.g. "Per Kg"); the ₹ sign is part of the template
  add('packing', U(v.packing));

  let dl: string[];
  if (v.deliverySame) dl = [U(v.buyer.name), bl.join(' '), U(v.buyer.city)];
  else {
    dl = lines(v.delivery).map(U);
    if (dl.length > 3) issues.push({ level: 'error', slot: 'delivery1', key: 'delivery', msg: 'Delivery at: at most 3 lines fit.' });
  }
  dl.slice(0, 3).forEach((t, i) => add('delivery' + (i + 1), t));

  add('loading', U(v.loading));
  add('payment', U(v.payment[tag]));
  add('brokerage', U(fmtBrokerage(v.brokerage[tag])));
  add('other', U(v.other));

  // blank values that are almost never meant to be blank: a heads-up (does not block the PDF)
  for (const id of ['no', 'date', 'buyer_name', 'seller_name', 'product1', 'qty', 'price', 'brokerage']) {
    if (!items.some(i => i.id === id)) {
      issues.push({ level: 'warn', slot: id, key: FORMKEY[id], msg: LABELS[id] + ' is empty, so nothing is printed there.' });
    }
  }
  return { items, issues };
}

function tagSingle(FIELDS: FieldsData, tag: Tag): string {
  return FIELDS.pages[tag].singleAddrSlot;
}

/* ---------- font check: is this the same Verdana the design uses? ---------- */
export function checkFont(font: FontLike | null | undefined, REF: FontRef): { ok: boolean; problems: string[] } {
  if (!font || !font.unitsPerEm) return { ok: false, problems: ['Could not read this font file.'] };
  const problems: string[] = [];
  if (font.unitsPerEm !== REF.unitsPerEm) problems.push('Different internal scale (' + font.unitsPerEm + ').');
  const fam = (font.familyName || '') + ' ' + (font.fullName || '');
  if (!/verdana/i.test(fam)) problems.push('This does not look like Verdana (' + (font.fullName || font.familyName || 'unknown') + ').');
  if (/bold|italic|oblique/i.test(font.subfamilyName || '')) problems.push('Please pick regular Verdana, not ' + font.subfamilyName + '.');
  let bad = 0;
  for (const [ch, adv] of Object.entries(REF.advances)) {
    const cp = ch.codePointAt(0)!;
    if (!font.hasGlyphForCodePoint(cp) || font.glyphForCodePoint(cp).advanceWidth !== adv) bad++;
  }
  if (bad) problems.push(bad + ' letter widths differ from the design font (another Verdana version).');
  return { ok: problems.length === 0, problems };
}

/* ---------- libraries are loaded on demand so the rest of the app stays light ---------- */
type FontkitModule = { create(bytes: Uint8Array): unknown };
let fontkitPromise: Promise<FontkitModule> | null = null;
export function loadFontkit(): Promise<FontkitModule> {
  if (!fontkitPromise) {
    fontkitPromise = import('@pdf-lib/fontkit').then((m: any) => (m.default || m) as FontkitModule);
    fontkitPromise.catch(() => { fontkitPromise = null; });
  }
  return fontkitPromise;
}

/** Parse a font file (for measuring / checking). */
export async function parseFont(bytes: Uint8Array): Promise<FontLike> {
  const fk = await loadFontkit();
  return fk.create(bytes) as FontLike;
}

/* ---------- render ---------- */
const NO_FEATURES = { kern: false, liga: false, clig: false, calt: false, ccmp: false, locl: false, mark: false, mkmk: false, rlig: false, dlig: false, hlig: false };

export async function render(
  tplBytes: Uint8Array,
  fontBytes: Uint8Array,
  font: FontLike,
  items: NoteItem[],
  FIELDS: FieldsData,
  meta?: { title?: string },
): Promise<Uint8Array> {
  const [pdfLib, fontkit] = await Promise.all([import('pdf-lib'), loadFontkit()]);
  const { PDFDocument, rgb, ParseSpeeds } = pdfLib;
  const upem = font.unitsPerEm;
  const doc = await PDFDocument.load(tplBytes, { updateMetadata: false, parseSpeed: ParseSpeeds.Fastest });
  doc.registerFontkit(fontkit as any);
  const embedded = await doc.embedFont(fontBytes, { subset: true, features: NO_FEATURES } as any);
  const page = doc.getPage(0);
  for (const it of items) {
    const y = FIELDS.mediaTop - it.y; // our y is measured from the top of the page
    if (it.k && it.k !== 1) {
      // the original placed these glyph by glyph with advances scaled by k: do the same
      let x = it.x;
      for (const ch of it.text) {
        if (ch !== ' ') page.drawText(ch, { x, y, size: it.size, font: embedded, color: rgb(0, 0, 0) });
        x += (font.glyphForCodePoint(ch.codePointAt(0)!).advanceWidth / upem) * it.size * it.k;
      }
    } else {
      page.drawText(it.text, { x: it.x, y, size: it.size, font: embedded, color: rgb(0, 0, 0) });
    }
  }
  if (meta?.title) doc.setTitle(meta.title);
  return await doc.save({ useObjectStreams: true });
}

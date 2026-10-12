/* Brokerage Bill + Invoice PDFs, drawn on the company letterhead (header, lotus watermark, footer).
 *
 * The letterhead is public/contract-templates/L.pdf = the Contract Note artwork with the contract's middle
 * section removed. Only the middle of the page is drawn here. Layouts follow the reference bill / invoice:
 *
 *   Brokerage Bill : title + period, "M/s." box with Bill No. / Bill Date / Pan No., table
 *                    Cont.No | Date | Party Name & City | Particulars | Type | Quantity | Rate | Total Brok.,
 *                    Total, "Rupees : ... Only", E. & O. E., jurisdiction, "For, <company>" + signature.
 *   Invoice        : "TO," party, INVOICE NO. / INVOICE DATE, grid table
 *                    Bill Date | Vou No | Party Name | Item Name | Weight | Rate | Brokerage,
 *                    words box + Total, BANK DETAILS, "FOR, <company>" + signature.
 *
 * Many parties can be drawn into ONE pdf (each starts on a new page); the letterhead is stored only once.
 */
import type { CompanySettings, Party } from '../types';
import { billTotals, partyName, type BillLine } from './calc';
import { rupeesInWords } from './words';
import { loadFontkit, makeMeasurer, parseFont } from '../contractNote/engine';
import type { Measurer } from '../contractNote/types';

export type BillKind = 'bill' | 'invoice';

export interface BillDoc {
  party: Party;
  lines: BillLine[];
  from: string; // yyyy-mm-dd
  to: string;   // yyyy-mm-dd
  billNo: string;
  billDate: string; // yyyy-mm-dd
  adjustment: number;
  adjustmentNote: string;
  gstPercent: number;
}

export interface PdfAssets {
  template: Uint8Array; // letterhead (L.pdf)
  regular: Uint8Array;  // Verdana regular
  bold?: Uint8Array;    // Verdana Bold (optional; headings are drawn with a faux bold when missing)
  company: CompanySettings;
}

export interface PdfResult {
  bytes: Uint8Array;
  pages: number;
  /** things worth telling the user (characters the font cannot print, ...) */
  warnings: string[];
}

/* ---------- number / date formatting ---------- */
export function inr(n: number): string {
  const neg = n < 0;
  const [i, d] = Math.abs(n).toFixed(2).split('.');
  const g = i.length > 3 ? i.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + i.slice(-3) : i;
  return (neg ? '-' : '') + g + '.' + d;
}
export function dmy(iso: string, sep = '/'): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? m[3] + sep + m[2] + sep + m[1] : String(iso || '');
}
/** the amount in words without the leading "Rupees" (the bill prints "Rupees : ..." itself) */
const wordsOf = (n: number) => rupeesInWords(n).replace(/^Rupees\s+/, '');
const up = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim().toUpperCase();

/** the party's address as printed lines (address lines, then "CITY, STATE - PINCODE") */
export function addressLines(p: Partial<Party>): string[] {
  const out = String(p.address || '').split(/\r?\n/).map(up).filter(Boolean);
  const cityLine = [up(p.city), up(p.state)].filter(Boolean).join(', ') + (p.pincode ? ' - ' + String(p.pincode).trim() : '');
  if (cityLine.trim()) out.push(cityLine.trim());
  return out;
}

/* ---------- page geometry (points; y is measured from the TOP of the page) ---------- */
const W = 595.5;
const H = 842.25;
const L = 52;            // left edge of the content area (aligned with the letterhead rule)
const R = 527.5;         // right edge
const CW = R - L;
const FIRST_TOP = 152;   // just under the letterhead rule
const BOTTOM = 640;      // above the letterhead footer
const SIZE = 7.5;        // table text
const LEAD = 9.6;
const PADY = 4.5;
const PADX = 3.5;
const FAUX = 0.4;        // extra width allowed for the faux-bold outline

const NO_FEATURES = { kern: false, liga: false, clig: false, calt: false, ccmp: false, locl: false, mark: false, mkmk: false, rlig: false, dlig: false, hlig: false };

interface Col { label: string; w: number; align: 'l' | 'r' }
interface Row { cells: string[][]; h: number }

/* The drawing context for one PDF. */
interface Ctx {
  regM: Measurer;
  boldM: Measurer | null;
  warnings: Set<string>;
}

export async function renderBillDocs(kind: BillKind, docs: BillDoc[], assets: PdfAssets, title: string): Promise<PdfResult> {
  const [pdfLib, fontkit] = await Promise.all([import('pdf-lib'), loadFontkit()]);
  const { PDFDocument, rgb, ParseSpeeds, pushGraphicsState, popGraphicsState, setTextRenderingMode, TextRenderingMode, setLineWidth } = pdfLib;
  type PDFPage = import('pdf-lib').PDFPage;
  type PDFFont = import('pdf-lib').PDFFont;

  const regFont = await parseFont(assets.regular);
  const boldFontParsed = assets.bold ? await parseFont(assets.bold) : null;
  const ctx: Ctx = { regM: makeMeasurer(regFont)!, boldM: boldFontParsed ? makeMeasurer(boldFontParsed) : null, warnings: new Set() };

  const out = await PDFDocument.create({ updateMetadata: false });
  out.registerFontkit(fontkit as any);
  const reg: PDFFont = await out.embedFont(assets.regular, { subset: true, features: NO_FEATURES } as any);
  const bold: PDFFont | null = assets.bold ? await out.embedFont(assets.bold, { subset: true, features: NO_FEATURES } as any) : null;
  const src = await PDFDocument.load(assets.template, { updateMetadata: false, parseSpeed: ParseSpeeds.Fastest });
  const [letterhead] = await out.embedPages([src.getPage(0)]);

  // signature picture (a data URL saved in Settings)
  let sig: { img: import('pdf-lib').PDFImage; w: number; h: number } | null = null;
  const sigUrl = assets.company.signature;
  if (sigUrl && /^data:image\/(png|jpe?g)/i.test(sigUrl)) {
    try {
      const raw = Uint8Array.from(atob(sigUrl.slice(sigUrl.indexOf(',') + 1)), c => c.charCodeAt(0));
      const img = /^data:image\/png/i.test(sigUrl) ? await out.embedPng(raw) : await out.embedJpg(raw);
      const k = Math.min(110 / img.width, 40 / img.height);
      sig = { img, w: img.width * k, h: img.height * k };
    } catch { ctx.warnings.add('The signature picture in Settings could not be used (left blank).'); }
  }

  /* ----- text helpers ----- */
  const safe = (s: string): string => {
    const t = String(s ?? '').replace(/₹/g, 'Rs.').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
    const bad = ctx.regM.missing(t);
    if (!bad.length) return t;
    ctx.warnings.add('The font cannot print: ' + bad.join(' ') + ' (shown as "?"). Gujarati/Hindi names need an English spelling on the bill.');
    let r = t;
    for (const ch of bad) r = r.split(ch).join('?');
    return r;
  };
  const wid = (s: string, size: number, b = false) =>
    (b && ctx.boldM ? ctx.boldM : ctx.regM).width(s, size) + (b && !ctx.boldM ? FAUX : 0);

  function wrap(s: string, size: number, maxW: number, b = false): string[] {
    const lines: string[] = [];
    for (const para of String(s ?? '').split(/\n/)) {
      const words = safe(para).split(/\s+/).filter(Boolean);
      let cur = '';
      for (const w of words) {
        const cand = cur ? cur + ' ' + w : w;
        if (wid(cand, size, b) <= maxW) { cur = cand; continue; }
        if (cur) { lines.push(cur); cur = ''; }
        if (wid(w, size, b) <= maxW) { cur = w; continue; }
        let chunk = '';
        for (const ch of w) {
          if (chunk && wid(chunk + ch, size, b) > maxW) { lines.push(chunk); chunk = ch; } else chunk += ch;
        }
        cur = chunk;
      }
      if (cur) lines.push(cur);
    }
    return lines.length ? lines : [''];
  }

  class Pen {
    constructor(readonly page: PDFPage) {}
    text(s: string, x: number, y: number, size: number, o: { bold?: boolean; align?: 'l' | 'r' | 'c'; width?: number } = {}) {
      s = safe(s);
      if (!s) return;
      const w = wid(s, size, !!o.bold);
      let px = x;
      if (o.align === 'r') px = x - w;
      else if (o.align === 'c') px = x - w / 2;
      const font = o.bold && bold ? bold : reg;
      const opt = { x: px, y: H - y, size, font, color: rgb(0, 0, 0) };
      if (o.bold && !bold) {
        // no Bold font uploaded: thicken the regular letters with a thin outline (fill + stroke)
        this.page.pushOperators(pushGraphicsState(), setTextRenderingMode(TextRenderingMode.FillAndOutline), setLineWidth(size * 0.045));
        this.page.drawText(s, opt);
        this.page.pushOperators(popGraphicsState());
      } else this.page.drawText(s, opt);
    }
    line(x1: number, y1: number, x2: number, y2: number, w = 0.6, gray = 0) {
      this.page.drawLine({ start: { x: x1, y: H - y1 }, end: { x: x2, y: H - y2 }, thickness: w, color: rgb(gray, gray, gray) });
    }
    rect(x: number, y: number, w: number, h: number, o: { border?: number; fill?: number } = {}) {
      this.page.drawRectangle({
        x, y: H - y - h, width: w, height: h,
        ...(o.fill !== undefined ? { color: rgb(o.fill, o.fill, o.fill) } : {}),
        ...(o.border ? { borderColor: rgb(0, 0, 0), borderWidth: o.border } : {}),
      });
    }
    image(img: import('pdf-lib').PDFImage, x: number, y: number, w: number, h: number) {
      this.page.drawImage(img, { x, y: H - y - h, width: w, height: h });
    }
  }
  const newPage = (): Pen => {
    const page = out.addPage([W, H]);
    page.drawPage(letterhead, { x: 0, y: 0, width: W, height: H });
    return new Pen(page);
  };

  const company = assets.company;
  const companyName = up(company.legalName || company.name) || 'MAHALAXMI AGRI COMMODITIES';
  const jurisdiction = up(company.jurisdiction || company.city) || 'RAJKOT';

  /* ----- tables ----- */
  const headerLines = (cols: Col[]) => cols.map(c => wrap(c.label, SIZE, c.w - 2 * PADX, true));
  const headerHeight = (cols: Col[]) => Math.max(...headerLines(cols).map(l => l.length)) * LEAD + 2 * PADY;
  const colEdges = (cols: Col[]) => { const e = [L]; for (const c of cols) e.push(e[e.length - 1] + c.w); return e; };

  function makeRow(cols: Col[], raw: string[][]): Row {
    const cells = raw.map((lines, i) => lines.flatMap(l => wrap(l, SIZE, cols[i].w - 2 * PADX)));
    return { cells, h: Math.max(...cells.map(c => c.length)) * LEAD + 2 * PADY };
  }

  function drawHeader(pen: Pen, cols: Col[], y: number, grid: boolean): number {
    const h = headerHeight(cols);
    const edges = colEdges(cols);
    if (grid) pen.rect(L, y, CW, h, { fill: 0.92, border: 0.6 });
    else { pen.line(L, y, R, y, 0.8); pen.line(L, y + h, R, y + h, 0.8); }
    headerLines(cols).forEach((lines, i) => {
      lines.forEach((t, j) => {
        const by = y + PADY + SIZE * 0.82 + j * LEAD;
        if (cols[i].align === 'r') pen.text(t, edges[i + 1] - PADX, by, SIZE, { bold: true, align: 'r' });
        else pen.text(t, edges[i] + PADX, by, SIZE, { bold: true });
      });
    });
    if (grid) for (let i = 1; i < cols.length; i++) pen.line(edges[i], y, edges[i], y + h, 0.6);
    return y + h;
  }

  function drawRow(pen: Pen, cols: Col[], row: Row, y: number, grid: boolean): number {
    const edges = colEdges(cols);
    row.cells.forEach((lines, i) => {
      lines.forEach((t, j) => {
        const by = y + PADY + SIZE * 0.82 + j * LEAD;
        if (cols[i].align === 'r') pen.text(t, edges[i + 1] - PADX, by, SIZE, { align: 'r' });
        else pen.text(t, edges[i] + PADX, by, SIZE);
      });
    });
    if (grid) {
      for (let i = 0; i <= cols.length; i++) pen.line(edges[i], y, edges[i], y + row.h, 0.6);
      pen.line(L, y + row.h, R, y + row.h, 0.6);
    }
    return y + row.h;
  }

  /** which rows go on which page; the totals block is never left alone on a page */
  function paginate(rows: Row[], firstStart: number, contStart: number, footerH: number): number[][] {
    const pages: number[][] = [];
    let cur: number[] = [];
    let y = firstStart;
    rows.forEach((r, i) => {
      if (cur.length && y + r.h > BOTTOM) { pages.push(cur); cur = []; y = contStart; }
      cur.push(i);
      y += r.h;
    });
    if (y + footerH > BOTTOM) {
      if (cur.length > 1) { const last = cur.pop()!; pages.push(cur); cur = [last]; }
      else { pages.push(cur); cur = []; } // the totals go on a page of their own
    }
    pages.push(cur);
    return pages;
  }

  const signBlock = (pen: Pen, y: number, label: string) => {
    pen.text(label + ' ' + companyName, R - 4, y + 9, 9, { bold: true, align: 'r' });
    if (sig) pen.image(sig.img, R - 10 - sig.w, y + 15, sig.w, sig.h);
  };
  const SIGN_H = 62;

  /* extra rows under the total: adjustment, GST */
  function extraRows(d: BillDoc, t: ReturnType<typeof billTotals>): { label: string; amount: number }[] {
    const r: { label: string; amount: number }[] = [];
    if (t.adjustment) r.push({ label: 'Adjustment' + (d.adjustmentNote ? ' (' + d.adjustmentNote + ')' : ''), amount: t.adjustment });
    if (t.gstPercent > 0) {
      if (t.intraState) {
        r.push({ label: `CGST @ ${t.gstPercent / 2}%`, amount: t.cgst });
        r.push({ label: `SGST @ ${t.gstPercent / 2}%`, amount: t.sgst });
      } else r.push({ label: `IGST @ ${t.gstPercent}%`, amount: t.igst });
    }
    return r;
  }

  /* ================= BROKERAGE BILL ================= */
  const BILL_COLS: Col[] = [
    { label: 'Cont.\nNo', w: 32, align: 'l' },
    { label: 'Date', w: 54, align: 'l' },
    { label: 'Party Name & City', w: 110, align: 'l' },
    { label: 'Particulars', w: 62, align: 'l' },
    { label: 'Type', w: 28, align: 'l' },
    { label: 'Quantity\n(M.TONES)', w: 56, align: 'r' },
    { label: 'Rate (PER\nM.TONES)', w: 68, align: 'r' },
    { label: 'Total\nBrok.', w: 65.5, align: 'r' },
  ];

  function drawBill(d: BillDoc) {
    const t = billTotals(d.lines.reduce((s, l) => s + l.brokerage, 0), d.adjustment, d.gstPercent, d.party, company);
    const totalQty = d.lines.reduce((s, l) => s + l.qtyMT, 0);
    const rows = d.lines.map(l => makeRow(BILL_COLS, [
      [l.contractNo],
      [dmy(l.date)],
      [l.counterparty.name, l.counterparty.city].filter(Boolean),
      [l.product],
      [l.type],
      [l.qtyMT.toFixed(3)],
      l.ratePerMT !== null ? [inr(l.ratePerMT)] : [inr(l.rate), l.rateUnit],
      [inr(l.brokerage)],
    ]));

    // --- first-page header: title, period, party box
    const boxL = L + 8;
    const boxW = 292;
    const nameLines = wrap('M/s. ' + partyName(d.party), 10, boxW - 8, true);
    const addr = addressLines(d.party).flatMap(l => wrap(l, 8, boxW - 8));
    const gstLine = d.party.gstin ? ['GSTIN : ' + up(d.party.gstin)] : [];
    const leftH = 8 + nameLines.length * 12.5 + (addr.length + gstLine.length) * 10.8 + 6;
    const boxH = Math.max(64, leftH);
    const boxTop = 198;
    const firstTableTop = boxTop + boxH + 12;
    const hdrH = headerHeight(BILL_COLS);
    const extras = extraRows(d, t);
    const showNet = extras.length > 0;
    const grand = t.total;
    const words = wrap(wordsOf(grand), 8.5, CW - 8 - wid('Rupees : ', 8.5, true), true);
    const footerH = 18 + extras.length * 13 + (showNet ? 18 : 0) + 8 + Math.max(words.length * 11, 12) + 10 + SIGN_H;
    const pages = paginate(rows, firstTableTop + hdrH, FIRST_TOP + 22 + hdrH, footerH);

    pages.forEach((idx, p) => {
      const pen = newPage();
      let y: number;
      if (p === 0) {
        pen.text('Brokerage Bill', (L + R) / 2, 172, 15, { bold: true, align: 'c' });
        pen.text('For the period : ' + dmy(d.from) + ' - ' + dmy(d.to), (L + R) / 2, 187, 8.5, { align: 'c' });
        pen.rect(L, boxTop, CW, boxH, { border: 0.8 });
        pen.line(L + 300, boxTop, L + 300, boxTop + boxH, 0.8);
        let ty = boxTop + 14;
        nameLines.forEach(n => { pen.text(n, boxL, ty, 10, { bold: true }); ty += 12.5; });
        [...addr, ...gstLine].forEach(n => { pen.text(n, boxL, ty, 8); ty += 10.8; });
        const rx = L + 308;
        const info: [string, string][] = [['Bill No.', d.billNo], ['Bill Date', dmy(d.billDate)], ['Pan No.', up(company.pan)]];
        if (t.gstPercent > 0 && company.gstin) info.push(['GSTIN', up(company.gstin)]);
        info.forEach(([k, v], i) => {
          const yy = boxTop + 17 + i * 14;
          pen.text(k, rx, yy, 8.5, { bold: true });
          pen.text(': ' + v, rx + 52, yy, 8.5);
        });
        y = firstTableTop;
      } else {
        pen.text(`Brokerage Bill  -  M/s. ${partyName(d.party)}  -  Bill No. ${d.billNo}`, L, FIRST_TOP + 12, 8, { bold: true });
        y = FIRST_TOP + 22;
      }
      if (pages.length > 1) pen.text(`Page ${p + 1} of ${pages.length}`, R, p === 0 ? 146 : FIRST_TOP + 12, 7, { align: 'r' });
      y = drawHeader(pen, BILL_COLS, y, false);
      for (const i of idx) y = drawRow(pen, BILL_COLS, rows[i], y, false);

      if (p !== pages.length - 1) return;
      // --- totals
      const edges = colEdges(BILL_COLS);
      const labelRight = edges[7] - 6;
      pen.line(L, y + 1, R, y + 1, 0.8);
      pen.text('Total', L + PADX, y + 12, 8.5, { bold: true });
      pen.text(totalQty.toFixed(3), edges[6] - PADX, y + 12, 8, { bold: true, align: 'r' });
      pen.text(inr(t.subtotal), R - PADX, y + 12, 8.5, { bold: true, align: 'r' });
      y += 18;
      if (showNet) {
        pen.line(L, y - 1, R, y - 1, 0.4);
        for (const e of extras) {
          pen.text(e.label, labelRight, y + 9, 8, { align: 'r' });
          pen.text(inr(e.amount), R - PADX, y + 9, 8, { align: 'r' });
          y += 13;
        }
        pen.line(L, y, R, y, 0.8);
        pen.text('Net Amount', labelRight, y + 12, 8.5, { bold: true, align: 'r' });
        pen.text(inr(grand), R - PADX, y + 12, 8.5, { bold: true, align: 'r' });
        y += 18;
      }
      pen.line(L, y, R, y, 0.8);
      y += 8;
      const wx = L + PADX;
      pen.text('Rupees : ', wx, y + 9, 8.5, { bold: true });
      words.forEach((w, i) => pen.text(w, wx + wid('Rupees : ', 8.5, true), y + 9 + i * 11, 8.5, { bold: true }));
      y += Math.max(words.length * 11, 12) + 10;
      pen.text('E. & O. E.  THANK YOU.', L + PADX, y + 22, 8);
      pen.text(`Subject To ${jurisdiction} Jurisdiction`, L + PADX, y + 36, 8);
      signBlock(pen, y, 'For,');
    });
  }

  /* ================= INVOICE ================= */
  const INV_COLS: Col[] = [
    { label: 'Bill Date', w: 52, align: 'l' },
    { label: 'Vou\nNo', w: 36, align: 'l' },
    { label: 'Party Name', w: 128, align: 'l' },
    { label: 'Item Name', w: 82, align: 'l' },
    { label: 'Weight\n(MT)', w: 56, align: 'r' },
    { label: 'Rate\n(per MT)', w: 60, align: 'r' },
    { label: 'Brokerage', w: 61.5, align: 'r' },
  ];

  function drawInvoice(d: BillDoc) {
    const t = billTotals(d.lines.reduce((s, l) => s + l.brokerage, 0), d.adjustment, d.gstPercent, d.party, company);
    const totalQty = d.lines.reduce((s, l) => s + l.qtyMT, 0);
    const rows = d.lines.map(l => makeRow(INV_COLS, [
      [dmy(l.date)],
      [l.contractNo],
      [l.counterparty.name, l.counterparty.city].filter(Boolean),
      [l.product, '(' + l.type + ')'],
      [l.qtyMT.toFixed(3)],
      l.ratePerMT !== null ? [inr(l.ratePerMT)] : [inr(l.rate), l.rateUnit],
      [inr(l.brokerage)],
    ]));

    const taxInvoice = t.gstPercent > 0;
    const toW = 280;
    const toName = wrap(partyName(d.party), 10, toW, true);
    const addr = addressLines(d.party).flatMap(l => wrap(l, 8, toW));
    const gstLine = d.party.gstin ? ['GSTIN : ' + up(d.party.gstin)] : [];
    const toTop = 198;
    const toH = 14 + toName.length * 12.5 + (addr.length + gstLine.length) * 10.8 + 4;
    const firstTableTop = toTop + Math.max(toH, 58) + 10;
    const hdrH = headerHeight(INV_COLS);
    const extras = extraRows(d, t);
    const grand = t.total;
    const edges = colEdges(INV_COLS);
    const wordsW = edges[4] - L - 2 * PADX;
    const words = wrap(wordsOf(grand), 8, wordsW - wid('Rupees : ', 8, true), true);
    const sumRows = 1 + extras.length + (extras.length ? 1 : 0); // Total, extras, Net
    const sumH = Math.max(sumRows * 15, words.length * 11 + 8);
    const bank = [
      ['NAME', up(company.bankAccountName || company.legalName || company.name)],
      ['BANK', up(company.bankName)],
      ['BRANCH', up(company.bankBranch)],
      ['A/C NO.', up(company.bankAccount)],
      ['IFSC', up(company.bankIfsc)],
      ['PAN NO.', up(company.pan)],
    ].filter(([, v]) => v);
    const bankH = 16 + bank.length * 11.5;
    const footerH = sumH + 12 + Math.max(bankH, SIGN_H);
    const pages = paginate(rows, firstTableTop + hdrH, FIRST_TOP + 22 + hdrH, footerH);

    pages.forEach((idx, p) => {
      const pen = newPage();
      let y: number;
      if (p === 0) {
        pen.text(taxInvoice ? 'TAX INVOICE' : 'INVOICE', (L + R) / 2, 172, 15, { bold: true, align: 'c' });
        let ty = toTop + 12;
        pen.text('TO,', L + 2, ty, 9, { bold: true }); ty += 14;
        toName.forEach(n => { pen.text(n, L + 2, ty, 10, { bold: true }); ty += 12.5; });
        [...addr, ...gstLine].forEach(n => { pen.text(n, L + 2, ty, 8); ty += 10.8; });
        const rl = R - 2;
        pen.text('INVOICE NO. : ' + d.billNo, rl, toTop + 12, 9, { bold: true, align: 'r' });
        pen.text('INVOICE DATE : ' + dmy(d.billDate, '.'), rl, toTop + 26, 9, { bold: true, align: 'r' });
        pen.text('FOR THE PERIOD : ' + dmy(d.from) + ' - ' + dmy(d.to), rl, toTop + 40, 8, { align: 'r' });
        if (taxInvoice && company.gstin) pen.text('GSTIN : ' + up(company.gstin), rl, toTop + 53, 8, { align: 'r' });
        y = firstTableTop;
      } else {
        pen.text(`Invoice  -  ${partyName(d.party)}  -  Invoice No. ${d.billNo}`, L, FIRST_TOP + 12, 8, { bold: true });
        y = FIRST_TOP + 22;
      }
      if (pages.length > 1) pen.text(`Page ${p + 1} of ${pages.length}`, R, p === 0 ? 146 : FIRST_TOP + 12, 7, { align: 'r' });
      y = drawHeader(pen, INV_COLS, y, true);
      for (const i of idx) y = drawRow(pen, INV_COLS, rows[i], y, true);

      if (p !== pages.length - 1) return;
      // --- words box (left) and totals (right), as one grid block
      const top = y;
      pen.rect(L, top, edges[4] - L, sumH, { border: 0.6 });
      pen.text('Rupees : ', L + PADX, top + 12, 8, { bold: true });
      words.forEach((w, i) => pen.text(w, L + PADX + wid('Rupees : ', 8, true), top + 12 + i * 11, 8, { bold: true }));
      const items: { label: string; amount: number; strong: boolean; qty?: number }[] = [
        { label: 'Total', amount: t.subtotal, strong: true, qty: totalQty },
        ...extras.map(e => ({ ...e, strong: false })),
        ...(extras.length ? [{ label: 'Net Amount', amount: grand, strong: true }] : []),
      ];
      const rh = sumH / items.length;
      items.forEach((it, i) => {
        const ry = top + i * rh;
        pen.rect(edges[4], ry, edges[7] - edges[4], rh, { border: 0.6 });
        pen.line(edges[6], ry, edges[6], ry + rh, 0.6);
        const base = ry + rh / 2 + 3;
        if (it.qty !== undefined) {
          pen.text('Total', edges[4] + PADX, base, 8, { bold: true });
          pen.text(it.qty.toFixed(3), edges[6] - PADX, base, 8, { bold: true, align: 'r' });
        } else pen.text(it.label, edges[6] - PADX, base, 8, { bold: it.strong, align: 'r' });
        pen.text(inr(it.amount), edges[7] - PADX, base, 8.5, { bold: it.strong, align: 'r' });
      });
      y = top + sumH + 12;
      // --- bank details (left) + signature (right)
      pen.text('BANK DETAILS', L + 2, y + 9, 8.5, { bold: true });
      pen.line(L + 2, y + 11.5, L + 2 + wid('BANK DETAILS', 8.5, true), y + 11.5, 0.5);
      bank.forEach(([k, v], i) => {
        const yy = y + 24 + i * 11.5;
        pen.text(k, L + 2, yy, 8, { bold: true });
        pen.text(': ' + v, L + 52, yy, 8);
      });
      signBlock(pen, y, 'FOR,');
    });
  }

  for (const d of docs) (kind === 'bill' ? drawBill : drawInvoice)(d);
  if (!docs.length) newPage();

  out.setTitle(title);
  out.setCreator(companyName);
  out.setProducer(companyName);
  const bytes = await out.save({ useObjectStreams: true });
  return { bytes, pages: out.getPageCount(), warnings: [...ctx.warnings] };
}

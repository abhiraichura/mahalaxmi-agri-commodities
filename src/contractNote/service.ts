import { FIELDS, FONT_REF } from './data';
import { checkFont, compose, makeMeasurer, parseFont, render } from './engine';
import { getStoredFont } from './fontStore';
import type { FontLike, Measurer, NoteIssue, NoteValues, Tag } from './types';

/** bump when the template PDFs in /public/contract-templates change, so devices fetch the new ones */
export const TEMPLATE_VERSION = '2';

const tplCache = new Map<string, Promise<Uint8Array>>();
/** plain = the copy without header, footer and lotus (for printing on the printed letterhead) */
export function getTemplate(tag: Tag, plain = false): Promise<Uint8Array> {
  const file = plain ? `${tag}-print` : tag;
  let p = tplCache.get(file);
  if (!p) {
    p = fetch(`/contract-templates/${file}.pdf?v=${TEMPLATE_VERSION}`)
      .then(async r => {
        const ct = r.headers.get('content-type') || '';
        if (!r.ok || /text\/html/i.test(ct)) throw new Error('The contract template file is missing on the server.');
        return new Uint8Array(await r.arrayBuffer());
      });
    p.catch(() => tplCache.delete(file));
    tplCache.set(file, p);
  }
  return p;
}

export interface NoteContext {
  fontBytes: Uint8Array;
  font: FontLike;
  measurer: Measurer;
  version: number;
  fontProblems: string[]; // empty when the font matches the design font
}

let ctxPromise: Promise<NoteContext | null> | null = null;
/** Loads the stored Verdana. null = no font uploaded yet. */
export function loadContext(): Promise<NoteContext | null> {
  if (!ctxPromise) {
    ctxPromise = (async () => {
      const stored = await getStoredFont();
      if (!stored) return null;
      const font = await parseFont(stored.bytes);
      const chk = checkFont(font, FONT_REF);
      return { fontBytes: stored.bytes, font, measurer: makeMeasurer(font)!, version: stored.meta.version, fontProblems: chk.problems };
    })();
    ctxPromise.catch(() => { ctxPromise = null; });
  }
  return ctxPromise;
}
export function resetContext() { ctxPromise = null; renderCache.clear(); }

export function composeNote(values: NoteValues, tag: Tag, ctx: NoteContext) {
  return compose(values, tag, FIELDS, undefined, ctx.measurer);
}

export const isBlocking = (issues: NoteIssue[]) => issues.some(i => i.level === 'error' || i.level === 'overflow');

/* ---------- rendering (serialised, with a small result cache) ---------- */
const renderCache = new Map<string, Uint8Array>();
let chain: Promise<unknown> = Promise.resolve();

export function renderNote(values: NoteValues, tag: Tag, ctx: NoteContext, title: string, plain = false): Promise<Uint8Array> {
  const key = tag + (plain ? 'P' : '') + '|' + ctx.version + '|' + JSON.stringify(values);
  const hit = renderCache.get(key);
  if (hit) return Promise.resolve(hit);
  const job = chain.then(async () => {
    const hit2 = renderCache.get(key);
    if (hit2) return hit2;
    const { items } = composeNote(values, tag, ctx);
    const tpl = await getTemplate(tag, plain);
    const bytes = await render(tpl, ctx.fontBytes, ctx.font, items, FIELDS, { title });
    renderCache.set(key, bytes);
    if (renderCache.size > 12) renderCache.delete(renderCache.keys().next().value as string);
    return bytes;
  });
  chain = job.catch(() => undefined);
  return job;
}

export const copyName = (tag: Tag) => (tag === 'B' ? 'Buyer' : 'Seller');
export const noteTitle = (no: string, tag: Tag, plain = false) => `Contract Note ${no} - ${copyName(tag)} Copy${plain ? ' (print copy, no letterhead)' : ''}`;
export function noteFileName(no: string, tag: Tag, plain = false): string {
  const safe = (no || 'note').replace(/[\\/:*?"<>|\s]+/g, '-');
  return `Contract_${safe}_${tag}${plain ? '_print' : ''}.pdf`;
}

/* ---------- getting the PDF out of the app ---------- */
const toBlob = (bytes: Uint8Array) => new Blob([bytes as BlobPart], { type: 'application/pdf' });
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function downloadBytes(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(toBlob(bytes));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** returns 'shared' | 'cancelled' | 'unsupported' | 'blocked' */
export async function shareBytes(bytes: Uint8Array, fileName: string, title: string): Promise<'shared' | 'cancelled' | 'unsupported' | 'blocked'> {
  const file = new File([toBlob(bytes)], fileName, { type: 'application/pdf' });
  if (!navigator.canShare || !navigator.canShare({ files: [file] })) return 'unsupported';
  try {
    await navigator.share({ files: [file], title });
    return 'shared';
  } catch (e: any) {
    if (e && e.name === 'AbortError') return 'cancelled';
    return 'blocked';
  }
}

export async function printBytes(bytes: Uint8Array, fileName: string, title: string): Promise<'printing' | 'shared' | 'unsupported'> {
  if (isIOS()) {
    // iPhone / iPad: the share sheet has a Print action, which is the reliable way to print a PDF there
    const r = await shareBytes(bytes, fileName, title);
    if (r === 'shared' || r === 'cancelled') return 'shared';
  }
  if ((navigator as any).pdfViewerEnabled === false) return 'unsupported'; // no built-in PDF viewer to print from
  const url = URL.createObjectURL(toBlob(bytes));
  // print from a hidden frame so no extra tab is left open; if the browser refuses, open the PDF instead
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  frame.onload = () => {
    try { frame.contentWindow?.focus(); frame.contentWindow?.print(); } catch { window.open(url, '_blank'); }
  };
  frame.src = url;
  document.body.appendChild(frame);
  setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 5 * 60_000);
  return 'printing';
}

// Getting finished files (PDF / ZIP) out of the app: download, share sheet (iPhone), print, and building a ZIP.
import { zipSync } from 'fflate';

const toBlob = (bytes: Uint8Array, mime: string) => new Blob([bytes as BlobPart], { type: mime });
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const mimeOf = (name: string) => (/\.zip$/i.test(name) ? 'application/zip' : 'application/pdf');

export function downloadFile(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(toBlob(bytes, mimeOf(fileName)));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** the iPhone / iPad share sheet (WhatsApp, Mail, Save to Files, Print ...). 'unsupported' = use download instead */
export async function shareFile(bytes: Uint8Array, fileName: string, title: string): Promise<'shared' | 'cancelled' | 'unsupported' | 'blocked'> {
  const file = new File([toBlob(bytes, mimeOf(fileName))], fileName, { type: mimeOf(fileName) });
  if (!navigator.canShare || !navigator.canShare({ files: [file] })) return 'unsupported';
  try {
    await navigator.share({ files: [file], title });
    return 'shared';
  } catch (e: any) {
    if (e && e.name === 'AbortError') return 'cancelled';
    return 'blocked';
  }
}

/** opens the PDF in a new tab (desktop), or the share sheet on iPhone where it can be previewed / printed */
export function previewPdf(bytes: Uint8Array): boolean {
  const url = URL.createObjectURL(toBlob(bytes, 'application/pdf'));
  const w = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
  return !!w;
}

export function printPdf(bytes: Uint8Array): boolean {
  if ((navigator as any).pdfViewerEnabled === false || isIOS()) return false; // use the share sheet's Print there
  const url = URL.createObjectURL(toBlob(bytes, 'application/pdf'));
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  frame.onload = () => {
    try { frame.contentWindow?.focus(); frame.contentWindow?.print(); } catch { window.open(url, '_blank'); }
  };
  frame.src = url;
  document.body.appendChild(frame);
  setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 5 * 60_000);
  return true;
}

/** a ZIP of the files (PDFs are already compressed, so they are stored as they are: fast, small memory use) */
export function makeZip(files: { name: string; bytes: Uint8Array }[]): Uint8Array {
  const used = new Set<string>();
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const f of files) {
    let name = f.name;
    for (let i = 2; used.has(name.toLowerCase()); i++) name = f.name.replace(/(\.[^.]+)?$/, `_${i}$1`);
    used.add(name.toLowerCase());
    entries[name] = [f.bytes, { level: 0 }];
  }
  return zipSync(entries);
}

/** file-name-safe version of a party name */
export const safeName = (s: string) =>
  String(s || 'Party').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s/g, '_').slice(0, 48) || 'Party';

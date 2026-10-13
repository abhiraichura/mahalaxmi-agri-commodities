// Loads what the bill/invoice PDFs need: the letterhead, the stored Verdana (+ optional Bold) and the company details.
import { getStoredFont, onFontChange } from '../contractNote/fontStore';
import type { CompanySettings } from '../types';
import type { PdfAssets } from './pdf';

/** bump when public/contract-templates/L.pdf changes, so devices fetch the new one */
export const LETTERHEAD_VERSION = '2';

let letterhead: Promise<Uint8Array> | null = null;
export function getLetterhead(): Promise<Uint8Array> {
  if (!letterhead) {
    letterhead = fetch(`/contract-templates/L.pdf?v=${LETTERHEAD_VERSION}`).then(async r => {
      const ct = r.headers.get('content-type') || '';
      if (!r.ok || /text\/html/i.test(ct)) throw new Error('The letterhead file (contract-templates/L.pdf) is missing on the server. Upload it to GitHub and wait for the deploy to finish.');
      return new Uint8Array(await r.arrayBuffer());
    });
    letterhead.catch(() => { letterhead = null; });
  }
  return letterhead;
}

type Fonts = { regular: Uint8Array; bold?: Uint8Array } | null;
let fonts: Promise<Fonts> | null = null;
onFontChange(() => { fonts = null; });

function getFonts(): Promise<Fonts> {
  if (!fonts) {
    fonts = (async () => {
      const [reg, bold] = await Promise.all([getStoredFont('regular'), getStoredFont('bold')]);
      if (!reg) return null;
      return { regular: reg.bytes, ...(bold ? { bold: bold.bytes } : {}) };
    })();
    fonts.catch(() => { fonts = null; });
  }
  return fonts;
}

/** null = the Verdana font has not been uploaded yet (Settings -> Contract Note font).
 *  withLetterhead = false: copies for the printed letterhead need no letterhead file at all. */
export async function loadBillAssets(company: CompanySettings, withLetterhead = true): Promise<PdfAssets | null> {
  const [f, template] = await Promise.all([getFonts(), withLetterhead ? getLetterhead() : Promise.resolve(null)]);
  if (!f) return null;
  return { template, regular: f.regular, bold: f.bold, company };
}

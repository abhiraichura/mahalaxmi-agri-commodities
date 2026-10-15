// Fetches the NCDEX Live Quotes page from the server and checks that what came back is a real, fresh board.
// There is no trick in here: an ordinary request with a normal browser header, two addresses, a few polite retries.
// If NCDEX refuses or the page is not fresh, we report exactly that and the app falls back to paste / type-in.

import { parseBoard, toText } from './parse.js';
import { istParts } from './ist.js';

export const BOARD_URLS = [
  'https://www.ncdex.com/market-watch/live_quotes',
  'https://ncdex.com/market-watch/live_quotes',
];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const BLOCK_RE = /access denied|request unsuccessful|captcha|just a moment|attention required|unusual traffic|bot detected|pardon our interruption|incapsula|akamai/i;

export async function fetchBoardHtml({
  fetchImpl = fetch, attempts = 3, timeoutMs = 9000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  const log = [];
  for (let i = 0; i < attempts; i++) {
    const url = BOARD_URLS[i % BOARD_URLS.length] + (i === 0 ? '' : `?_=${Date.now()}`);
    const t0 = Date.now();
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        redirect: 'follow',
        signal: ctl.signal,
      });
      const html = await res.text();
      const entry = { url: url.replace(/\?_=\d+$/, ''), status: res.status, ms: Date.now() - t0, bytes: html.length };
      log.push(entry);
      if (res.ok && html.length > 1500 && !(BLOCK_RE.test(html.slice(0, 4000)) && html.length < 20000)) return { ok: true, html, log };
      if (res.ok) entry.note = 'page came back but looks like a block / error page';
    } catch (e) {
      log.push({ url: url.replace(/\?_=\d+$/, ''), error: e && e.name === 'AbortError' ? 'timed out' : String((e && e.message) || e), ms: Date.now() - t0 });
    } finally {
      clearTimeout(timer);
    }
    if (i < attempts - 1) await sleep(1000 * (i + 1));
  }
  const blocked = log.some((l) => [401, 403, 406, 429, 503].includes(l.status) || l.note);
  return {
    ok: false, html: '', log,
    reason: blocked ? 'NCDEX refused the request from the server (looks like a block).' : 'Could not reach the NCDEX page from the server.',
    blocked,
  };
}

/**
 * Fresh = the board's own "As on" time is today and not older than maxAgeMin.
 * Returns { ok, board, diag, reason }.
 */
export function judgeBoard(html, { now = new Date(), maxAgeMin = 30, requireBoardTime = true } = {}) {
  const board = parseBoard(html, { now });
  const parts = istParts(now);
  const bt = board.boardTime;
  const ageMin = bt ? Math.round((now.getTime() - bt.epoch) / 60000) : null;
  const diag = {
    boardTime: bt ? bt.label : null,
    boardDate: bt ? bt.dateKey : null,
    ageMin,
    today: parts.dateKey,
    found: Object.keys(board.picks),
    errors: board.errors,
    warnings: board.warnings,
    looksBlocked: BLOCK_RE.test(String(html).slice(0, 6000)) && Object.keys(board.picks).length === 0,
    // a short excerpt of what the server saw, so a layout change can be fixed quickly
    excerpt: excerptAround(html),
  };
  if (board.errors.length) {
    return { ok: false, board, diag, reason: diag.looksBlocked ? 'NCDEX returned a block / error page instead of the board.' : `Could not read the board: ${board.errors.join('; ')}`, kind: 'unreadable' };
  }
  if (!bt) {
    if (requireBoardTime) return { ok: false, board, diag, reason: 'The board time ("As on ...") was not found, so freshness cannot be verified.', kind: 'no_time' };
    return { ok: true, board, diag, warn: 'board time not found' };
  }
  if (bt.dateKey !== parts.dateKey) {
    return { ok: false, board, diag, reason: `The board shows ${bt.label}, which is not today. NCDEX may be closed (holiday) or the page is an old copy.`, kind: 'not_today' };
  }
  if (ageMin > maxAgeMin || ageMin < -5) {
    return { ok: false, board, diag, reason: `The board time is ${bt.label} (${ageMin} min old), so the server copy of the page is not live.`, kind: 'stale' };
  }
  return { ok: true, board, diag };
}

function excerptAround(html) {
  const text = toText(html).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
  const i = text.search(/JEERAUNJHA/i);
  const j = i >= 0 ? text.indexOf('JEERAUNJHA', i + 10) : -1; // skip the drop-down occurrence, prefer the table
  const at = j >= 0 ? j : Math.max(0, i);
  return text.slice(Math.max(0, at - 80), at + 700);
}

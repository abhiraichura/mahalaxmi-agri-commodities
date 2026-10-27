// "Is everything working?" - turns the activity log and today's updates into plain statements.
// No database and no network here: it only reads what it is given, so it is easy to test.

import { hourLabel, istToEpoch } from './ist.js';
import { SLOTS } from './message.js';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const clock = (ms) => new Date(ms).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

export const SOURCE_NAME = { feed: 'Grok feed', server: 'Server reads NCDEX', browser: 'My browser sends the board' };

/**
 * log      newest first (see service.logEvent)
 * updates  recent updates (newest first)
 * parts    istParts(now)
 * wrongKey { atMs, count } | null  (someone opened the feed address with a wrong key)
 */
export function buildHealth({ log = [], updates = [], config = {}, devices = 0, parts, now, wrongKey = null }) {
  const source = config.rateSource === 'feed' || config.rateSource === 'browser' ? config.rateSource : 'server';
  const limit = clamp(Math.round(Number(config.feedWaitMin) || 10), 3, 30);
  const grace = source === 'server' ? 3 : limit;
  const weekday = parts.weekday >= 1 && parts.weekday <= 5;
  const nowMs = now.getTime();
  const today = log.filter((e) => e.day === parts.dateKey);
  const problems = [];

  // ---- today's slots
  const slots = SLOTS.map((h) => {
    const id = `${parts.dateKey}_${h}`;
    const u = updates.find((x) => x.id === id) || null;
    const elapsed = parts.minutesOfDay - h * 60;
    let state;
    if (u) state = u.status === 'failed' && u.kind === 'late' ? 'late' : u.status;
    else if (!weekday) state = 'closed';
    else if (elapsed < 0) state = 'upcoming';
    else if (elapsed < grace) state = 'waiting';
    else state = 'nothing';
    const via = u && u.status === 'ready'
      ? (u.source === 'feed' ? 'Grok feed' : u.source === 'browser' ? 'your browser' : u.source === 'ncdex' ? (u.trigger === 'cron' ? 'the scheduler (NCDEX)' : 'NCDEX, started by you') : u.source === 'paste' ? 'pasted by you' : 'typed by you')
      : null;
    return { slot: String(h), hour: h, label: hourLabel(h), state, via, atMs: u ? u.createdAtMs || null : null, reason: u ? u.reason || null : null, arrivedLate: !!(u && u.arrivedLate), elapsed };
  });

  // ---- the three senders
  const feedEntries = today.filter((e) => e.kind === 'feed' && e.result !== 'test');
  const lastFeed = log.find((e) => e.kind === 'feed' && e.result !== 'test') || null;
  const lastFeedTest = log.find((e) => e.kind === 'feed' && e.result === 'test') || null;
  const cronToday = today.filter((e) => e.kind === 'cron').slice().reverse();
  const lastCron = log.find((e) => e.kind === 'cron') || null;
  const lastAlert = log.find((e) => e.kind === 'alert') || null;

  const startedSlots = slots.filter((s) => weekday && s.elapsed >= 0);
  const wrongToday = wrongKey && wrongKey.atMs && new Date(wrongKey.atMs).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === parts.dateKey;

  // ---- problems, worst first
  if (source === 'feed') {
    if (wrongToday) {
      problems.push({ level: 'bad', code: 'wrong_key', text: `The Grok address was opened with a WRONG key at ${clock(wrongKey.atMs)}${wrongKey.count > 1 ? ` (${wrongKey.count} times)` : ''}. If that was Grok, its instructions still hold an old key: open "Show the Grok instructions" below, copy them again and replace everything in the Grok automation.` });
    }
    // slots where nothing arrived and no alert was sent: either the scheduler checked too early, or it never checked
    const nothing = slots.filter((s) => s.state === 'nothing');
    const callsOf = (h) => today.filter((e) => e.kind === 'cron' && e.offsetSlot === h);
    const checked = nothing.filter((s) => callsOf(s.hour).length);
    const unchecked = nothing.filter((s) => !callsOf(s.hour).length);
    if (checked.length) {
      const latest = checked[checked.length - 1];
      const maxOffset = Math.max(...checked.flatMap((s) => callsOf(s.hour)).map((e) => Number(e.offset) || 0));
      const suggest = clamp(maxOffset, 3, 30);
      problems.push({
        level: 'bad', code: 'scheduler_early',
        text: `${latest.label}: nothing arrived from Grok and no alert was sent. Your scheduler last checked ${maxOffset} minutes after the hour, which is before your alert time (${limit} minutes), so it waited and never alerted.`,
        fix: suggest !== limit ? { type: 'set_wait', value: suggest, label: `Alert me after ${suggest} minutes` } : null,
      });
    }
    if (unchecked.length) {
      problems.push({ level: 'bad', code: 'scheduler_silent', text: `${unchecked.map((s) => s.label).join(', ')}: nothing arrived from Grok and the scheduler did not contact the app, so there was no alert. Check the job on cron-job.org (switched on? right address? right minutes?).` });
    }
    if (weekday && !feedEntries.length && parts.minutesOfDay >= 10 * 60 + limit && !nothing.length) {
      const anyReady = slots.some((s) => s.state === 'ready');
      if (!anyReady) problems.push({ level: 'warn', code: 'no_feed_today', text: 'Grok has not contacted the app today. Check that Grok ran and that its instructions contain the app address (use the 10-second Grok test below).' });
    }
    if (lastFeed && lastFeed.day === parts.dateKey && lastFeed.result === 'refused' && !slots.some((s) => s.hour === Number(lastFeed.slot) && s.state === 'ready')) {
      problems.push({ level: 'warn', code: 'feed_refused', text: `The last numbers from Grok (${clock(lastFeed.atMs)}) were refused: ${lastFeed.message}` });
    }
  }
  if (source === 'browser' && weekday) {
    const missed = slots.find((s) => s.state === 'nothing');
    if (missed) problems.push({ level: 'bad', code: 'browser_missing', text: `${missed.label}: no board was sent from your browser. Open the NCDEX page and press your "Send rates" bookmark, or type the numbers.` });
  }
  if (source === 'server') {
    const failedRuns = today.filter((e) => e.kind === 'cron' && e.result === 'failed');
    const blocked = failedRuns.length || slots.some((s) => s.state === 'failed');
    if (blocked) problems.push({ level: 'bad', code: 'server_blocked', text: 'The server could not read the NCDEX board (NCDEX shows servers a "checking your browser" page). This method does not work reliably from the internet. Use the Grok feed instead.', fix: { type: 'set_source', value: 'feed', label: 'Switch to the Grok feed' } });
    const nothing = slots.find((s) => s.state === 'nothing');
    if (nothing && !blocked) problems.push({ level: 'bad', code: 'scheduler_silent', text: `${nothing.label}: the scheduler did not contact the app. Check the job on cron-job.org.` });
  }

  // any slot that ended up needing you (alert sent, numbers refused ...)
  const covered = problems.some((p) => p.code === 'server_blocked');
  for (const sl of slots) {
    if ((sl.state === 'late' || sl.state === 'failed') && !covered) problems.push({ level: 'bad', code: 'slot_failed', text: `${sl.reason && sl.reason.startsWith(sl.label) ? '' : `${sl.label}: `}${sl.reason || 'the rates did not arrive.'}${sl.state === 'late' ? ' If Grok delivers later, this turns into the message by itself.' : ''}` });
  }

  // a weekday with started slots, but the scheduler has never been heard from today
  if (weekday && startedSlots.length && !cronToday.length && !problems.some((p) => p.code === 'scheduler_silent')) {
    problems.push({ level: 'warn', code: 'cron_quiet', text: lastCron ? `The scheduler has not contacted the app today (last time: ${new Date(lastCron.atMs).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' })} ${clock(lastCron.atMs)}). Without it you get no "rates did not arrive" alert.` : 'The scheduler has never contacted the app. Without it you get no "rates did not arrive" alert. Set up the job on cron-job.org (steps in the guide).' });
  }

  // ---- notifications
  if (!devices) problems.push({ level: 'bad', code: 'no_devices', text: 'No device has notifications turned on, so nothing can be sent to you. Press "Turn on notifications" on your phone and on this computer.' });
  else if (lastAlert && lastAlert.pushed && lastAlert.pushed.error) problems.push({ level: 'bad', code: 'push_error', text: `The last notification could not be sent: ${lastAlert.pushed.error}` });
  else if (lastAlert && lastAlert.pushed && lastAlert.pushed.total > 0 && lastAlert.pushed.sent === 0) problems.push({ level: 'bad', code: 'push_failed', text: `The last notification (${clock(lastAlert.atMs)}) reached 0 of ${lastAlert.pushed.total} devices${lastAlert.pushed.errors && lastAlert.pushed.errors.length ? `: ${lastAlert.pushed.errors.join('; ')}` : '.'}` });

  // ---- when does Grok usually deliver? (minutes after the hour, from the last updates that really came from the feed)
  let typical = null;
  if (source === 'feed') {
    const mins = updates
      .filter((u) => u.status === 'ready' && u.source === 'feed' && u.slotHour != null && u.date && u.createdAtMs)
      .map((u) => Math.round((u.createdAtMs - istToEpoch(u.date, u.slotHour * 60)) / 60000))
      .filter((m) => m >= 0 && m <= 59)
      .slice(0, 12);
    if (mins.length >= 3) {
      const sorted = mins.slice().sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const max = sorted[sorted.length - 1];
      const suggest = clamp(max + 2, 3, 30);
      typical = {
        count: mins.length, median, min: sorted[0], max,
        // true when the alert time is shorter than Grok usually takes: then "rates need you" rings first almost every time
        alertsFirst: limit <= max, suggest: limit < suggest ? suggest : null,
        fix: limit <= max && suggest !== limit ? { type: 'set_wait', value: suggest, label: `Alert me only after ${suggest} minutes` } : null,
      };
    }
  }

  const order = { bad: 0, warn: 1, info: 2 };
  problems.sort((a, b) => order[a.level] - order[b.level]);

  // ---- one sentence for the top of the page
  const readyNow = slots.filter((s) => s.state === 'ready');
  const lastReady = readyNow.length ? readyNow[readyNow.length - 1] : null;
  const next = weekday ? slots.find((s) => s.state === 'upcoming' || s.state === 'waiting') : null;
  let overall = 'good';
  let headline;
  if (problems.some((p) => p.level === 'bad')) { overall = 'bad'; headline = problems.find((p) => p.level === 'bad').text; }
  else if (problems.length) { overall = 'warn'; headline = problems[0].text; }
  else if (!weekday) headline = 'The market is closed today. Nothing is expected.';
  else if (lastReady) headline = `Working. ${lastReady.label} update is ready${lastReady.via ? ` (from ${lastReady.via})` : ''}${next ? `. Next: ${next.label}.` : '. That was the last one for today.'}`;
  else headline = next ? `Nothing wrong. Waiting for the ${next.label} update.` : 'Nothing wrong.';

  return {
    source, sourceName: SOURCE_NAME[source], waitMin: limit, weekday, overall, headline, problems, slots, typical,
    feed: { lastAtMs: lastFeed ? lastFeed.atMs : null, lastResult: lastFeed ? lastFeed.result : null, lastMessage: lastFeed ? lastFeed.message : null, todayCount: feedEntries.length, lastTestAtMs: lastFeedTest ? lastFeedTest.atMs : null },
    scheduler: {
      lastAtMs: lastCron ? lastCron.atMs : null, lastResult: lastCron ? lastCron.result : null, lastMessage: lastCron ? lastCron.message : null,
      callsToday: cronToday.map((e) => ({ atMs: e.atMs, time: e.time, result: e.result, offset: e.offset ?? null })),
    },
    notifications: {
      devices,
      last: lastAlert ? { atMs: lastAlert.atMs, message: lastAlert.message, ...(lastAlert.pushed || {}) } : null,
    },
    wrongKey: wrongKey && wrongKey.atMs ? { atMs: wrongKey.atMs, count: wrongKey.count || 1 } : null,
    nowMs,
  };
}

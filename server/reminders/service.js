// The daily reminder check: which contract reminders are due today, send each one once, and remember that it was sent.
// Called by the daily scheduler, by the app when it is opened, and by the "check now" button.
// Sends nothing before 8 AM or after 9 PM (India time) unless the owner presses "check now".

import { dueReminders, todayIST } from './plan.js';

const QUIET_FROM = 8;   // first hour (IST) when reminders may be sent
const QUIET_TO = 21;    // from this hour on, nothing is sent
const DIGEST_OVER = 3;  // more than this many reminders in one check become ONE notification

const SHORT = {
  loading_half: 'loading check', loading_eve: 'loaded yet?', loading_due: 'loading deadline today', loading_overdue: 'loading overdue',
  payment_open: 'payment window opens', payment_last: 'payment due', payment_overdue: 'payment overdue',
  promised_loading: 'loading promised for today', promised_payment: 'payment promised for today',
};

export function istHour(now) { return Number(new Date(now.getTime() + 330 * 60000).toISOString().slice(11, 13)); }

export function createReminders({ store, push, subsStore, clock = () => new Date() }) {
  const hasDevices = async () => { try { return (await subsStore.listSubs()).length; } catch { return 0; } };

  async function run({ trigger = 'cron', force = false } = {}) {
    const now = clock();
    const today = todayIST(now);
    const hour = istHour(now);
    const base = { ok: true, trigger, today, at: now.getTime() };

    if (!force && (hour < QUIET_FROM || hour >= QUIET_TO)) {
      await store.putMeta('last', { checkedAtMs: now.getTime(), trigger, skipped: 'quiet hours', ...(trigger === 'cron' ? { cronAtMs: now.getTime() } : {}) }).catch(() => {});
      return { ...base, skipped: 'quiet hours', checked: 0, due: 0, pending: 0, sent: 0, failed: 0, notifications: [] };
    }

    const contracts = await store.listContracts();
    const due = contracts.flatMap((c) => dueReminders(c, today));
    due.sort((a, b) => a.priority - b.priority || String(a.title).localeCompare(String(b.title)));

    // claim each reminder first: two runs at the same moment can never send the same reminder twice
    const toSend = [];
    for (const d of due) {
      const mine = await store.claimSent(d.key, { kind: d.kind, contractId: d.contractId, date: d.date, title: d.title, sentAtMs: now.getTime(), state: 'sending' });
      if (mine) toSend.push(d);
    }
    const out = { ...base, checked: contracts.length, due: due.length, pending: toSend.length, sent: 0, failed: 0, notifications: [], devices: null };
    const finish = async (extra = {}) => {
      await store.putMeta('last', { checkedAtMs: now.getTime(), atMs: now.getTime(), trigger, skipped: null, checked: out.checked, due: out.due, pending: out.pending, sent: out.sent, failed: out.failed, devices: out.devices, ...(trigger === 'cron' ? { cronAtMs: now.getTime() } : {}), ...extra }).catch(() => {});
      return out;
    };

    if (!toSend.length) { out.devices = await hasDevices(); return finish(); }

    const release = async (list) => { for (const d of list) await store.releaseSent(d.key).catch(() => {}); };
    const payloads = toSend.length > DIGEST_OVER
      ? [{ items: toSend, payload: digest(toSend) }]
      : toSend.map((d) => ({ items: [d], payload: { title: d.title, body: d.body, url: d.url, tag: d.tag } }));

    for (const p of payloads) {
      let r;
      try { r = await push.sendAll(p.payload); } catch (e) { r = { sent: 0, failed: 1, total: 0, errors: [String((e && e.message) || e).slice(0, 120)] }; }
      out.devices = r.total;
      out.notifications.push({ title: p.payload.title, sent: r.sent, total: r.total });
      if (r.sent > 0) {
        out.sent += 1;
        for (const d of p.items) await store.markSent(d.key, { state: 'sent', sentAtMs: now.getTime(), pushed: { sent: r.sent, failed: r.failed, total: r.total }, digest: p.items.length > 1 }).catch(() => {});
      } else {
        out.failed += 1;
        out.error = r.total === 0 ? 'No device has notifications turned on.' : (r.errors && r.errors[0]) || 'The notification could not be delivered.';
        await release(p.items); // try again at the next check, so nothing is lost
      }
    }
    // housekeeping once a day: forget reminders older than 60 days
    try {
      const meta = await store.getMeta('last');
      if (!meta || meta.pruneDay !== today) { await store.pruneSent(now.getTime() - 60 * 86400000); await store.putMeta('last', { pruneDay: today }); }
    } catch { /* not important */ }
    return finish();
  }

  function digest(list) {
    const lines = list.slice(0, 3).map((d) => `• Contract ${String(d.title).match(/Contract (\S+)/)?.[1] || ''}: ${SHORT[d.kind] || 'needs you'}`);
    if (list.length > 3) lines.push(`…and ${list.length - 3} more`);
    return { title: `📋 ${list.length} contracts need you today`, body: lines.join('\n'), url: '/', tag: 'reminders-digest' };
  }

  async function status() {
    const [last, recent, devices] = await Promise.all([store.getMeta('last'), store.recentSent(12), hasDevices()]);
    const now = clock();
    return { ok: true, nowMs: now.getTime(), today: todayIST(now), last: last || null, recent: recent.filter((r) => r.state === 'sent'), devices };
  }

  async function test() {
    const r = await push.sendAll({ title: '🔔 Contract reminders are on', body: 'You will get loading and payment reminders here.', url: '/', tag: 'reminders-test' });
    return { ok: true, ...r };
  }

  return { run, status, test };
}

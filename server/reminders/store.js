// Firestore access for the reminders (Firebase Admin). Contracts are only READ here; the app writes them.
// What this adds to the database:
//   reminderSent/{contractId__kind__date}   one small note per reminder that was sent (so it is never sent twice)
//   reminderMeta/last                       when the daily check last ran and what it did

export function makeReminderStore(db) {
  const col = (n) => db.collection(n);
  return {
    /** the contracts that can need a reminder (confirmed ones) */
    async listContracts() {
      const q = await col('contracts').where('status', '==', 'confirmed').get();
      return q.docs.map((d) => ({ ...d.data(), id: d.data().id || d.id }));
    },
    /** true when this caller is the first to claim sending the reminder (so two runs never send it twice) */
    async claimSent(key, data) {
      const ref = col('reminderSent').doc(key);
      const note = { ...data, key, claimedAtMs: data.sentAtMs || Date.now() };
      try { await ref.create(note); return true; }
      catch (e) {
        if (!(e && (e.code === 6 || /ALREADY_EXISTS/i.test(String(e.message || e))))) throw e;
        // a run that died half-way leaves a "sending" note behind: after 10 minutes it may be taken over
        const s = await ref.get(); const d = s.exists ? s.data() : null;
        if (d && d.state === 'sending' && Date.now() - (d.claimedAtMs || 0) > 600000) { await ref.set(note); return true; }
        return false;
      }
    },
    async releaseSent(key) { await col('reminderSent').doc(key).delete(); },
    async markSent(key, patch) { await col('reminderSent').doc(key).set(patch, { merge: true }); },
    async recentSent(limit = 12) {
      const q = await col('reminderSent').orderBy('sentAtMs', 'desc').limit(limit).get();
      return q.docs.map((d) => ({ ...d.data(), id: d.id }));
    },
    async pruneSent(beforeMs) {
      const q = await col('reminderSent').where('sentAtMs', '<', beforeMs).limit(200).get();
      await Promise.all(q.docs.map((d) => d.ref.delete()));
      return q.size;
    },
    async getMeta(name) { const s = await col('reminderMeta').doc(name).get(); return s.exists ? s.data() : null; },
    async putMeta(name, data) { await col('reminderMeta').doc(name).set(JSON.parse(JSON.stringify(data)), { merge: true }); },
  };
}

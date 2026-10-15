// Firestore access for the server side (Firebase Admin). Everything goes through a small interface so it can be tested
// with an in-memory copy.

import { createHash, randomBytes } from 'node:crypto';
import { DEFAULT_CONFIG } from './message.js';

export class SetupError extends Error {
  constructor(msg, missing = []) { super(msg); this.name = 'SetupError'; this.missing = missing; }
}

const clean = (o) => JSON.parse(JSON.stringify(o));
export const subId = (endpoint) => createHash('sha1').update(String(endpoint)).digest('hex').slice(0, 24);

function readCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  let txt = raw.trim();
  if (!txt.startsWith('{')) txt = Buffer.from(txt, 'base64').toString('utf8');
  const j = JSON.parse(txt);
  if (j.private_key) j.private_key = String(j.private_key).replace(/\\n/g, '\n');
  return j;
}

export function setupStatus() {
  return { firebaseServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT };
}

let cached = null;
/** -> { db, auth } (Firebase Admin). Throws SetupError when the service account is missing. */
export async function getAdmin() {
  if (cached) return cached;
  let cred;
  try { cred = readCredential(); } catch (e) { throw new SetupError('FIREBASE_SERVICE_ACCOUNT could not be read (it must be the full JSON file contents).', ['FIREBASE_SERVICE_ACCOUNT']); }
  if (!cred) throw new SetupError('FIREBASE_SERVICE_ACCOUNT is not set on the server.', ['FIREBASE_SERVICE_ACCOUNT']);
  const appMod = await import('firebase-admin/app');
  const fsMod = await import('firebase-admin/firestore');
  const authMod = await import('firebase-admin/auth');
  const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp({ credential: appMod.cert(cred) });
  const db = fsMod.getFirestore(app);
  try { db.settings({ ignoreUndefinedProperties: true }); } catch { /* already configured */ }
  cached = { db, auth: authMod.getAuth(app) };
  return cached;
}

export function makeStore(db) {
  const col = (n) => db.collection(n);
  return {
    async getConfig() {
      const s = await col('rateConfig').doc('main').get();
      const d = s.exists ? s.data() : {};
      return { ...DEFAULT_CONFIG, ...d, company: { ...DEFAULT_CONFIG.company, ...(d.company || {}) } };
    },
    async setConfig(patch) { await col('rateConfig').doc('main').set(clean(patch), { merge: true }); },

    async getSecrets() { const s = await col('rateSecrets').doc('main').get(); return s.exists ? s.data() : {}; },
    async setSecrets(patch) { await col('rateSecrets').doc('main').set(clean(patch), { merge: true }); },

    async getDay(dateKey) { const s = await col('rateDays').doc(dateKey).get(); return s.exists ? s.data() : { readings: {} }; },
    async putReading(dateKey, key, reading) { await col('rateDays').doc(dateKey).set({ readings: { [key]: clean(reading) } }, { merge: true }); },

    async getUpdate(id) { const s = await col('rateUpdates').doc(id).get(); return s.exists ? { id, ...s.data() } : null; },
    async putUpdate(id, data) { await col('rateUpdates').doc(id).set(clean(data), { merge: true }); },
    async listUpdates(limit = 20) {
      const q = await col('rateUpdates').orderBy('createdAtMs', 'desc').limit(limit).get();
      return q.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    /** one run at a time per update: true if this caller may proceed */
    async claim(id, { ttlMs = 120000, nowMs = Date.now() } = {}) {
      const ref = col('rateUpdates').doc(id);
      return db.runTransaction(async (tx) => {
        const s = await tx.get(ref);
        const d = s.exists ? s.data() : null;
        if (d && d.status === 'running' && nowMs - (d.startedAtMs || 0) < ttlMs) return false;
        tx.set(ref, { status: 'running', startedAtMs: nowMs }, { merge: true });
        return true;
      });
    },

    async listSubs() { const q = await col('ratePushSubs').get(); return q.docs.map((d) => ({ id: d.id, ...d.data() })); },
    async addSub(sub) { const id = subId(sub.subscription.endpoint); await col('ratePushSubs').doc(id).set(clean({ ...sub, updatedAtMs: Date.now() }), { merge: true }); return id; },
    async removeSub(id) { await col('ratePushSubs').doc(id).delete(); },
  };
}

export function newSecret() { return randomBytes(24).toString('hex'); }

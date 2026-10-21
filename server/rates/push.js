// Web Push (notifications on the phone / computer) using VAPID keys.
// The keys are created once and kept in the private database, so no setup is needed. They can be replaced
// by VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY settings later if wanted.

export function createPush({ store, env = process.env, webpushImpl = null }) {
  let ready = null;

  async function init() {
    if (ready) return ready;
    const wp = webpushImpl || (await import('web-push')).default;
    let pub = env.VAPID_PUBLIC_KEY;
    let priv = env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) {
      const sec = await store.getSecrets();
      pub = sec.vapidPublic;
      priv = sec.vapidPrivate;
      if (!pub || !priv) {
        const k = wp.generateVAPIDKeys();
        pub = k.publicKey;
        priv = k.privateKey;
        await store.setSecrets({ vapidPublic: pub, vapidPrivate: priv });
      }
    }
    wp.setVapidDetails(env.VAPID_SUBJECT || 'mailto:push@mahalaxmi-agri.example.com', pub, priv);
    ready = { wp, pub };
    return ready;
  }

  return {
    async publicKey() { return (await init()).pub; },

    /** payload: { title, body, url, tag } -> { sent, failed, removed, total } */
    async sendAll(payload) {
      const { wp } = await init();
      const subs = await store.listSubs();
      const body = JSON.stringify(payload);
      let sent = 0, failed = 0, removed = 0;
      const errors = [];
      await Promise.all(subs.map(async (s) => {
        try {
          await wp.sendNotification(s.subscription, body, { TTL: 3600, urgency: 'high', topic: payload.tag ? String(payload.tag).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) : undefined });
          sent++;
        } catch (e) {
          failed++;
          const gone = e && (e.statusCode === 404 || e.statusCode === 410);
          if (gone) { removed++; try { await store.removeSub(s.id); } catch { /* ignore */ } }
          // keep the reason: it is shown in the app, so a silent failure can be understood
          const why = gone ? 'the device unsubscribed or the browser forgot it (removed; turn notifications on again there)'
            : `${e && e.statusCode ? `HTTP ${e.statusCode}` : 'error'}${e && e.body ? `: ${String(e.body).slice(0, 80)}` : e && e.message ? `: ${String(e.message).slice(0, 80)}` : ''}`;
          const name = s.label ? `${String(s.label).slice(0, 30)}: ` : '';
          if (errors.length < 3 && !errors.includes(name + why)) errors.push(name + why);
        }
      }));
      return { sent, failed, removed, total: subs.length, errors };
    },
  };
}

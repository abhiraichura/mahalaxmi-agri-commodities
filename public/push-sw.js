// Notifications for the Rates Desk. This file is loaded by the app's service worker (see vite.config.ts).

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'Mahalaxmi', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Mahalaxmi Rates Desk';
  const options = {
    body: data.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || 'rates',
    renotify: true,
    data: { url: data.url || '/rates' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/rates';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) {
        try { await c.focus(); } catch (e) { /* ignore */ }
        if ('navigate' in c) { try { await c.navigate(url); } catch (e) { /* ignore */ } }
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (err) {
    payload = { title: 'Preptio', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Preptio';
  const options = {
    body: payload.body || 'You have a new notification.',
    icon: payload.icon || '/web-app-manifest-192x192.png',
    badge: payload.badge || '/web-app-manifest-192x192.png',
    data: {
      url: payload.url || '/dashboard',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      return null;
    })
  );
});

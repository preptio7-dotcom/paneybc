const CACHE_VERSION = 'v1_' + new Date().getTime()
const CACHE_NAME = `preptio-cache-${CACHE_VERSION}`
const RUNTIME_CACHE = 'preptio-runtime'

self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...')
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...')
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old cache versions to force fresh content
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('[SW] Deleting old cache:', cacheName)
                        return caches.delete(cacheName)
                    }
                })
            )
        })
    )
    event.waitUntil(self.clients.claim());
});

// Handle fetch requests for cache management
self.addEventListener('fetch', (event) => {
    const { request } = event
    const url = new URL(request.url)

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return
    }

    // Skip chrome extensions and non-http protocols
    if (!url.protocol.startsWith('http')) {
        return
    }

    // Network first for API calls
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).then((response) => {
                if (!response.ok) throw new Error('API response not ok')
                const clonedResponse = response.clone()
                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, clonedResponse)
                })
                return response
            }).catch(() => {
                return caches.match(request)
            })
        )
        return
    }

    // For HTML pages, always fetch fresh to see latest updates
    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(
            fetch(request, { cache: 'reload' }).then((response) => {
                if (!response.ok) throw new Error('Network response not ok')
                const clonedResponse = response.clone()
                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, clonedResponse)
                })
                return response
            }).catch(() => {
                return caches.match(request)
            })
        )
        return
    }

    // For static assets (JS, CSS, images), use cache first
    event.respondWith(
        caches.match(request).then((response) => {
            return response || fetch(request).then((response) => {
                if (!response.ok) throw new Error('Network response not ok')
                const clonedResponse = response.clone()
                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, clonedResponse)
                })
                return response
            })
        })
    )
});


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

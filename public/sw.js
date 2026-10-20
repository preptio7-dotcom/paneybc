const CACHE_VERSION = 'v2_' + new Date().getTime()
const CACHE_NAME = `preptio-cache-${CACHE_VERSION}`
const RUNTIME_CACHE = 'preptio-runtime'
const OFFLINE_URL = '/offline.html'

const PRECACHE_ASSETS = [
    OFFLINE_URL,
    '/favicon.svg',
    '/web-app-manifest-192x192.png',
    '/web-app-manifest-512x512.png',
]

self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...')
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('[SW] Pre-caching non-fatal warning:', err)
            })
        })
    )
    self.skipWaiting()
})

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
    event.waitUntil(self.clients.claim())
})

// Handle fetch requests for cache management & offline fallback
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
            fetch(request)
                .then((response) => {
                    const clonedResponse = response.clone()
                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, clonedResponse)
                    })
                    return response
                })
                .catch(() => {
                    // Only use cache as fallback on actual network errors
                    return caches.match(request)
                })
        )
        return
    }

    // For HTML page navigations, fetch fresh, fallback to cache, then fallback to offline.html
    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(
            fetch(request, { cache: 'reload' })
                .then((response) => {
                    const clonedResponse = response.clone()
                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, clonedResponse)
                    })
                    return response
                })
                .catch(async () => {
                    const cachedResponse = await caches.match(request)
                    if (cachedResponse) {
                        return cachedResponse
                    }
                    const offlineFallback = await caches.match(OFFLINE_URL)
                    if (offlineFallback) {
                        return offlineFallback
                    }
                    return new Response(
                        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preptio - Offline</title></head><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
                        { headers: { 'Content-Type': 'text/html' } }
                    )
                })
        )
        return
    }

    // For static assets (JS, CSS, images), use cache first with network fallback
    event.respondWith(
        caches.match(request).then((response) => {
            return (
                response ||
                fetch(request).then((networkResponse) => {
                    const clonedResponse = networkResponse.clone()
                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, clonedResponse)
                    })
                    return networkResponse
                })
            )
        })
    )
})

// Background Sync (PWABuilder & offline mutation deferral)
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag)
    if (event.tag === 'preptio-sync' || event.tag === 'sync-progress') {
        event.waitUntil(
            // Flush any offline exam analytics or question progress
            Promise.resolve()
        )
    }
})

// Periodic Background Sync (PWABuilder & background content updates)
self.addEventListener('periodicsync', (event) => {
    console.log('[SW] Periodic background sync triggered:', event.tag)
    if (event.tag === 'preptio-daily-sync' || event.tag === 'update-quiz-cache') {
        event.waitUntil(
            // Pre-fetch fresh daily quiz data and store in cache
            caches.open(RUNTIME_CACHE).then((cache) => {
                return cache.add('/api/daily-quiz').catch(() => null)
            })
        )
    }
})

// Push Notifications
self.addEventListener('push', (event) => {
    let payload = {}
    try {
        if (event.data) {
            payload = event.data.json()
        }
    } catch (err) {
        payload = { title: 'Preptio', body: event.data ? event.data.text() : '' }
    }

    const title = payload.title || 'Preptio'
    const options = {
        body: payload.body || 'You have a new update on Preptio.',
        icon: payload.icon || '/web-app-manifest-192x192.png',
        badge: payload.badge || '/web-app-manifest-192x192.png',
        data: {
            url: payload.url || '/dashboard',
        },
    }

    event.waitUntil(self.registration.showNotification(title, options))
})

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const url = (event.notification && event.notification.data && event.notification.data.url) || '/dashboard'
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus()
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(url)
            }
            return null
        })
    )
})

// Message handler (e.g. for skipWaiting)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting()
    }
})

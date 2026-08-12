// ── Fawri Service Worker ──
// Web Push Notifications + Network-First Fetch Strategy

const CACHE_NAME = 'fawri-shell-v1'

// Shell resources to cache for offline/instant loading
const SHELL_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Remove old caches only (keep current)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Network-first fetch: try network, fall back to cache for navigation
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // For navigation requests (page loads), use network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Cache successful responses
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return res
        })
        .catch(() => caches.match('/') || caches.match(request))
    )
    return
  }

  // For static assets (icons, manifest), use cache-first
  if (
    url.pathname.match(/\.(png|svg|ico|json|woff2?)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return res
        })
      )
    )
    return
  }
})

// Web Push Notification Listener
self.addEventListener('push', (event) => {
  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data = { title: 'إشعار جديد ⚡', body: event.data.text() }
    }
  }

  const title = data.title || 'طلب جديد على فوري 🛒'
  const options = {
    body: data.body || 'لديك طلب جديد في متجرك!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'fawri-order',
    renotify: true,
    vibrate: [200, 100, 200, 100, 200, 100, 400],
    data: {
      url: data.url || '/dashboard',
    },
    actions: [
      { action: 'open', title: '📋 عرض الطلب' },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

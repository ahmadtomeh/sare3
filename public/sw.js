// ── Sare3 Service Worker ──
// Web Push Notifications + Instant Network Pass-Through (No Asset Caching Issues)

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
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

  const title = data.title || 'طلب جديد على سريع 🛒'
  const options = {
    body: data.body || 'لديك طلب جديد في متجرك!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'sare3-order',
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

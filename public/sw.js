// ── Fawri Service Worker ──
// Web Push Notifications Only (No Fetch Interception to avoid order issues)

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Only remove caches unrelated to current version
  event.waitUntil(self.clients.claim())
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

  const title = data.title || 'تحديث من فوري ⚡'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'fawri-notification',
    renotify: true,
    vibrate: data.vibrate || [200, 100, 200],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [
      { action: 'open', title: '📋 عرض التفاصيل' },
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

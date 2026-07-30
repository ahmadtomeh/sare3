// ── Sare3 Service Worker ──
// Network-First for HTML/Documents, Cache-Fallback for Offline
// + Web Push Notifications support

const CACHE_NAME = 'sare3-v999'

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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('supabase.co')) return

  // Network-First strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.destination === 'document') {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached
          if (event.request.destination === 'document') {
            return caches.match('/index.html')
          }
        })
      })
  )
})

// ── Web Push: استقبال الإشعارات حتى لو المتصفح مغلق ──
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() || {}
  } catch {
    data = { title: 'طلب جديد! 🛒', body: event.data?.text() || '' }
  }

  const title = data.title || 'طلب جديد على سريع 🛒'
  const options = {
    body: data.body || 'لديك طلب جديد — افتح لوحة التحكم',
    tag: data.tag || `order-${Date.now()}`,
    renotify: true,                         // يهز الهاتف ويصدر صوت حتى لو فيه إشعار قديم
    requireInteraction: true,               // يثبّت الإشعار على الشاشة حتى يتفاعل معه التاجر
    silent: false,                          // إجبار تشغيل الصوت وعدم كتم الإشعار
    vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 110, 450], // نمط اهتزاز تنبيهي قوي
    data: {
      url: data.url || '/dashboard',
      orderId: data.orderId,
    },
    actions: [
      { action: 'open', title: '📋 فتح الطلبات' },
      { action: 'dismiss', title: 'إغلاق' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ── عند الضغط على الإشعار ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // إذا الداشبورد مفتوح → اعرضه
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus()
        }
      }
      // إذا مو مفتوح → افتحه
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

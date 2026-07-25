// ── Sare3 Service Worker ──
// Network-First for HTML/Documents, Cache-Fallback for Offline

const CACHE_NAME = 'sare3-v2'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
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

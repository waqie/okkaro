// OKKARO service worker — auto-updating.
// Navigations are network-first (always fresh HTML). On every deploy the new
// SW activates immediately, clears old caches, and takes control so clients
// pick up the latest build without a manual cache clear.
const CACHE = 'okkaro-shell-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // drop any stale caches from older versions
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  // Page navigations: network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match('/')),
    )
  }
  // Everything else (hashed assets, API, HMR) goes straight to network.
})

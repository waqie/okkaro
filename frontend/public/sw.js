// OKKARO service worker — keeps the app installable and gives a basic
// offline fallback for the app shell. Kept minimal so it never interferes
// with Vite's dev server / HMR (only navigation requests are handled).
const CACHE = 'hysabpro-shell-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  // Only handle page navigations: network-first, fall back to cached shell.
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
  // Everything else (modules, API, HMR, assets) goes straight to network.
})

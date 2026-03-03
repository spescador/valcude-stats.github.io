// ================================================================
// Service Worker — Valcude Stats
// Estrategia: cache-first para estáticos, network-only para API
// ================================================================

const CACHE_NAME = 'valcude-v2'

const STATIC_ASSETS = [
  './',
  './pin.html',
  './index.html',
  './match.html',
  './player.html',
  './ranking.html',
  './import.html',
  './css/style.css',
  './js/config.js',
  './js/db.js',
  './js/utils.js',
  './js/auth.js',
  './js/pin.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
]

/* ── Instalación: precargar estáticos ─────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

/* ── Activación: limpiar caches antiguos ──────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

/* ── Fetch: cache-first para estáticos ────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // En localhost → siempre red (desarrollo, sin caché)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return  // dejar que el navegador gestione directamente
  }

  // Supabase, esm.sh y CDN externos → siempre red
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname === 'esm.sh' ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('sheetjs.com')
  ) {
    return  // dejar que el navegador gestione directamente
  }

  // Todo lo demás → cache-first con actualización en red
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        if (response.ok && request.method === 'GET') {
          caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()))
        }
        return response
      })
      return cached || networkFetch
    })
  )
})

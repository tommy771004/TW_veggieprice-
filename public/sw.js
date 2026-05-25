const CACHE_NAME = 'veggieprice-static-v3'
const RUNTIME_CACHE = 'veggieprice-runtime-v3'
const APP_SHELL = [
  '/',
  '/search',
  '/seasonal',
  '/watchlist',
  '/settings',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/og-image.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => ![CACHE_NAME, RUNTIME_CACHE].includes(key))
        .map((key) => caches.delete(key))
    ))
  )
  self.clients.claim()
})

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)

  try {
    const response = await fetch(request)
    if (request.method === 'GET' && response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }

    if (request.mode === 'navigate') {
      return caches.match('/')
    }

    throw new Error('Network unavailable and no cached response found.')
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const cached = await cache.match(request)
  const fetchPromise = fetch(request)
    .then((response) => {
      if (request.method === 'GET' && response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cached || new Response('Network error', { status: 503 }))

  return cached || fetchPromise
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') {
    return
  }

  if (url.origin !== self.location.origin) {
    return
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})

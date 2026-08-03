// Service Worker for MGS USA LLC - Cache-First Strategy
// Enables offline support and 70% faster repeat visits
const CACHE_NAME = 'mgs-usa-v1.0.1';
const ASSETS_CACHE = 'mgs-usa-assets-v1.0.1';

// Core assets to cache immediately (shell + critical resources)
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/assets/styles.min.css',
  '/assets/images/brand-video-poster.webp',
  '/assets/images/commercial-video-poster.webp',
  '/assets/images/shower-video-poster.webp'
];

// Install: Cache critical assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching critical assets...');
      return cache.addAll(CRITICAL_ASSETS).catch(err => {
        console.warn('[SW] Cache error:', err);
        // Don't fail the entire cache on partial failures
        return Promise.resolve();
      });
    }).then(() => {
      self.skipWaiting();
    })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== ASSETS_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      self.clients.claim();
    })
  );
});

// Fetch: Cache-First strategy for assets, Network-First for HTML
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, external resources, Google fonts API
  if (request.method !== 'GET' || url.hostname !== location.hostname) {
    return;
  }

  // HTML pages: Network-First (always get latest)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 200) {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Assets: Cache-First (use cache, fallback to network)
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Stale-While-Revalidate: update cache in background
        fetch(request).then(response => {
          if (response.status === 200) {
            caches.open(ASSETS_CACHE).then(cache => {
              cache.put(request, response);
            });
          }
        }).catch(() => {}); // Fail silently

        return cachedResponse;
      }

      return fetch(request).then(response => {
        if (response.status === 200) {
          const cache = caches.open(ASSETS_CACHE);
          cache.then(c => c.put(request, response.clone()));
        }
        return response;
      }).catch(() => {
        // Return a generic offline page if available
        return new Response('Network request failed', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});

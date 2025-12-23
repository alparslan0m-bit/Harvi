/**
 * Service Worker - Harvi PWA
 * Implements App Shell caching strategy, offline support, and background sync
 */

const CACHE_NAME = 'harvi-v1';
const RUNTIME_CACHE = 'harvi-runtime-v1';
const API_CACHE = 'harvi-api-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/base/variables.css',
  '/css/base/reset.css',
  '/css/components/cards.css',
  '/css/components/buttons.css',
  '/css/components/header.css',
  '/css/components/quiz-container.css',
  '/css/components/quiz-options.css',
  '/css/components/results-screen.css',
  '/css/components/breadcrumb.css',
  '/css/components/micro-interactions.css',
  '/css/layout/grid.css',
  '/css/themes/dark-mode.css',
  '/css/themes/girl-mode.css',
  '/css/utils/responsive.css',
  '/css/utils/mobile.css',
  '/css/utils/animations.css',
  '/css/utils/ios-optimizations.css',
  '/css/animations.css',
  '/js/app.js',
  '/js/quiz.js',
  '/js/results.js',
  '/js/navigation.js',
  '/js/animations.js',
  '/offline.html'
];

/**
 * Install event - cache essential assets (App Shell)
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching App Shell...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle API requests with Stale-While-Revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached API response if offline
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('[SW] Serving API from cache:', request.url);
                return cachedResponse;
              }
              // No cached response and no network - return empty response
              return new Response(
                JSON.stringify({ error: 'Offline' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            });
        })
    );
    return;
  }

  // Handle HTML document requests with Network-First strategy
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          // Clone and cache successful navigation responses
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cached response or offline page
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return caches.match('/offline.html');
            });
        })
    );
    return;
  }

  // Handle static assets with Cache-First strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone and cache successful responses
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clone);
            });

            return response;
          })
          .catch(() => {
            // Graceful degradation for missing static assets
            return new Response('Asset not found', { status: 404 });
          });
      })
  );
});

/**
 * Handle background sync for quiz results
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-quiz-results') {
    event.waitUntil(
      // Retrieve pending results from IndexedDB and send to server
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_QUIZ_RESULTS'
          });
        });
      })
    );
  }
});

/**
 * Handle push notifications
 */
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New content available',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'harvi-notification',
      requireInteraction: false
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Harvi', options)
    );
  }
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

/**
 * Service Worker - Harvi PWA
 * Implements App Shell caching strategy, offline support, and background sync
 */

const CACHE_NAME = 'harvi-v2';
const RUNTIME_CACHE = 'harvi-runtime-v2';
const API_CACHE = 'harvi-api-v2';
const IMAGE_CACHE = 'harvi-images-v2';

// Determine base path (works for root or subdirectory deployments)
const BASE_PATH = self.registration.scope.replace(self.location.origin, '').slice(0, -1);

const ASSETS_TO_CACHE = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/css/main.css',
  BASE_PATH + '/css/base/variables.css',
  BASE_PATH + '/css/base/reset.css',
  BASE_PATH + '/css/components/cards.css',
  BASE_PATH + '/css/components/buttons.css',
  BASE_PATH + '/css/components/header.css',
  BASE_PATH + '/css/components/quiz-container.css',
  BASE_PATH + '/css/components/quiz-options.css',
  BASE_PATH + '/css/components/results-screen.css',
  BASE_PATH + '/css/components/breadcrumb.css',
  BASE_PATH + '/css/components/micro-interactions.css',
  BASE_PATH + '/css/components/glassmorphism.css',
  BASE_PATH + '/css/components/view-transitions.css',
  BASE_PATH + '/css/components/showcase-glass-2.0.css',
  BASE_PATH + '/css/components/bottom-nav.css',
  BASE_PATH + '/css/components/gamification.css',
  BASE_PATH + '/css/layout/grid.css',
  BASE_PATH + '/css/themes/dark-mode.css',
  BASE_PATH + '/css/themes/girl-mode.css',
  BASE_PATH + '/css/utils/responsive.css',
  BASE_PATH + '/css/utils/mobile.css',
  BASE_PATH + '/css/utils/animations.css',
  BASE_PATH + '/css/utils/ios-optimizations.css',
  BASE_PATH + '/css/animations.css',
  BASE_PATH + '/js/app.js',
  BASE_PATH + '/js/quiz.js',
  BASE_PATH + '/js/results.js',
  BASE_PATH + '/js/navigation.js',
  BASE_PATH + '/js/animations.js',
  BASE_PATH + '/js/showcase-features.js',
  BASE_PATH + '/js/gamification.js',
  BASE_PATH + '/js/db.js',
  BASE_PATH + '/offline.html'
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
              cacheName !== API_CACHE &&
              cacheName !== IMAGE_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Smart Prefetch - Proactively cache content likely to be accessed next
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PREFETCH_QUIZZES') {
    const lectureIds = event.data.lectureIds || [];
    prefetchQuizzes(lectureIds);
  }
});

async function prefetchQuizzes(lectureIds) {
  try {
    const cache = await caches.open(API_CACHE);
    for (const lectureId of lectureIds) {
      const url = `/api/quiz/${lectureId}`;
      if (!await cache.match(url)) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
            console.log('[SW] Prefetched quiz:', lectureId);
          }
        } catch (e) {
          console.warn('[SW] Failed to prefetch quiz:', lectureId);
        }
      }
    }
  } catch (e) {
    console.warn('[SW] Prefetch failed:', e);
  }
}

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

            // Determine which cache to use
            const cacheToUse = request.destination === 'image' ? IMAGE_CACHE : RUNTIME_CACHE;

            // Clone and cache successful responses
            const clone = response.clone();
            caches.open(cacheToUse).then((cache) => {
              cache.put(request, clone);
            });

            return response;
          })
          .catch(() => {
            // Graceful degradation for missing static assets
            if (request.destination === 'image') {
              // Return a placeholder image or cached fallback
              return caches.match('/icons/icon-192x192.png');
            }
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
    let data = { title: 'Harvi', body: 'New content available' };
    
    try {
      data = event.data.json();
    } catch (error) {
      console.warn('Failed to parse push notification JSON:', error);
      // Use event.data.text() as fallback if JSON parsing fails
      if (event.data) {
        try {
          data = { title: 'Harvi', body: event.data.text() };
        } catch (textError) {
          // Use default values if text parsing also fails
          console.warn('Failed to read push notification text:', textError);
        }
      }
    }
    
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

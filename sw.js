/**
 * Service Worker - Harvi PWA
 * Implements App Shell caching strategy, offline support, and background sync
 */

// ============================================================================
// VERSION CONTROL
// Update this version number with each deployment
// This ensures all caches are invalidated together
// ============================================================================
const APP_VERSION = '2.3.1';  // ← Bump version for latest optimizations
const BUILD_TIMESTAMP = '2025-12-29T14:30:00+02:00';  // ← Current timestamp
// Generate cache names from version
const CACHE_NAME = `harvi-shell-v${APP_VERSION}`;
const RUNTIME_CACHE = `harvi-runtime-v${APP_VERSION}`;
const API_CACHE = `harvi-api-v${APP_VERSION}`;
const IMAGE_CACHE = `harvi-images-v${APP_VERSION}`;
// Log version info
console.log(`[SW] Version ${APP_VERSION} (${BUILD_TIMESTAMP})`);
console.log(`[SW] Cache names:`, {
  shell: CACHE_NAME,
  runtime: RUNTIME_CACHE,
  api: API_CACHE,
  images: IMAGE_CACHE
});

// Determine base path (works for root or subdirectory deployments)
const BASE_PATH = self.registration.scope.replace(self.location.origin, '').slice(0, -1);

const ASSETS_TO_CACHE = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/manifest.json',
  BASE_PATH + '/css/main.css',
  BASE_PATH + '/css/base/variables.css',
  BASE_PATH + '/css/base/reset.css',
  BASE_PATH + '/css/components/cards.css',
  BASE_PATH + '/css/components/buttons.css',
  BASE_PATH + '/css/components/header.css',
  BASE_PATH + '/css/components/quiz-container.css',
  BASE_PATH + '/css/components/quiz-options.css',
  BASE_PATH + '/css/components/results-screen.css',
  BASE_PATH + '/css/components/micro-interactions.css',
  BASE_PATH + '/css/components/glassmorphism.css',
  BASE_PATH + '/css/components/view-transitions.css',
  BASE_PATH + '/css/components/showcase-glass-2.0.css',
  BASE_PATH + '/css/components/bottom-nav.css',
  BASE_PATH + '/css/components/profile.css',
  BASE_PATH + '/css/components/modals.css',
  BASE_PATH + '/css/components/pwa-features.css',
  BASE_PATH + '/css/components/dynamic-island.css',
  BASE_PATH + '/css/components/native-navigation.css',
  BASE_PATH + '/css/layout/grid.css',
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
  BASE_PATH + '/js/profile.js',
  BASE_PATH + '/js/pwa-features.js',
  BASE_PATH + '/js/motion-coordinator.js',
  BASE_PATH + '/js/native-touch-engine.js',
  BASE_PATH + '/js/animations.js',
  BASE_PATH + '/js/showcase-features.js',
  BASE_PATH + '/js/dynamic-island.js',
  BASE_PATH + '/js/haptics-engine.js',
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
 * IMPROVED: Deletes ALL caches not matching current version
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker version', APP_VERSION);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // List of current cache names (all with same version)
      const currentCaches = [
        CACHE_NAME,
        RUNTIME_CACHE,
        API_CACHE,
        IMAGE_CACHE
      ];

      console.log('[SW] Current caches:', currentCaches);
      console.log('[SW] Found caches:', cacheNames);

      // Delete any cache that:
      // 1. Is a Harvi cache (starts with 'harvi-')
      // 2. But NOT in current version list
      const cachesToDelete = cacheNames.filter(cacheName => {
        // Check if this is a Harvi cache
        const isHarviCache = cacheName.startsWith('harvi-');
        // Check if it's in our current version caches
        const isCurrentCache = currentCaches.includes(cacheName);
        // Delete if it's ours but old version
        return isHarviCache && !isCurrentCache;
      });

      if (cachesToDelete.length > 0) {
        console.log('[SW] Deleting old caches:', cachesToDelete);
      } else {
        console.log('[SW] No old caches to delete');
      }

      return Promise.all(
        cachesToDelete.map((cacheName) => {
          console.log('[SW] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
      .then(() => {
        console.log('[SW] Old caches cleaned up');
        return self.clients.claim();
      })
      .then(() => {
        console.log('[SW] Service worker activated and claimed clients');

        // Notify all clients about the new version
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: APP_VERSION,
              buildTime: BUILD_TIMESTAMP
            });
          });
        });
      })
  );
});

/**
 * Message handler - allow clients to query version
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);

  // Existing prefetch handler
  if (event.data && event.data.type === 'PREFETCH_QUIZZES') {
    const lectureIds = event.data.lectureIds || [];
    prefetchQuizzes(lectureIds);
    return;
  }

  // NEW: Version query handler
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: APP_VERSION,
      buildTime: BUILD_TIMESTAMP,
      caches: {
        shell: CACHE_NAME,
        runtime: RUNTIME_CACHE,
        api: API_CACHE,
        images: IMAGE_CACHE
      }
    });
    return;
  }

  // NEW: Clear all caches (for debugging/reset)
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys()
        .then(names => Promise.all(names.map(name => caches.delete(name))))
        .then(() => {
          console.log('[SW] All caches cleared');
          event.ports[0].postMessage({ ok: true });
        })
    );
    return;
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

  // Handle API requests with optimized caching strategies
  if (url.pathname.startsWith('/api/')) {
    // Cache-First for stable data that rarely changes
    if (url.pathname === '/api/years') {
      event.respondWith(
        caches.match(request).then(cached => {
          if (cached) {
            // Return cached, but revalidate in background
            fetch(request).then(res => {
              if (res.ok) {
                caches.open(API_CACHE).then(c => c.put(request, res));
              }
            });
            return cached;
          }
          // No cache, fetch and cache
          return fetch(request).then(response => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(API_CACHE).then(cache => cache.put(request, clone));
            }
            return response;
          });
        })
      );
      return;
    }

    // Stale-While-Revalidate for other API requests
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
              return caches.match(BASE_PATH + '/offline.html');
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
              return caches.match(BASE_PATH + '/icons/icon-192x192.svg');
            }
            return new Response('Asset not found', { status: 404 });
          })
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
 * IMPROVED: Comprehensive error handling to prevent service worker crashes
 */
self.addEventListener('push', (event) => {
  // CRITICAL FIX: Wrap entire handler in try-catch to prevent SW crashes
  try {
    if (!event || !event.data) {
      console.warn('Invalid push event received');
      return;
    }

    let data = { title: 'Harvi', body: 'New content available' };

    // Try to parse JSON data with comprehensive error handling
    try {
      const jsonData = event.data.json();
      if (jsonData && typeof jsonData === 'object') {
        data = { ...data, ...jsonData };
      }
    } catch (jsonError) {
      console.warn('Failed to parse push notification JSON:', jsonError);

      // Fallback: try to get text content
      try {
        const textData = event.data.text();
        if (textData && typeof textData === 'string') {
          data.body = textData;
        }
      } catch (textError) {
        console.warn('Failed to read push notification text:', textError);
        // Continue with default data
      }
    }

    // Validate and sanitize notification data with fallbacks
    const title = String(data.title || 'Harvi').substring(0, 100);
    const body = String(data.body || 'New content available').substring(0, 200);
    const requireInteraction = Boolean(data.requireInteraction);

    const options = {
      body: body,
      icon: BASE_PATH + '/icons/icon-192x192.png',
      badge: BASE_PATH + '/icons/badge-72x72.png',
      tag: data.tag || 'harvi-notification',
      requireInteraction: requireInteraction,
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
        .catch(notificationError => {
          console.error('Failed to show notification:', notificationError);
          // Don't re-throw - we've handled the error
        })
    );
  } catch (error) {
    console.error('Push notification handler error:', error);
    // CRITICAL: Don't let push handler errors crash the service worker
    // Just log and continue - the SW stays alive
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

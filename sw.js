/**
 * Service Worker - Harvi PWA
 * Implements App Shell caching strategy, offline support, and background sync
 * 
 * v3.3.0: Added SW-level Request Budget Enforcement
 * - Rate limiting for API endpoints
 * - Stale-while-revalidate with enforced cooldowns
 * - Request deduplication at SW level
 */

// ============================================================================
// VERSION CONTROL
// Update this version number with each deployment
// This ensures all caches are invalidated together
// ============================================================================
const APP_VERSION = '3.3.0';  // ← PWA Request Minimization Phase 2: SW-level rate limiting
const BUILD_TIMESTAMP = '2026-01-22T15:41:00+02:00';

// ============================================================================
// SW-LEVEL REQUEST BUDGET ENFORCEMENT
// Block excessive requests before they reach the network
// ============================================================================
const SW_BUDGET = {
  // Cooldowns (milliseconds)
  COOLDOWNS: {
    '/api/years': 60 * 60 * 1000,        // 1 hour
    '/api/lectures/batch': 5 * 60 * 1000  // 5 minutes
  },

  // Last request timestamps per endpoint pattern
  lastRequestTime: new Map(),

  // In-flight requests for deduplication
  inFlightRequests: new Map(),

  // Session statistics
  stats: {
    blocked: 0,
    deduplicated: 0,
    allowed: 0
  }
};

/**
 * Check if a request should be rate-limited
 * @param {string} pathname - URL pathname
 * @returns {boolean} - true if request should proceed, false if blocked
 */
function shouldAllowRequest(pathname) {
  for (const [pattern, cooldown] of Object.entries(SW_BUDGET.COOLDOWNS)) {
    if (pathname.includes(pattern)) {
      const lastTime = SW_BUDGET.lastRequestTime.get(pattern);
      if (lastTime && (Date.now() - lastTime) < cooldown) {
        SW_BUDGET.stats.blocked++;
        console.log(`[SW Budget] ⏱️ Blocked: ${pattern} (${Math.round((cooldown - (Date.now() - lastTime)) / 1000)}s cooldown)`);
        return false;
      }
    }
  }
  return true;
}

/**
 * Record a request as made (update cooldown timer)
 * @param {string} pathname - URL pathname
 */
function recordRequest(pathname) {
  for (const pattern of Object.keys(SW_BUDGET.COOLDOWNS)) {
    if (pathname.includes(pattern)) {
      SW_BUDGET.lastRequestTime.set(pattern, Date.now());
      SW_BUDGET.stats.allowed++;
      console.log(`[SW Budget] ✅ Allowed: ${pattern}`);
      break;
    }
  }
}

/**
 * Deduplicate in-flight requests
 * @param {string} url - Request URL
 * @param {Function} fetchFn - Function to execute the fetch
 * @returns {Promise<Response>}
 */
function deduplicateFetch(url, fetchFn) {
  if (SW_BUDGET.inFlightRequests.has(url)) {
    SW_BUDGET.stats.deduplicated++;
    console.log(`[SW Budget] 🔄 Deduplicated: ${url}`);
    return SW_BUDGET.inFlightRequests.get(url);
  }

  const promise = fetchFn().finally(() => {
    setTimeout(() => SW_BUDGET.inFlightRequests.delete(url), 100);
  });

  SW_BUDGET.inFlightRequests.set(url, promise);
  return promise;
}
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
  BASE_PATH + '/js/cache-utils.js',
  BASE_PATH + '/js/request-guard.js',  // PWA Request Minimization
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

/**
 * Prefetch lecture batches via GET /api/lectures/batch?ids=...
 * PWA Caching Strategy: use real endpoint (was /api/quiz/:id which does not exist).
 */
async function prefetchQuizzes(lectureIds) {
  if (!lectureIds || lectureIds.length === 0) return;
  try {
    const idsParam = lectureIds.join(',');
    if (idsParam.length > 1800) return; // Avoid 414 URI Too Long
    const url = '/api/lectures/batch?ids=' + encodeURIComponent(idsParam);
    const cache = await caches.open(API_CACHE);
    if (await cache.match(url)) return;
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        console.log('[SW] Prefetched lecture batch:', lectureIds.length, 'ids');
      }
    } catch (e) {
      console.warn('[SW] Prefetch batch failed:', e);
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
    // PWA Caching Strategy: never cache admin or mutating requests (POST/PUT/PATCH/DELETE)
    if (url.pathname.startsWith('/api/admin/') || request.method !== 'GET') {
      return; // pass through to network
    }

    // =========================================================================
    // SW-LEVEL RATE LIMITING for /api/years
    // Check cooldown BEFORE network request - serve from cache if within cooldown
    // =========================================================================
    if (url.pathname === '/api/years') {
      event.respondWith(
        caches.match(request).then(cached => {
          // Check if we should rate-limit this request
          if (!shouldAllowRequest(url.pathname)) {
            // Within cooldown - return cached response without network request
            if (cached) {
              console.log('[SW Budget] 🔒 Rate-limited /api/years - serving cache');
              return cached;
            }
            // No cache? Return a 429 to let client know
            return new Response(
              JSON.stringify({ error: 'Rate limited', useCache: true }),
              { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
          }

          // Not rate-limited - use Stale-While-Revalidate
          if (cached) {
            // Return cached immediately, revalidate in background
            deduplicateFetch(request.url, () => fetch(request)).then(res => {
              if (res && res.ok) {
                recordRequest(url.pathname);
                caches.open(API_CACHE).then(c => c.put(request, res.clone()));
              }
            }).catch(() => { });
            return cached;
          }

          // No cache - must fetch
          return deduplicateFetch(request.url, () => fetch(request)).then(response => {
            if (response.ok) {
              recordRequest(url.pathname);
              const clone = response.clone();
              caches.open(API_CACHE).then(cache => cache.put(request, clone));
            }
            return response;
          });
        })
      );
      return;
    }

    // =========================================================================
    // SW-LEVEL RATE LIMITING for /api/lectures/batch
    // Same pattern: check cooldown, serve from cache if rate-limited
    // =========================================================================
    if (url.pathname.includes('/api/lectures/batch')) {
      event.respondWith(
        caches.match(request).then(cached => {
          // Check if we should rate-limit this request  
          if (!shouldAllowRequest(url.pathname)) {
            if (cached) {
              console.log('[SW Budget] 🔒 Rate-limited /api/lectures/batch - serving cache');
              return cached;
            }
            return new Response(
              JSON.stringify({ error: 'Rate limited', useCache: true }),
              { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
          }

          // Not rate-limited - Network-first with cache fallback
          return deduplicateFetch(request.url, () => fetch(request))
            .then((response) => {
              if (response.ok) {
                recordRequest(url.pathname);
                const clone = response.clone();
                caches.open(API_CACHE).then(cache => cache.put(request, clone));
              }
              return response;
            })
            .catch(() => {
              if (cached) {
                console.log('[SW] Serving lectures batch from cache');
                return cached;
              }
              return new Response(
                JSON.stringify({ error: 'Offline' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            });
        })
      );
      return;
    }

    // Network-first for other GET /api/* endpoints (no rate limiting)
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('[SW] Serving API from cache:', request.url);
                return cachedResponse;
              }
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

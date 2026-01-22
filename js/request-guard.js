/**
 * Request Guard - Edge Request Budget Enforcement
 * 
 * PURPOSE: Prevent excessive network requests that burn Vercel Edge quota.
 * 
 * STRATEGY:
 * 1. Track in-flight requests to prevent duplicates
 * 2. Enforce cooldowns on specific endpoints
 * 3. Deduplicate identical requests
 * 4. Provide request statistics for monitoring
 * 
 * This is the SINGLE SOURCE OF TRUTH for request management.
 */
(function (global) {
    'use strict';

    /**
     * Request Budget Configuration
     * These limits ensure we stay within Vercel free tier
     */
    const CONFIG = {
        // Minimum time between requests to same endpoint (ms)
        ENDPOINT_COOLDOWNS: {
            '/api/years': 60 * 60 * 1000,       // 1 hour - years data rarely changes
            '/api/lectures/batch': 5 * 60 * 1000, // 5 minutes per batch
            'default': 1000                      // 1 second for unknown endpoints
        },

        // Session request limits (soft limits, warns but doesn't block)
        SESSION_WARN_THRESHOLD: 50,  // Warn after 50 requests per session
        SESSION_HARD_LIMIT: 200,     // Hard limit per session

        // Daily budget tracking
        DAILY_BUDGET: 100,           // Target: < 100 requests per day per user

        // Deduplication window (ms) - identical requests within this window are merged
        DEDUP_WINDOW: 100
    };

    /**
     * Request Guard State
     */
    const state = {
        // Track last request time per endpoint
        lastRequestTime: new Map(),

        // Track in-flight requests for deduplication
        inFlightRequests: new Map(),

        // Session statistics
        sessionStats: {
            totalRequests: 0,
            blockedRequests: 0,
            deduplicatedRequests: 0,
            cachedResponses: 0,
            startTime: Date.now()
        },

        // Daily tracking (persisted to localStorage)
        dailyStats: null
    };

    /**
     * Initialize daily stats from localStorage
     */
    function initDailyStats() {
        const today = new Date().toISOString().split('T')[0];
        const stored = localStorage.getItem('harvi_daily_stats');

        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.date === today) {
                    state.dailyStats = parsed;
                    return;
                }
            } catch (e) {
                // Corrupted, reset
            }
        }

        // New day or first time
        state.dailyStats = {
            date: today,
            requests: 0,
            endpoints: {}
        };
        saveDailyStats();
    }

    /**
     * Save daily stats to localStorage
     */
    function saveDailyStats() {
        try {
            localStorage.setItem('harvi_daily_stats', JSON.stringify(state.dailyStats));
        } catch (e) {
            // localStorage full or disabled
        }
    }

    /**
     * Get cooldown for an endpoint
     */
    function getCooldown(url) {
        for (const [pattern, cooldown] of Object.entries(CONFIG.ENDPOINT_COOLDOWNS)) {
            if (pattern !== 'default' && url.includes(pattern)) {
                return cooldown;
            }
        }
        return CONFIG.ENDPOINT_COOLDOWNS.default;
    }

    /**
     * Check if a request should be blocked due to cooldown
     * @param {string} url - The request URL
     * @returns {boolean} - true if request should proceed, false if blocked
     */
    function checkCooldown(url) {
        const cooldown = getCooldown(url);
        const lastTime = state.lastRequestTime.get(url);

        if (lastTime && (Date.now() - lastTime) < cooldown) {
            console.log(`[RequestGuard] ⏱️ Cooldown: ${url} (${Math.round((cooldown - (Date.now() - lastTime)) / 1000)}s remaining)`);
            return false;
        }

        return true;
    }

    /**
     * Record a request being made
     */
    function recordRequest(url) {
        state.lastRequestTime.set(url, Date.now());
        state.sessionStats.totalRequests++;

        if (state.dailyStats) {
            state.dailyStats.requests++;
            state.dailyStats.endpoints[url] = (state.dailyStats.endpoints[url] || 0) + 1;
            saveDailyStats();
        }

        // Check thresholds
        if (state.sessionStats.totalRequests === CONFIG.SESSION_WARN_THRESHOLD) {
            console.warn(`[RequestGuard] ⚠️ Session request threshold reached: ${CONFIG.SESSION_WARN_THRESHOLD} requests`);
        }

        if (state.dailyStats && state.dailyStats.requests > CONFIG.DAILY_BUDGET) {
            console.warn(`[RequestGuard] ⚠️ Daily budget exceeded: ${state.dailyStats.requests}/${CONFIG.DAILY_BUDGET}`);
        }
    }

    /**
     * Deduplicate: If an identical request is already in-flight, return its promise
     * @param {string} key - Request key (URL + method + body hash)
     * @param {Function} fetchFn - Function that performs the actual fetch
     * @returns {Promise} - The fetch promise
     */
    function deduplicateFetch(key, fetchFn) {
        // Check if identical request is in-flight
        if (state.inFlightRequests.has(key)) {
            const existing = state.inFlightRequests.get(key);
            if (Date.now() - existing.startTime < CONFIG.DEDUP_WINDOW * 10) { // 1 second window
                console.log(`[RequestGuard] 🔄 Deduplicated: ${key}`);
                state.sessionStats.deduplicatedRequests++;
                return existing.promise;
            }
        }

        // Create new request
        const promise = fetchFn().finally(() => {
            // Clean up after request completes
            setTimeout(() => {
                state.inFlightRequests.delete(key);
            }, 100);
        });

        state.inFlightRequests.set(key, {
            promise,
            startTime: Date.now()
        });

        return promise;
    }

    /**
     * Generate a unique key for a request
     */
    function getRequestKey(url, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        const body = options.body || '';
        return `${method}:${url}:${body.substring(0, 100)}`;
    }

    /**
     * Guarded fetch - wraps fetch with all protections
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @param {Object} guardOptions - Guard-specific options
     * @returns {Promise<Response>}
     */
    function guardedFetch(url, options = {}, guardOptions = {}) {
        const {
            bypassCooldown = false,
            bypassDedup = false,
            source = 'unknown'
        } = guardOptions;

        const key = getRequestKey(url, options);

        // Check hard session limit
        if (state.sessionStats.totalRequests >= CONFIG.SESSION_HARD_LIMIT) {
            console.error(`[RequestGuard] ❌ Session hard limit reached: ${CONFIG.SESSION_HARD_LIMIT}`);
            state.sessionStats.blockedRequests++;
            return Promise.resolve(new Response(JSON.stringify({
                error: 'Request limit exceeded',
                message: 'Too many requests in this session'
            }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' }
            }));
        }

        // Check cooldown (skip for POST/PUT/DELETE which are important)
        const method = (options.method || 'GET').toUpperCase();
        if (!bypassCooldown && method === 'GET' && !checkCooldown(url)) {
            state.sessionStats.blockedRequests++;
            // Return a synthetic "try cache" response
            return Promise.resolve(new Response(JSON.stringify({
                error: 'Cooldown active',
                message: 'Please wait before retrying',
                useCache: true
            }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' }
            }));
        }

        // Perform fetch with deduplication
        const fetchFn = () => {
            recordRequest(url);
            console.log(`[RequestGuard] 📡 ${method} ${url} (source: ${source})`);
            return fetch(url, options);
        };

        if (bypassDedup) {
            return fetchFn();
        }

        return deduplicateFetch(key, fetchFn);
    }

    /**
     * Force clear cooldown for an endpoint (for user-initiated refresh)
     */
    function clearCooldown(url) {
        if (url) {
            state.lastRequestTime.delete(url);
        } else {
            state.lastRequestTime.clear();
        }
        console.log(`[RequestGuard] 🗑️ Cooldown cleared: ${url || 'ALL'}`);
    }

    /**
     * Get current statistics
     */
    function getStats() {
        return {
            session: { ...state.sessionStats },
            daily: state.dailyStats ? { ...state.dailyStats } : null,
            config: { ...CONFIG },
            inFlight: state.inFlightRequests.size,
            cooldowns: Array.from(state.lastRequestTime.entries()).map(([url, time]) => ({
                url,
                remaining: Math.max(0, getCooldown(url) - (Date.now() - time))
            }))
        };
    }

    /**
     * Reset session stats (for testing)
     */
    function resetSession() {
        state.sessionStats = {
            totalRequests: 0,
            blockedRequests: 0,
            deduplicatedRequests: 0,
            cachedResponses: 0,
            startTime: Date.now()
        };
        state.lastRequestTime.clear();
        state.inFlightRequests.clear();
        console.log('[RequestGuard] 🔄 Session reset');
    }

    // Initialize on load
    initDailyStats();

    // Export API
    global.RequestGuard = {
        fetch: guardedFetch,
        clearCooldown,
        getStats,
        resetSession,
        checkCooldown,
        CONFIG
    };

    console.log('[RequestGuard] ✅ Initialized - Daily requests so far:', state.dailyStats?.requests || 0);

})(typeof window !== 'undefined' ? window : this);

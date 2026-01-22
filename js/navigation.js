/**
 * Navigation Manager
 * Manages hierarchical navigation and card-based UI rendering
 * Features: Smart caching, smooth transitions, optimized rendering
 * 
 * v3.3.0: Added Intelligent Prefetch on Idle
 * - Prefetches likely next subjects during browser idle time
 * - Reduces perceived latency for navigation
 */
class Navigation {
    constructor(app) {
        this.app = app;
        this.currentPath = [];
        this.remoteYears = null;
        this.cacheTimestamp = null;
        this.cacheTimeout = 60 * 60 * 1000; // 1 HOUR cache validity (was 5 min - PWA Optimization)
        this.abortController = null; // For request cancellation
        this.currentHeaderTitle = ''; // Track current header title
        this.transitionDirection = 'forward'; // 'forward' (push) or 'back' (pop)
        this.yearsIDBKey = 'harvi_years_cache'; // IndexedDB key for years persistence
        this._yearsLoadedFromIDB = false; // Track if we've loaded from IDB this session

        // Prefetch on Idle configuration
        this._prefetchedSubjects = new Set(); // Track what we've already prefetched
        this._idlePrefetchScheduled = false;   // Prevent duplicate idle callbacks
    }

    /**
     * Get a smart icon based on text content
     * Delegates to the centralized Medical Engine
     */
    getSmartIcon(text, defaultIcon = 'stethoscope') {
        if (window.medicalEngine) {
            return window.medicalEngine.getSmartIcon(text, defaultIcon);
        }
        return `<i data-lucide="${defaultIcon}"></i>`;
    }


    /**
     * Update header with large title and inline title for morphing effect
     * REFACTORED: Now delegates to HeaderController
     */
    updateHeader(titleText) {
        this.currentHeaderTitle = titleText;

        if (!window.HeaderController) {
            console.warn('HeaderController not available');
            return;
        }

        // Delegate to HeaderController
        window.HeaderController.updateNavigationTitle(titleText);
    }

    /**
     * Clean up navigation resources to prevent memory leaks
     */
    cleanup() {
        console.log('🧹 Cleaning up navigation resources...');

        if (this._refreshYearsTimeout) {
            clearTimeout(this._refreshYearsTimeout);
            this._refreshYearsTimeout = null;
        }
        if (this.abortController) {
            try {
                this.abortController.abort();
                console.log('✓ Aborted pending requests');
            } catch (e) {
                console.warn('AbortController abort failed:', e);
            }
            this.abortController = null;
        }

        // Clear prefetch state
        this._prefetchedSubjects.clear();
        this._idlePrefetchScheduled = false;

        console.log('✓ Navigation cleanup complete');
    }

    /**
     * Smart years loading with caching and smooth transitions
     */
    async showYears() {
        // 1. Prepare State
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        this.app.showScreen('navigation-screen');
        this.currentPath = [];

        this.updateHeader('Years');

        // PWA Optimization: Try to load from IndexedDB if we haven't this session
        if (!this.remoteYears && !this._yearsLoadedFromIDB) {
            await this.loadYearsFromIDB();
        }

        const container = document.getElementById('cards-container');
        if (!container) return;

        // 2. Use Standard Render Path
        this.renderWithTransition(container, () => {
            const hubContainer = document.createElement('div');
            hubContainer.className = 'home-hub-container';

            // Feature Card: Resume Quiz
            if (this.app.resumableQuiz && this.app.lastLectureName) {
                const progress = this.app.resumableQuiz;
                const percent = Math.round((progress.currentIndex / progress.questions.length) * 100);

                const hero = document.createElement('div');
                hero.className = 'hero-continue-card';
                hero.innerHTML = `
                    <div class="hero-badge">Resume Quiz</div>
                    <div>
                        <h3 class="hero-title">${this.app.lastLectureName}</h3>
                        <p class="hero-subtitle">${progress.currentIndex} of ${progress.questions.length} questions • ${percent}% complete</p>
                    </div>
                    <div class="hero-progress-pill" style="width: ${percent}%"></div>
                `;
                hero.onclick = async () => {
                    const lectureId = this.app.lastLectureId;
                    if (!lectureId) return;
                    this.app.startQuiz(progress.questions, { ...progress.metadata, fromSavedProgress: true });
                };
                hubContainer.appendChild(hero);
            }

            // Dynamic Content Area
            const hubContent = document.createElement('div');
            hubContent.id = 'hub-content-area';
            hubContainer.appendChild(hubContent);

            // Render existing cache or skeleton (PWA Strategy: show "Cached" when from cache)
            if (this.isCacheValid() && this.remoteYears) {
                this.renderYears(hubContent, this.remoteYears, false, true);
            } else {
                this.showLoadingState(hubContent);
            }

            return hubContainer;
        });

        // 3. Background Fetch Refresh (PWA Optimized)
        // Only fetch from network if cache is invalid AND we don't have data
        if (!this.isCacheValid() && !this.remoteYears) {
            await this.fetchYearsFromNetwork(container);
        } else if (!this.isCacheValid() && this.remoteYears) {
            // Have stale data - show it, refresh in background
            this.fetchYearsFromNetwork(container); // Don't await - background
        }
        // If cache is valid and we have data, do nothing - pure cache hit!
    }

    /**
     * Load years from IndexedDB (session startup)
     * Called once per session to hydrate cache
     */
    async loadYearsFromIDB() {
        this._yearsLoadedFromIDB = true;
        try {
            if (!harviDB) return;
            const cachedYears = await harviDB.getSetting(this.yearsIDBKey);
            if (cachedYears && cachedYears.data && Array.isArray(cachedYears.data)) {
                this.remoteYears = cachedYears.data;
                this.cacheTimestamp = cachedYears.timestamp || 0;
                console.log(`[Navigation] 📦 Loaded ${this.remoteYears.length} years from IndexedDB (cached ${Math.round((Date.now() - this.cacheTimestamp) / 60000)}min ago)`);
            }
        } catch (e) {
            console.warn('[Navigation] Failed to load years from IDB:', e);
        }
    }

    /**
     * Save years to IndexedDB for cross-session persistence
     */
    async saveYearsToIDB(years) {
        try {
            if (!harviDB) return;
            await harviDB.setSetting(this.yearsIDBKey, {
                data: years,
                timestamp: Date.now()
            });
            console.log(`[Navigation] 💾 Saved ${years.length} years to IndexedDB`);
        } catch (e) {
            console.warn('[Navigation] Failed to save years to IDB:', e);
        }
    }

    /**
     * Fetch years from network (with RequestGuard protection)
     */
    async fetchYearsFromNetwork(container) {
        try {
            // Use RequestGuard if available (enforces cooldowns)
            const fetchFn = window.RequestGuard
                ? (url, opts) => window.RequestGuard.fetch(url, opts, { source: 'showYears' })
                : SafeFetch.fetch;

            this.abortController = new AbortController();
            const res = await fetchFn('./api/years', {
                signal: this.abortController.signal,
                timeout: 10000,
                retries: 2
            });

            // Check if request was blocked by cooldown
            if (res.status === 429) {
                console.log('[Navigation] ⏱️ Years request blocked by cooldown - using cache');
                return; // Use existing cache
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const years = await res.json();

            years.sort((a, b) => {
                const aNum = parseInt((a.external_id || '').replace(/\D/g, '')) || 0;
                const bNum = parseInt((b.external_id || '').replace(/\D/g, '')) || 0;
                if (aNum !== bNum) return aNum - bNum;
                return (a.external_id || '').localeCompare(b.external_id || '', undefined, { numeric: true });
            });

            if (years && Array.isArray(years)) {
                this.remoteYears = years;
                this.cacheTimestamp = Date.now();

                // Persist to IndexedDB for cross-session caching
                this.saveYearsToIDB(years);

                const targetContentArea = document.getElementById('hub-content-area');
                if (targetContentArea) {
                    this.renderYears(targetContentArea, years, true);
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error('Failed to load years:', e);
                // Only show error if we have no cached data
                if (!this.remoteYears && container) {
                    this.showErrorState(container, 'Failed to load years.');
                }
            }
        }
    }
    /**
     * Check if cache is still valid
     */
    isCacheValid() {
        if (!this.cacheTimestamp || !this.remoteYears) return false;
        return (Date.now() - this.cacheTimestamp) < this.cacheTimeout;
    }

    /**
     * PWA Caching Strategy Phase 3: Schedule background revalidation for years (focus/reconnect).
     * Debounced 500ms; non-blocking.
     */
    scheduleRefreshYears() {
        if (this._refreshYearsTimeout) clearTimeout(this._refreshYearsTimeout);
        this._refreshYearsTimeout = setTimeout(() => {
            this._refreshYearsTimeout = null;
            this.refreshYearsInBackground();
        }, 500);
    }

    /**
     * PWA Strategy: Fetch /api/years, update cache, refresh years view if visible.
     * Non-blocking; no abort. Call on visibilitychange (visible) and online.
     * 
     * OPTIMIZED: Only refresh if cache is stale (>1 hour old)
     */
    async refreshYearsInBackground() {
        // Skip if offline
        if (!navigator.onLine) return;

        // PWA Optimization: Skip if cache is still valid
        if (this.isCacheValid()) {
            console.log('[Navigation] 🔄 Background refresh skipped - cache still valid');
            return;
        }

        // Use RequestGuard to enforce cooldowns
        try {
            const fetchFn = window.RequestGuard
                ? (url, opts) => window.RequestGuard.fetch(url, opts, { source: 'backgroundRefresh' })
                : SafeFetch.fetch;

            const res = await fetchFn('./api/years', { timeout: 10000, retries: 1 });

            // Blocked by cooldown - that's fine, we'll try later
            if (res.status === 429) return;
            if (!res.ok) return;

            const years = await res.json();
            if (!years || !Array.isArray(years)) return;

            years.sort((a, b) => {
                const aNum = parseInt((a.external_id || '').replace(/\D/g, '')) || 0;
                const bNum = parseInt((b.external_id || '').replace(/\D/g, '')) || 0;
                if (aNum !== bNum) return aNum - bNum;
                return (a.external_id || '').localeCompare(b.external_id || '', undefined, { numeric: true });
            });

            this.remoteYears = years;
            this.cacheTimestamp = Date.now();

            // Persist to IndexedDB
            this.saveYearsToIDB(years);

            const onYearsView = this.currentPath.length === 0;
            const hub = document.getElementById('hub-content-area');
            if (onYearsView && hub) {
                this.renderYears(hub, years, true, false);
            }
        } catch (e) {
            // non-blocking; ignore
        }
    }

    /**
     * Render years with smooth transition.
     * @param {HTMLElement} container
     * @param {Array} years
     * @param {boolean} [animate=true]
     * @param {boolean} [fromCache=false] — PWA Strategy: show "Cached" indicator when from cache
     */
    renderYears(container, years, animate = true, fromCache = false) {
        container.innerHTML = '';

        // PWA Strategy: Indicator removed per user request for cleaner UI
        /*
        if (fromCache) {
            const ind = document.createElement('div');
            ind.className = 'cache-indicator';
            ind.textContent = 'Cached';
            ind.setAttribute('aria-hidden', 'true');
            container.appendChild(ind);
        }
        */

        const bentoGrid = document.createElement('div');
        bentoGrid.className = 'bento-grid';

        years.forEach((year, index) => {
            const card = document.createElement('div');

            // Cycle through premium variants
            const variants = ['azure', 'emerald', 'amber', 'amethyst'];
            const variant = variants[index % variants.length];
            card.className = `bento-year-card variant-${variant} year-card`;

            // Map icons based on year if standard
            const iconName = year.icon || (index === 0 ? 'stethoscope' : index === 1 ? 'dna' : 'brain');
            const icon = `<i data-lucide="${iconName}"></i>`;

            card.innerHTML = `
                <div>
                    <div class="year-icon-box">${icon}</div>
                    <h3 class="year-name">${year.name}</h3>
                </div>
            `;

            card.addEventListener('click', () => this.showModules(year));
            bentoGrid.appendChild(card);
        });

        container.appendChild(bentoGrid);

        // Apply stagger animation
        if (window.motionCoordinator) {
            const items = bentoGrid.querySelectorAll('.bento-year-card');
            window.motionCoordinator.staggerElements(items, 'animate-entrance-slide-up');
        }

        // Initialize Lucide Icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /**
     * Show loading state using SkeletonLoader
     */
    showLoadingState(container) {
        container.innerHTML = '';

        const bentoGrid = document.createElement('div');
        bentoGrid.className = 'bento-grid';
        for (let i = 0; i < 4; i++) {
            const card = document.createElement('div');
            card.className = 'bento-year-card skeleton-loader';
            card.style.opacity = '0.5';
            bentoGrid.appendChild(card);
        }
        container.appendChild(bentoGrid);
    }
    showErrorState(container, message) {
        container.innerHTML = '';
        container.style.opacity = '1';

        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            color: white; 
            text-align: center; 
            width: 100%; 
            padding: 3rem 2rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
        `;

        const errorText = document.createElement('p');
        errorText.textContent = message;
        errorText.style.cssText = 'margin: 0; font-size: 1.1rem;';

        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry';
        retryButton.style.cssText = `
            padding: 0.75rem 1.5rem;
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 8px;
            color: white;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        retryButton.addEventListener('mouseenter', () => {
            retryButton.style.background = 'rgba(255,255,255,0.3)';
        });
        retryButton.addEventListener('mouseleave', () => {
            retryButton.style.background = 'rgba(255,255,255,0.2)';
        });
        retryButton.addEventListener('click', () => {
            this.cacheTimestamp = null; // Force refresh
            this.showYears();
        });

        errorDiv.appendChild(errorText);
        errorDiv.appendChild(retryButton);
        container.appendChild(errorDiv);
    }

    showModules(year) {
        this.currentPath = [year];

        this.updateHeader(year.name);

        const container = document.getElementById('cards-container');
        if (!container) return;

        this.renderWithTransition(container, () => {
            if (!year.modules || year.modules.length === 0) {
                return this.createEmptyState('No modules available yet.');
            }

            const listWrapper = document.createElement('div');
            listWrapper.className = 'home-hub-container'; // Reuse hub spacing

            if (year.modules) {
                year.modules.sort((a, b) => {
                    const aNum = parseInt((a.external_id || '').replace(/\D/g, '')) || 0;
                    const bNum = parseInt((b.external_id || '').replace(/\D/g, '')) || 0;
                    if (aNum !== bNum) return aNum - bNum;
                    return (a.external_id || '').localeCompare(b.external_id || '', undefined, { numeric: true });
                });
            }

            const bentoGrid = document.createElement('div');
            bentoGrid.className = 'bento-grid';

            year.modules.forEach((module, index) => {
                const card = document.createElement('div');

                // Cycle through premium variants
                const variants = ['azure', 'emerald', 'amber', 'amethyst'];
                const variant = variants[index % variants.length];
                card.className = `bento-year-card variant-${variant} module-card`;

                const icon = this.getSmartIcon(module.name, 'book-open');
                card.innerHTML = `
                    <div>
                        <div class="year-icon-box">${icon}</div>
                        <h3 class="year-name">${module.name}</h3>
                    </div>
                `;

                card.addEventListener('click', () => this.showSubjects(year, module));
                bentoGrid.appendChild(card);
            });

            listWrapper.appendChild(bentoGrid);
            return listWrapper;
        });
    }

    showSubjects(year, module) {
        this.currentPath = [year, module];

        this.updateHeader(module.name);

        const container = document.getElementById('cards-container');
        if (!container) return;

        this.renderWithTransition(container, () => {
            if (!module.subjects || module.subjects.length === 0) {
                return this.createEmptyState('No subjects available yet.');
            }

            const listWrapper = document.createElement('div');
            listWrapper.className = 'home-hub-container';

            if (module.subjects) {
                module.subjects.sort((a, b) => {
                    const aNum = parseInt((a.external_id || '').replace(/\D/g, '')) || 0;
                    const bNum = parseInt((b.external_id || '').replace(/\D/g, '')) || 0;
                    if (aNum !== bNum) return aNum - bNum;
                    return (a.external_id || '').localeCompare(b.external_id || '', undefined, { numeric: true });
                });
            }

            const bentoGrid = document.createElement('div');
            bentoGrid.className = 'bento-grid';
            listWrapper.appendChild(bentoGrid);

            module.subjects.forEach((subject, index) => {
                const card = document.createElement('div');

                // Use same premium variants as years
                const variants = ['azure', 'emerald', 'amber', 'amethyst'];
                const variant = variants[index % variants.length];
                card.className = `bento-year-card variant-${variant} subject-card`;

                const icon = this.getSmartIcon(subject.name, 'pen-tool');
                card.innerHTML = `
                    <div>
                        <div class="year-icon-box">${icon}</div>
                        <h3 class="year-name">${subject.name}</h3>
                    </div>
                `;

                card.addEventListener('click', () => this.showLectures(year, module, subject));
                bentoGrid.appendChild(card);
            });

            return listWrapper;
        });

        // PWA Optimization: Schedule prefetch of likely next subjects during idle time
        this.schedulePrefetchOnIdle();
    }

    /**
     * Show lectures with offline-first strategy (PWA Caching Strategy Phase 2).
     * Read-through: try IDB first; if all found and not stale, render from cache and optionally revalidate in background.
     * Otherwise network-first, with IDB fallback on failure.
     */
    showLectures(year, module, subject) {
        this.currentPath = [year, module, subject];

        this.updateHeader(subject.name);

        const container = document.getElementById('cards-container');

        if (!subject.lectures || subject.lectures.length === 0) {
            this.renderWithTransition(container, () => this.createEmptyState('No lectures available yet.'));
            return;
        }

        subject.lectures.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        const oldCards = container.querySelectorAll('.lecture-card-masterpiece[data-lecture-id]');
        oldCards.forEach(card => {
            if (card._clickHandler) {
                card.removeEventListener('click', card._clickHandler);
                delete card._clickHandler;
                delete card._clickHandlerAdded;
            }
        });
        if (oldCards.length) console.log('🧹 Cleaned up', oldCards.length, 'old lecture cards');

        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        const abortController = new AbortController();
        this.abortController = abortController;

        const lectureIds = subject.lectures.map(l => l.id);
        const loadingCards = new Map();
        let indicatorEl = null;

        const showCacheIndicator = (kind) => {
            // PWA Strategy: Indicator removed per user request for cleaner UI
            /*
            indicatorEl.classList.remove('cache-indicator--hidden');
            indicatorEl.classList.toggle('cache-indicator--offline', kind === 'offline');
            indicatorEl.textContent = kind === 'offline' ? 'Offline • Showing cached' : 'Cached';
            */
        };

        const applyResultsToCards = (results, loadingCardsMap) => {
            results.forEach((res) => {
                const card = loadingCardsMap.get(res.lecture.id);
                if (!card || !container.contains(card)) return;
                if (!res.success) {
                    if (res.error && res.error.name !== 'AbortError') this.updateCardError(card);
                    return;
                }
                const data = res.data;
                const lec = res.lecture;
                lec.questions = data.questions || [];
                if (lec.questions.length > 0) {
                    this.updateCardSuccess(card, lec.questions, year, module, subject, lec);
                } else {
                    this.updateCardEmpty(card);
                }
            });
        };

        const persistAndBuildResults = (lectures, fromNetwork) => {
            const map = new Map(lectures.map(l => [l.id, l]));
            return subject.lectures.map(lec => {
                const data = map.get(lec.id);
                if (!data) return { lecture: lec, data: null, success: false, error: new Error('Not found') };
                if (fromNetwork && harviDB && data.questions) {
                    harviDB.saveLecture({ id: lec.id, ...data }).catch(e => console.warn('Failed to cache lecture:', e));
                }
                return { lecture: lec, data, success: true };
            });
        };

        this.renderWithTransition(container, () => {
            const fragment = document.createDocumentFragment();
            indicatorEl = document.createElement('div');
            indicatorEl.className = 'cache-indicator cache-indicator--hidden';
            indicatorEl.setAttribute('aria-hidden', 'true');
            fragment.appendChild(indicatorEl);

            const groupWrapper = document.createElement('div');
            groupWrapper.className = 'lecture-grid';

            subject.lectures.forEach(lecture => {
                const item = document.createElement('div');
                item.className = 'lecture-card-masterpiece loading skeleton-loader';
                item.innerHTML = `
                    <div class="lecture-name">${lecture.name}</div>
                    <div class="lecture-meta">Loading high-yield topics...</div>
                `;
                item.dataset.lectureId = lecture.id;
                loadingCards.set(lecture.id, item);
                groupWrapper.appendChild(item);
            });

            fragment.appendChild(groupWrapper);
            return fragment;
        });

        const runReadThrough = async () => {
            if (!harviDB || !window.CacheUtils) return { allFoundAndFresh: false, cached: null };
            const cached = await harviDB.getLecturesByIds(lectureIds);
            const isStale = (l) => window.CacheUtils.isLectureStale(l);
            const allFound = cached.size === lectureIds.length;
            const noneStale = allFound && lectureIds.every(id => !isStale(cached.get(id)));
            return { allFoundAndFresh: allFound && noneStale, cached };
        };

        const doBackgroundRevalidate = () => {
            // PWA Optimization: Use RequestGuard to enforce cooldowns
            const fetchFn = window.RequestGuard
                ? (u, o) => window.RequestGuard.fetch(u, o, { source: 'lectureRevalidate' })
                : SafeFetch.fetch;

            const url = `/api/lectures/batch?ids=${lectureIds.join(',')}`;
            const req = url.length > 2000
                ? fetchFn('/api/lectures/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lectureIds }),
                    timeout: 15000,
                    retries: 1
                })
                : fetchFn(url, { cache: 'default', timeout: 15000, retries: 1 });

            req.then(res => {
                // If blocked by cooldown (429), that's fine
                if (res.status === 429 || !res.ok) return;
                return res.json();
            }).then(lectures => {
                if (!lectures || abortController.signal.aborted) return;
                const sameSubject = this.currentPath.length === 3 && this.currentPath[2] && this.currentPath[2].id === subject.id;
                if (!sameSubject) return;
                const results = persistAndBuildResults(lectures, true);
                applyResultsToCards(results, loadingCards);
                if (indicatorEl) indicatorEl.classList.add('cache-indicator--hidden');
            }).catch(() => { });
        };

        runReadThrough().then(({ allFoundAndFresh, cached }) => {
            if (abortController.signal.aborted) return;

            if (allFoundAndFresh && cached && cached.size) {
                const results = subject.lectures.map(lec => {
                    const data = cached.get(lec.id);
                    return {
                        lecture: lec,
                        data: data || { questions: [] },
                        success: !!(data && data.questions && data.questions.length)
                    };
                });
                applyResultsToCards(results, loadingCards);
                showCacheIndicator('cached');
                // PWA Optimization: SKIP background revalidation when cache is fresh
                // This reduces unnecessary network requests significantly
                console.log('[Navigation] 🟢 Lectures served from fresh cache - no network request needed');
                this.abortController = null;
                return;
            }

            // PWA Optimization: Use RequestGuard for network fetch
            const fetchFn = window.RequestGuard
                ? (u, o) => window.RequestGuard.fetch(u, o, { source: 'lectureLoad' })
                : SafeFetch.fetch;

            const url = `/api/lectures/batch?ids=${lectureIds.join(',')}`;
            const batchFetchPromise = url.length > 2000
                ? fetchFn('/api/lectures/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lectureIds }),
                    signal: abortController.signal,
                    cache: 'no-cache',
                    timeout: 15000,
                    retries: 2
                })
                : fetchFn(url, { signal: abortController.signal, cache: 'default', timeout: 15000, retries: 2 });

            batchFetchPromise
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json();
                })
                .then(lectures => {
                    if (abortController.signal.aborted) return;
                    const results = persistAndBuildResults(lectures, true);
                    applyResultsToCards(results, loadingCards);
                    this.abortController = null;
                })
                .catch(async (err) => {
                    this.abortController = null;
                    if (err.name === 'AbortError') return;
                    console.error('Error loading lectures:', err);
                    const fallback = harviDB ? await harviDB.getLecturesByIds(lectureIds) : new Map();
                    const results = subject.lectures.map(lec => {
                        const data = fallback.get(lec.id);
                        const ok = !!(data && data.questions && data.questions.length);
                        return {
                            lecture: lec,
                            data: data || { questions: [] },
                            success: ok,
                            error: ok ? null : new Error('Offline')
                        };
                    });
                    applyResultsToCards(results, loadingCards);
                    showCacheIndicator('offline');
                });
        });
    }

    /**
     * Update card to success state with questions
     */
    /**
     * Update card to success state with questions
     * FIXED: No longer uses cloneNode - properly manages event listeners
     */
    updateCardSuccess(card, questions, year, module, subject, lecture) {
        const questionCount = questions.length;

        // Update card description (Masterpiece style)
        const metaEl = card.querySelector('.lecture-meta');
        if (metaEl) {
            metaEl.textContent = `${questionCount} Questions • Mastery Recommended`;
        }

        // Update card styling
        card.classList.remove('loading', 'skeleton-loader');
        card.classList.add('active');
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';

        // CRITICAL FIX: Instead of cloning, use a single-use flag
        if (!card._clickHandlerAdded) {
            const clickHandler = () => {
                if (window.HapticsEngine) window.HapticsEngine.selection();
                this.app.startQuiz(questions, {
                    year: year.name,
                    module: module.name,
                    subject: subject.name,
                    lecture: lecture.name,
                    lectureId: lecture.id
                });
            };
            card._clickHandler = clickHandler;
            card.addEventListener('click', clickHandler);
            card._clickHandlerAdded = true;
        } else {
            // Update closure with potential new data
            if (card._clickHandler) card.removeEventListener('click', card._clickHandler);
            const clickHandler = () => {
                if (window.HapticsEngine) window.HapticsEngine.selection();
                this.app.startQuiz(questions, {
                    year: year.name,
                    module: module.name,
                    subject: subject.name,
                    lecture: lecture.name,
                    lectureId: lecture.id
                });
            };
            card._clickHandler = clickHandler;
            card.addEventListener('click', clickHandler);
        }
    }

    /**
     * Update card to empty state
     */
    updateCardEmpty(card) {
        const metaEl = card.querySelector('.lecture-meta');
        if (metaEl) metaEl.textContent = 'No questions found in this topic';
        card.style.opacity = '0.6';
        card.style.cursor = 'not-allowed';
        card.style.pointerEvents = 'none';
        card.classList.remove('loading', 'skeleton-loader');
    }

    /**
     * Update card to error state
     */
    updateCardError(card) {
        const metaEl = card.querySelector('.lecture-meta');
        if (metaEl) metaEl.textContent = 'Failed to load high-yield content';
        card.style.opacity = '0.6';
        card.style.cursor = 'not-allowed';
        card.style.pointerEvents = 'none';
        card.classList.remove('loading', 'skeleton-loader');
    }

    /**
     * Render content with smooth fade transition
     */
    /**
     * Render content with smooth native-like transition
     */
    /**
     * Render content with smooth native-like transition
     * Uses View Transitions API with a robust fallback
     */
    renderWithTransition(container, contentFactory) {
        const performUpdate = () => {
            // Generate new content
            const content = contentFactory();

            // Handle direction and skip logic
            let animationClass = '';
            if (window.skipAnimation) {
                window.skipAnimation = false;
            } else {
                animationClass = this.transitionDirection === 'back'
                    ? 'animate-enter-pop'
                    : 'animate-enter-push';
            }

            // Reset direction
            this.transitionDirection = 'forward';

            // IMPORTANT: Only clear and append at the last moment
            // This reduces the blank-screen duration
            container.innerHTML = '';

            if (content instanceof DocumentFragment) {
                Array.from(content.children).forEach(child => {
                    if (animationClass) child.classList.add(animationClass);
                });
                container.appendChild(content);
            } else {
                if (animationClass) content.classList.add(animationClass);
                container.appendChild(content);
            }

            // Reset active screen scroll position
            const activeScreen = document.querySelector('.screen.active');
            if (activeScreen) {
                activeScreen.scrollTo({ top: 0, behavior: 'instant' });
            }

            // 🟢 Global Icon Rendering: Ensure Lucide icons are processed after DOM update
            if (window.lucide) {
                window.lucide.createIcons();
            }
        };

        // Use View Transitions if available (Apple native feel)
        if (document.startViewTransition) {
            document.startViewTransition(() => {
                performUpdate();
                return Promise.resolve();
            });
        } else {
            performUpdate();
        }
    }

    /**
     * Create empty state message
     */
    createEmptyState(message) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.cssText = 'color: white; text-align: center; width: 100%; padding: 2rem;';
        emptyDiv.textContent = message;
        return emptyDiv;
    }



    /**
     * Navigate to a specific path level using path-based routing
     * This replaces hardcoded index checks with a flexible navigation system
     * @param {number} targetIndex - The index in currentPath to navigate to
     */
    navigateToPath(targetIndex) {
        if (targetIndex < 0 || targetIndex >= this.currentPath.length) {
            // Invalid index, go to home
            this.showYears();
            return;
        }

        // Build path up to target index
        const targetPath = this.currentPath.slice(0, targetIndex + 1);

        // If target is shallower than current, it's a BACK navigation
        if (targetIndex < this.currentPath.length - 1) {
            this.transitionDirection = 'back';
        }

        // Navigate based on path length
        switch (targetPath.length) {
            case 1:
                // Navigate to modules view
                this.showModules(targetPath[0]);
                break;
            case 2:
                // Navigate to subjects view
                this.showSubjects(targetPath[0], targetPath[1]);
                break;
            case 3:
                // Navigate to lectures view
                this.showLectures(targetPath[0], targetPath[1], targetPath[2]);
                break;
            default:
                // Fallback to home for unknown path lengths
                this.showYears();
                break;
        }
    }

    /**
     * Setup Large Title scroll transition
     * REFACTORED: Now delegates to HeaderController
     */
    setupScrollListener() {
        // Delegate to HeaderController
        if (window.HeaderController) {
            window.HeaderController.setupScrollListener();
        }
    }

    // =========================================================================
    // PREFETCH ON IDLE - Intelligent prefetching for faster navigation
    // =========================================================================

    /**
     * Schedule prefetch of likely next subjects during browser idle time
     * Called after navigating to a module to prefetch first few subjects
     */
    schedulePrefetchOnIdle() {
        // Only run if browser supports requestIdleCallback
        if (!window.requestIdleCallback || this._idlePrefetchScheduled) {
            return;
        }

        // Only prefetch if we're in a module (have subjects to prefetch)
        if (this.currentPath.length < 2) {
            return;
        }

        this._idlePrefetchScheduled = true;

        requestIdleCallback((deadline) => {
            this._idlePrefetchScheduled = false;
            this.prefetchLikelyNextSubjects(deadline);
        }, { timeout: 5000 }); // Max 5 seconds delay
    }

    /**
     * Prefetch lectures for the first few subjects in current module
     * @param {IdleDeadline} deadline - Browser idle deadline
     */
    async prefetchLikelyNextSubjects(deadline) {
        const module = this.currentPath[1];
        const year = this.currentPath[0];

        if (!module || !module.subjects || !navigator.onLine) {
            return;
        }

        console.log('[Prefetch] 🚀 Starting idle prefetch...');

        // Prefetch only first 2-3 subjects (most likely to be clicked)
        const subjectsToPrefetch = module.subjects.slice(0, 3);
        let prefetchedCount = 0;

        for (const subject of subjectsToPrefetch) {
            // Check if we have time remaining in idle period
            if (deadline.timeRemaining() < 50) {
                console.log('[Prefetch] ⏱️ Idle time exhausted, stopping');
                break;
            }

            // Skip if already prefetched
            if (this._prefetchedSubjects.has(subject.id)) {
                continue;
            }

            // Skip if no lectures
            if (!subject.lectures || subject.lectures.length === 0) {
                continue;
            }

            // Check if user navigated away
            if (this.currentPath.length < 2 || this.currentPath[1]?.id !== module.id) {
                console.log('[Prefetch] 🛑 User navigated away, stopping');
                break;
            }

            try {
                await this.prefetchSubjectLectures(subject, year, module);
                this._prefetchedSubjects.add(subject.id);
                prefetchedCount++;
            } catch (e) {
                console.warn('[Prefetch] Failed to prefetch subject:', subject.name, e);
            }
        }

        if (prefetchedCount > 0) {
            console.log(`[Prefetch] ✅ Prefetched ${prefetchedCount} subjects`);
        }
    }

    /**
     * Prefetch all lectures for a subject (save to IndexedDB)
     * @param {Object} subject - Subject to prefetch
     */
    async prefetchSubjectLectures(subject) {
        if (!harviDB || !subject.lectures) return;

        const lectureIds = subject.lectures.map(l => l.id);

        // Check if all already cached in IDB
        const cached = await harviDB.getLecturesByIds(lectureIds);
        if (cached.size === lectureIds.length) {
            console.log(`[Prefetch] ⏭️ ${subject.name} already in cache`);
            return;
        }

        // Fetch missing lectures via batch endpoint
        const missingIds = lectureIds.filter(id => !cached.has(id));
        if (missingIds.length === 0) return;

        console.log(`[Prefetch] 📦 Prefetching ${missingIds.length} lectures for ${subject.name}`);

        // Use service worker for prefetch (it will handle caching)
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'PREFETCH_QUIZZES',
                lectureIds: missingIds
            });
        }
    }
}

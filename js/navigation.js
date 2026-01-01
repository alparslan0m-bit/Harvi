/**
 * Navigation Manager
 * Manages hierarchical navigation and card-based UI rendering
 * Features: Smart caching, smooth transitions, optimized rendering
 */
class Navigation {
    constructor(app) {
        this.app = app;
        this.currentPath = [];
        this.remoteYears = null;
        this.cacheTimestamp = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache validity
        this.abortController = null; // For request cancellation
        this.scrollListener = null; // Track scroll listener for cleanup
        this.currentHeaderTitle = ''; // Track current header title
        this.transitionDirection = 'forward'; // 'forward' (push) or 'back' (pop)
    }

    /**
     * Update header with large title and inline title for morphing effect
     * Activates the scroll-to-inline transition CSS
     */
    updateHeader(titleText) {
        this.currentHeaderTitle = titleText;
        const brandContainer = document.getElementById('brand-container');
        const navTitleArea = document.getElementById('navigation-title-area');

        if (!brandContainer || !navTitleArea) return;

        // If at the root level (Years), show the master brand
        if (titleText === 'Years' || !titleText) {
            brandContainer.style.display = 'flex';
            navTitleArea.style.display = 'none';
        } else {
            // Otherwise show the Navigation Large Title
            brandContainer.style.display = 'none';
            navTitleArea.style.display = 'block';

            navTitleArea.innerHTML = `
                <div class="scrollable-header">
                    <h1 class="large-title">${titleText}</h1>
                    <div class="inline-title">${titleText}</div>
                </div>
            `;

            // Reset scroll state
            const scrollableHeader = navTitleArea.querySelector('.scrollable-header');
            if (scrollableHeader) {
                scrollableHeader.classList.remove('scrolled');
            }
        }
    }

    /**
     * Clean up navigation resources to prevent memory leaks
     */
    cleanup() {
        console.log('🧹 Cleaning up navigation resources...');

        // 1. Abort and clean up any pending requests
        if (this.abortController) {
            try {
                this.abortController.abort();
                console.log('✓ Aborted pending requests');
            } catch (e) {
                console.warn('AbortController abort failed:', e);
            }
            this.abortController = null;  // ← KEY: null the reference
        }

        // 2. Remove scroll listener
        if (this.scrollListener) {
            const screen = document.querySelector('.screen.active');
            if (screen) {
                screen.removeEventListener('scroll', this.scrollListener, { passive: true });
                console.log('✓ Scroll listener removed');
            }
            this.scrollListener = null;
        }

        // 3. Clear cached data if needed (optional - depends on requirements)
        // this.remoteYears = null;
        // this.cacheTimestamp = null;

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
        this.updateBreadcrumb();
        this.updateHeader('Years');

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

            // Render existing cache or skeleton
            if (this.isCacheValid() && this.remoteYears) {
                this.renderYears(hubContent, this.remoteYears, false);
            } else {
                this.showLoadingState(hubContent);
            }

            return hubContainer;
        });

        // 3. Background Fetch Refresh
        if (!this.isCacheValid() || !this.remoteYears) {
            try {
                this.abortController = new AbortController();
                const res = await SafeFetch.fetch('./api/years', {
                    signal: this.abortController.signal,
                    timeout: 10000,
                    retries: 2
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const years = await res.json();

                years.sort((a, b) => {
                    const aNum = parseInt(a.id.replace(/\D/g, '')) || 0;
                    const bNum = parseInt(b.id.replace(/\D/g, '')) || 0;
                    return aNum - bNum;
                });

                if (years && Array.isArray(years)) {
                    this.remoteYears = years;
                    this.cacheTimestamp = Date.now();
                    const targetContentArea = document.getElementById('hub-content-area');
                    if (targetContentArea) {
                        this.renderYears(targetContentArea, years, true);
                    }
                }
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error('Failed to load years:', e);
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
     * Render years with smooth transition
     */
    renderYears(container, years, animate = true) {
        // Clear previous content (skeletons or old grid)
        container.innerHTML = '';

        // Create Bento Grid
        const bentoGrid = document.createElement('div');
        bentoGrid.className = 'bento-grid';

        years.forEach((year, index) => {
            const card = document.createElement('div');

            // Cycle through premium variants
            const variants = ['azure', 'emerald', 'amber', 'amethyst'];
            const variant = variants[index % variants.length];
            card.className = `bento-year-card variant-${variant}`;

            // Map icons based on year if standard
            const icon = year.icon || (index === 0 ? '🩺' : index === 1 ? '🧬' : '🧠');
            const modulesCount = year.modules?.length || 0;

            card.innerHTML = `
                <div>
                    <div class="year-icon-box">${icon}</div>
                    <h3 class="year-name">${year.name}</h3>
                    <span class="year-stats">${modulesCount} Modules</span>
                </div>
                <div class="float-symbol">${icon}</div>
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
        this.updateBreadcrumb();
        this.updateHeader(year.name);

        const container = document.getElementById('cards-container');
        if (!container) return;

        this.renderWithTransition(container, () => {
            if (!year.modules || year.modules.length === 0) {
                return this.createEmptyState('No modules available yet.');
            }

            const listWrapper = document.createElement('div');
            listWrapper.className = 'home-hub-container'; // Reuse hub spacing

            const bentoGrid = document.createElement('div');
            bentoGrid.className = 'bento-grid';

            year.modules.forEach((module, index) => {
                const card = document.createElement('div');
                card.className = 'bento-year-card'; // Reuse bento style

                const icon = '📚';
                const subjectsCount = module.subjects?.length || 0;

                card.innerHTML = `
                    <div>
                        <div class="year-icon-box">${icon}</div>
                        <h3 class="year-name">${module.name}</h3>
                        <span class="year-stats">${subjectsCount} Subjects</span>
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
        this.updateBreadcrumb();
        this.updateHeader(module.name);

        const container = document.getElementById('cards-container');
        if (!container) return;

        this.renderWithTransition(container, () => {
            if (!module.subjects || module.subjects.length === 0) {
                return this.createEmptyState('No subjects available yet.');
            }

            const listWrapper = document.createElement('div');
            listWrapper.className = 'home-hub-container';

            const gridWrapper = document.createElement('div');
            gridWrapper.className = 'lecture-grid';
            listWrapper.appendChild(gridWrapper);

            module.subjects.forEach(subject => {
                const item = document.createElement('div');
                item.className = 'lecture-card-masterpiece active';

                const lectureCount = subject.lectures ? subject.lectures.length : 0;

                item.innerHTML = `
                    <div class="lecture-name">${subject.name}</div>
                    <div class="lecture-meta">${lectureCount} Lectures • Explore Curriculum</div>
                `;

                item.addEventListener('click', () => this.showLectures(year, module, subject));
                gridWrapper.appendChild(item);
            });

            return listWrapper;
        });
    }

    /**
     * Show lectures with offline-first strategy
     * Displays cached content immediately, then fetches fresh data in background
     */
    showLectures(year, module, subject) {
        this.currentPath = [year, module, subject];
        this.updateBreadcrumb();
        this.updateHeader(subject.name);

        const container = document.getElementById('cards-container');

        if (!subject.lectures || subject.lectures.length === 0) {
            this.renderWithTransition(container, () => this.createEmptyState('No lectures available yet.'));
            return;
        }

        // CLEANUP: Remove old event listeners before clearing container
        const oldCards = container.querySelectorAll('.lecture-card-masterpiece[data-lecture-id]');
        oldCards.forEach(card => {
            if (card._clickHandler) {
                card.removeEventListener('click', card._clickHandler);
                delete card._clickHandler;
                delete card._clickHandlerAdded;
            }
        });
        console.log(`🧹 Cleaned up ${oldCards.length} old lecture cards`);

        // Cancel any previous requests immediately
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;  // ← ADD THIS LINE
        }

        const abortController = new AbortController();
        this.abortController = abortController;

        // START BATCH FETCHING - Single GET request for better caching
        // Note: Offline caching preserved via harviDB.saveLecture() in promise chain
        const lectureIds = subject.lectures.map(lecture => lecture.id);
        const url = `./api/lectures/batch?ids=${lectureIds.join(',')}`;

        // Check URL length to prevent 414 Request-URI Too Long errors
        const batchFetchPromise = url.length > 2000
            ? // Fallback to POST if URL too long
            SafeFetch.fetch('./api/lectures/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lectureIds }),
                signal: abortController.signal,
                cache: 'no-cache',
                timeout: 15000,
                retries: 2
            })
            : // Use GET for normal cases (better caching)
            SafeFetch.fetch(url, {
                signal: abortController.signal,
                cache: 'default',
                timeout: 15000,
                retries: 2
            });

        // Render cards immediately with loading state (while fetching happens in parallel)
        const loadingCards = new Map();
        this.renderWithTransition(container, () => {
            const fragment = document.createDocumentFragment();
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

        // SINGLE CONTINUOUS PROMISE CHAIN: Fetch → Process → Update Cards
        batchFetchPromise
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(lectures => {
                // Create a map for quick lookup
                const lectureMap = new Map(lectures.map(lecture => [lecture.id, lecture]));
                return subject.lectures.map(lecture => {
                    const data = lectureMap.get(lecture.id);
                    if (data) {
                        // Update cache with fresh data
                        if (harviDB && data.questions) {
                            harviDB.saveLecture({
                                id: lecture.id,
                                ...data
                            }).catch(e =>
                                console.warn('Failed to cache lecture:', e)
                            );
                        }
                        return { lecture, data, success: true };
                    } else {
                        return { lecture, error: new Error('Lecture not found in batch response'), success: false };
                    }
                });
            })
            .then(results => {
                // NOW 'results' is the correctly processed array!
                if (abortController.signal.aborted) return;

                results.forEach((result) => {
                    if (abortController.signal.aborted) return;

                    const lecture = result.lecture;
                    const currentCard = loadingCards.get(lecture.id);

                    if (!currentCard || !container.contains(currentCard)) {
                        return; // Card was removed, ignore
                    }

                    if (!result.success) {
                        // Handle error
                        if (result.error?.name !== 'AbortError') {
                            this.updateCardError(currentCard);
                        }
                        return;
                    }

                    const { data } = result;
                    lecture.questions = data.questions || [];
                    const questions = lecture.questions;

                    if (questions && questions.length > 0) {
                        this.updateCardSuccess(currentCard, questions, year, module, subject, lecture);
                    } else {
                        this.updateCardEmpty(currentCard);
                    }
                });

                this.abortController = null; // Clean up on success
            })
            .catch(error => {
                this.abortController = null; // Clean up on error

                if (error.name !== 'AbortError') {
                    console.error('Error loading lectures:', error);
                    // Show error on all remaining cards
                    loadingCards.forEach(card => {
                        if (container.contains(card)) {
                            this.updateCardError(card);
                        }
                    });
                }
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

            container.scrollTop = 0;
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
     * Update navigation breadcrumb for hierarchical context
     */
    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;

        breadcrumb.innerHTML = '';

        const homeItem = document.createElement('span');
        homeItem.className = 'breadcrumb-item';
        homeItem.innerHTML = '🏠 Home';
        homeItem.style.cursor = 'pointer';
        homeItem.style.cursor = 'pointer';
        homeItem.addEventListener('click', () => {
            this.transitionDirection = 'back'; // Home is always back
            this.app.navigation.showYears();
        });
        breadcrumb.appendChild(homeItem);

        this.currentPath.forEach((item, index) => {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = ' > ';
            breadcrumb.appendChild(separator);

            const pathItem = document.createElement('span');
            pathItem.className = 'breadcrumb-item';
            if (index === this.currentPath.length - 1) {
                pathItem.classList.add('active');
            }
            pathItem.textContent = item.name;
            pathItem.style.cursor = 'pointer';

            // Use path-based navigation instead of hardcoded index checks
            pathItem.addEventListener('click', () => {
                this.navigateToPath(index);
            });

            breadcrumb.appendChild(pathItem);
        });
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
     * Monitors scroll position to collapse header
     */
    setupScrollListener() {
        const screen = document.querySelector('.screen.active');
        if (!screen) return;

        const header = screen.querySelector('.scrollable-header');
        if (!header) return;

        // Remove existing listeners to avoid duplicates
        if (this.scrollListener) {
            screen.removeEventListener('scroll', this.scrollListener);
        }

        let isTicking = false;
        this.scrollListener = () => {
            if (!isTicking) {
                requestAnimationFrame(() => {
                    const scrollY = screen.scrollTop;
                    const threshold = 15; // Standard iOS threshold for header transition

                    const isScrolled = scrollY > threshold;
                    if (header.classList.contains('scrolled') !== isScrolled) {
                        header.classList.toggle('scrolled', isScrolled);
                    }
                    isTicking = false;
                });
                isTicking = true;
            }
        };

        screen.addEventListener('scroll', this.scrollListener, { passive: true });
    }
}

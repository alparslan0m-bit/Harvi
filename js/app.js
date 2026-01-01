/**
 * PHASE 2: SafeFetch Utility
 * Handles timeout, retry, and error states for all API calls
 * Prevents "infinite loading spinners" on network issues
 * FIXED: Returns synthetic Response instead of throwing to prevent unhandled rejections
 */
class SafeFetch {
    static _lastErrorShown = 0; // ← Track last error notification time

    static async fetch(url, options = {}) {
        const timeout = options.timeout || 10000; // 10s default timeout
        const retries = options.retries || 1;
        let lastError;

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                lastError = error;
                console.warn(`Fetch attempt ${attempt + 1} failed:`, error);

                // Show retry UI if this was the last attempt
                if (attempt === retries - 1) {
                    SafeFetch.showRetryUI(url, error);
                }

                // Wait before retry
                if (attempt < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
        }

        // CRITICAL FIX: Instead of throwing, return synthetic Response
        // This prevents unhandled promise rejections while still indicating error
        console.error(`SafeFetch failed after ${retries} attempts:`, lastError);
        return new Response(JSON.stringify({
            error: 'Network request failed',
            message: lastError?.message || 'Unknown error',
            url: url,
            attempts: retries
        }), {
            status: 0, // 0 indicates network error (not HTTP error)
            statusText: 'Network Error',
            headers: { 'Content-Type': 'application/json' }
        });
    }

    static showRetryUI(url, error) {
        // Only show if not recently shown (debounce for 3 seconds)
        const now = Date.now();
        if (now - this._lastErrorShown < 3000) {
            return; // Skip if error shown within 3 seconds
        }
        this._lastErrorShown = now;

        // Use Dynamic Island for retry notification
        if (window.dynamicIsland) {
            window.dynamicIsland.show({
                title: '⚠️ Connection Failed',
                subtitle: 'Unable to reach server. Check your internet.',
                type: 'error',
                duration: 5000,
                onTap: () => {
                    window.dynamicIsland.hide();
                    window.location.reload();
                }
            });
        } else {
            console.warn(`Failed to fetch ${url}: ${error.message}`);
        }
    }
}

/**
 * Main Application Controller
 * Coordinates screen transitions, persistent state, and global application state
 */
class MCQApp {
    constructor() {
        this.currentPath = [];
        this.navigationStack = ['navigation-screen']; // PHASE 2: Explicit stack for gestures
        this.currentQuiz = null;
        this.isGirlMode = false;
        this.lastLectureId = null;
        this.lastLectureName = null; // ← Add lecture name storage
        this.resumableQuiz = null;
        this.previousScreen = 'navigation-screen';
        // PHASE 2 FIX: Master copy of lecture questions for protecting against shuffle corruption
        this.masterCopyQuestions = null;
        this.init();
    }

    async init() {
        // Expose premium features to window for cross-script access
        window.SkeletonLoader = SkeletonLoader;
        window.audioToolkit = new AudioToolkit();

        // Initialize IndexedDB
        try {
            await harviDB.init();

            // Use Dynamic Island for initialization feedback
            if (window.dynamicIsland) {
                window.dynamicIsland.show({
                    title: '✓ Ready to Learn',
                    subtitle: 'Offline mode enabled',
                    type: 'success',
                    duration: 1500
                });
            }
        } catch (error) {
            console.error('⚠️  Database initialization failed:', error);

            // Show warning to user but don't block app
            if (window.dynamicIsland) {
                window.dynamicIsland.show({
                    title: '⚠️ Limited Functionality',
                    subtitle: 'Offline features disabled. Quiz progress won\'t be saved.',
                    type: 'warning',
                    duration: 5000
                });
            } else {
                console.warn('Running in degraded mode - no offline storage available');
            }

            // App continues to work, but without offline features
            // Set a flag to disable offline-dependent features
            this.offlineDisabled = true;
        }

        this.navigation = new Navigation(this);
        this.quiz = new Quiz(this);
        this.results = new Results(this);
        this.stats = new Stats(this);
        this.profile = new Profile(this);

        this.initTheme();
        this.setupBrandButton();
        this.setupBottomNavigation();
        await this.checkResumableQuiz();
        this.setupOnlineStatusHandling();
        this.setupServiceWorkerUpdateListener();
        this.navigation.showYears();
    }

    /**
     * Listen for service worker updates and prompt user to refresh
     */
    setupServiceWorkerUpdateListener() {
        window.addEventListener('sw-update-available', () => {
            if (window.dynamicIsland) {
                window.dynamicIsland.show({
                    title: '📦 Update Available',
                    subtitle: 'New version ready. Tap to refresh.',
                    type: 'success',
                    duration: 0, // Don't auto-dismiss
                    onTap: () => {
                        window.dynamicIsland.hide();
                        // Trigger service worker to activate update and refresh page
                        window.location.reload();
                    },
                    onClose: () => {
                        // User dismissed - can refresh later
                    }
                });
            } else {
                // Fallback notification
                console.log('Service worker update available');
                alert('A new version of Harvi is available. Please refresh the page to update.');
            }
        });
    }

    /**
     * Check if there's a quiz that can be resumed
     */
    async checkResumableQuiz() {
        try {
            const lastLectureId = await harviDB.getSetting('lastActiveLectureId');
            if (lastLectureId) {
                const progress = await harviDB.getQuizProgress(lastLectureId);
                if (progress && progress.currentIndex < progress.questions.length) {
                    this.resumableQuiz = progress;
                    this.lastLectureId = lastLectureId;
                    this.lastLectureName = progress.metadata?.lecture || null; // ← RESTORE NAME
                    console.log('✓ Resumable quiz found:', lastLectureId);
                }
            }
        } catch (error) {
            console.warn('Could not check resumable quiz:', error);
        }
    }


    /**
     * Handle online/offline status changes
     */
    setupOnlineStatusHandling() {
        window.addEventListener('online', () => {
            document.body.classList.remove('offline-mode');

            // Notify via Dynamic Island
            if (window.dynamicIsland) {
                window.dynamicIsland.show({
                    title: '✓ Connection Restored',
                    type: 'success',
                    duration: 2000
                });
            }

            this.syncPendingData();
        });

        window.addEventListener('offline', () => {
            document.body.classList.add('offline-mode');

            // Notify via Dynamic Island
            if (window.dynamicIsland) {
                window.dynamicIsland.show({
                    title: '⚠ Connection Lost',
                    subtitle: 'Working offline - changes will sync when reconnected',
                    type: 'warning',
                    duration: 3000
                });
            }
        });

        // Set initial offline state
        if (!navigator.onLine) {
            document.body.classList.add('offline-mode');
        }
    }

    /**
     * Sync any pending data when connection is restored
     */
    async syncPendingData() {
        try {
            const queue = await harviDB.getSyncQueue();
            if (queue.length === 0) return;

            console.log(`Syncing ${queue.length} pending items...`);

            for (const item of queue) {
                try {
                    // Example: Sync quiz results to server
                    if (item.action === 'saveQuizResult') {
                        // WIRED: Use SafeFetch for automatic retry and error handling on sync
                        const response = await SafeFetch.fetch('./api/quiz-results', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(item.data),
                            timeout: 15000,
                            retries: 3
                        });

                        // Only mark as synced if server accepted the data
                        if (response.ok) {
                            await harviDB.markSynced(item.id);
                            console.log(`✓ Synced item ${item.id}`);
                        } else {
                            console.warn(`Server rejected item ${item.id}: ${response.status}`);
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to sync item ${item.id}:`, error);
                }
            }

            console.log('✓ Sync completed');
        } catch (error) {
            console.warn('Sync error:', error);
        }
    }

    initTheme() {
        const savedMode = localStorage.getItem('girlMode');
        if (savedMode !== null) {
            this.isGirlMode = savedMode === 'true';
        }

        this.applyTheme();
    }

    /**
     * Setup brand button (Harvi title) to return home
     */
    setupBrandButton() {
        const brandButton = document.getElementById('brand-container');
        if (brandButton) {
            brandButton.addEventListener('click', () => {
                this.resetApp();
            });
        }

        // Handle stats and profile brand buttons
        const brandStats = document.getElementById('brand-stats');
        if (brandStats) {
            brandStats.addEventListener('click', () => {
                this.showScreen('navigation-screen');
            });
        }

        const brandProfile = document.getElementById('brand-profile');
        if (brandProfile) {
            brandProfile.addEventListener('click', () => {
                this.showScreen('navigation-screen');
            });
        }
    }

    /**
     * Setup bottom navigation bar click handlers
     */
    setupBottomNavigation() {
        const navItems = document.querySelectorAll('.bottom-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const screenId = item.dataset.screen;

                if (screenId) {
                    // Logic: If clicking home while a quiz/result is active, perform a clean reset
                    if (screenId === 'navigation-screen') {
                        this.resetApp();
                    } else {
                        this.showScreen(screenId);
                    }

                    // Haptic feedback
                    if (navigator.vibrate) {
                        navigator.vibrate(8);
                    }
                }
            });
        });
    }

    /**
     * Setup pull-to-refresh gesture for lecture list
     */
    setupPullToRefresh() {
        const container = document.getElementById('app');
        if (container && window.PullToRefresh) {
            this.pullToRefresh = new PullToRefresh(container);
        }
    }

    toggleGirlMode() {
        document.body.classList.add('theme-transitioning');
        this.isGirlMode = !this.isGirlMode;
        localStorage.setItem('girlMode', this.isGirlMode.toString());
        this.applyTheme();
        setTimeout(() => document.body.classList.remove('theme-transitioning'), 300);
    }

    applyTheme() {
        if (this.isGirlMode) {
            document.body.classList.add('girl-mode');
        } else {
            document.body.classList.remove('girl-mode');
        }

        // Sync browser UI theme color with app mode
        if (window.AdaptiveThemeColor) {
            AdaptiveThemeColor.updateTheme();
        }
    }

    /**
     * Show screen with View Transitions API support
     * Creates smooth directional animations between screens
     */
    showScreen(screenId) {
        // 1. Guard against redundant calls
        const currentActive = document.querySelector('.screen.active');
        if (currentActive && currentActive.id === screenId) {
            console.log(`[Navigation] Screen ${screenId} is already active, skipping.`);
            return;
        }

        const transition = () => {
            // Track previous screen for back gesture navigation
            if (currentActive) {
                this.previousScreen = currentActive.id;

                // PHASE 2: Maintain explicit navigation stack for TAB-level peers
                // This ensures we always have a history to go back to if needed
                if (!this.navigationStack.includes(screenId)) {
                    this.navigationStack.push(screenId);
                } else {
                    // If going back to an existing tab, truncate the stack up to that point
                    const index = this.navigationStack.indexOf(screenId);
                    this.navigationStack = this.navigationStack.slice(0, index + 1);
                }
            }

            // Sync Tab Bar Highlighting IMMEDIATELY (prevents desync feel)
            this.updateBottomNavActiveState(screenId);

            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
            });

            const screen = document.getElementById(screenId);
            if (screen) {
                screen.classList.add('active');

                // Reset scroll position on tab switch (Apple standard: new tab starts at top)
                screen.scrollTop = 0;
            }

            // Setup scroll listener for Large Title transition (if applicable)
            if (this.navigation) {
                this.navigation.setupScrollListener();
            }

            // Initialize screen-specific content
            if (screenId === 'stats-screen' && this.stats) {
                this.stats.init();
            } else if (screenId === 'profile-screen' && this.profile) {
                this.profile.init();
            }

            // Hide bottom nav during quiz for better focus
            this.toggleBottomNavVisibility(screenId);

            // Subtle haptic tick on screen transition
            if (navigator.vibrate) {
                navigator.vibrate(5);
            }
        };

        // 2. Execute with View Transitions if supported
        if (document.startViewTransition) {
            // Give the browser a hint about the transition type
            // Root-level screen switches use cross-dissolve
            document.startViewTransition(transition);
        } else {
            // Fallback for older browsers
            transition();
        }
    }

    /**
     * Update bottom navigation active state to match current screen
     */
    updateBottomNavActiveState(screenId) {
        const navItems = document.querySelectorAll('.bottom-nav-item');
        navItems.forEach(item => {
            const navScreen = item.dataset.screen;
            if (navScreen === screenId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * Hide bottom nav during quiz for better focus, show otherwise
     */
    toggleBottomNavVisibility(screenId) {
        const bottomNav = document.getElementById('bottom-nav-container');
        if (bottomNav) {
            if (screenId === 'quiz-screen') {
                bottomNav.classList.remove('active');
                document.body.classList.add('quiz-mode-active');
            } else {
                bottomNav.classList.add('active');
                document.body.classList.remove('quiz-mode-active');
            }
        }
    }

    /**
     * Navigate back using explicit stack (PHASE 2: Replaces previousElementSibling logic)
     */
    /**
     * Smart Back Navigation
     * Prioritizes internal drill-down navigation, then falls back to screen stack
     */
    goBack() {
        // 1. Check if we can go back within the Home/Navigation hierarchy
        if (this.navigation && this.navigation.currentPath.length > 0) {
            // Get parent path index
            const parentIndex = this.navigation.currentPath.length - 2;

            if (parentIndex >= 0) {
                this.navigation.navigateToPath(parentIndex);
            } else {
                // If at root level of content (Years), go to root display
                this.navigation.showYears();
            }
            return;
        }

        // 2. If no internal navigation, pop the screen stack (Tabs)
        if (this.navigationStack.length > 1) {
            this.navigationStack.pop();
            const previousId = this.navigationStack[this.navigationStack.length - 1];
            this.showScreen(previousId);
        } else {
            console.log('At root of app, minimal back action');
        }
    }

    async startQuiz(questions, pathInfo) {
        // PHASE 2 FIX: Store master copy of unshuffled questions
        // This prevents shuffling from one session from affecting retakes
        this.masterCopyQuestions = structuredClone(questions);

        // Create a deep clone for the quiz session
        // The quiz will shuffle this clone; the master copy stays pristine for retakes
        const quizSessionQuestions = structuredClone(questions);

        this.currentQuiz = {
            questions: quizSessionQuestions,
            pathInfo: pathInfo,
            currentIndex: 0,
            answers: [],
            score: 0,
            startTime: Date.now()
        };

        // Save lecture ID for resumable quiz
        if (pathInfo && pathInfo.lectureId) {
            this.lastLectureId = pathInfo.lectureId;
            this.lastLectureName = pathInfo.lecture; // ← Store lecture name
            await harviDB.setSetting('lastActiveLectureId', pathInfo.lectureId);

            // If starting NEW (not from saved progress), clear any stale progress record
            if (!pathInfo.fromSavedProgress) {
                await harviDB.deleteQuizProgress(pathInfo.lectureId);
            }
        }

        // AGGRESSIVE CLEANUP: Hide any existing resume prompts
        if (window.dynamicIsland) {
            window.dynamicIsland.hide();
        }
        const existingPrompt = document.querySelector('.resume-prompt');
        if (existingPrompt) existingPrompt.remove();
        this.resumableQuiz = null;

        this.quiz.start(quizSessionQuestions, pathInfo);
    }

    async showResults(score, total, metadata) {
        this.results.show(score, total, metadata);

        // AGGRESSIVE CLEAR: Stop resume prompts immediately
        this.resumableQuiz = null;

        // Save quiz result and clear resumable state
        if (this.lastLectureId) {
            const currentLectureId = this.lastLectureId; // Capture in case it changes
            try {
                // 1. Clear resume pointer in DB IMMEDIATELY (sync)
                await harviDB.setSetting('lastActiveLectureId', null);

                // 2. Physically delete the progress record
                await harviDB.deleteQuizProgress(currentLectureId);

                const timeSpent = this.currentQuiz ? (Date.now() - (this.currentQuiz.startTime || Date.now())) : 0;
                const result = { score, total, timeSpent };

                // 3. Save results
                await harviDB.saveQuizResult(currentLectureId, result, this.lastLectureName);

                // Queue for sync if offline
                if (!navigator.onLine) {
                    await harviDB.queueSync('saveQuizResult', {
                        lectureId: currentLectureId,
                        lectureName: this.lastLectureName,
                        ...result
                    });
                }
            } catch (error) {
                console.warn('Failed to save quiz result:', error);
            }
        }
    }

    async resetApp() {
        // Cleanup quiz resources before resetting
        if (this.quiz && typeof this.quiz.cleanup === 'function') {
            this.quiz.cleanup();  // ← This line already exists, good!
        }

        // Also cleanup navigation resources
        if (this.navigation && typeof this.navigation.cleanup === 'function') {
            this.navigation.cleanup();  // ← ADD THIS
        }

        this.currentPath = [];
        this.currentQuiz = null;
        this.resumableQuiz = null;
        this.navigation.showYears();
    }

    showLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
    }
}

function initializeMobileOptimizations() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isMobile) {
        document.body.classList.add('mobile-device');
    }

    if (isIOS) {
        document.body.classList.add('ios-device');
    }

    if (isMobile) {
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    const interactiveElements = document.querySelectorAll('.option, .btn-primary, .continue-btn, .back-btn');
    interactiveElements.forEach(element => {
        element.classList.add('touch-feedback', 'mobile-touch-fix');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeMobileOptimizations();
    window.app = new MCQApp();
});
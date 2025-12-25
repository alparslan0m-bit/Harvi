/**
 * PHASE 2: SafeFetch Utility
 * Handles timeout, retry, and error states for all API calls
 * Prevents "infinite loading spinners" on network issues
 */
class SafeFetch {
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

        throw lastError;
    }

    static showRetryUI(url, error) {
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
        this.isDarkMode = false;
        this.lastLectureId = null;
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
                    type: 'success',
                    duration: 1500
                });
            } else {
                console.log('✓ Database initialized');
            }
        } catch (error) {
            console.warn('Database initialization warning:', error);
        }

        this.navigation = new Navigation(this);
        this.quiz = new Quiz(this);
        this.results = new Results(this);
        this.stats = new Stats(this);
        this.profile = new Profile(this);
        
        this.initDarkMode();
        this.setupBrandButton();
        this.setupBottomNavigation();
        this.setupPullToRefresh();
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
                    console.log('✓ Resumable quiz found:', lastLectureId);
                    
                    // Show floating resume prompt
                    this.showResumePrompt(lastLectureId, progress);
                }
            }
        } catch (error) {
            console.warn('Could not check resumable quiz:', error);
        }
    }
    
    /**
     * Show floating pill prompting user to resume their quiz
     */
    showResumePrompt(lectureId, progress) {
        // Use Dynamic Island notification system instead of custom prompt
        if (window.dynamicIsland) {
            const progressText = `${progress.metadata?.name || 'Quiz'} (${progress.currentIndex}/${progress.questions.length})`;
            
            window.dynamicIsland.show({
                title: '▶️ Resume Quiz',
                subtitle: progressText,
                type: 'info',
                duration: 0, // Don't auto-dismiss
                onTap: () => {
                    window.dynamicIsland.hide();
                    this.startQuiz(progress.questions, progress.metadata);
                },
                onClose: () => {
                    // User dismissed it
                }
            });
        } else {
            // Fallback: show in custom prompt if DynamicIsland not available
            this.showResumeFallback(lectureId, progress);
        }
    }

    showResumeFallback(lectureId, progress) {
        // Wait for navigation to be initialized
        setTimeout(() => {
            const container = document.getElementById('cards-container');
            if (!container) return;
            
            const prompt = document.createElement('div');
            prompt.className = 'resume-prompt';
            prompt.innerHTML = `
                <div class="resume-content">
                    <span class="resume-icon">▶️</span>
                    <div class="resume-text">
                        <p class="resume-label">Resume Quiz</p>
                        <p class="resume-progress">${progress.metadata?.name || 'Your Quiz'} (${progress.currentIndex}/${progress.questions.length})</p>
                    </div>
                    <button class="resume-close" aria-label="Dismiss">✕</button>
                </div>
            `;
            
            // Resume button click handler
            prompt.addEventListener('click', (e) => {
                if (e.target.classList.contains('resume-close')) {
                    prompt.remove();
                } else {
                    this.startQuiz(progress.questions, progress.metadata);
                }
            });
            
            // Close button specifically
            prompt.querySelector('.resume-close').addEventListener('click', (e) => {
                e.stopPropagation();
                prompt.classList.add('fade-out');
                setTimeout(() => prompt.remove(), 300);
            });
            
            container.parentElement.insertBefore(prompt, container);
        }, 100);
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

    initDarkMode() {
        const savedMode = localStorage.getItem('girlMode');
        if (savedMode !== null) {
            this.isDarkMode = savedMode === 'true';
        } else {
            this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        
        this.applyDarkMode();
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('girlMode') === null) {
                this.isDarkMode = e.matches;
                this.applyDarkMode();
            }
        });
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
                    // Show the requested screen (active state handled by showScreen)
                    this.showScreen(screenId);
                    
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

    toggleDarkMode() {
        document.body.classList.add('theme-transitioning');
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('girlMode', this.isDarkMode.toString());
        this.applyDarkMode();
        setTimeout(() => document.body.classList.remove('theme-transitioning'), 300);
    }

    applyDarkMode() {
        if (this.isDarkMode) {
            document.body.classList.add('girl-mode');
        } else {
            document.body.classList.remove('girl-mode');
        }
        
        // Sync browser UI theme color with app mode
        if (window.ThemeSyncEngine) {
            ThemeSyncEngine.syncToMode(this.isDarkMode);
        }
    }

    /**
     * Show screen with View Transitions API support
     * Creates smooth directional animations between screens
     */
    showScreen(screenId) {
        const transition = () => {
            // Track previous screen for back gesture navigation
            const currentActive = document.querySelector('.screen.active');
            if (currentActive) {
                this.previousScreen = currentActive.id;
                // PHASE 2: Maintain explicit navigation stack
                if (!this.navigationStack.includes(screenId)) {
                    this.navigationStack.push(screenId);
                } else {
                    this.navigationStack = this.navigationStack.slice(0, this.navigationStack.indexOf(screenId) + 1);
                }
            }

            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
            });
            const screen = document.getElementById(screenId);
            screen.classList.add('active');
            
            // Setup scroll listener for Large Title transition
            if (this.navigation) {
                this.navigation.setupScrollListener();
            }
            
            // Initialize screen-specific content
            if (screenId === 'stats-screen' && this.stats) {
                this.stats.init();
            } else if (screenId === 'profile-screen' && this.profile) {
                this.profile.init();
            }
            
            // Update bottom navigation active state
            this.updateBottomNavActiveState(screenId);
            
            // Hide bottom nav during quiz for better focus
            this.toggleBottomNavVisibility(screenId);
            
            // Subtle haptic tick on screen transition (PHASE 3: iOS-style short pulse)
            if (navigator.vibrate) {
                navigator.vibrate(5);
            }
        };
        
        // Use View Transitions API if available (modern browsers)
        if (document.startViewTransition) {
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
            } else {
                bottomNav.classList.add('active');
            }
        }
    }

    /**
     * Navigate back using explicit stack (PHASE 2: Replaces previousElementSibling logic)
     */
    goBack() {
        if (this.navigationStack.length > 1) {
            this.navigationStack.pop();
            const previousId = this.navigationStack[this.navigationStack.length - 1];
            this.showScreen(previousId);
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
            await harviDB.setSetting('lastActiveLectureId', pathInfo.lectureId);
        }

        this.quiz.start(quizSessionQuestions, pathInfo);
    }

    async showResults(score, total, metadata) {
        this.results.show(score, total, metadata);
        
        // Save quiz result and clear resumable state
        if (this.currentQuiz && this.lastLectureId) {
            try {
                const timeSpent = Date.now() - (this.currentQuiz.startTime || Date.now());
                const result = { score, total, timeSpent };
                
                await harviDB.saveQuizResult(this.lastLectureId, result);
                await harviDB.setSetting('lastActiveLectureId', null);
                
                // Queue for sync if offline
                if (!navigator.onLine) {
                    await harviDB.queueSync('saveQuizResult', {
                        lectureId: this.lastLectureId,
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
            this.quiz.cleanup();
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
/**
 * Main Application Controller
 * Coordinates screen transitions, persistent state, and global application state
 */
class MCQApp {
    constructor() {
        this.currentPath = [];
        this.currentQuiz = null;
        this.isDarkMode = false;
        this.lastLectureId = null;
        this.resumableQuiz = null;
        this.previousScreen = 'navigation-screen'; // Track previous screen for back gestures
        this.init();
    }

    async init() {
        // Initialize IndexedDB
        try {
            await harviDB.init();
            console.log('✓ Database initialized');
        } catch (error) {
            console.warn('Database initialization warning:', error);
        }

        this.navigation = new Navigation(this);
        this.quiz = new Quiz(this);
        this.results = new Results(this);
        
        this.initDarkMode();
        this.setupBottomNavigation();
        await this.checkResumableQuiz();
        this.setupOnlineStatusHandling();
        this.navigation.showYears();
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
            console.log('✓ Connection restored');
            document.body.classList.remove('offline-mode');
            this.syncPendingData();
        });

        window.addEventListener('offline', () => {
            console.log('⚠ Connection lost');
            document.body.classList.add('offline-mode');
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
                        const response = await fetch('/api/quiz-results', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(item.data)
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

    /**
     * Setup bottom navigation screen switching
     */
    setupBottomNavigation() {
        const navItems = document.querySelectorAll('.bottom-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const screenId = item.dataset.screen;
                if (screenId) {
                    navItems.forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');
                    this.showScreen(screenId);
                    
                    // Update stats UI when stats screen is shown
                    if (screenId === 'stats-screen') {
                        setTimeout(() => {
                            this.updateStatsUI();
                            // Render heatmap
                            if (window.HeatmapGenerator) {
                                const heatmap = new HeatmapGenerator('#activity-heatmap');
                                heatmap.render();
                            }
                        }, 100);
                    }
                    
                    if (navigator.vibrate) navigator.vibrate(8);
                }
            });
        });
    }

    /**
     * Update stats screen with current data
     */
    async updateStatsUI() {
        try {
            if (window.StatisticsAggregator) {
                const stats = await StatisticsAggregator.aggregateStats();
                if (stats) {
                    document.getElementById('total-quizzes').textContent = stats.totalQuizzes;
                    document.getElementById('average-score').textContent = Math.round(stats.averageScore) + '%';
                    document.getElementById('current-streak').textContent = stats.streak;
                    document.getElementById('best-score').textContent = stats.bestScore || '0%';
                    
                    // Render badges if available
                    if (window.BadgeSystem) {
                        BadgeSystem.renderBadges('#achievements-container', stats);
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to update stats UI:', e);
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
        this.setupDarkModeToggles();
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('girlMode') === null) {
                this.isDarkMode = e.matches;
                this.applyDarkMode();
            }
        });
    }

    setupDarkModeToggles() {
        const toggles = [
            document.getElementById('mode-toggle'),
            document.getElementById('quiz-mode-toggle'),
            document.getElementById('results-mode-toggle')
        ];
        
        toggles.forEach(toggle => {
            if (toggle) {
                toggle.addEventListener('click', () => this.toggleDarkMode());
                toggle.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.toggleDarkMode();
                    }
                });
            }
        });
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('girlMode', this.isDarkMode.toString());
        this.applyDarkMode();
    }

    applyDarkMode() {
        if (this.isDarkMode) {
            document.body.classList.add('girl-mode');
        } else {
            document.body.classList.remove('girl-mode');
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
            
            // Subtle haptic tick on screen transition
            if (navigator.vibrate) {
                navigator.vibrate(10);
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

    async startQuiz(questions, pathInfo) {
        this.currentQuiz = {
            questions: questions,
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

        this.quiz.start(questions, pathInfo);
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
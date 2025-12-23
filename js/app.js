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
                        await fetch('/api/quiz-results', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(item.data)
                        });
                        await harviDB.markSynced(item.id);
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

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
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
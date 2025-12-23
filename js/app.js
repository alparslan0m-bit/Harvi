/**
 * Main Application Controller
 * Coordinates screen transitions and global application state
 */
class MCQApp {
    constructor() {
        this.currentPath = [];
        this.currentQuiz = null;
        this.isDarkMode = false;
        this.init();
    }

    init() {
        this.navigation = new Navigation(this);
        this.quiz = new Quiz(this);
        this.results = new Results(this);
        
        this.initDarkMode();
        this.navigation.showYears();
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

    startQuiz(questions, pathInfo) {
        this.currentQuiz = {
            questions: questions,
            pathInfo: pathInfo,
            currentIndex: 0,
            answers: [],
            score: 0
        };
        this.quiz.start(questions, pathInfo);
    }

    showResults(score, total, metadata) {
        this.results.show(score, total, metadata);
    }

    resetApp() {
        // Cleanup quiz resources before resetting
        if (this.quiz && typeof this.quiz.cleanup === 'function') {
            this.quiz.cleanup();
        }
        this.currentPath = [];
        this.currentQuiz = null;
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
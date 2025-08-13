// Main App Controller
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
        
        // Initialize dark mode from localStorage
        this.initDarkMode();
        
        // Initialize with years view
        this.navigation.showYears();
    }

    initDarkMode() {
        // Check localStorage for saved preference
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode !== null) {
            this.isDarkMode = savedMode === 'true';
        } else {
            // Check system preference
            this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        
        this.applyDarkMode();
        
        // Add event listeners for dark mode toggles
        this.setupDarkModeToggles();
        
        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('darkMode') === null) {
                this.isDarkMode = e.matches;
                this.applyDarkMode();
            }
        });
    }

    setupDarkModeToggles() {
        const toggles = [
            document.getElementById('dark-mode-toggle'),
            document.getElementById('quiz-dark-mode-toggle'),
            document.getElementById('results-dark-mode-toggle')
        ];
        
        toggles.forEach(toggle => {
            if (toggle) {
                toggle.addEventListener('click', () => this.toggleDarkMode());
                // Add keyboard support
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
        localStorage.setItem('darkMode', this.isDarkMode.toString());
        this.applyDarkMode();
    }

    applyDarkMode() {
        if (this.isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
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

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MCQApp();
});
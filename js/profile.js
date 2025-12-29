/**
 * Profile Screen Manager
 * Manages user settings and preferences
 */
class Profile {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('profile-content');
        this.listenersAttached = false; // ← Track if listeners are attached
    }

    /**
     * Initialize and display profile content
     */
    async init() {
        if (!this.container) return;

        this.renderProfile();
        this.setupEventListeners();
    }

    /**
     * Render profile content
     */
    renderProfile() {
        this.container.innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
                    </svg>
                </div>
                <h3>Profile Settings</h3>
            </div>

            <div class="profile-settings">
                <div class="setting-group">
                    <h4>Appearance</h4>
                    <div class="setting-item">
                        <label class="setting-label">
                            <span>Theme Mode</span>
                            <input type="checkbox" id="profile-theme-mode" class="setting-toggle">
                        </label>
                    </div>
                </div>

                <div class="setting-group">
                    <h4>Data Management</h4>
                    <button class="btn-secondary" id="clear-data-btn">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                        Clear All Data
                    </button>
                </div>

                <div class="setting-group">
                    <h4>About</h4>
                    <div class="about-info">
                        <p><strong>Harvi</strong> - Medical MCQ Learning Platform</p>
                        <p>Version 2.1.0</p>
                        <p>Built with ❤️ for medical students</p>
                    </div>
                </div>
            </div>
        `;

        // Set initial toggle states
        this.updateToggleStates();
    }

    /**
     * Update toggle states based on current settings
     */
    updateToggleStates() {
        const themeModeToggle = document.getElementById('profile-theme-mode');

        if (themeModeToggle) {
            themeModeToggle.checked = document.body.classList.contains('girl-mode');
        }
    }

    /**
     * Setup event listeners for profile interactions
     */
    setupEventListeners() {
        // Only setup listeners once
        if (this.listenersAttached) {
            return;
        }
        
        const themeModeToggle = document.getElementById('profile-theme-mode');
        const clearDataBtn = document.getElementById('clear-data-btn');

        if (themeModeToggle) {
            themeModeToggle.addEventListener('change', () => {
                this.app.toggleDarkMode();
                // Delay update to account for theme transition (300ms)
                setTimeout(() => this.updateToggleStates(), 350);
            });
        }

        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                this.confirmClearData();
            });
        }
        
        this.listenersAttached = true; // ← Mark as attached
    }

    /**
     * Confirm and clear all user data
     */
    async confirmClearData() {
        if (confirm('Are you sure you want to clear all quiz data and settings? This action cannot be undone.')) {
            try {
                await harviDB.clearAll();
                alert('All data has been cleared.');
                // Reset app to initial state
                this.app.resetApp();
            } catch (error) {
                console.error('Failed to clear data:', error);
                alert('Failed to clear data. Please try again.');
            }
        }
    }
}
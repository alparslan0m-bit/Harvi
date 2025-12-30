/**
 * Profile Screen Manager
 * Manages user settings and preferences
 */
class Profile {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('profile-content');
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
                            <span>Girl Mode</span>
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
        const themeModeToggle = document.getElementById('profile-theme-mode');
        const clearDataBtn = document.getElementById('clear-data-btn');

        if (themeModeToggle) {
            themeModeToggle.addEventListener('change', () => {
                this.app.toggleGirlMode();
                // Delay update to account for theme transition (300ms)
                setTimeout(() => this.updateToggleStates(), 350);
            });
        }

        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                this.confirmClearData();
            });
        }
    }

    /**
     * Show danger modal and clear all user data on confirmation
     */
    async confirmClearData() {
        // Create and show the danger modal - returns 'controller' object to handle closing manually
        const modalController = await this.showDangerModal();

        if (modalController.confirmed) {
            try {
                // 1. Trigger haptic feedback
                if (navigator.vibrate) {
                    navigator.vibrate([30, 50, 30]);
                }

                // 2. Show loading state on the button (Modal is still open)
                if (modalController.deleteBtn) {
                    modalController.deleteBtn.classList.add('loading');
                    modalController.deleteBtn.disabled = true;
                }

                // 3. Perform the actual data clearing
                // Added a small artificial delay (500ms) so the user actually sees the processing state
                await new Promise(r => setTimeout(r, 800));
                await harviDB.clearAll();

                // 4. Close the modal properly now that we are done
                modalController.close();

                // 5. Show success notification via Dynamic Island
                if (window.dynamicIsland) {
                    window.dynamicIsland.show({
                        title: '✓ All Data Cleared',
                        subtitle: 'Your quiz history and settings have been removed.',
                        icon: '🗑️',
                        type: 'success',
                        duration: 4000
                    });
                }

                // 6. Reset app to initial state
                this.app.resetApp();
            } catch (error) {
                console.error('Failed to clear data:', error);

                // Show error
                if (window.dynamicIsland) {
                    window.dynamicIsland.show({
                        title: '✕ Failed to Clear Data',
                        subtitle: 'Please try again.',
                        icon: '⚠️',
                        type: 'error',
                        duration: 4000
                    });
                }

                // Reset button state if we failed
                if (modalController.deleteBtn) {
                    modalController.deleteBtn.classList.remove('loading');
                    modalController.deleteBtn.disabled = false;
                }
            }
        }
    }

    /**
     * Display danger modal with glassmorphic design
     * Returns Promise that resolves to an object: { confirmed: boolean, close: function, deleteBtn: element }
     */
    showDangerModal() {
        return new Promise((resolve) => {
            // Create backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';

            // Create modal
            const modal = document.createElement('div');
            modal.className = 'glass-modal';
            modal.innerHTML = `
                <div class="glass-modal-header">
                    <div class="glass-modal-icon">
                        <svg viewBox="0 0 24 24" fill="none" class="modal-trash-icon" style="stroke: #FF3B30; stroke-width: 2;">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="10" y1="11" x2="10" y2="17" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="14" y1="11" x2="14" y2="17" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div>
                        <h2 class="glass-modal-title">Delete All Data?</h2>
                        <p class="glass-modal-description">This will permanently remove your quiz history, saved lectures, and settings. You cannot undo this action.</p>
                    </div>
                </div>
                <div class="glass-modal-actions">
                    <button class="glass-modal-btn glass-modal-btn-cancel" id="modal-cancel">Cancel</button>
                    <button class="glass-modal-btn glass-modal-btn-delete" id="modal-delete">
                        <span class="btn-text">Delete Forever</span>
                    </button>
                </div>
            `;

            // Append to DOM
            document.body.appendChild(backdrop);
            document.body.appendChild(modal);

            // Trigger haptic feedback: heavy "thud" on modal open
            if (navigator.vibrate) {
                navigator.vibrate([50]);
            }

            // Elements
            const cancelBtn = modal.querySelector('#modal-cancel');
            const deleteBtn = modal.querySelector('#modal-delete');

            // Cleanup function (Internal UI removal)
            const cleanup = () => {
                backdrop.removeEventListener('click', handleBackdropClick);

                // Fade out animation
                backdrop.style.animation = 'backdropFadeIn 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) reverse forwards';
                modal.style.animation = 'modalSpringPopIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) reverse forwards';

                setTimeout(() => {
                    backdrop.remove();
                    modal.remove();
                }, 300);
            };

            const handleCancel = () => {
                cleanup();
                resolve({ confirmed: false });
            };

            const handleDelete = () => {
                // DO NOT cleanup here. We return the control to the caller.
                resolve({
                    confirmed: true,
                    close: cleanup,
                    deleteBtn: deleteBtn
                });
            };

            // Shake effect if user tries to click backdrop
            const handleBackdropClick = (e) => {
                if (e.target === backdrop) {
                    modal.classList.add('shake');
                    setTimeout(() => modal.classList.remove('shake'), 400);
                }
            };

            // Attach event listeners
            backdrop.addEventListener('click', handleBackdropClick);
            cancelBtn.addEventListener('click', handleCancel);
            deleteBtn.addEventListener('click', handleDelete);

            // Keyboard navigation
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') handleCancel();
            });

            // Focus cancel button initially for safety
            setTimeout(() => cancelBtn.focus(), 100);
        });
    }
}
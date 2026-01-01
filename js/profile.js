/**
 * Profile Screen Manager - App-Centric Bento Edition
 * Re-engineered for high-impact visual hierarchy using Apple's Bento Grid layout.
 * Theme system translated into Male/Female iconography for intuitive personalization.
 */
class Profile {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('profile-content');
    }

    /**
     * Initialize the Profile page
     */
    async init() {
        if (!this.container) return;

        this.renderProfile();
        this.setupEventListeners();
    }

    /**
     * Render the high-fidelity Bento-Style Profile interface
     */
    renderProfile() {
        this.container.innerHTML = `
            <div class="profile-bento-grid">
                
                <!-- BENTO SECTION: THEME MODE (Large Square) -->
                <div class="bento-card bento-theme-card">
                    <div class="bento-card-header">
                        <span class="bento-badge">AESTHETIC</span>
                        <h3 class="bento-title">Visual Tone</h3>
                    </div>
                    
                    <div class="bento-theme-selector" id="theme-selector">
                        <button class="theme-option" data-theme="azure" id="theme-male">
                            <div class="theme-icon-container">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 7L12 3L4 7M20 7V17L12 21M20 7L12 11M4 7V17L12 21M4 7L12 11M12 11V21" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <span class="theme-label">Male</span>
                        </button>
                        
                        <button class="theme-option" data-theme="blush" id="theme-female">
                            <div class="theme-icon-container">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 14C14.7614 14 17 11.7614 17 9C17 6.23858 14.7614 4 12 4C9.23858 4 7 6.23858 7 9C7 11.7614 9.23858 14 12 14Z" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12 14V21M9 18H15" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <span class="theme-label">Female</span>
                        </button>
                        
                        <div class="theme-indicator-pill"></div>
                    </div>
                    <p class="bento-footer-text">Azure (Male) or Blush (Female)</p>
                </div>

                <!-- BENTO SECTION: SPONSOR (Wide Horizontal) -->
                <div class="bento-card bento-sponsor-card" id="sponsor-card">
                    <div class="bento-card-header">
                        <span class="bento-badge gold">PREMIUM</span>
                    </div>
                    <div class="bento-sponsor-content">
                        <h3>Harvi Foundation</h3>
                        <p>Support medical education for everyone.</p>
                        <div class="bento-sponsor-placeholder">
                            <span>Sponsor Space</span>
                        </div>
                    </div>
                </div>

                <!-- BENTO SECTION: SHARE (Tall Square) -->
                <div class="bento-card bento-action-card bento-share" id="share-card">
                    <div class="bento-action-icon">🚀</div>
                    <h3 class="bento-title">Share Harvi</h3>
                    <p class="bento-footer-text">Invite your colleagues</p>
                    <div class="bento-arrow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <path d="M7 17L17 7M17 7H7M17 7V17" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>

                <!-- BENTO SECTION: MAINTENANCE (Small Square) -->
                <div class="bento-card bento-danger-card" id="clear-data-btn">
                    <div class="bento-action-icon danger">🗑️</div>
                    <h3 class="bento-title">Reset</h3>
                    <p class="bento-footer-text">System purge</p>
                </div>

                <!-- BENTO SECTION: VERSION (Small Square) -->
                <div class="bento-card bento-info-card">
                    <div class="bento-action-icon info">✨</div>
                    <h3 class="bento-title">v2.5.0</h3>
                    <p class="bento-footer-text">Gold Build</p>
                </div>

            </div>

            <div class="profile-legal-footer">
                <div class="footer-links">
                    <span>Privacy</span>
                    <span>Terms</span>
                    <span>Credits</span>
                </div>
                <p>Made for Excellence • Harvi Medicine</p>
            </div>
        `;

        this.updateToggleStates();
    }

    /**
     * Synchronize UI toggles with current application state
     */
    updateToggleStates() {
        const isPink = document.body.classList.contains('girl-mode');
        const themeSelector = document.getElementById('theme-selector');
        if (!themeSelector) return;

        const maleBtn = themeSelector.querySelector('[data-theme="azure"]');
        const femaleBtn = themeSelector.querySelector('[data-theme="blush"]');
        const pill = themeSelector.querySelector('.theme-indicator-pill');

        if (isPink) {
            femaleBtn.classList.add('active');
            maleBtn.classList.remove('active');
            pill.style.transform = 'translateX(100%)';
        } else {
            maleBtn.classList.add('active');
            femaleBtn.classList.remove('active');
            pill.style.transform = 'translateX(0)';
        }
    }

    /**
     * Attach premium event handlers with haptic feedback
     */
    setupEventListeners() {
        const themeSelector = document.getElementById('theme-selector');
        const clearDataBtn = document.getElementById('clear-data-btn');
        const shareCard = document.getElementById('share-card');

        if (themeSelector) {
            themeSelector.addEventListener('click', (e) => {
                const option = e.target.closest('.theme-option');
                if (!option) return;

                const isPinkNow = document.body.classList.contains('girl-mode');
                const wantPink = option.dataset.theme === 'blush';

                if (isPinkNow !== wantPink) {
                    if (window.HapticsEngine) window.HapticsEngine.selection();
                    this.app.toggleGirlMode();
                    this.updateToggleStates();
                }
            });
        }

        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                if (window.HapticsEngine) window.HapticsEngine.warning();
                this.confirmClearData();
            });
        }

        if (shareCard) {
            shareCard.addEventListener('click', () => {
                if (window.HapticsEngine) window.HapticsEngine.selection();
                this.shareApp();
            });
        }
    }

    async shareApp() {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Harvi - Medical Learning',
                    text: 'Master medical exams with Harvi!',
                    url: window.location.href
                });
            } catch (e) { }
        } else {
            // Fallback
            navigator.clipboard.writeText(window.location.href);
            if (window.dynamicIsland) {
                window.dynamicIsland.show({
                    title: '✓ Link Copied',
                    subtitle: 'Share it with your colleagues',
                    type: 'success'
                });
            }
        }
    }

    /**
     * Show premium danger modal for data reset
     */
    async confirmClearData() {
        const modalController = await this.showDangerModal();
        if (modalController.confirmed) {
            try {
                if (window.HapticsEngine) window.HapticsEngine.success();
                if (modalController.deleteBtn) {
                    modalController.deleteBtn.classList.add('loading');
                    modalController.deleteBtn.disabled = true;
                }

                await new Promise(r => setTimeout(r, 1000));
                await harviDB.clearAll();
                localStorage.clear();

                modalController.close();

                if (window.dynamicIsland) {
                    window.dynamicIsland.show({
                        title: '✓ System Reset',
                        subtitle: 'All data cleared successfully.',
                        type: 'success'
                    });
                }

                setTimeout(() => window.location.reload(), 1500);
            } catch (error) {
                console.error('[Profile] Reset failed:', error);
            }
        }
    }

    showDangerModal() {
        return new Promise((resolve) => {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            const modal = document.createElement('div');
            modal.className = 'glass-modal bento-danger-modal';
            modal.innerHTML = `
                <div class="glass-modal-header">
                    <div class="danger-icon-bento">⚠️</div>
                    <h2 class="glass-modal-title">Clear All Data?</h2>
                    <p class="glass-modal-description">This action will permanently delete your progress and cache. This cannot be undone.</p>
                </div>
                <div class="glass-modal-actions">
                    <button class="glass-modal-btn glass-modal-btn-delete" id="modal-delete">Purge Data</button>
                    <button class="glass-modal-btn glass-modal-btn-cancel" id="modal-cancel">Cancel</button>
                </div>
            `;
            document.body.appendChild(backdrop);
            document.body.appendChild(modal);
            const cleanup = () => { backdrop.remove(); modal.remove(); };
            modal.querySelector('#modal-cancel').onclick = () => { cleanup(); resolve({ confirmed: false }); };
            modal.querySelector('#modal-delete').onclick = () => { resolve({ confirmed: true, close: cleanup, deleteBtn: modal.querySelector('#modal-delete') }); };
        });
    }
}

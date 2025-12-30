/**
 * Profile Screen Manager - Vision Gallery Edition
 */
class Profile {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('profile-content');
    }

    async init() {
        if (!this.container) return;
        this.renderProfile();
        this.setupEventListeners();
    }

    renderProfile() {
        this.container.innerHTML = `
            <div class="profile-column-left">
                <!-- Mini Branding -->
                <div class="brand-header-mini">
                    <div class="brand-icon-mini">H</div>
                    <div class="brand-meta-mini">
                        <h2>Harvi Platform <span class="pro-badge">Official</span></h2>
                        <p>Medicine. Mastery. Memory.</p>
                    </div>
                </div>

                <!-- Identification Vision Square -->
                <div class="vision-square">
                    <p class="vision-phrase">
                        Harvi is a <span>Smart Medical Assistant</span>, meticulously crafted to transform complex medical knowledge into mastered skills through <span>Offline Excellence</span>.
                    </p>
                </div>
            </div>

            <div class="profile-column-right">
                <!-- Visual Cards Gallery -->
                <div class="action-gallery">
                    <div class="gallery-card card-share" id="share-card">
                        <div class="gallery-card-icon">🚀</div>
                        <h3 class="gallery-card-title">Share Harvi</h3>
                    </div>
                    <div class="gallery-card card-sponsor" id="sponsor-card">
                        <div class="gallery-card-icon">💎</div>
                        <h3 class="gallery-card-title">Sponsorship</h3>
                    </div>
                </div>

                <!-- Settings -->
                <div class="ios-list-group">
                    <div class="theme-selector-group">
                        <div class="row-label">Aesthetic Tone</div>
                        <div class="segmented-control" id="theme-selector">
                            <div class="segment-pill"></div>
                            <div class="segment" data-theme="azure">Azure</div>
                            <div class="segment" data-theme="blush">Blush</div>
                        </div>
                    </div>
                </div>

                <!-- Danger Zone -->
                <button class="reset-button" id="clear-data-btn">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Clear Platform Progress
                </button>
            </div>

            <p style="text-align: center; color: #8E8E93; font-size: 13px; margin-top: 40px; font-weight: 500;">
                Version 2.1.0 • Built with ❤️
            </p>
        `;

        this.updateToggleStates();
    }

    updateToggleStates() {
        const isPink = document.body.classList.contains('girl-mode');
        const segments = this.container.querySelectorAll('.segment');

        segments.forEach(seg => {
            const isRosa = seg.dataset.theme === 'blush';
            seg.classList.toggle('active', isRosa === isPink);
        });
    }

    setupEventListeners() {
        const themeSelector = document.getElementById('theme-selector');
        const clearDataBtn = document.getElementById('clear-data-btn');
        const shareCard = document.getElementById('share-card');

        if (themeSelector) {
            themeSelector.addEventListener('click', (e) => {
                const segment = e.target.closest('.segment');
                if (!segment) return;

                const isPink = document.body.classList.contains('girl-mode');
                const targetPink = segment.dataset.theme === 'blush';

                if (isPink !== targetPink) {
                    this.app.toggleGirlMode();
                    setTimeout(() => this.updateToggleStates(), 350);
                }
            });
        }

        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => this.confirmClearData());
        }

        if (shareCard && navigator.share) {
            shareCard.addEventListener('click', () => {
                navigator.share({
                    title: 'Harvi - Medical MCQs',
                    text: 'Master medical exams with Harvi!',
                    url: window.location.href
                }).catch(() => { });
            });
        }
    }

    async confirmClearData() {
        const modalController = await this.showDangerModal();
        if (modalController.confirmed) {
            try {
                if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
                if (modalController.deleteBtn) {
                    modalController.deleteBtn.classList.add('loading');
                    modalController.deleteBtn.disabled = true;
                }
                await new Promise(r => setTimeout(r, 800));
                await harviDB.clearAll();
                modalController.close();
                if (window.dynamicIsland) {
                    window.dynamicIsland.show({
                        title: '✓ Platform Reset',
                        subtitle: 'Local progress cleared.',
                        type: 'success'
                    });
                }
                this.app.resetApp();
            } catch (error) {
                console.error('Failed to clear data:', error);
            }
        }
    }

    showDangerModal() {
        return new Promise((resolve) => {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            const modal = document.createElement('div');
            modal.className = 'glass-modal';
            modal.innerHTML = `
                <div class="glass-modal-header">
                    <div class="glass-modal-icon">⚠️</div>
                    <div>
                        <h2 class="glass-modal-title">Reset Platform?</h2>
                        <p class="glass-modal-description">This will permanently clear your local mastery progress and history. This action cannot be undone.</p>
                    </div>
                </div>
                <div class="glass-modal-actions">
                    <button class="glass-modal-btn glass-modal-btn-delete" id="modal-delete">Reset Everything</button>
                    <button class="glass-modal-btn glass-modal-btn-cancel" id="modal-cancel">Keep My Progress</button>
                </div>
            `;
            document.body.appendChild(backdrop);
            document.body.appendChild(modal);
            const cancelBtn = modal.querySelector('#modal-cancel');
            const deleteBtn = modal.querySelector('#modal-delete');
            const cleanup = () => {
                backdrop.style.animation = 'backdropFadeIn 300ms reverse forwards';
                modal.style.animation = 'modalSpringPopIn 300ms reverse forwards';
                setTimeout(() => { backdrop.remove(); modal.remove(); }, 300);
            };
            cancelBtn.onclick = () => { cleanup(); resolve({ confirmed: false }); };
            deleteBtn.onclick = () => { resolve({ confirmed: true, close: cleanup, deleteBtn }); };
            backdrop.onclick = (e) => { if (e.target === backdrop) { modal.classList.add('shake'); setTimeout(() => modal.classList.remove('shake'), 400); } };
        });
    }
}

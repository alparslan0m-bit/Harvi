/**
 * Profile Manager
 * Manages the app-centric Bento-style Profile page
 * Features: Theme toggle, Share, Install PWA, Clear Data
 */
class Profile {
    constructor(app) {
        this.app = app;
        this.containerId = 'profile-content';
    }

    init() {
        try {
            console.log('👤 Initializing Profile Screen...');
            this.renderBento();
        } catch (err) {
            console.error('✗ Profile initialization failed:', err);
            this.showErrorUI(err);
        }
    }

    renderBento() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.warn(`[Profile] Container #${this.containerId} not found`);
            return;
        }

        // Safety check for app instance
        if (!this.app) {
            console.error('[Profile] App instance is missing');
            container.innerHTML = '<div class="profile-error">Initialization error: App instance missing.</div>';
            return;
        }

        try {
            container.innerHTML = '';
            const grid = document.createElement('div');
            grid.className = 'profile-bento-grid';

            // 1. Theme Toggle Card (Wide)
            const themeLabel = this.app.isGirlMode ? 'Switch to Azure' : 'Switch to Blush';
            const themeSub = this.app.isGirlMode ? 'Currently in Blush theme' : 'Currently in Azure theme';
            const themeIcon = this.app.isGirlMode
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.42 4.58a5 5 0 0 0-7.07 0l-.35.35-.35-.35a5 5 0 0 0-7.07 7.07l.35.35L12 18l6.07-6.07.35-.35a5 5 0 0 0 0-7.07z"/></svg>`;

            const themeCard = this.createCard({
                title: themeLabel,
                subtitle: themeSub,
                icon: themeIcon,
                className: 'wide theme-card',
                onClick: () => {
                    this.app.toggleGirlMode();
                    this.init(); // Re-render to update labels
                    if (window.HapticsEngine) window.HapticsEngine.medium();
                }
            });

            // 2. Sponsor Placeholder (Wide) - Directly below theme
            const sponsorCard = this.createCard({
                title: 'Community Sponsor',
                subtitle: 'Supporting the next generation of medical professionals.',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
                className: 'wide sponsor-card',
                onClick: () => {
                    if (window.dynamicIsland) {
                        window.dynamicIsland.show({
                            title: 'Coming Soon',
                            subtitle: 'Interested in sponsoring? Contact us.',
                            type: 'info'
                        });
                    }
                }
            });
            sponsorCard.insertAdjacentHTML('afterbegin', '<span class="sponsor-badge">Partner</span>');

            // Detect standalone mode (Safari-safe)
            let isApp = false;
            try {
                isApp = window.navigator.standalone === true ||
                    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
            } catch (e) {
                console.warn('[Profile] matchMedia check failed:', e);
            }

            // 3. Install App Card (Small/Parallel)
            const installCard = this.createCard({
                title: isApp ? 'App Installed' : 'Install App',
                subtitle: isApp ? 'Native Experience Active' : 'Add to Home Screen',
                icon: isApp
                    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
                    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
                className: `small-card install-card ${isApp ? 'installed-active' : ''}`,
                onClick: () => this.handleInstall()
            });

            // 4. Share App Card (Small/Parallel)
            const shareCard = this.createCard({
                title: 'Share Harvi',
                subtitle: 'Tell colleagues',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
                className: 'small-card',
                onClick: () => this.handleShare()
            });

            // 5. Clear Data Card (Wide)
            const clearCard = this.createCard({
                title: 'Clear All Data',
                subtitle: 'Resets all progress safely',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
                className: 'wide clear-card',
                onClick: () => this.handleClearData()
            });

            // Append all cards in the specified order
            grid.appendChild(themeCard);
            grid.appendChild(sponsorCard);
            grid.appendChild(installCard);
            grid.appendChild(shareCard);
            grid.appendChild(clearCard);

            container.appendChild(grid);

            // Apply staggering animation
            if (window.motionCoordinator) {
                const items = grid.querySelectorAll('.bento-card');
                window.motionCoordinator.staggerElements(items, 'animate-bento-entry');
            } else {
                grid.querySelectorAll('.bento-card').forEach((el, i) => {
                    el.style.animationDelay = `${i * 0.1}s`;
                    el.classList.add('animate-bento-entry');
                });
            }
        } catch (err) {
            console.error('[Profile] Render failed:', err);
            this.showErrorUI(err);
        }
    }

    createCard({ title, subtitle, icon, className = '', onClick }) {
        const card = document.createElement('div');
        card.className = `bento-card ${className}`;

        card.innerHTML = `
            <div class="card-icon">${icon}</div>
            <div class="card-text">
                <h3 class="card-title">${title}</h3>
                <p class="card-subtitle">${subtitle}</p>
            </div>
        `;

        card.addEventListener('click', () => {
            if (window.HapticsEngine) window.HapticsEngine.selection();
            onClick();
        });

        return card;
    }

    async handleShare() {
        const shareData = {
            title: 'Harvi - Medical MCQs',
            text: 'Master medical exams with Harvi. High-yield questions at your fingertips!',
            url: window.location.origin
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
                // Fallback: Copy to clipboard (Safari-safe)
                await navigator.clipboard.writeText(window.location.origin);
                if (window.dynamicIsland) {
                    window.dynamicIsland.show({
                        title: 'Link Copied',
                        subtitle: 'Share it with your colleagues!',
                        type: 'success'
                    });
                }
            } else {
                // Ultimate fallback for older browsers
                if (window.dynamicIsland) {
                    window.dynamicIsland.show({
                        title: 'Share Link',
                        subtitle: window.location.origin,
                        type: 'info'
                    });
                }
            }
        } catch (err) {
            console.warn('Share failed:', err);
            // Graceful degradation
            if (window.dynamicIsland) {
                window.dynamicIsland.show({
                    title: 'Share Link',
                    subtitle: window.location.origin,
                    type: 'info'
                });
            }
        }
    }

    async handleInstall() {
        if (window.pwaPrompt) {
            window.pwaPrompt.triggerInstall();
        } else {
            // Fallback for race condition before pwaPrompt init
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                if (window.dynamicIsland) {
                    window.dynamicIsland.show({
                        title: 'Installation',
                        subtitle: 'Tap Share -> Add to Home Screen',
                        type: 'info'
                    });
                }
            } else {
                alert('Installation: Use your browser menu "Add to Home Screen"');
            }
        }
    }

    async handleClearData() {
        const confirmed = await this.showConfirmModal({
            title: 'Clear All Data?',
            description: 'This action is irreversible. All your quiz progress, history, and custom settings will be permanently removed from this device.',
            confirmText: 'Clear Everything',
            cancelText: 'Keep My Data',
            type: 'danger'
        });

        if (!confirmed) return;

        if (window.HapticsEngine) window.HapticsEngine.notification('warning');

        try {
            // 1. Clear LocalStorage
            localStorage.clear();

            // 2. Clear IndexedDB using the NUCLEAR approach
            // First, close any open connections to prevent 'blocked' events
            if (window.harviDB) {
                window.harviDB.close();
            }

            // Wait a tick for connection to close
            await new Promise(r => setTimeout(r, 100));

            const delRequest = indexedDB.deleteDatabase('HarviDB');

            delRequest.onsuccess = () => {
                console.log('✓ Database deleted successfully');
                window.location.reload();
            };

            delRequest.onerror = (e) => {
                console.error('✗ Failed to delete database:', e);
                // Even if it failed, we reload to try and clear state
                window.location.reload();
            };

            delRequest.onblocked = () => {
                console.warn('! Database deletion blocked. Forcing reload.');
                // If blocked, a reload usually frees the lock for the next user attempt
                window.location.reload();
            };

        } catch (e) {
            console.error('Error clearing data:', e);
            window.location.reload();
        }
    }

    showConfirmModal({ title, description, confirmText, cancelText, type = 'info' }) {
        return new Promise((resolve) => {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';

            const modal = document.createElement('div');
            modal.className = 'glass-modal';

            const iconColor = type === 'danger' ? '#FF3B30' : 'var(--primary-color)';
            const icon = type === 'danger' ? '⚠️' : 'ℹ️';

            modal.innerHTML = `
                <div class="glass-modal-header">
                    <div class="glass-modal-icon" style="background: ${iconColor}1a; color: ${iconColor}">
                        ${icon}
                    </div>
                    <h2 class="glass-modal-title">${title}</h2>
                </div>
                <p class="glass-modal-description">${description}</p>
                <div class="glass-modal-actions">
                    <button class="glass-modal-btn glass-modal-btn-delete" id="modal-confirm-btn">${confirmText}</button>
                    <button class="glass-modal-btn glass-modal-btn-cancel" id="modal-cancel-btn">${cancelText}</button>
                </div>
            `;

            document.body.appendChild(backdrop);
            document.body.appendChild(modal);

            const cleanup = (result) => {
                modal.style.animation = 'modalSpringPopIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) reverse forwards';
                backdrop.style.opacity = '0';
                backdrop.style.transition = 'opacity 300ms ease';
                setTimeout(() => {
                    backdrop.remove();
                    modal.remove();
                    resolve(result);
                }, 300);
            };

            modal.querySelector('#modal-confirm-btn').onclick = () => {
                if (window.HapticsEngine) window.HapticsEngine.selection();
                cleanup(true);
            };
            modal.querySelector('#modal-cancel-btn').onclick = () => {
                if (window.HapticsEngine) window.HapticsEngine.selection();
                cleanup(false);
            };
            backdrop.onclick = () => {
                modal.classList.add('shake');
                setTimeout(() => modal.classList.remove('shake'), 400);
            };
        });
    }

    showErrorUI(error) {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
                <div style="font-size: 40px; margin-bottom: 20px;">⚠️</div>
                <h3 style="margin-bottom: 10px;">Unable to load profile</h3>
                <p style="font-size: 14px; opacity: 0.7;">${error.message || 'Unknown error occurred'}</p>
                <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; border-radius: 12px; border: none; background: var(--primary-color); color: white; cursor: pointer;">Retry Reload</button>
            </div>
        `;
    }
}

window.Profile = Profile;

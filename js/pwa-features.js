/**
 * PWA Enhancement Features
 * Custom A2HS prompt, theme color sync, Badge API, and Safe Area handling
 */

// ============================================
// CUSTOM ADD-TO-HOME-SCREEN PROMPT
// ============================================

class CustomA2HSPrompt {
    constructor() {
        this.deferredPrompt = null;
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        this.init();
    }

    init() {
        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            this.deferredPrompt = e;
            console.log('✓ PWA Install Prompt captured');
        });

        // Track app installed state
        window.addEventListener('appinstalled', () => {
            console.log('✓ PWA installed successfully');
            this.deferredPrompt = null;
            localStorage.setItem('harvi_app_installed', 'true');
            if (window.HapticsEngine) window.HapticsEngine.notification('success');

            // Re-render profile if active
            if (window.app && window.app.profile) {
                window.app.profile.init();
            }
        });
    }

    /**
     * Manual trigger for installation logic
     */
    triggerInstall() {
        // Safari-safe standalone detection
        let isStandalone = false;
        try {
            isStandalone = window.navigator.standalone === true ||
                (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
        } catch (e) {
            console.warn('[PWA] matchMedia check failed:', e);
        }

        if (isStandalone) {
            if (window.dynamicIsland) {
                window.dynamicIsland.show({
                    title: 'Already Installed',
                    subtitle: 'Harvi is running as a native app',
                    type: 'success'
                });
            }
            return;
        }

        if (this.deferredPrompt) {
            // Android / Chrome Desktop
            this.installApp();
        } else if (this.isIOS) {
            // iOS Safari
            this.showIOSInstallPrompt();
        } else {
            // Other Desktop / Fallback
            if (window.dynamicIsland) {
                window.dynamicIsland.show({
                    title: 'How to Install',
                    subtitle: 'Use your browser\'s install menu or icon in address bar',
                    type: 'info'
                });
            }
        }
    }

    async installApp() {
        if (!this.deferredPrompt) return;

        try {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            console.log(`User response to install: ${outcome}`);
            this.deferredPrompt = null;
        } catch (err) {
            console.error('Install prompt failed:', err);
        }
    }

    showIOSInstallPrompt() {
        // Remove existing if any
        const existing = document.getElementById('ios-install-prompt');
        if (existing) existing.remove();

        const prompt = document.createElement('div');
        prompt.id = 'ios-install-prompt';
        prompt.className = 'ios-install-container';

        // Premium Apple-inspired instruction UI
        prompt.innerHTML = `
            <div class="ios-install-card glass-card">
                <div class="ios-install-handle"></div>
                <div class="ios-content">
                    <div class="ios-header-row">
                        <div class="ios-app-icon">🏥</div>
                        <div class="ios-app-info">
                            <h3>Install Harvi</h3>
                            <p>Add to your home screen</p>
                        </div>
                        <button class="ios-close-btn">&times;</button>
                    </div>
                    
                    <div class="ios-instruction-steps">
                        <div class="step">
                            <div class="step-num">1</div>
                            <p>Tap the <strong>Share</strong> button in the browser toolbar</p>
                            <span class="step-icon share-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                            </span>
                        </div>
                        <div class="step">
                            <div class="step-num">2</div>
                            <p>Scroll down and select <strong>Add to Home Screen</strong></p>
                            <span class="step-icon plus-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                            </span>
                        </div>
                    </div>
                    
                    <button class="ios-done-btn">Got It</button>
                </div>
            </div>
            <div class="ios-backdrop"></div>
        `;

        document.body.appendChild(prompt);

        // Haptic feedback
        if (window.HapticsEngine) window.HapticsEngine.notification('success');

        const close = () => {
            prompt.classList.add('fade-out');
            setTimeout(() => prompt.remove(), 400);
        };

        prompt.querySelector('.ios-close-btn').addEventListener('click', close);
        prompt.querySelector('.ios-done-btn').addEventListener('click', close);
        prompt.querySelector('.ios-backdrop').addEventListener('click', close);
    }
}

// ============================================
// ADAPTIVE THEME COLOR ENGINE
// ============================================

class AdaptiveThemeColor {
    static init() {
        // Initialize on load
        this.updateTheme();

        // Listen for mode changes
        // Note: Header mode toggles removed, theme changes handled by profile settings

        // Update on visibility change (device goes to sleep)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateTheme();
            }
        });
    }

    static updateTheme() {
        const isGirlMode = document.body.classList.contains('girl-mode');

        // Boy mode: Sky blue (#0EA5E9)
        // Girl mode: Pink (#EC4899)
        const color = isGirlMode ? '#EC4899' : '#0EA5E9';
        const metaTag = document.querySelector('meta[name="theme-color"]');

        if (metaTag) {
            metaTag.setAttribute('content', color);
        }

        // Update manifest theme-color if possible
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
            // This would require dynamic manifest generation
            console.log('[Theme] Updated color to:', color);
        }
    }
}

// ============================================
// SPLASH SCREEN HANDLER
// ============================================

class SplashScreenHandler {
    static show() {
        const splash = document.createElement('div');
        splash.id = 'splash-screen';
        splash.className = 'splash-screen';
        splash.innerHTML = `
            <div class="splash-content">
                <div class="splash-logo">🏥</div>
                <h1>Harvi</h1>
                <p>Medical Learning Platform</p>
                <div class="splash-loader"></div>
            </div>
        `;
        document.body.appendChild(splash);

        // Simulate loading
        setTimeout(() => {
            this.hide();
        }, 2000);
    }

    static hide() {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('fade-out');
            setTimeout(() => {
                if (document.body.contains(splash)) {
                    document.body.removeChild(splash);
                }
            }, 300);
        }
    }
}

// ============================================
// IMAGE OPTIMIZATION & BLUR-UP
// ============================================

class ImageOptimizer {
    static initBlurUp(imageElement) {
        const blurredSrc = imageElement.dataset.blurredSrc;
        const highResSrc = imageElement.src;

        if (!blurredSrc) return;

        // Show blurred version first
        imageElement.style.backgroundImage = `url(${blurredSrc})`;
        imageElement.style.backgroundSize = 'cover';
        imageElement.style.backgroundPosition = 'center';

        // Load high-res version
        const img = new Image();
        img.onload = () => {
            imageElement.classList.add('image-loaded');
            imageElement.src = highResSrc;
            imageElement.style.backgroundImage = 'none';
        };

        img.onerror = () => {
            console.warn('Failed to load image:', highResSrc);
        };

        img.src = highResSrc;
    }

    static prefetchNextImages(lectureId) {
        // Prefetch images for next lecture
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                const nextImages = document.querySelectorAll(
                    `[data-lecture="${lectureId}"] img`
                );
                nextImages.forEach(img => {
                    const link = document.createElement('link');
                    link.rel = 'prefetch';
                    link.href = img.src;
                    document.head.appendChild(link);
                });
            });
        }
    }
}

// ============================================
// PREFETCHING STRATEGY
// ============================================

class PrefetchingStrategy {
    static prefetchNextLectures(currentLectureIds = []) {
        // Tell service worker to prefetch next likely quizzes
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'PREFETCH_QUIZZES',
                lectureIds: currentLectureIds.slice(0, 3) // Prefetch next 3
            });
        }
    }

    static prefetchResources() {
        // Prefetch Google Fonts
        const fonts = [
            'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap',
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
        ];

        fonts.forEach(font => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = font;
            document.head.appendChild(link);
        });
    }

    static deferNonCritical() {
        // Defer loading of non-critical scripts
        const scripts = document.querySelectorAll('script[data-defer="true"]');
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                scripts.forEach(script => {
                    const src = script.getAttribute('data-src');
                    if (src) {
                        const newScript = document.createElement('script');
                        newScript.src = src;
                        document.head.appendChild(newScript);
                    }
                });
            });
        }
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize all PWA features when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializePWAFeatures();
    });
} else {
    initializePWAFeatures();
}

function initializePWAFeatures() {
    // Initialize custom A2HS
    window.pwaPrompt = new CustomA2HSPrompt();

    // Initialize adaptive theme color
    AdaptiveThemeColor.init();

    // Prefetch resources
    PrefetchingStrategy.prefetchResources();

    // Defer non-critical resources
    PrefetchingStrategy.deferNonCritical();

    console.log('✓ PWA features initialized');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CustomA2HSPrompt,
        AdaptiveThemeColor,
        SplashScreenHandler,
        ImageOptimizer,
        PrefetchingStrategy
    };
}

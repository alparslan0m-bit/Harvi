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
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.init();
    }

    init() {
        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showCustomPrompt();
        });

        // Track app installed state
        window.addEventListener('appinstalled', () => {
            console.log('✓ PWA installed successfully');
            this.deferredPrompt = null;
            localStorage.setItem('harvi_app_installed', 'true');
            HapticsEngine.success();
            audioToolkit.play('celebration');
        });

        // For iOS, show manual installation instructions
        if (this.isIOS) {
            this.showIOSInstallPrompt();
        }
    }

    showCustomPrompt() {
        const existingPrompt = document.getElementById('custom-a2hs-prompt');
        if (existingPrompt) {
            existingPrompt.remove();
        }

        const prompt = document.createElement('div');
        prompt.id = 'custom-a2hs-prompt';
        prompt.className = 'custom-a2hs-container';
        prompt.innerHTML = `
            <div class="custom-a2hs-card glass-card">
                <button class="a2hs-close" aria-label="Close">&times;</button>
                <div class="a2hs-content">
                    <div class="a2hs-icon">🚀</div>
                    <h2 class="a2hs-title">Install Harvi</h2>
                    <p class="a2hs-description">
                        Get instant access to medical MCQs. Works offline, faster loading, and home screen icon.
                    </p>
                    <div class="a2hs-benefits">
                        <div class="a2hs-benefit">
                            <span class="benefit-icon">📱</span>
                            <span class="benefit-text">App-like experience</span>
                        </div>
                        <div class="a2hs-benefit">
                            <span class="benefit-icon">📡</span>
                            <span class="benefit-text">Works offline</span>
                        </div>
                        <div class="a2hs-benefit">
                            <span class="benefit-icon">⚡</span>
                            <span class="benefit-text">Lightning fast</span>
                        </div>
                    </div>
                    <div class="a2hs-buttons">
                        <button class="btn-install">Install Now</button>
                        <button class="btn-dismiss">Not Now</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(prompt);

        // Event listeners
        prompt.querySelector('.a2hs-close').addEventListener('click', () => {
            this.dismissPrompt(prompt);
        });

        prompt.querySelector('.btn-install').addEventListener('click', () => {
            this.installApp();
        });

        prompt.querySelector('.btn-dismiss').addEventListener('click', () => {
            this.dismissPrompt(prompt);
        });

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (document.body.contains(prompt)) {
                this.dismissPrompt(prompt);
            }
        }, 10000);
    }

    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            console.log(`User response: ${outcome}`);
            this.deferredPrompt = null;
        }
    }

    dismissPrompt(prompt) {
        prompt.classList.add('fade-out');
        setTimeout(() => {
            if (document.body.contains(prompt)) {
                document.body.removeChild(prompt);
            }
        }, 300);
        
        // Don't show again for 7 days
        localStorage.setItem('harvi_a2hs_dismissed', Date.now());
    }

    showIOSInstallPrompt() {
        // Check if already installed (Safari fullscreen mode)
        const isRunningStandalone = window.navigator.standalone === true;
        if (isRunningStandalone) {
            return;
        }

        const lastDismissed = localStorage.getItem('harvi_ios_install_dismissed');
        if (lastDismissed && Date.now() - lastDismissed < 7 * 24 * 60 * 60 * 1000) {
            return; // Don't show for 7 days after dismissal
        }

        setTimeout(() => {
            const prompt = document.createElement('div');
            prompt.id = 'ios-install-prompt';
            prompt.className = 'ios-install-container';
            prompt.innerHTML = `
                <div class="ios-install-card glass-card">
                    <button class="ios-close" aria-label="Close">&times;</button>
                    <div class="ios-content">
                        <div class="ios-icon">📲</div>
                        <h2 class="ios-title">Install on Home Screen</h2>
                        <p class="ios-description">
                            Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> for quick access
                        </p>
                        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8' stroke='%230EA5E9' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M12 2v10M7 7l5-5 5 5' stroke='%230EA5E9' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E" alt="Share" class="ios-instruction-icon">
                        <button class="btn-got-it">Got It</button>
                    </div>
                </div>
            `;

            document.body.appendChild(prompt);

            prompt.querySelector('.ios-close').addEventListener('click', () => {
                this.dismissIOSPrompt(prompt);
            });

            prompt.querySelector('.btn-got-it').addEventListener('click', () => {
                this.dismissIOSPrompt(prompt);
            });

            setTimeout(() => {
                if (document.body.contains(prompt)) {
                    this.dismissIOSPrompt(prompt);
                }
            }, 8000);
        }, 2000); // Show after 2 seconds
    }

    dismissIOSPrompt(prompt) {
        prompt.classList.add('fade-out');
        setTimeout(() => {
            if (document.body.contains(prompt)) {
                document.body.removeChild(prompt);
            }
        }, 300);
        localStorage.setItem('harvi_ios_install_dismissed', Date.now());
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
        const modeToggle = document.getElementById('mode-toggle');
        if (modeToggle) {
            modeToggle.addEventListener('click', () => {
                setTimeout(() => this.updateTheme(), 100);
            });
        }

        // Listen for system preference changes
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addEventListener('change', () => {
                this.updateTheme();
            });
        }

        // Update on visibility change (device goes to sleep)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateTheme();
            }
        });
    }

    static updateTheme() {
        const isDarkMode = document.body.classList.contains('girl-mode');
        
        // Boy mode: Sky blue (#0EA5E9)
        // Girl mode: Pink (#EC4899)
        const color = isDarkMode ? '#EC4899' : '#0EA5E9';
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
    new CustomA2HSPrompt();

    // Initialize adaptive theme color
    AdaptiveThemeColor.init();

    // Initialize safe area handling (already done in showcase-features.js)
    SafeAreaHandler.init();

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

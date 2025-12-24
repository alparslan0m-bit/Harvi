/**
 * Showcase-Level Enhancement Features
 * Gesture Recognition, Audio Feedback, and Advanced UI Patterns
 * Note: HapticsEngine is defined in haptics-engine.js
 */

// ============================================
// AUDIO FEEDBACK SYSTEM (Web Audio API)
// ============================================

class AudioToolkit {
    constructor() {
        this.audioContext = null;
        this.isEnabled = true;
        this.sounds = {};
        this.loadingTime = null;
        this.init();
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await this.generateSounds();
            this.startTime = Date.now();
        } catch (e) {
            console.warn('Audio context initialization failed:', e);
            this.isEnabled = false;
        }
    }

    async generateSounds() {
        // Pop sound for selection (200ms)
        this.sounds.pop = this.createPopSound();

        // Ding sound for correct answer
        this.sounds.ding = this.createDingSound();

        // Thud sound for incorrect answer
        this.sounds.thud = this.createThudSound();

        // Celebration sound
        this.sounds.celebration = this.createCelebrationSound();

        // Pull-to-refresh sound
        this.sounds.refresh = this.createRefreshSound();
    }

    createPopSound() {
        const duration = 0.1;
        
        return () => {
            const now = this.audioContext.currentTime;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + duration);
            
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(now);
            osc.stop(now + duration);
        };
    }

    createDingSound() {
        const duration = 0.3;
        
        return () => {
            const now = this.audioContext.currentTime;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.frequency.setValueAtTime(1047, now); // C6 note
            
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(now);
            osc.stop(now + duration);
        };
    }

    createThudSound() {
        const duration = 0.2;
        
        return () => {
            const now = this.audioContext.currentTime;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + duration);
            
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(now);
            osc.stop(now + duration);
        };
    }

    createCelebrationSound() {
        return () => {
            const now = this.audioContext.currentTime;
            // Play ascending notes
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
            notes.forEach((freq, idx) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.2, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.2);
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.2);
            });
        };
    }

    createRefreshSound() {
        const duration = 0.15;
        
        return () => {
            const now = this.audioContext.currentTime;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + duration);
            
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(now);
            osc.stop(now + duration);
        };
    }

    play(soundName) {
        if (!this.isEnabled || !this.sounds[soundName]) return;
        try {
            this.sounds[soundName]();
        } catch (e) {
            console.warn(`Failed to play ${soundName}:`, e);
        }
    }

    toggle() {
        this.isEnabled = !this.isEnabled;
        localStorage.setItem('audioEnabled', this.isEnabled);
        return this.isEnabled;
    }

    loadEnabled() {
        this.isEnabled = localStorage.getItem('audioEnabled') !== 'false';
    }
}

// Initialize audio toolkit
const audioToolkit = new AudioToolkit();
audioToolkit.loadEnabled();

// ============================================
// GESTURE RECOGNITION & SWIPE HANDLING
// ============================================

class GestureHandler {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 50;
        this.maxSwipeDistance = 150;
        this.init();
    }

    init() {
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), false);
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), false);
    }

    handleTouchStart(e) {
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
    }

    handleTouchEnd(e) {
        this.touchEndX = e.changedTouches[0].screenX;
        this.touchEndY = e.changedTouches[0].screenY;
        this.handleSwipe();
    }

    handleSwipe() {
        const diffX = this.touchStartX - this.touchEndX;
        const diffY = this.touchStartY - this.touchEndY;

        // Check if it's a horizontal swipe (not vertical)
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Swipe from left edge to right = go back
            if (diffX < -this.minSwipeDistance && this.touchStartX < 50) {
                this.onSwipeBack();
            }
        }
    }

    onSwipeBack() {
        const backBtn = document.querySelector('.back-btn');
        if (backBtn && document.getElementById('quiz-screen')?.classList.contains('active')) {
            backBtn.click();
        }
    }
}

// Initialize gesture handler
const gestureHandler = new GestureHandler();

// ============================================
// PULL-TO-REFRESH IMPLEMENTATION
// ============================================

class PullToRefresh {
    constructor(container, onRefresh = null) {
        this.container = container;
        this.onRefresh = onRefresh; // Callback for actual refresh
        this.pullDistance = 0;
        this.pullThreshold = 100;
        this.isRefreshing = false;
        this.init();
    }

    init() {
        let startY = 0;
        let isPulling = false;

        this.container.addEventListener('touchstart', (e) => {
            if (this.container.scrollTop === 0) {
                startY = e.touches[0].clientY;
            } else {
                startY = 0;
            }
        });

        this.container.addEventListener('touchmove', (e) => {
            if (this.container.scrollTop === 0 && startY > 0) {
                const currentY = e.touches[0].clientY;
                this.pullDistance = currentY - startY;
                
                // Only prevent default if we're actually pulling downward
                if (this.pullDistance > 10) {
                    isPulling = true;
                    e.preventDefault();
                    this.updatePullIndicator(this.pullDistance);
                }
            }
        });

        this.container.addEventListener('touchend', () => {
            if (this.pullDistance >= this.pullThreshold) {
                this.triggerRefresh();
            }
            this.resetPull();
            startY = 0;
            isPulling = false;
        });
    }

    updatePullIndicator(distance) {
        const indicator = document.getElementById('pull-refresh-indicator');
        if (indicator) {
            const opacity = Math.min(distance / this.pullThreshold, 1);
            const rotation = Math.min((distance / this.pullThreshold) * 360, 360);
            
            indicator.style.opacity = opacity;
            indicator.style.transform = `rotate(${rotation}deg) translateY(${distance * 0.5}px)`;
        }
    }

    resetPull() {
        this.pullDistance = 0;
        const indicator = document.getElementById('pull-refresh-indicator');
        if (indicator) {
            indicator.style.opacity = '0';
            indicator.style.transform = 'rotate(0deg) translateY(0)';
        }
    }

    async triggerRefresh() {
        if (this.isRefreshing) return;
        this.isRefreshing = true;

        audioToolkit.play('refresh');
        HapticsEngine.pulse();

        try {
            // Execute callback if provided
            if (this.onRefresh && typeof this.onRefresh === 'function') {
                await this.onRefresh();
            } else if (window.app && window.app.navigation) {
                // Default: refresh lecture list
                await window.app.navigation.showYears();
            } else {
                // Fallback: just wait
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.warn('Refresh failed:', error);
        }

        this.isRefreshing = false;
        HapticsEngine.success();
        this.resetPull();
    }
}

// ============================================
// OPTIMISTIC UI UPDATES
// ============================================

class OptimisticUI {
    static updateOptionSelection(element) {
        // Instant visual feedback before processing
        element.style.transform = 'scale(0.95)';
        element.style.opacity = '0.7';
        
        audioToolkit.play('pop');
        HapticsEngine.selection();

        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.opacity = '1';
        }, 100);
    }

    static showLoadingState(element) {
        element.classList.add('loading-state');
        element.style.opacity = '0.6';
        element.style.pointerEvents = 'none';
    }

    static hideLoadingState(element) {
        element.classList.remove('loading-state');
        element.style.opacity = '1';
        element.style.pointerEvents = 'auto';
    }
}

// ============================================
// SPRING PHYSICS ANIMATIONS
// ============================================

class SpringPhysics {
    static animate(element, from, to, options = {}) {
        const {
            damping = 0.6,
            stiffness = 0.08,
            duration = 500
        } = options;

        let current = from;
        let velocity = 0;
        let force = 0;
        const startTime = Date.now();

        const update = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > duration) {
                current = to;
                element.style.transform = `scale(${current})`;
                return;
            }

            force = (to - current) * stiffness;
            velocity += force;
            velocity *= damping;
            current += velocity;

            element.style.transform = `scale(${current})`;
            requestAnimationFrame(update);
        };

        update();
    }

    static bounce(element) {
        this.animate(element, 1, 1.1, { damping: 0.5, stiffness: 0.15, duration: 300 });
        setTimeout(() => {
            this.animate(element, 1.1, 1, { damping: 0.5, stiffness: 0.15, duration: 200 });
        }, 150);
    }
}

// ============================================
// POSITIONAL CONFETTI (Confetti 2.0)
// ============================================

class ConfettiEngine {
    static burstFromElement(element) {
        const rect = element.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        confetti({
            particleCount: 30,
            spread: 70,
            origin: { x, y },
            colors: ['#4ADE80', '#34D399', '#6366F1'],
            startVelocity: 25,
            gravity: 1.2,
            ticks: 200,
            scalar: 1
        });
    }

    static celebrationBurst() {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366F1', '#8B5CF6', '#4ADE80', '#34D399'],
            startVelocity: 30,
            gravity: 1.2,
            ticks: 200
        });
    }
}

// ============================================
// SKELETON LOADER FACTORY
// ============================================

class SkeletonLoader {
    static createCardSkeleton() {
        const skeleton = document.createElement('div');
        skeleton.className = 'glass-card skeleton-card';
        skeleton.innerHTML = `
            <div class="skeleton skeleton-card-title"></div>
            <div class="skeleton skeleton-card-option"></div>
            <div class="skeleton skeleton-card-option"></div>
            <div class="skeleton skeleton-card-option"></div>
            <div class="skeleton skeleton-card-option"></div>
            <div class="skeleton skeleton-card-button"></div>
        `;
        return skeleton;
    }

    static createGridSkeleton(count = 4) {
        const container = document.createElement('div');
        container.className = 'cards-grid';
        
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'card skeleton';
            skeleton.style.height = '100px';
            skeleton.style.borderRadius = '16px';
            container.appendChild(skeleton);
        }
        
        return container;
    }

    static renderGrid(container, options = {}) {
        const {
            columns = 2,
            rows = 3,
            cardHeight = '120px'
        } = options;

        container.innerHTML = '';
        container.className = 'cards-grid';
        
        const totalCards = columns * rows;
        for (let i = 0; i < totalCards; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'card skeleton';
            skeleton.style.height = cardHeight;
            skeleton.style.borderRadius = '16px';
            skeleton.style.minHeight = '100px';
            container.appendChild(skeleton);
        }
        
        return container;
    }

    static replace(element) {
        element.innerHTML = '';
        const skeleton = this.createCardSkeleton();
        element.appendChild(skeleton);
    }

    static clear(element) {
        element.innerHTML = '';
    }
}

// ============================================
// THEME COLOR SYNC (Dynamic A2HS)
// ============================================

class ThemeSyncEngine {
    static updateThemeColor(color) {
        const metaTag = document.querySelector('meta[name="theme-color"]');
        if (metaTag) {
            metaTag.setAttribute('content', color);
        }
    }

    static syncToMode(isDarkMode) {
        // Boy mode: Sky blue (#0EA5E9)
        // Girl mode: Pink (#EC4899)
        const color = isDarkMode ? '#EC4899' : '#0EA5E9';
        this.updateThemeColor(color);
    }
}

// ============================================
// SAFE AREA INSETS HANDLER
// ============================================

class SafeAreaHandler {
    static init() {
        const updateSafeArea = () => {
            document.documentElement.style.setProperty(
                '--safe-area-top',
                `env(safe-area-inset-top, 0px)`
            );
            document.documentElement.style.setProperty(
                '--safe-area-bottom',
                `env(safe-area-inset-bottom, 0px)`
            );
            document.documentElement.style.setProperty(
                '--safe-area-left',
                `env(safe-area-inset-left, 0px)`
            );
            document.documentElement.style.setProperty(
                '--safe-area-right',
                `env(safe-area-inset-right, 0px)`
            );
        };

        updateSafeArea();
        window.addEventListener('orientationchange', updateSafeArea);
    }
}

// Initialize safe area handling
SafeAreaHandler.init();

// ============================================
// BADGE API FOR APP ICON
// ============================================

class BadgeManager {
    static async setIncompleteCount(count) {
        if ('setAppBadge' in navigator) {
            try {
                await navigator.setAppBadge(count);
            } catch (e) {
                console.warn('Badge API not available:', e);
            }
        }
    }

    static async clearBadge() {
        if ('clearAppBadge' in navigator) {
            try {
                await navigator.clearAppBadge();
            } catch (e) {
                console.warn('Badge API not available:', e);
            }
        }
    }

    static updateFromQuizProgress(completedCount, totalCount) {
        const incomplete = totalCount - completedCount;
        if (incomplete > 0) {
            this.setIncompleteCount(incomplete);
        } else {
            this.clearBadge();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AudioToolkit,
        GestureHandler,
        PullToRefresh,
        OptimisticUI,
        SpringPhysics,
        ConfettiEngine,
        SkeletonLoader,
        ThemeSyncEngine,
        SafeAreaHandler,
        BadgeManager
    };
}

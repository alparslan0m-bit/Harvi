/**
 * NATIVE TOUCH ENGINE (Apple-Standard)
 * Fully optimized gesture management, tactile feedback, and interactive intent.
 * Replaces both NativeGestureEngine and TouchHighlightSystem.
 */

class NativeTouchEngine {
    constructor() {
        // Gesture State
        this.touchStart = { x: 0, y: 0, time: 0 };
        this.isBackSwiping = false;
        this.longPressTimer = null;
        this.activeLongPress = false;

        // Config (Apple Interaction Metrics)
        this.config = {
            swipeEdgeThreshold: 30,      // Early edge detection (px)
            backSwipeTriggerDistance: 120, // Distance to trigger back (px)
            longPressDuration: 450,      // Standard iOS long-press (ms)
            touchSlop: 10,               // Movement allowed before canceling long-press (px)
            velocityThreshold: 0.6       // Pixels per ms for flick detection
        };

        this.init();
    }

    init() {
        // Universal Event Listeners (Passive for performance)
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false }); // Needs non-passive for swipe cancellation
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
        document.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { passive: true });

        // Prevent default context menu on elements that handle their own long-press
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('[data-context-menu]')) e.preventDefault();
        });

        console.log('📱 Native Touch Engine Initialized');
    }

    /**
     * CORE EVENT HANDLERS
     */

    handleTouchStart(e) {
        const touch = e.touches[0];
        this.touchStart = { x: touch.clientX, y: touch.clientY, time: Date.now() };
        this.isBackSwiping = false;
        this.activeLongPress = false;

        const target = e.target.closest('button, .list-item, .card-pressable, .quiz-option, [data-context-menu]');

        // 1. Long-press detection
        if (target && target.matches('[data-context-menu]')) {
            this.longPressTimer = setTimeout(() => {
                this.activeLongPress = true;
                this.triggerLongPress(target, touch);
            }, this.config.longPressDuration);
        }

        // 2. Edge back-swipe detection
        // Only trigger if at the left edge and app allows back navigation
        if (touch.clientX < this.config.swipeEdgeThreshold && !this.isInQuiz()) {
            this.isBackSwiping = true;
            this.initBackSwipeVisuals();
        }

        // 3. Tactile Feedback (Coordinated with CSS :active)
        if (target) {
            if (window.HapticsEngine) window.HapticsEngine.selection();
        }
    }

    handleTouchMove(e) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStart.x;
        const deltaY = touch.clientY - this.touchStart.y;

        // Cancel long-press if user moves finger significantly
        if (Math.abs(deltaX) > this.config.touchSlop || Math.abs(deltaY) > this.config.touchSlop) {
            clearTimeout(this.longPressTimer);
        }

        if (this.isBackSwiping) {
            // Prevent browser's default scroll if we're swiping back
            if (e.cancelable) e.preventDefault();
            this.updateBackSwipeVisuals(deltaX);
        }
    }

    handleTouchEnd(e) {
        clearTimeout(this.longPressTimer);
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.touchStart.x;
        const duration = Date.now() - this.touchStart.time;
        const velocity = deltaX / duration;

        if (this.isBackSwiping) {
            this.completeBackSwipe(deltaX, velocity);
        }

        this.isBackSwiping = false;
        this.activeLongPress = false;
    }

    handleTouchCancel() {
        clearTimeout(this.longPressTimer);
        if (this.isBackSwiping) {
            this.completeBackSwipe(0, 0); // Revert
        }
        this.isBackSwiping = false;
    }

    /**
     * BACK-SWIPE SYSTEM
     */

    initBackSwipeVisuals() {
        // Ensure overlay and indicator exist
        let overlay = document.querySelector('.swipe-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'swipe-overlay';
            document.body.appendChild(overlay);
        }

        let indicator = document.querySelector('.back-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'back-indicator';
            indicator.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M15 18L9 12L15 6" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            document.body.appendChild(indicator);
        }

        overlay.classList.add('active');
        indicator.style.opacity = '0';
        indicator.style.left = '-40px';
    }

    updateBackSwipeVisuals(deltaX) {
        const screen = document.querySelector('.screen.active');
        const indicator = document.querySelector('.back-indicator');
        const overlay = document.querySelector('.swipe-overlay');

        if (!screen || deltaX < 0) return;

        // Elastic constraint (Resistance increases as you swipe further)
        const resistance = 0.4;
        const translateX = deltaX * resistance;
        const progress = Math.min(deltaX / this.config.backSwipeTriggerDistance, 1);

        requestAnimationFrame(() => {
            screen.style.transform = `translateX(${translateX}px)`;
            screen.style.borderRadius = `${progress * 24}px`;

            if (indicator) {
                indicator.style.opacity = progress.toString();
                indicator.style.left = `${Math.min((deltaX * 0.5) - 40, 20)}px`;
                indicator.style.transform = `translateY(-50%) scale(${0.8 + (progress * 0.2)})`;
            }

            if (overlay) {
                overlay.style.background = `rgba(0, 0, 0, ${progress * 0.3})`;
            }
        });
    }

    completeBackSwipe(deltaX, velocity) {
        const screen = document.querySelector('.screen.active');
        const indicator = document.querySelector('.back-indicator');
        const overlay = document.querySelector('.swipe-overlay');

        const shouldComplete = deltaX > this.config.backSwipeTriggerDistance || velocity > this.config.velocityThreshold;

        if (shouldComplete && window.app) {
            // Success Haptic
            if (window.HapticsEngine) window.HapticsEngine.swipe();

            // Animate out
            screen.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            screen.style.transform = 'translateX(100%)';
            screen.style.opacity = '0';

            if (indicator) {
                indicator.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
                indicator.style.left = '100vw';
                indicator.style.opacity = '0';
            }

            setTimeout(() => {
                window.app.goBack();
                this.resetSwipeStates(screen, indicator, overlay);
            }, 300);
        } else {
            // Revert
            screen.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            screen.style.transform = 'translateX(0)';
            screen.style.borderRadius = '';

            if (indicator) {
                indicator.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
                indicator.style.left = '-40px';
                indicator.style.opacity = '0';
            }

            if (overlay) overlay.classList.remove('active');

            setTimeout(() => {
                this.resetSwipeStates(screen, indicator, overlay);
            }, 400);
        }
    }

    resetSwipeStates(screen, indicator, overlay) {
        if (screen) {
            screen.style.transition = '';
            screen.style.transform = '';
            screen.style.borderRadius = '';
            screen.style.opacity = '';
        }
        if (indicator) {
            indicator.style.transition = '';
            indicator.style.left = '-40px';
            indicator.style.opacity = '0';
        }
        if (overlay) {
            overlay.classList.remove('active');
            overlay.style.background = '';
        }
    }

    /**
     * CONTEXT MENU SYSTEM
     */

    triggerLongPress(target, touch) {
        if (window.HapticsEngine) window.HapticsEngine.warning(); // "Pop" feel

        let menuData = [];
        try {
            menuData = JSON.parse(target.dataset.contextMenu || '[]');
        } catch (e) { return; }

        if (menuData.length === 0) return;

        this.showContextMenu(menuData, touch);
    }

    showContextMenu(items, touch) {
        const menu = document.createElement('div');
        menu.className = 'context-menu';

        items.forEach(item => {
            const btn = document.createElement('button');
            btn.className = `context-menu-item ${item.destructive ? 'destructive' : ''}`;
            btn.innerHTML = `<span>${item.label}</span>`;
            btn.addEventListener('click', () => {
                if (item.action) {
                    // Execute string-based or direct action
                    if (typeof item.action === 'string' && window[item.action]) {
                        window[item.action]();
                    } else if (typeof item.action === 'function') {
                        item.action();
                    }
                }
                this.closeContextMenu(menu);
            });
            menu.appendChild(btn);
        });

        document.body.appendChild(menu);

        // Position
        const rect = menu.getBoundingClientRect();
        let left = touch.clientX - (rect.width / 2);
        let top = touch.clientY - rect.height - 20;

        // Bounds check
        left = Math.max(10, Math.min(left, window.innerWidth - rect.width - 10));
        top = Math.max(10, top);

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.classList.add('visible');

        // Close on click outside
        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                this.closeContextMenu(menu);
                document.removeEventListener('touchstart', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('touchstart', closeHandler), 10);
    }

    closeContextMenu(menu) {
        menu.classList.remove('visible');
        setTimeout(() => menu.remove(), 200);
        if (window.HapticsEngine) window.HapticsEngine.selection();
    }

    /**
     * UTILS
     */

    isInQuiz() {
        return document.body.classList.contains('quiz-mode-active');
    }
}

// Global initialization
window.nativeTouchEngine = new NativeTouchEngine();

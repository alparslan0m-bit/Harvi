/**
 * NATIVE GESTURE ENGINE
 * Elastic back-swipe, long-press menus, contextual haptics
 * Integrates with Apple Material System
 */

class NativeGestureEngine {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.isBackSwipping = false;
        this.longPressTimer = null;
        this.longPressDuration = 500; // ms
        this.swipeThreshold = 50; // px
        this.init();
    }

    init() {
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), false);
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), false);
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), false);
        document.addEventListener('contextmenu', (e) => e.preventDefault(), false);
    }

    /**
     * ELASTIC BACK-SWIPE GESTURE
     * Swipe from left edge (0-50px) to trigger back navigation with visual feedback
     */
    handleTouchStart(e) {
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();

        // Long-press detection
        this.longPressTimer = setTimeout(() => {
            if (!this.isBackSwipping) {
                this.handleLongPress(e);
            }
        }, this.longPressDuration);

        // Back-swipe edge detection (left 50px)
        if (touch.clientX < 50 && !this.isBackSwipping) {
            this.isBackSwipping = true;
            this.showSwipeOverlay();
        }
    }

    handleTouchMove(e) {
        if (!this.isBackSwipping) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const screen = document.querySelector('.screen.active');

        if (!screen) return;

        // Swipe progress (0 to 1)
        const progress = Math.min(deltaX / 200, 1);

        // Move screen with finger
        screen.style.transform = `translateX(${deltaX}px)`;
        screen.style.opacity = 1 - (progress * 0.3);

        // Scale menu behind (subtle rubber-banding effect)
        const behindScreen = screen.previousElementSibling;
        if (behindScreen) {
            behindScreen.style.transform = `scale(${1 - (progress * 0.05)})`;
        }

        // Update overlay dimming
        const overlay = document.querySelector('.swipe-overlay');
        if (overlay) {
            overlay.style.backgroundColor = `rgba(0, 0, 0, ${progress * 0.4})`;
        }

        // Haptic feedback on progress
        if (navigator.vibrate && progress > 0.3) {
            navigator.vibrate(5);
        }
    }

    handleTouchEnd(e) {
        clearTimeout(this.longPressTimer);

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const duration = Date.now() - this.touchStartTime;
        const velocity = Math.abs(deltaX) / duration;

        const screen = document.querySelector('.screen.active');
        if (!screen) {
            this.isBackSwipping = false;
            return;
        }

        // Swipe completed if moved > 100px or fast velocity
        const shouldComplete = deltaX > 100 || (velocity > 0.5 && deltaX > 20);

        if (shouldComplete && this.isBackSwipping) {
            // Animation to complete swipe
            screen.style.transition = 'all 0.3s cubic-bezier(0.3, 0, 0.2, 1)';
            screen.style.transform = 'translateX(100%)';
            screen.style.opacity = '0';

            setTimeout(() => {
                this.hideSwipeOverlay();
                this.isBackSwipping = false;
                
                // Navigate back in stack instead of always going home
                const breadcrumbs = document.querySelector('.breadcrumb');
                if (breadcrumbs && breadcrumbs.children.length > 1) {
                    // Click the previous breadcrumb item for proper navigation
                    breadcrumbs.children[breadcrumbs.children.length - 2]?.click?.();
                } else if (window.app?.previousScreen) {
                    // Fallback: use tracked previous screen
                    window.app.showScreen(window.app.previousScreen);
                } else {
                    // Last resort: go to quiz list
                    window.app?.showScreen?.('quiz-list');
                }
                
                screen.style.transition = '';
                screen.style.transform = '';
                screen.style.opacity = '';
            }, 300);
        } else {
            // Animation back to origin
            screen.style.transition = 'all 0.3s cubic-bezier(0.3, 0, 0.2, 1)';
            screen.style.transform = 'translateX(0)';
            screen.style.opacity = '1';

            setTimeout(() => {
                this.hideSwipeOverlay();
                this.isBackSwipping = false;
                screen.style.transition = '';
            }, 300);
        }
    }

    /**
     * LONG-PRESS CONTEXT MENU
     * Shows iOS-style context menu on long press
     */
    handleLongPress(event) {
        const target = event.target.closest('[data-context-menu]');
        if (!target) return;

        event.preventDefault();

        // Get menu items from data attribute
        const menuData = JSON.parse(target.dataset.contextMenu || '[]');
        if (menuData.length === 0) return;

        const touch = event.touches?.[0] || { clientX: event.clientX, clientY: event.clientY };

        // Create context menu
        const menu = this.createContextMenu(menuData, touch);
        document.body.appendChild(menu);

        // Position menu near touch point
        const rect = menu.getBoundingClientRect();
        menu.style.left = Math.max(8, Math.min(touch.clientX - rect.width / 2, window.innerWidth - rect.width - 8)) + 'px';
        menu.style.top = Math.max(8, touch.clientY - rect.height - 8) + 'px';

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([10, 20, 10]);
        }

        // Close on outside click
        const closeMenu = () => {
            menu.classList.add('closing');
            setTimeout(() => menu.remove(), 200);
            document.removeEventListener('click', closeMenu);
        };

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    createContextMenu(items, touch) {
        const menu = document.createElement('div');
        menu.className = 'context-menu';

        items.forEach((item, index) => {
            if (item.separator) {
                const sep = document.createElement('div');
                sep.className = 'context-menu-separator';
                menu.appendChild(sep);
            } else {
                const btn = document.createElement('button');
                btn.className = `context-menu-item ${item.destructive ? 'destructive' : ''}`;
                btn.innerHTML = `
                    ${item.icon ? `<span>${item.icon}</span>` : ''}
                    <span>${item.label}</span>
                `;

                btn.addEventListener('click', () => {
                    if (item.action) {
                        item.action();
                    }
                    menu.classList.add('closing');
                    setTimeout(() => menu.remove(), 200);

                    // Haptic feedback on selection
                    if (navigator.vibrate) {
                        navigator.vibrate(20);
                    }
                });

                menu.appendChild(btn);
            }
        });

        return menu;
    }

    /**
     * VISUAL FEEDBACK: Swipe Overlay
     */
    showSwipeOverlay() {
        let overlay = document.querySelector('.swipe-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'swipe-overlay';
            document.body.appendChild(overlay);
        }
        overlay.classList.add('active');
    }

    hideSwipeOverlay() {
        const overlay = document.querySelector('.swipe-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    /**
     * CONTEXTUAL HAPTICS: Selection Tick
     * Subtle haptic when hovering over interactive elements (before tap)
     */
    enableContextualHaptics() {
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('button, [role="button"], .interactive-element');
            if (target && navigator.vibrate) {
                navigator.vibrate(5); // Subtle 5ms tick
            }
        });
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.nativeGestureEngine = new NativeGestureEngine();
    });
} else {
    window.nativeGestureEngine = new NativeGestureEngine();
}

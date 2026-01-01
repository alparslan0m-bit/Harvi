/**
 * NATIVE TOUCH ENGINE (Apple-Standard)
 * Fully optimized gesture management, tactile feedback, and interactive intent.
 * Replaces both NativeGestureEngine and TouchHighlightSystem.
 */

class NativeTouchEngine {
    constructor() {
        // Gesture State
        this.touchStart = { x: 0, y: 0, time: 0 };
        this.longPressTimer = null;
        this.activeLongPress = false;

        // Config (Apple Interaction Metrics)
        this.config = {
            longPressDuration: 450,      // Standard iOS long-press (ms)
            touchSlop: 10,               // Movement allowed before canceling long-press (px)
            velocityThreshold: 0.6       // Pixels per ms for flick detection
        };

        this.init();
    }

    init() {
        // Universal Event Listeners (Passive for performance)
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: true }); // Reverted to passive since no cancellation needed
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

        /* Edge back-swipe detection removed to prevent accidental navigation */

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

        // No-op for move if long-press is canceled
    }

    handleTouchEnd(e) {
        clearTimeout(this.longPressTimer);
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.touchStart.x;
        const duration = Date.now() - this.touchStart.time;
        const velocity = deltaX / duration;

        this.activeLongPress = false;
    }

    handleTouchCancel() {
        clearTimeout(this.longPressTimer);
    }

    /* BACK-SWIPE SYSTEM REMOVED */

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

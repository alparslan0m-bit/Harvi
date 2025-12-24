/**
 * UNIFIED GESTURE COORDINATOR - Phase 3 Refinement
 * 
 * Single unified gesture brain that manages ALL touch interactions
 * Prevents gesture conflicts between NativeGestureEngine and GesturePhysicsEngine
 * 
 * Gesture Priority Logic:
 * - >30° horizontal = Back-swipe (horizontal lock)
 * - Vertical-only = Header elasticity (damped harmonic motion)
 * - Long-press (500ms) = Context menu
 */

class UnifiedGestureCoordinator {
    constructor() {
        this.state = {
            isActive: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            startTime: 0,
            velocity: { x: 0, y: 0 },
            lastTime: 0,
            gestureType: null // 'horizontal', 'vertical', 'longpress', 'none'
        };

        this.config = {
            backSwipeThreshold: 50,           // Trigger if moved 50px right from left edge
            horizontalThreshold: 30,          // Degrees - more than 30° = horizontal
            longPressDuration: 500,           // ms
            elasticityConstant: 500,          // For damped harmonic motion
            maxOverscroll: 150,
            velocityMultiplier: 0.8
        };

        this.isInitialized = false;
        this.longPressTimer = null;
    }

    /**
     * Initialize unified coordinator
     */
    init() {
        if (this.isInitialized) return;

        console.log('[UnifiedGestureCoordinator] Initializing...');

        // Remove old event listeners from conflicting engines
        this.disableConflictingEngines();

        // Add unified listeners (using passive: true where safe)
        document.addEventListener('touchstart', (e) => this.onTouchStart(e), {
            passive: true,
            capture: true
        });

        document.addEventListener('touchmove', (e) => this.onTouchMove(e), {
            passive: true,
            capture: true
        });

        document.addEventListener('touchend', (e) => this.onTouchEnd(e), {
            passive: false,
            capture: true
        });

        // Mouse fallback for desktop
        document.addEventListener('mousedown', (e) => this.onTouchStart(e), {
            passive: true
        });
        document.addEventListener('mousemove', (e) => this.onTouchMove(e), {
            passive: true
        });
        document.addEventListener('mouseup', (e) => this.onTouchEnd(e));

        this.isInitialized = true;
        console.log('[UnifiedGestureCoordinator] Ready (60 FPS unified gestures)');
    }

    /**
     * Disable conflicting gesture engines
     */
    disableConflictingEngines() {
        // Signal to NativeGestureEngine and GesturePhysicsEngine to disable
        if (window.__NativeGestureEngine) {
            window.__NativeGestureEngine._disabledByCoordinator = true;
        }
        if (window.__GesturePhysicsEngine) {
            window.__GesturePhysicsEngine._disabledByCoordinator = true;
        }
    }

    /**
     * Touch start - initialize gesture detection
     */
    onTouchStart(e) {
        if (this.state.isActive) return;

        const touch = e.touches?.[0] || e;

        this.state.isActive = true;
        this.state.startX = touch.clientX;
        this.state.startY = touch.clientY;
        this.state.currentX = touch.clientX;
        this.state.currentY = touch.clientY;
        this.state.startTime = Date.now();
        this.state.lastTime = Date.now();
        this.state.gestureType = null;

        // Start long-press timer
        this.longPressTimer = setTimeout(() => {
            if (this.state.isActive && this.state.gestureType === null) {
                this.onLongPress(e);
            }
        }, this.config.longPressDuration);

        // Haptic feedback on touch
        this.triggerHaptic('touch');
    }

    /**
     * Touch move - determine gesture type and apply appropriate physics
     */
    onTouchMove(e) {
        if (!this.state.isActive) return;

        const touch = e.touches?.[0] || e;
        const deltaX = touch.clientX - this.state.startX;
        const deltaY = touch.clientY - this.state.startY;

        // Calculate velocity
        const timeDelta = Date.now() - this.state.lastTime;
        this.state.velocity.x = (touch.clientX - this.state.currentX) / (timeDelta || 1);
        this.state.velocity.y = (touch.clientY - this.state.currentY) / (timeDelta || 1);

        this.state.currentX = touch.clientX;
        this.state.currentY = touch.clientY;
        this.state.lastTime = Date.now();

        // Determine gesture type (only once)
        if (this.state.gestureType === null) {
            this.detectGestureType(deltaX, deltaY);
        }

        // Apply appropriate handler
        switch (this.state.gestureType) {
            case 'horizontal':
                this.handleBackSwipe(deltaX, deltaY);
                break;
            case 'vertical':
                this.handleVerticalElasticity(deltaY);
                break;
            case 'longpress':
                // Already handled
                break;
        }
    }

    /**
     * Detect gesture type based on angle
     * >30° horizontal = back-swipe
     * Vertical = elasticity
     */
    detectGestureType(deltaX, deltaY) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        const totalDelta = Math.sqrt(absDeltaX ** 2 + absDeltaY ** 2);

        // Need minimum movement to detect
        if (totalDelta < 10) return;

        // Calculate angle
        const angle = Math.atan2(absDeltaY, absDeltaX) * (180 / Math.PI);

        // Horizontal (back-swipe only from left edge)
        if (angle < this.config.horizontalThreshold && this.state.startX < 50) {
            this.state.gestureType = 'horizontal';
            clearTimeout(this.longPressTimer);
        }
        // Vertical (header elasticity)
        else if (angle > 90 - this.config.horizontalThreshold) {
            this.state.gestureType = 'vertical';
            clearTimeout(this.longPressTimer);
        }
    }

    /**
     * Handle back-swipe gesture (horizontal from left edge)
     * Moves the entire screen left/right for native iOS feel
     */
    handleBackSwipe(deltaX, deltaY) {
        const backSwipeProgress = Math.min(deltaX / 100, 1); // 0-1 progress

        // Move entire screen to the right with swipe
        const appElement = document.getElementById('app') || document.querySelector('body > div:first-child');
        if (appElement) {
            appElement.style.transform = `translateX(${deltaX * 0.8}px)`;
            appElement.style.opacity = Math.max(0.7, 1 - deltaX / 200);
        }

        // Show shadow from left (previous screen peeking through)
        this.showBackSwipeShadow(backSwipeProgress);

        if (backSwipeProgress > 0.3) {
            // Show back-swipe overlay
            this.showBackSwipeOverlay(backSwipeProgress);
        }

        // Apply haptic feedback at threshold
        if (backSwipeProgress === 0.3) {
            this.triggerHaptic('boundary');
        }
    }

    /**
     * Handle vertical gesture with damped harmonic motion
     */
    handleVerticalElasticity(deltaY) {
        // Apply damped harmonic motion formula
        // resistance = 1 - 1/(1 + |delta|/500)
        const resistance = this.calculateElasticity(deltaY);
        const effectiveMove = deltaY * resistance;
        const clampedMove = Math.min(
            effectiveMove,
            this.config.maxOverscroll
        );

        // Apply visual transformation
        this.applyElasticTransform(clampedMove);

        // Haptic feedback on boundary crossing
        if (Math.abs(clampedMove) > this.config.maxOverscroll - 20) {
            this.triggerHaptic('boundary');
        }
    }

    /**
     * Damped harmonic motion formula
     */
    calculateElasticity(delta) {
        const absD = Math.abs(delta);
        const resistance = 1 - 1 / (1 + absD / this.config.elasticityConstant);
        return resistance;
    }

    /**
     * Apply elastic transform to target
     */
    applyElasticTransform(distance) {
        const target = document.querySelector('[data-gesture-target]');
        if (!target) return;

        target.style.transform = `translateY(${distance * 0.5}px)`;
        target.style.opacity = Math.max(0.9, 1 - Math.abs(distance) / 500);
    }

    /**
     * Show shadow from left edge (previous screen peeking)
     */
    showBackSwipeShadow(progress) {
        let shadow = document.getElementById('back-swipe-shadow');
        if (!shadow) {
            shadow = document.createElement('div');
            shadow.id = 'back-swipe-shadow';
            shadow.style.cssText = `
                position: fixed;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(to right, rgba(0, 0, 0, 0.3), transparent);
                pointer-events: none;
                transition: none;
                z-index: 998;
            `;
            document.body.appendChild(shadow);
        }

        shadow.style.opacity = progress.toString();
    }

    /**
     * Show back-swipe overlay
     */
    showBackSwipeOverlay(progress) {
        let overlay = document.getElementById('back-swipe-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'back-swipe-overlay';
            overlay.style.cssText = `
                position: fixed;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0);
                pointer-events: none;
                transition: none;
                z-index: 999;
            `;
            document.body.appendChild(overlay);
        }

        overlay.style.backgroundColor = `rgba(0, 0, 0, ${0.3 * progress})`;
    }

    /**
     * Handle long-press gesture
     */
    onLongPress(e) {
        this.state.gestureType = 'longpress';
        console.log('[UnifiedGestureCoordinator] Long-press detected');

        // Trigger context menu if applicable
        const contextTarget = e.target.closest('[data-context-menu]');
        if (contextTarget) {
            this.triggerHaptic('release');
            // Dispatch custom event for context menu
            contextTarget.dispatchEvent(new CustomEvent('longpress'));
        }
    }

    /**
     * Touch end - apply momentum and snap
     */
    onTouchEnd(e) {
        if (!this.state.isActive) return;

        clearTimeout(this.longPressTimer);
        this.state.isActive = false;

        const momentum = this.state.gestureType === 'vertical'
            ? this.state.velocity.y
            : this.state.velocity.x;

        switch (this.state.gestureType) {
            case 'horizontal':
                this.finishBackSwipe(momentum);
                break;
            case 'vertical':
                this.finishVerticalGesture(momentum);
                break;
            case 'longpress':
                // Already handled
                break;
        }

        this.triggerHaptic('release');
        this.state.gestureType = null;
    }

    /**
     * Finish back-swipe with momentum and screen animation
     */
    finishBackSwipe(momentum) {
        const overlay = document.getElementById('back-swipe-overlay');
        const shadow = document.getElementById('back-swipe-shadow');
        const appElement = document.getElementById('app') || document.querySelector('body > div:first-child');

        if (!appElement) return;

        // If momentum + progress > threshold, navigate back
        const currentProgress = Math.abs(parseFloat(appElement.style.transform.match(/-?\d+/) || 0) || 0) / 100;

        if (currentProgress > 0.5 || momentum > 0.5) {
            // Animate screen out to the right, then navigate
            this.animateScreenOut(appElement, overlay, shadow);
        } else {
            // Snap back
            this.animateScreenReset(appElement, overlay, shadow);
        }
    }

    /**
     * Animate screen out (back-swipe successful)
     */
    animateScreenOut(appElement, overlay, shadow) {
        const startTime = Date.now();
        const duration = 300;
        const startPosition = parseFloat(appElement.style.transform.match(/-?\d+/) || 0) || 0;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = progress; // Linear for swipe-out

            const newPosition = startPosition + (window.innerWidth * 0.8 * (1 - progress));
            const opacity = Math.max(0, 1 - progress);

            appElement.style.transform = `translateX(${newPosition}px)`;
            appElement.style.opacity = opacity;

            if (overlay) overlay.style.opacity = (progress * 0.5).toString();
            if (shadow) shadow.style.opacity = (progress * 0.3).toString();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Navigate back after animation completes
                this.triggerHaptic('success');
                // Use app's internal back navigation instead of History API
                if (window.app && typeof window.app.goBack === 'function') {
                    window.app.goBack();
                } else {
                    window.history.back();
                }
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Snap screen back to original position
     */
    animateScreenReset(appElement, overlay, shadow) {
        const startTime = Date.now();
        const duration = 300;
        const startPosition = parseFloat(appElement.style.transform.match(/-?\d+/) || 0) || 0;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

            const newPosition = startPosition * (1 - eased);
            const opacity = 1 - (startPosition / 400) * (1 - eased);

            appElement.style.transform = `translateX(${newPosition}px)`;
            appElement.style.opacity = opacity;

            if (overlay) overlay.style.opacity = (Math.max(0, 1 - eased * 2)).toString();
            if (shadow) shadow.style.opacity = (Math.max(0, 1 - eased * 3)).toString();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                appElement.style.transform = 'translateX(0)';
                appElement.style.opacity = '1';
                if (overlay) overlay.style.opacity = '0';
                if (shadow) shadow.style.opacity = '0';
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Finish vertical gesture with snap
     */
    finishVerticalGesture(momentum) {
        const target = document.querySelector('[data-gesture-target]');
        if (!target) return;

        const boundaries = [120, 56]; // header expanded/collapsed
        let nearest = boundaries[0];
        let minDist = Infinity;

        boundaries.forEach(b => {
            const dist = Math.abs(0 - b);
            if (dist < minDist) {
                minDist = dist;
                nearest = b;
            }
        });

        this.snapToPosition(target, nearest, momentum);
    }

    /**
     * Snap to nearest boundary with momentum
     */
    snapToPosition(element, targetPosition, initialVelocity) {
        const startTime = Date.now();
        const duration = 400;
        const startPosition = 0;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            const newPosition = startPosition +
                (targetPosition - startPosition) * eased +
                initialVelocity * elapsed * (1 - progress);

            element.style.transform = `translateY(${newPosition * 0.5}px)`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.transform = `translateY(${targetPosition * 0.5}px)`;
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Trigger haptic feedback
     */
    triggerHaptic(type) {
        if (!navigator.vibrate) return;

        const patterns = {
            'touch': [10],
            'boundary': [20],
            'success': [30, 20, 30],
            'release': [15, 10, 15]
        };

        const pattern = patterns[type];
        if (pattern) {
            navigator.vibrate(pattern);
        }
    }

    /**
     * Get coordinator state
     */
    getState() {
        return {
            isActive: this.state.isActive,
            gestureType: this.state.gestureType,
            velocity: this.state.velocity
        };
    }
}

// Global instance
window.__UnifiedGestureCoordinator = new UnifiedGestureCoordinator();

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.__UnifiedGestureCoordinator.init();
    });
} else {
    window.__UnifiedGestureCoordinator.init();
}

/**
 * Gesture Physics Engine - Phase 3
 * 
 * Implements Apple-like rubber band elasticity
 * Uses damped harmonic motion formula: resistance = 1 - 1/(1 + delta/500)
 * 
 * Features:
 * - Damped harmonic motion for elastic feel
 * - Input latency reduction (passive listeners)
 * - Haptic sync with scroll boundaries
 */

class GesturePhysicsEngine {
    constructor() {
        this.config = {
            elasticityConstant: 500,      // Controls rubber band resistance
            dampingFactor: 0.95,          // Energy loss per frame
            maxOverscroll: 150,           // Max pixels beyond boundary
            hapticThreshold: 50,          // Distance to trigger haptic
            touchActionNone: true         // Disable 300ms tap delay
        };

        this.state = {
            isScrolling: false,
            startY: 0,
            currentY: 0,
            overscrollDistance: 0,
            velocity: 0,
            lastTime: 0
        };

        this.boundaryPositions = {
            headerExpanded: 120,
            headerCollapsed: 56,
            footerTop: 0
        };
    }

    /**
     * Initialize gesture physics system
     */
    init() {
        console.log('[GesturePhysicsEngine] Initializing...');

        // Add CSS for touch-action to prevent 300ms delay
        this.addTouchActionCSS();

        // Add gesture listeners with passive: true (low latency)
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

        // Mouse events for desktop testing
        document.addEventListener('mousedown', (e) => this.onTouchStart(e), { 
            passive: true 
        });
        document.addEventListener('mousemove', (e) => this.onTouchMove(e), { 
            passive: true 
        });
        document.addEventListener('mouseup', (e) => this.onTouchEnd(e));

        console.log('[GesturePhysicsEngine] Ready (60 FPS physics enabled)');
    }

    /**
     * Add CSS for touch-action optimization
     */
    addTouchActionCSS() {
        const style = document.createElement('style');
        style.textContent = `
            /* Eliminate 300ms click delay */
            body {
                touch-action: none;
            }
            
            /* Allow selection areas */
            .text-selectable {
                touch-action: auto;
            }
            
            /* Smooth scrollable areas */
            .scrollable {
                touch-action: pan-y;
                overscroll-behavior: contain;
            }
            
            /* GPU acceleration for gestures */
            .gesture-target {
                will-change: transform;
                backface-visibility: hidden;
                perspective: 1000px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Touch start - record initial position
     */
    onTouchStart(event) {
        const touch = event.touches?.[0] || event;
        
        this.state.isScrolling = true;
        this.state.startY = touch.clientY;
        this.state.currentY = touch.clientY;
        this.state.velocity = 0;
        this.state.lastTime = Date.now();
        this.state.overscrollDistance = 0;

        // Trigger haptic feedback on touch
        this.triggerHaptic('touch');
    }

    /**
     * Touch move - apply elastic physics
     */
    onTouchMove(event) {
        if (!this.state.isScrolling) return;

        const touch = event.touches?.[0] || event;
        const currentY = touch.clientY;
        const delta = currentY - this.state.currentY;
        const timeDelta = Date.now() - this.state.lastTime;

        // Calculate velocity for momentum
        this.state.velocity = delta / (timeDelta || 1);

        // Apply damped harmonic motion formula
        // resistance = 1 - 1/(1 + delta/500)
        const resistance = this.calculateElasticity(delta);

        // Limit overscroll
        this.state.overscrollDistance = Math.min(
            delta * resistance,
            this.config.maxOverscroll
        );

        this.state.currentY = currentY;
        this.state.lastTime = Date.now();

        // Apply visual transformation
        this.applyGestureTransform(this.state.overscrollDistance);

        // Check boundary crossings for haptic feedback
        this.checkBoundaryCrossing(currentY);
    }

    /**
     * Damped harmonic motion formula
     * Creates Apple rubber-band feel
     */
    calculateElasticity(delta) {
        // resistance = 1 - 1/(1 + |delta|/C)
        // C = elasticity constant (500px)
        const absD = Math.abs(delta);
        const resistance = 1 - 1 / (1 + absD / this.config.elasticityConstant);
        
        return resistance;
    }

    /**
     * Apply gesture transform to visual elements
     */
    applyGestureTransform(distance) {
        const target = document.querySelector('[data-gesture-target]');
        if (!target) return;

        // Apply smooth transform
        target.style.transform = `translateY(${distance * 0.5}px)`;
        target.style.opacity = Math.max(0.9, 1 - Math.abs(distance) / 500);
    }

    /**
     * Check if user crossed boundary for haptic feedback
     */
    checkBoundaryCrossing(currentY) {
        const headerTarget = this.boundaryPositions.headerCollapsed;
        const distanceToHeader = Math.abs(currentY - headerTarget);

        if (distanceToHeader < this.config.hapticThreshold) {
            // About to cross header boundary
            if (Math.abs(this.state.velocity) > 0.5) {
                this.triggerHaptic('boundary');
            }
        }
    }

    /**
     * Touch end - apply momentum & snap to boundaries
     */
    onTouchEnd(event) {
        if (!this.state.isScrolling) return;

        this.state.isScrolling = false;

        const momentum = this.state.velocity;
        const currentOverscroll = this.state.overscrollDistance;

        // Snap back animation with momentum
        this.snapToNearestBoundary(momentum, currentOverscroll);

        // Haptic feedback on release
        this.triggerHaptic('release');
    }

    /**
     * Snap to nearest boundary with momentum
     */
    snapToNearestBoundary(momentum, currentOverscroll) {
        const target = document.querySelector('[data-gesture-target]');
        if (!target) return;

        const boundaries = [
            this.boundaryPositions.headerExpanded,
            this.boundaryPositions.headerCollapsed
        ];

        // Find nearest boundary
        let nearestBoundary = boundaries[0];
        let minDistance = Math.abs(currentOverscroll - boundaries[0]);

        for (let boundary of boundaries.slice(1)) {
            const distance = Math.abs(currentOverscroll - boundary);
            if (distance < minDistance) {
                minDistance = distance;
                nearestBoundary = boundary;
            }
        }

        // Animate to boundary with momentum
        this.animateToPosition(target, nearestBoundary, momentum);
    }

    /**
     * Smooth animation to position
     */
    animateToPosition(element, targetPosition, initialVelocity) {
        let currentPosition = this.state.overscrollDistance;
        const startTime = Date.now();
        const duration = 400; // ms

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing: cubic-out (1 - (1-progress)^3)
            const eased = 1 - Math.pow(1 - progress, 3);

            const newPosition = currentPosition + 
                (targetPosition - currentPosition) * eased +
                initialVelocity * elapsed * (1 - progress);

            element.style.transform = `translateY(${newPosition * 0.5}px)`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Snap to final position
                element.style.transform = `translateY(${targetPosition * 0.5}px)`;
                this.state.overscrollDistance = 0;
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
            'release': [15, 10, 15]
        };

        const pattern = patterns[type];
        if (pattern) {
            navigator.vibrate(pattern);
        }
    }

    /**
     * Update elasticity constant for different devices
     */
    setElasticity(constant) {
        this.config.elasticityConstant = constant;
    }

    /**
     * Get physics state for debugging
     */
    getState() {
        return {
            isScrolling: this.state.isScrolling,
            velocity: this.state.velocity,
            overscrollDistance: this.state.overscrollDistance,
            config: this.config
        };
    }
}

// Global instance
window.__GesturePhysicsEngine = new GesturePhysicsEngine();

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.__GesturePhysicsEngine.init();
    });
} else {
    window.__GesturePhysicsEngine.init();
}

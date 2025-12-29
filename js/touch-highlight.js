/**
 * ===== APPLE TOUCH HIGHLIGHT SYSTEM =====
 * Shows ripple effect at touch point, coordinates with haptic feedback,
 * and provides visual feedback for all interactive elements
 */

class TouchHighlightSystem {
  constructor() {
    this.rippleElements = new Map();
    this.touchableSelectors = [
      '.pressable',
      '.btn',
      'button',
      '.list-item',
      '.card-pressable',
      '.icon-btn',
      'a[href]',
      '[role="button"]',
      '[role="tab"]',
      '[role="menuitem"]'
    ];
    this.hapticEnabled = 'vibrate' in navigator;
    this.touchFeedbackDelay = 0; // ms before showing feedback

    this.init();
  }

  /**
   * Initialize touch highlight system
   */
  init() {
    // Set up event listeners for all touchable elements
    this.setupTouchListeners();

    // Handle dynamic content
    this.observeDOMChanges();

    // Mobile-only optimizations
    if (this.isTouchDevice()) {
      this.optimizeForTouchDevice();
    }
  }

  /**
   * Check if device supports touch
   */
  isTouchDevice() {
    return (
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0)
    );
  }

  /**
   * Set up touch event listeners
   */
  setupTouchListeners() {
    // Event delegation for better performance
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: true });
    document.addEventListener('mousedown', this.handleMouseDown.bind(this), { passive: true });
    document.addEventListener('mouseup', this.handleMouseUp.bind(this), { passive: true });
  }

  /**
   * Handle touch start - show ripple at touch point
   */
  handleTouchStart(event) {
    const target = event.target.closest(this.touchableSelectors.join(','));
    if (!target || target.disabled) return;

    const touch = event.touches[0];
    this.showRipple(target, touch.clientX, touch.clientY);
    this.triggerHapticFeedback(target);
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(event) {
    const target = event.target.closest(this.touchableSelectors.join(','));
    if (!target) return;

    this.hideRipple(target);
  }

  /**
   * Handle touch cancel
   */
  handleTouchCancel(event) {
    const target = event.target.closest(this.touchableSelectors.join(','));
    if (!target) return;

    this.hideRipple(target);
  }

  /**
   * Handle mouse down (for desktop testing)
   */
  handleMouseDown(event) {
    if (!this.isTouchDevice()) {
      const target = event.target.closest(this.touchableSelectors.join(','));
      if (!target || target.disabled) return;

      this.showRipple(target, event.clientX, event.clientY);
      this.triggerHapticFeedback(target);
    }
  }

  /**
   * Handle mouse up
   */
  handleMouseUp(event) {
    if (!this.isTouchDevice()) {
      const target = event.target.closest(this.touchableSelectors.join(','));
      if (!target) return;

      this.hideRipple(target);
    }
  }

  /**
   * Show ripple effect at touch point
   * @param {Element} target - Target element
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  showRipple(target, x, y) {
    // Create ripple container if needed
    if (!target.hasAttribute('data-ripple-container')) {
      target.setAttribute('data-ripple-container', 'true');
      target.style.position = target.style.position || 'relative';
      target.style.overflow = 'hidden';
    }

    // Remove existing ripple
    this.hideRipple(target);

    // Calculate ripple position relative to target
    const rect = target.getBoundingClientRect();
    const relX = x - rect.left;
    const relY = y - rect.top;

    // Create ripple element
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${relX}px`;
    ripple.style.top = `${relY}px`;
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.width = '40px';
    ripple.style.height = '40px';
    ripple.style.transform = 'translate(-50%, -50%)';
    ripple.style.backgroundColor = this.getRippleColor(target);
    ripple.style.pointerEvents = 'none';
    ripple.style.animation = 'ripple-effect 600ms var(--motion-ease-out)';
    ripple.style.zIndex = '1';

    target.appendChild(ripple);

    // Store ripple reference
    this.rippleElements.set(target, ripple);
  }

  /**
   * Hide ripple effect
   * @param {Element} target - Target element
   */
  hideRipple(target) {
    const ripple = this.rippleElements.get(target);
    if (ripple && ripple.parentElement === target) {
      setTimeout(() => {
        ripple.style.opacity = '0';
        ripple.style.transition = 'opacity 200ms ease-out';
        setTimeout(() => {
          if (ripple.parentElement === target) {
            ripple.remove();
          }
          // Only delete the map entry if it still points to THIS specific ripple
          if (this.rippleElements.get(target) === ripple) {
            this.rippleElements.delete(target);
          }
        }, 200);
      }, 100);
    }
  }

  /**
   * Determine ripple color based on element type
   * @param {Element} target - Target element
   * @returns {string} Color for ripple
   */
  getRippleColor(target) {
    // Check for primary button
    if (target.classList.contains('btn-primary')) {
      return 'rgba(14, 165, 233, 0.5)';
    }

    // Check for success/error states
    if (target.classList.contains('selected')) {
      return 'rgba(16, 185, 129, 0.5)';
    }

    if (target.classList.contains('incorrect')) {
      return 'rgba(239, 68, 68, 0.5)';
    }

    // Default ripple color
    return 'rgba(0, 0, 0, 0.1)';
  }

  /**
   * Trigger haptic feedback based on element type
   * @param {Element} target - Target element
   */
  triggerHapticFeedback(target) {
    if (!this.hapticEnabled || !window.motionCoordinator) {
      return;
    }

    // Determine haptic type based on element class
    if (target.classList.contains('btn-primary') || target.classList.contains('btn')) {
      window.motionCoordinator.triggerHaptic('light');
    } else if (target.classList.contains('toggle') || target.classList.contains('switch')) {
      window.motionCoordinator.triggerHaptic('medium');
    } else if (target.classList.contains('list-item')) {
      window.motionCoordinator.triggerHaptic('selection');
    } else {
      window.motionCoordinator.triggerHaptic('light');
    }
  }

  /**
   * Observe DOM changes for dynamic content
   */
  observeDOMChanges() {
    const observer = new MutationObserver(() => {
      // Re-setup listeners if DOM changed significantly
      // This is a simplified approach - in production, use event delegation
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Optimize for touch device
   */
  optimizeForTouchDevice() {
    // Add touch feedback to root
    const html = document.documentElement;

    // Disable tap highlight (browser default)
    const style = document.createElement('style');
    style.textContent = `
      ${this.touchableSelectors.join(', ')} {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }
    `;
    document.head.appendChild(style);

    // Add fast click handling if needed
    this.setupFastClickHandling();
  }

  /**
   * Setup fast click handling for 300ms delay elimination
   */
  setupFastClickHandling() {
    let lastClickTime = 0;
    const MIN_CLICK_INTERVAL = 200;

    document.addEventListener('click', (event) => {
      const now = Date.now();

      // Prevent double-clicks
      if (now - lastClickTime < MIN_CLICK_INTERVAL) {
        event.preventDefault();
        return;
      }

      lastClickTime = now;
    }, false);
  }

  /**
   * Add custom ripple to specific element
   * @param {Element} element - Element to add ripple to
   * @param {object} options - Ripple options
   */
  addCustomRipple(element, options = {}) {
    const color = options.color || 'rgba(0, 0, 0, 0.1)';
    const duration = options.duration || 600;

    element.addEventListener('click', (event) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const ripple = document.createElement('span');
      ripple.className = 'ripple-custom';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.position = 'absolute';
      ripple.style.width = '20px';
      ripple.style.height = '20px';
      ripple.style.borderRadius = '50%';
      ripple.style.backgroundColor = color;
      ripple.style.transform = 'translate(-50%, -50%)';
      ripple.style.pointerEvents = 'none';
      ripple.style.animation = `ripple-effect ${duration}ms var(--motion-ease-out)`;

      if (!element.style.position || element.style.position === 'static') {
        element.style.position = 'relative';
      }
      if (element.style.overflow === 'visible') {
        element.style.overflow = 'hidden';
      }

      element.appendChild(ripple);

      setTimeout(() => ripple.remove(), duration);
    });
  }

  /**
   * Show highlight flash (like iOS settings)
   * @param {Element} element - Element to flash
   * @param {object} options - Flash options
   */
  showHighlightFlash(element, options = {}) {
    const duration = options.duration || 400;
    const color = options.color || 'rgba(0, 0, 0, 0.05)';

    element.style.backgroundColor = color;
    element.style.transition = `background-color ${duration}ms var(--motion-ease-in-out)`;

    // Force reflow
    element.offsetHeight;

    // Reset background
    const originalBg = window.getComputedStyle(element).backgroundColor;
    element.style.backgroundColor = originalBg;
  }

  /**
   * Show 3D press effect (Haptic Preview)
   * @param {Element} element - Element to affect
   */
  show3DPressEffect(element) {
    const originalTransform = element.style.transform;

    element.style.transform = 'perspective(1000px) rotateX(5deg) rotateY(-5deg) scale(0.98)';
    element.style.transition = 'none';

    // Force reflow
    element.offsetHeight;

    // Reset with animation
    element.style.transition = 'transform 150ms var(--motion-spring-tight)';
    element.style.transform = originalTransform;
  }

  /**
   * Enable long-press detection
   * @param {Element} element - Element to monitor
   * @param {Function} callback - Function to call on long press
   * @param {number} duration - Long press duration in ms (default 500ms)
   */
  enableLongPress(element, callback, duration = 500) {
    let pressTimer;
    let isPressing = false;

    const startPress = () => {
      isPressing = true;
      pressTimer = setTimeout(() => {
        if (isPressing) {
          // Show haptic and visual feedback
          this.show3DPressEffect(element);
          if (window.motionCoordinator) {
            window.motionCoordinator.triggerHaptic('warning');
          }
          callback();
        }
      }, duration);
    };

    const endPress = () => {
      clearTimeout(pressTimer);
      isPressing = false;
    };

    element.addEventListener('touchstart', startPress, { passive: true });
    element.addEventListener('touchend', endPress, { passive: true });
    element.addEventListener('touchcancel', endPress, { passive: true });
    element.addEventListener('mousedown', startPress);
    element.addEventListener('mouseup', endPress);
    element.addEventListener('mouseleave', endPress);
  }

  /**
   * Get touch system metrics
   */
  getMetrics() {
    return {
      hapticEnabled: this.hapticEnabled,
      isTouchDevice: this.isTouchDevice(),
      activeRipples: this.rippleElements.size,
    };
  }
}

// Initialize and export
const touchHighlightSystem = new TouchHighlightSystem();
window.touchHighlightSystem = touchHighlightSystem;

// Example usage:
/*
// Add custom ripple
touchHighlightSystem.addCustomRipple(element, {
  color: 'rgba(14, 165, 233, 0.3)',
  duration: 800
});

// Show highlight flash
touchHighlightSystem.showHighlightFlash(element, {
  duration: 300,
  color: 'rgba(0, 0, 0, 0.08)'
});

// Enable long-press
touchHighlightSystem.enableLongPress(element, () => {
  console.log('Long pressed!');
  showContextMenu();
}, 500);

// Check metrics
console.log(touchHighlightSystem.getMetrics());
*/

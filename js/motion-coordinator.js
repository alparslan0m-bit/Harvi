/**
 * ===== APPLE MOTION COORDINATOR =====
 * Orchestrates multi-element animations, frame-rate detection,
 * and reduce-motion preference handling for iOS-native animation feel
 */

class MotionCoordinator {
  constructor() {
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.supportsHighFrameRate = this.detectHighFrameRate();
    this.activeAnimations = new Set();
    this.staggerDelay = 30; // ms between staggered elements
    
    this.init();
  }

  /**
   * Initialize motion coordinator and set up listeners
   */
  init() {
    // Listen for reduced motion preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addListener((e) => {
      this.prefersReducedMotion = e.matches;
      this.updateMotionState();
    });

    // Listen for frame rate changes
    this.monitorFrameRate();
  }

  /**
   * Detect if device supports 120fps (ProMotion displays)
   */
  detectHighFrameRate() {
    if (!window.requestAnimationFrame) return false;
    
    let frameCount = 0;
    let lastTime = performance.now();
    let frameRate = 60;

    const countFrame = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        frameRate = frameCount;
        frameCount = 0;
        lastTime = currentTime;
      }
      
      if (frameCount < 10) {
        requestAnimationFrame(countFrame);
      }
    };

    requestAnimationFrame(countFrame);
    return frameRate >= 90;
  }

  /**
   * Monitor frame rate during interactions
   */
  monitorFrameRate() {
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFrame = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        const fps = frameCount;
        if (fps < 30) {
          // Enable performance optimizations
          document.documentElement.classList.add('low-performance');
        } else {
          document.documentElement.classList.remove('low-performance');
        }
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  /**
   * Update motion settings when preference changes
   */
  updateMotionState() {
    if (this.prefersReducedMotion) {
      document.documentElement.style.setProperty('--duration-instant', '0ms');
      document.documentElement.style.setProperty('--duration-fast', '0ms');
      document.documentElement.style.setProperty('--duration-normal', '0ms');
      document.documentElement.style.setProperty('--duration-slow', '0ms');
      document.documentElement.style.setProperty('--duration-slower', '0ms');
      document.documentElement.style.setProperty('--duration-extended', '0ms');
    } else {
      // Reset to normal durations
      document.documentElement.style.removeProperty('--duration-instant');
      document.documentElement.style.removeProperty('--duration-fast');
      document.documentElement.style.removeProperty('--duration-normal');
      document.documentElement.style.removeProperty('--duration-slow');
      document.documentElement.style.removeProperty('--duration-slower');
      document.documentElement.style.removeProperty('--duration-extended');
    }
  }

  /**
   * Apply staggered animation to list of elements
   * @param {NodeList|Array} elements - Elements to animate
   * @param {string} animationClass - CSS class to apply
   * @param {object} options - Animation options
   */
  staggerElements(elements, animationClass = 'animate-entrance-slide-up', options = {}) {
    if (this.prefersReducedMotion) {
      elements.forEach(el => el.classList.add(animationClass));
      return;
    }

    const stagger = options.stagger ?? this.staggerDelay;
    const offset = options.offset ?? 0;

    elements.forEach((element, index) => {
      const delay = (index * stagger) + offset;
      element.style.setProperty('--animation-delay', `${delay}ms`);
      element.classList.add(animationClass);

      // Track animation
      const animationEnd = () => {
        this.activeAnimations.delete(element);
        element.removeEventListener('animationend', animationEnd);
      };
      element.addEventListener('animationend', animationEnd);
      this.activeAnimations.add(element);
    });
  }

  /**
   * Orchestrate coordinated multi-element animation sequence
   * @param {object} sequence - Animation sequence definition
   */
  orchestrateSequence(sequence) {
    if (this.prefersReducedMotion) {
      sequence.steps.forEach(step => {
        if (step.elements) {
          step.elements.forEach(el => {
            if (step.animationClass) {
              el.classList.add(step.animationClass);
            }
          });
        }
      });
      return;
    }

    let cumulativeDelay = 0;

    sequence.steps.forEach((step, stepIndex) => {
      const delay = cumulativeDelay;
      const duration = step.duration ?? 350;

      if (step.elements) {
        step.elements.forEach((element, elementIndex) => {
          const elementDelay = delay + (elementIndex * (step.stagger ?? this.staggerDelay));
          element.style.setProperty('--animation-delay', `${elementDelay}ms`);

          if (step.animationClass) {
            element.classList.add(step.animationClass);
          }

          if (step.callback) {
            const timeoutId = setTimeout(() => {
              step.callback(element, elementIndex);
            }, elementDelay);

            // Track timeout for cleanup
            const cleanup = () => {
              clearTimeout(timeoutId);
              this.activeAnimations.delete(element);
              element.removeEventListener('animationend', cleanup);
            };
            element.addEventListener('animationend', cleanup);
            this.activeAnimations.add(element);
          }
        });
      }

      cumulativeDelay += duration;
    });
  }

  /**
   * FLIP animation pattern for smooth position/size transitions
   * @param {Element} element - Element to animate
   * @param {Function} callback - Function that updates DOM
   */
  flipAnimation(element, callback) {
    if (this.prefersReducedMotion) {
      callback();
      return;
    }

    // First: record initial position
    const first = element.getBoundingClientRect();

    // Last: execute callback and record new position
    callback();
    const last = element.getBoundingClientRect();

    // Invert: calculate delta
    const deltaX = first.left - last.left;
    const deltaY = first.top - last.top;
    const deltaWidth = first.width / last.width;
    const deltaHeight = first.height / last.height;

    // Play: animate from old position to new
    element.style.transformOrigin = '0 0';
    element.style.transform = `translate(${deltaX}px, ${deltaY}px) scaleX(${deltaWidth}) scaleY(${deltaHeight})`;
    element.style.transition = 'none';

    // Trigger reflow
    element.offsetHeight;

    // Apply animation
    element.style.transition = 'transform var(--duration-normal) var(--motion-ease-in-out)';
    element.style.transform = 'translate(0, 0) scaleX(1) scaleY(1)';
  }

  /**
   * Apply spring physics to element
   * @param {Element} element - Element to animate
   * @param {object} options - Spring parameters
   */
  applySpring(element, options = {}) {
    const duration = options.duration ?? 500;
    const damping = options.damping ?? 0.75;
    const stiffness = options.stiffness ?? 300;

    // Convert spring parameters to cubic-bezier approximation
    // This is a simplified version - real spring physics would require animation library
    const easeFunction = `cubic-bezier(0.34, 1.56, 0.64, 1)`;

    element.style.animation = `spring-animation ${duration}ms ${easeFunction} forwards`;
  }

  /**
   * Animate between two colors smoothly
   * @param {Element} element - Element to animate
   * @param {string} fromColor - Starting color
   * @param {string} toColor - Ending color
   * @param {number} duration - Animation duration in ms
   */
  colorTransition(element, fromColor, toColor, duration = 300) {
    if (this.prefersReducedMotion) {
      element.style.backgroundColor = toColor;
      return;
    }

    element.style.backgroundColor = fromColor;
    element.style.transition = `background-color ${duration}ms var(--motion-ease-in-out)`;

    // Force reflow
    element.offsetHeight;

    element.style.backgroundColor = toColor;
  }

  /**
   * Create particle burst effect for celebrations
   * @param {Element} origin - Origin element for particle burst
   * @param {object} options - Burst options
   */
  particleBurst(origin, options = {}) {
    const particleCount = options.count ?? 8;
    const duration = options.duration ?? 800;
    const container = options.container ?? document.body;

    if (this.prefersReducedMotion) {
      return;
    }

    const rect = origin.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle-burst';
      particle.style.left = `${startX}px`;
      particle.style.top = `${startY}px`;
      particle.style.position = 'fixed';
      particle.style.width = '8px';
      particle.style.height = '8px';
      particle.style.borderRadius = '50%';
      particle.style.backgroundColor = options.color ?? 'var(--primary-color)';
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '9999';

      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 60;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;

      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);

      container.appendChild(particle);

      // Trigger animation
      particle.style.animation = `particle-burst ${duration}ms var(--motion-ease-out) forwards`;

      // Cleanup
      setTimeout(() => {
        particle.remove();
      }, duration);
    }
  }

  /**
   * Haptic feedback trigger (iOS devices only)
   * @param {string} type - Type of haptic (light, medium, heavy, success, warning, error)
   */
  triggerHaptic(type = 'light') {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 10],
        warning: [30, 20, 30],
        error: [50, 50, 50],
        selection: [15],
      };

      const pattern = patterns[type] || patterns.light;
      navigator.vibrate(pattern);
    }
  }

  /**
   * Throttle animation updates for performance
   * @param {Function} callback - Function to throttle
   * @param {number} limit - Time limit in ms
   */
  throttleAnimation(callback, limit = 16) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        callback.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Debounce animation start
   * @param {Function} callback - Function to debounce
   * @param {number} delay - Delay in ms
   */
  debounceAnimation(callback, delay = 100) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callback.apply(this, args);
      }, delay);
    };
  }

  /**
   * Stop all active animations
   */
  stopAllAnimations() {
    this.activeAnimations.forEach(element => {
      element.style.animation = 'none';
      element.style.transition = 'none';
    });
    this.activeAnimations.clear();
  }

  /**
   * Get current animation performance metrics
   */
  getMetrics() {
    return {
      activeAnimations: this.activeAnimations.size,
      prefersReducedMotion: this.prefersReducedMotion,
      supportsHighFrameRate: this.supportsHighFrameRate,
      memoryUsage: performance.memory?.usedJSHeapSize ?? 'N/A',
    };
  }
}

// Initialize and export
const motionCoordinator = new MotionCoordinator();
window.motionCoordinator = motionCoordinator;

// Example usage documentation:
/*
// Stagger list items
const listItems = document.querySelectorAll('.list-item');
motionCoordinator.staggerElements(listItems, 'animate-entrance-slide-up', {
  stagger: 30,
  offset: 100
});

// Orchestrate sequence
motionCoordinator.orchestrateSequence({
  steps: [
    {
      elements: document.querySelectorAll('.hero-item'),
      animationClass: 'animate-entrance-fade-scale',
      duration: 400,
      stagger: 50
    },
    {
      elements: document.querySelectorAll('.content-item'),
      animationClass: 'animate-entrance-slide-up',
      duration: 350,
      stagger: 30
    }
  ]
});

// FLIP animation
const card = document.querySelector('.card');
motionCoordinator.flipAnimation(card, () => {
  card.style.width = '200px'; // Size change
  card.style.transform = 'translateX(100px)'; // Position change
});

// Particle celebration
motionCoordinator.particleBurst(element, {
  count: 12,
  duration: 800,
  color: '#10B981'
});

// Trigger haptic
motionCoordinator.triggerHaptic('success');

// Check metrics
console.log(motionCoordinator.getMetrics());
*/

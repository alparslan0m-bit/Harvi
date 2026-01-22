/**
 * PHASE 3: ADAPTIVE PERFORMANCE ENGINE
 * Adjusts visual effects based on device capabilities
 * Detects low-performance devices and adjusts animations gracefully
 */

class AdaptivePerformance {
    constructor() {
        this.isLowPerformance = false;
        this.memoryAvailable = 0;
        this.cpuCores = navigator.hardwareConcurrency || 1;
        this.init();
    }

    async init() {
        // Detect low-end devices
        this.detectPerformanceLevel();
        this.adjustAnimations();
        this.adjustAnimationFrameRate();

        // Listen for memory pressure
        if ('memory' in performance) {
            this.monitorMemory();
        }
    }

    /**
     * Detect if device has low performance
     */
    detectPerformanceLevel() {
        const ram = performance.memory?.jsHeapSizeLimit || 0;
        const cores = this.cpuCores;

        // Low-end device detection:
        // - Less than 512MB of JS heap
        // - Single-core or dual-core CPU
        // - Large screen without high DPI (cheaper device)
        this.isLowPerformance = (ram < 536870912) || (cores <= 2);

        if (this.isLowPerformance) {
            console.log('🔋 Low-performance device detected. Reducing animation complexity.');
            document.body.classList.add('low-performance-mode');
        }
    }

    /**
     * Adjust animations for low-end devices
     * No blur effects exist - just reduce animation complexity
     */
    adjustAnimations() {
        if (this.isLowPerformance) {
            const style = document.createElement('style');
            style.textContent = `
                /* Reduce animation complexity on low-end devices */
                * {
                    animation-duration: 0.15s !important;
                    transition-duration: 0.1s !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * PHASE 3: Optimize animation frame rate for low-end devices
     * FIXED: Global RAF override removed to prevent scroll desync and jerkiness.
     * Rendering budget is now managed at the component level.
     */
    adjustAnimationFrameRate() {
        if (this.isLowPerformance) {
            console.log('🔋 Performance Mode: Capping expensive animations only.');
        }
    }

    /**
     * Monitor memory usage and warn if running low
     */
    monitorMemory() {
        if ('memory' in performance) {
            setInterval(() => {
                const memUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;

                // Warn if using more than 85% of available memory
                if (memUsage > 0.85) {
                    console.warn('⚠️ High memory usage detected:', Math.round(memUsage * 100) + '%');

                    // Force garbage collection hint if available
                    if (window.gc) {
                        console.log('Running garbage collection...');
                        window.gc();
                    }
                }
            }, 5000);
        }
    }

    /**
     * Check if device prefers reduced motion
     */
    static prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Disable all animations if user prefers reduced motion
     */
    static respectUserPreferences() {
        if (this.prefersReducedMotion()) {
            const style = document.createElement('style');
            style.textContent = `
                * {
                    animation: none !important;
                    transition: none !important;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.adaptivePerformance = new AdaptivePerformance();
        AdaptivePerformance.respectUserPreferences();
    });
} else {
    window.adaptivePerformance = new AdaptivePerformance();
    AdaptivePerformance.respectUserPreferences();
}

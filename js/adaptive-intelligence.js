/**
 * Adaptive Showcase Intelligence - Phase 5
 * 
 * Features:
 * - Device memory detection
 * - Network-aware preloading
 * - Quality tier selection
 * - Dynamic configuration
 */

class AdaptiveShowcaseIntelligence {
    constructor() {
        this.deviceProfile = null;
        this.networkProfile = null;
        this.config = {
            // Memory-based quality tiers
            lowMemory: 2,        // <= 2GB RAM
            mediumMemory: 4,     // 2-4GB RAM
            highMemory: 8,       // >= 8GB RAM

            // Network-based strategies
            slowNetwork: '3g',   // 3G or slower
            fastNetwork: '4g',   // 4G+
        };
        this.qualityTier = 'medium';
    }

    /**
     * Initialize adaptive intelligence
     */
    init() {
        console.log('[AdaptiveShowcaseIntelligence] Initializing...');

        this.detectDeviceProfile();
        this.detectNetworkProfile();
        this.configureForDevice();

        // Listen for network changes
        if (navigator.connection) {
            navigator.connection.addEventListener('change', () => {
                this.onNetworkChange();
            });
        }

        console.log('[AdaptiveShowcaseIntelligence] Ready');
        console.log(`  Device Profile: ${this.qualityTier}`);
        console.log(`  Network: ${this.networkProfile}`);
    }

    /**
     * Detect device memory
     */
    detectDeviceProfile() {
        const deviceMemory = navigator.deviceMemory || 4;

        if (deviceMemory <= this.config.lowMemory) {
            this.qualityTier = 'low';
        } else if (deviceMemory <= this.config.mediumMemory) {
            this.qualityTier = 'medium';
        } else {
            this.qualityTier = 'high';
        }

        this.deviceProfile = {
            memory: deviceMemory,
            cores: navigator.hardwareConcurrency || 1,
            tier: this.qualityTier
        };

        console.log('[AdaptiveShowcaseIntelligence] Device:', this.deviceProfile);
    }

    /**
     * Detect network condition
     */
    detectNetworkProfile() {
        if (!navigator.connection) {
            this.networkProfile = 'unknown';
            return;
        }

        const connection = navigator.connection;
        const type = connection.effectiveType; // '4g', '3g', '2g', 'slow-2g'
        const downlink = connection.downlink || 0; // Mbps
        const rtt = connection.rtt || 0; // ms
        const saveData = connection.saveData || false;

        this.networkProfile = {
            type,
            downlink,
            rtt,
            saveData,
            isSlowNetwork: type === '3g' || type === '2g' || type === 'slow-2g'
        };

        console.log('[AdaptiveShowcaseIntelligence] Network:', this.networkProfile);
    }

    /**
     * Configure app based on device profile
     */
    configureForDevice() {
        const tier = this.deviceProfile.tier;

        if (tier === 'low') {
            this.configureLowMemoryMode();
        } else if (tier === 'high') {
            this.configureHighMemoryMode();
        } else {
            this.configureMediumMemoryMode();
        }
    }

    /**
     * Low memory mode: Reduce quality, cache aggressively
     */
    configureLowMemoryMode() {
        console.log('[AdaptiveShowcaseIntelligence] Configuring for LOW memory device');

        // Disable expensive features - simplified animations only
        const style = document.createElement('style');
        style.textContent = `
            /* Simpler animations for low-end devices */
            * {
                animation-duration: 150ms !important;
            }
            
            /* Reduce images */
            img {
                max-width: 300px;
                max-height: 300px;
            }
        `;
        document.head.appendChild(style);

        // Reduce prefetch aggressiveness
        if (window.__PredictiveLoader) {
            window.__PredictiveLoader.config.maxConcurrent = 1;
            window.__PredictiveLoader.config.queueDelay = 300;
        }
    }

    /**
     * High memory mode: Enable all features, aggressive caching
     */
    configureHighMemoryMode() {
        console.log('[AdaptiveShowcaseIntelligence] Configuring for HIGH memory device');

        // Enable all features
        const style = document.createElement('style');
        style.textContent = `
            /* Premium animations */
            * {
                animation-duration: 300ms !important;
                transition-duration: 300ms !important;
            }
            
            /* High-res images */
            img {
                image-rendering: high-quality;
            }
        `;
        document.head.appendChild(style);

        // Aggressive prefetch
        if (window.__PredictiveLoader) {
            window.__PredictiveLoader.config.maxConcurrent = 4;
            window.__PredictiveLoader.config.queueDelay = 100;
        }

        // Aggressive hierarchical prefetch
        if (window.__HierarchicalPrefetcher) {
            window.__HierarchicalPrefetcher.config.moduleChunkSize = 10;
        }
    }

    /**
     * Medium memory mode: Balanced approach
     */
    configureMediumMemoryMode() {
        console.log('[AdaptiveShowcaseIntelligence] Configuring for MEDIUM memory device');

        // Balanced configuration - already defaults
    }

    /**
     * Handle network changes
     */
    onNetworkChange() {
        const oldProfile = this.networkProfile;
        this.detectNetworkProfile();

        if (oldProfile.type !== this.networkProfile.type) {
            console.log('[AdaptiveShowcaseIntelligence] Network changed:', this.networkProfile.type);
            this.configureForNetwork();
        }
    }

    /**
     * Configure prefetching based on network
     */
    configureForNetwork() {
        if (!this.networkProfile) return;

        if (this.networkProfile.isSlowNetwork) {
            // On slow network: reduce prefetch
            if (window.__PredictiveLoader) {
                window.__PredictiveLoader.config.maxConcurrent = 1;
                window.__PredictiveLoader.config.queueDelay = 500;
            }

            // Reduce quality
            this.reduceImageQuality();
        } else {
            // On fast network: increase prefetch
            if (window.__PredictiveLoader) {
                const tier = this.deviceProfile.tier;
                if (tier === 'high') {
                    window.__PredictiveLoader.config.maxConcurrent = 4;
                } else {
                    window.__PredictiveLoader.config.maxConcurrent = 2;
                }
                window.__PredictiveLoader.config.queueDelay = 150;
            }

            // Increase quality
            this.increaseImageQuality();
        }
    }

    /**
     * Reduce image quality for slow networks
     */
    reduceImageQuality() {
        document.querySelectorAll('img').forEach(img => {
            if (img.dataset.src) {
                // Use lower quality version
                img.src = img.dataset.src.replace(/\.jpg$/, '-low.jpg');
            }
        });
    }

    /**
     * Increase image quality for fast networks
     */
    increaseImageQuality() {
        document.querySelectorAll('img').forEach(img => {
            if (img.dataset.highRes) {
                img.src = img.dataset.highRes;
            }
        });
    }

    /**
     * Get prefetch strategy based on network
     */
    getPrefetchStrategy() {
        return {
            shouldPrefetch: !this.networkProfile?.saveData,
            shouldHierarchicalPrefetch: !this.networkProfile?.isSlowNetwork,
            chunkSize: this.networkProfile?.isSlowNetwork ? 3 : 5,
            delay: this.networkProfile?.isSlowNetwork ? 300 : 150
        };
    }

    /**
     * Get rendering quality for images
     */
    getRenderingQuality() {
        return {
            maxWidth: this.deviceProfile.tier === 'high' ? 800 : 400,
            quality: this.deviceProfile.tier === 'high' ? 'high' : 'medium',
            enableAnimations: this.deviceProfile.memory > 2
        };
    }

    /**
     * Get caching strategy
     */
    getCachingStrategy() {
        return {
            cacheSize: this.deviceProfile.tier === 'high' ? 50 : 20,
            cacheExpiry: this.deviceProfile.tier === 'high' ? 600000 : 300000, // ms
            aggressiveCache: this.deviceProfile.tier === 'high'
        };
    }

    /**
     * Get device profile
     */
    getDeviceProfile() {
        return this.deviceProfile;
    }

    /**
     * Get network profile
     */
    getNetworkProfile() {
        return this.networkProfile;
    }

    /**
     * Get quality tier
     */
    getQualityTier() {
        return {
            memory: this.qualityTier,
            network: this.networkProfile?.type,
            combined: `${this.qualityTier}-${this.networkProfile?.type || 'unknown'}`
        };
    }
}

// Global instance
window.__AdaptiveShowcaseIntelligence = new AdaptiveShowcaseIntelligence();

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.__AdaptiveShowcaseIntelligence.init();
    });
} else {
    window.__AdaptiveShowcaseIntelligence.init();
}

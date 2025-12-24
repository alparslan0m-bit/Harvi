/**
 * Asset Optimizer - Phase 4: Zero-Copy Strategy
 * 
 * Features:
 * - Fetch Priority API (fetchpriority high/low)
 * - Dominant color calculation for images
 * - Binary format preparation
 * - Smart resource loading
 */

class AssetOptimizer {
    constructor() {
        this.dominantColors = new Map();
        this.loadingPlaceholders = new Map();
        this.config = {
            enableDominantColors: true,
            enableFetchPriority: true,
            binaryOptimization: false, // Can be enabled for large datasets
            imageCacheBust: true
        };
    }

    /**
     * Initialize asset optimizer
     */
    init() {
        console.log('[AssetOptimizer] Initializing...');

        // Optimize existing images
        this.optimizeAllImages();

        // Optimize fetch requests
        this.optimizeFetchRequests();

        // Intercept dynamic image loads
        this.observeImageLoads();

        console.log('[AssetOptimizer] Ready');
    }

    /**
     * Optimize all existing images
     */
    optimizeAllImages() {
        document.querySelectorAll('img').forEach(img => {
            this.optimizeImage(img);
        });
    }

    /**
     * Optimize a single image
     */
    optimizeImage(imgElement) {
        // Calculate and set dominant color as background
        if (this.config.enableDominantColors) {
            this.setDominantColorBackground(imgElement);
        }

        // Add loading optimization
        imgElement.loading = 'lazy';
        imgElement.decoding = 'async';

        // Handle image load
        imgElement.addEventListener('load', () => {
            imgElement.classList.add('loaded');
            // Remove placeholder
            if (imgElement.style.backgroundColor) {
                imgElement.style.transition = 'opacity 200ms ease';
            }
        });
    }

    /**
     * Calculate dominant color from image
     */
    calculateDominantColor(imgElement) {
        if (this.dominantColors.has(imgElement.src)) {
            return this.dominantColors.get(imgElement.src);
        }

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 1;
            canvas.height = 1;

            // Draw image at 1x1 to get average color
            ctx.drawImage(imgElement, 0, 0, 1, 1);
            const imageData = ctx.getImageData(0, 0, 1, 1).data;

            const color = `rgb(${imageData[0]}, ${imageData[1]}, ${imageData[2]})`;
            this.dominantColors.set(imgElement.src, color);

            return color;
        } catch (error) {
            console.warn('[AssetOptimizer] Failed to calculate dominant color:', error);
            return 'rgba(128, 128, 128, 0.1)';
        }
    }

    /**
     * Set dominant color as placeholder background
     */
    setDominantColorBackground(imgElement) {
        // Use data URI if available
        const dataColor = imgElement.dataset.dominantColor;
        if (dataColor) {
            imgElement.style.backgroundColor = dataColor;
            return;
        }

        // Calculate from image
        if (imgElement.complete && imgElement.naturalHeight > 0) {
            const color = this.calculateDominantColor(imgElement);
            imgElement.style.backgroundColor = color;
        } else {
            // Wait for image to load
            imgElement.addEventListener('load', () => {
                const color = this.calculateDominantColor(imgElement);
                imgElement.style.backgroundColor = color;
            }, { once: true });
        }
    }

    /**
     * Optimize fetch requests with fetch priority API
     */
    optimizeFetchRequests() {
        // Mark API endpoints with priority
        const resourcePriorities = {
            '/api/years': 'high',
            '/api/modules': 'high',
            '/api/questions': 'high',
            '/api/stats': 'low',
            '/icons': 'low',
            '/images': 'low'
        };

        // Store for later use in fetch calls
        window.__FETCH_PRIORITIES = resourcePriorities;
    }

    /**
     * Execute fetch with priority
     */
    async fetchWithPriority(url, priority = 'high', options = {}) {
        const fetchOptions = {
            ...options,
            priority: priority
        };

        try {
            const response = await fetch(url, fetchOptions);
            return response;
        } catch (error) {
            console.warn(`[AssetOptimizer] Fetch failed for ${url}:`, error);
            throw error;
        }
    }

    /**
     * Observe dynamically added images
     */
    observeImageLoads() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'IMG') {
                            this.optimizeImage(node);
                        }
                        node.querySelectorAll?.('img').forEach(img => {
                            this.optimizeImage(img);
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Prepare binary format optimization (for future use)
     */
    prepareBinaryOptimization() {
        // MessagePack or Protobuf can reduce payload by 80%
        // This is a placeholder for future implementation
        console.log('[AssetOptimizer] Binary optimization ready (implement with MessagePack/Protobuf)');
    }

    /**
     * Get dominant color for a resource ID
     */
    getDominantColor(resourceId) {
        return this.dominantColors.get(resourceId) || 'rgba(128, 128, 128, 0.1)';
    }

    /**
     * Cache key for binary data (if using MessagePack)
     */
    getCacheKey(data, format = 'json') {
        if (format === 'msgpack') {
            return `msgpack:${data.id}`;
        }
        return `json:${data.id}`;
    }

    /**
     * Get status
     */
    getStatus() {
        return {
            cachedColors: this.dominantColors.size,
            config: this.config
        };
    }
}

// Global instance
window.__AssetOptimizer = new AssetOptimizer();

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.__AssetOptimizer.init();
    });
} else {
    window.__AssetOptimizer.init();
}

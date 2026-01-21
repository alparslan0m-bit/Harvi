/**
 * HeaderController - Unified Header Management
 * 
 * Provides a single, reusable header component with configurable behavior.
 * Eliminates code duplication across Home, Statistics, and Profile pages.
 * 
 * Features:
 * - Static mode: Fixed title with optional click handler
 * - Dynamic mode: Large title with scroll-based morphing (iOS-style)

 * - Safe-area inset support
 * - Memory leak prevention (proper cleanup)
 * 
 * @example
 * // Static header (Stats/Profile)
 * HeaderController.configure({
 *   title: 'Statistics',
 *   subtitle: 'Your progress at a glance',
 *   mode: 'static',
 *   onTitleClick: () => app.showScreen('navigation-screen')
 * });
 * 
 * // Dynamic header (Home)
 * HeaderController.configure({
 *   title: 'Harvi',
 *   subtitle: 'Questions you need',
 *   mode: 'dynamic',

 * });
 */
class HeaderController {
    constructor() {
        this.currentConfig = null;
        this.scrollListener = null;
        this.clickHandler = null;

        // DOM references (cached for performance)
        this.headerContainer = null;
        this.brandContainer = null;
        this.navTitleArea = null;


        this.init();
    }

    /**
     * Initialize and cache DOM references
     */
    init() {
        this.headerContainer = document.getElementById('header-container');
        this.brandContainer = document.getElementById('brand-container');
        this.navTitleArea = document.getElementById('navigation-title-area');


        if (!this.headerContainer || !this.brandContainer || !this.navTitleArea) {
            console.error('HeaderController: Required DOM elements not found');
            return;
        }

        console.log('✓ HeaderController initialized');
    }

    /**
     * Configure header with new settings
     * @param {Object} config - Header configuration
     * @param {string} config.title - Main title text
     * @param {string} [config.subtitle] - Optional subtitle text
     * @param {'static'|'dynamic'} [config.mode='static'] - Header behavior mode
     * @param {Function} [config.onTitleClick] - Optional click handler

     */
    configure(config) {
        // Validate config
        if (!config || !config.title) {
            console.warn('HeaderController.configure: title is required');
            return;
        }

        // Clean up previous configuration
        this.cleanup();

        this.currentConfig = {
            title: config.title,
            subtitle: config.subtitle || '',
            mode: config.mode || 'static',
            onTitleClick: config.onTitleClick || null
        };

        // Apply configuration
        this.render();
        this.show(); // Ensure header is visible when configured
    }

    /**
     * Render header based on current configuration
     */
    render() {
        if (!this.currentConfig) return;

        const { title, subtitle, mode, onTitleClick } = this.currentConfig;

        if (mode === 'dynamic') {
            // Dynamic mode: Show brand container with click support
            this.brandContainer.style.display = 'flex';
            this.navTitleArea.style.display = 'none';

            // Update brand content
            const titleElement = this.brandContainer.querySelector('.app-title');
            const descElement = this.brandContainer.querySelector('.brand-description');

            if (titleElement) titleElement.textContent = title;
            if (descElement) descElement.textContent = subtitle;

            // Setup click handler if provided
            if (onTitleClick) {
                this.clickHandler = (e) => {
                    e.preventDefault();
                    onTitleClick();
                };
                this.brandContainer.addEventListener('click', this.clickHandler);
            }

        } else {
            // Static mode: Show as fixed title (Stats/Profile)
            this.brandContainer.style.display = 'flex';
            this.navTitleArea.style.display = 'none';

            // Update brand content
            const titleElement = this.brandContainer.querySelector('.app-title');
            const descElement = this.brandContainer.querySelector('.brand-description');

            if (titleElement) titleElement.textContent = title;
            if (descElement) descElement.textContent = subtitle;

            // Setup click handler if provided
            if (onTitleClick) {
                this.clickHandler = (e) => {
                    e.preventDefault();
                    onTitleClick();
                };
                this.brandContainer.addEventListener('click', this.clickHandler);
            }
        }
    }

    /**
     * Update header for navigation drill-down (Home page specific)
     * Shows large title with scroll morphing effect
     * @param {string} titleText - Title to display
     */
    updateNavigationTitle(titleText) {
        if (!titleText || titleText === 'Years' || !titleText.trim()) {
            // At root level - show brand
            this.configure({
                title: 'Harvi',
                subtitle: 'Questions you need',
                mode: 'dynamic',
                onTitleClick: () => {
                    if (window.app && window.app.navigation) {
                        window.app.navigation.showYears();
                    }
                }
            });
            return;
        }

        // Show navigation large title
        this.brandContainer.style.display = 'none';
        this.navTitleArea.style.display = 'block';

        this.navTitleArea.innerHTML = `
            <div class="scrollable-header">
                <h1 class="large-title">${titleText}</h1>
                <div class="inline-title">${titleText}</div>
            </div>
        `;

        // Reset scroll state
        const scrollableHeader = this.navTitleArea.querySelector('.scrollable-header');
        if (scrollableHeader) {
            scrollableHeader.classList.remove('scrolled');
        }

        // Setup scroll listener for morphing effect
        this.setupScrollListener();
    }

    /**
     * Setup scroll listener for large title morphing effect
     * Only active in navigation drill-down mode
     */
    setupScrollListener() {
        // Clean up existing listener
        if (this.scrollListener) {
            const screen = document.querySelector('.screen.active');
            if (screen) {
                screen.removeEventListener('scroll', this.scrollListener, { passive: true });
            }
        }

        const screen = document.querySelector('.screen.active');
        if (!screen) return;

        const header = this.navTitleArea.querySelector('.scrollable-header');
        if (!header) return;

        let isTicking = false;
        this.scrollListener = () => {
            if (!isTicking) {
                requestAnimationFrame(() => {
                    const scrollY = screen.scrollTop;
                    const threshold = 44; // iOS standard threshold

                    if (scrollY > threshold) {
                        header.classList.add('scrolled');
                    } else {
                        header.classList.remove('scrolled');
                    }

                    isTicking = false;
                });
                isTicking = true;
            }
        };

        screen.addEventListener('scroll', this.scrollListener, { passive: true });
    }

    /**
     * Clean up event listeners and state
     * Prevents memory leaks when switching pages
     */
    cleanup() {
        // Remove scroll listener
        if (this.scrollListener) {
            const screen = document.querySelector('.screen.active');
            if (screen) {
                screen.removeEventListener('scroll', this.scrollListener, { passive: true });
            }
            this.scrollListener = null;
        }

        // Remove click handler
        if (this.clickHandler && this.brandContainer) {
            this.brandContainer.removeEventListener('click', this.clickHandler);
            this.clickHandler = null;
        }
    }



    /**
     * Hide the entire header container
     */
    hide() {
        if (this.headerContainer) {
            this.headerContainer.style.display = 'none';
        }
    }

    /**
     * Show the entire header container
     */
    show() {
        if (this.headerContainer) {
            this.headerContainer.style.display = 'block';
        }
    }
}

// Export as singleton
window.HeaderController = new HeaderController();

/**
 * Navigation Manager
 * Manages hierarchical navigation and card-based UI rendering
 * Features: Smart caching, smooth transitions, optimized rendering
 */
class Navigation {
    constructor(app) {
        this.app = app;
        this.currentPath = [];
        this.remoteYears = null;
        this.cacheTimestamp = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache validity
        this.abortController = null; // For request cancellation
        this.scrollListener = null; // Track scroll listener for cleanup
        this.currentHeaderTitle = ''; // Track current header title
    }

    /**
     * Update header with large title and inline title for morphing effect
     * Activates the scroll-to-inline transition CSS
     */
    updateHeader(titleText) {
        this.currentHeaderTitle = titleText;
        const brandContainer = document.getElementById('brand-container');
        const navTitleArea = document.getElementById('navigation-title-area');
        
        if (!brandContainer || !navTitleArea) return;

        // If at the root level (Years), show the master brand
        if (titleText === 'Years' || !titleText) {
            brandContainer.style.display = 'flex';
            navTitleArea.style.display = 'none';
        } else {
            // Otherwise show the Navigation Large Title
            brandContainer.style.display = 'none';
            navTitleArea.style.display = 'block';
            
            navTitleArea.innerHTML = `
                <div class="scrollable-header">
                    <h1 class="large-title">${titleText}</h1>
                    <div class="inline-title">${titleText}</div>
                </div>
            `;
            
            // Reset scroll state
            const scrollableHeader = navTitleArea.querySelector('.scrollable-header');
            if (scrollableHeader) {
                scrollableHeader.classList.remove('scrolled');
            }
        }
    }

    /**
     * Clean up navigation resources to prevent memory leaks
     */
    cleanup() {
        console.log('🧹 Cleaning up navigation resources...');
        
        // 1. Abort and clean up any pending requests
        if (this.abortController) {
            try {
                this.abortController.abort();
                console.log('✓ Aborted pending requests');
            } catch (e) {
                console.warn('AbortController abort failed:', e);
            }
            this.abortController = null;  // ← KEY: null the reference
        }
        
        // 2. Remove scroll listener
        if (this.scrollListener) {
            const cardsContainer = document.getElementById('cards-container');
            if (cardsContainer) {
                cardsContainer.removeEventListener('scroll', this.scrollListener, { passive: true });
                console.log('✓ Scroll listener removed');
            }
            this.scrollListener = null;
        }
        
        // 3. Clear cached data if needed (optional - depends on requirements)
        // this.remoteYears = null;
        // this.cacheTimestamp = null;
        
        console.log('✓ Navigation cleanup complete');
    }

    /**
     * Smart years loading with caching and smooth transitions
     */
    async showYears() {
        // Properly clean up before starting new navigation
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;  // ← ADD THIS
        }
        
        this.app.showScreen('navigation-screen');
        this.currentPath = [];
        this.updateBreadcrumb();
        this.updateHeader('Years');
        
        const container = document.getElementById('cards-container');
        const isCacheValid = this.isCacheValid();
        
        // Show cached data immediately if available and valid
        if (isCacheValid && this.remoteYears && this.remoteYears.length > 0) {
            this.renderYears(container, this.remoteYears, false);
        } else {
            // Show loading state
            this.showLoadingState(container, 'Loading years...');
        }
        
        // Always fetch fresh data in background (unless cache is very fresh)
        if (!isCacheValid || !this.remoteYears) {
            try {
                // Create NEW controller
                this.abortController = new AbortController();
                // WIRED: Use SafeFetch for automatic retry and error handling
                const res = await SafeFetch.fetch('./api/years', {
                    signal: this.abortController.signal,
                    timeout: 10000,
                    retries: 2
                });
                
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const years = await res.json();
                
                // Sort years
                years.sort((a, b) => {
                    const aNum = parseInt(a.id.replace(/\D/g, '')) || 0;
                    const bNum = parseInt(b.id.replace(/\D/g, '')) || 0;
                    return aNum - bNum;
                });
                
                // Update cache
                this.remoteYears = years;
                this.cacheTimestamp = Date.now();
                
                // Render with smooth transition
                this.renderYears(container, years, !isCacheValid);
            } catch (e) {
                this.abortController = null;  // ← ADD: Clean up on error
                
                if (e.name === 'AbortError') {
                    return;
                }
                console.error('Failed to load years:', e);
                this.showErrorState(container, 'Failed to load years. Please check server connection.');
            }
        }
    }
    
    /**
     * Check if cache is still valid
     */
    isCacheValid() {
        if (!this.cacheTimestamp || !this.remoteYears) return false;
        return (Date.now() - this.cacheTimestamp) < this.cacheTimeout;
    }
    
    /**
     * Render years with smooth transition
     */
    renderYears(container, years, animate = true) {
        if (animate) {
            container.style.opacity = '0';
            container.style.transition = 'opacity 0.3s ease';
        }
        
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();

        // Create inset grouped list wrapper
        const groupWrapper = document.createElement('div');
        groupWrapper.className = 'grouped-list';
        
        years.forEach((year, index) => {
            const item = this.createListItem(
                year.icon || '📘', 
                year.name, 
                `${year.modules?.length || 0} Modules`
            );
            
            item.addEventListener('click', () => this.showModules(year));
            groupWrapper.appendChild(item);
        });
        
        fragment.appendChild(groupWrapper);
        container.appendChild(fragment);
        
        // Apply stagger animation to list items
        if (window.motionCoordinator) {
            const items = groupWrapper.querySelectorAll('.list-item');
            window.motionCoordinator.staggerElements(items, 'animate-entrance-slide-up');
        }
        
        if (animate) {
            requestAnimationFrame(() => {
                container.style.opacity = '1';
            });
        }
    }
    
    /**
     * Show loading state using SkeletonLoader
     */
    showLoadingState(container, message = 'Loading...') {
        container.innerHTML = '';
        container.style.opacity = '1';

        // Create skeleton list items that match the iOS list style
        const groupWrapper = document.createElement('div');
        groupWrapper.className = 'grouped-list';

        // Generate 5-6 skeleton list items
        for (let i = 0; i < 6; i++) {
            const skeletonItem = document.createElement('div');
            skeletonItem.className = 'list-item skeleton-loader';
            skeletonItem.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <div style="width: 28px; height: 28px; background: rgba(255,255,255,0.1); border-radius: 6px; animation: pulse 1.5s ease-in-out infinite;"></div>
                    <div style="flex: 1;">
                        <div style="height: 16px; background: rgba(255,255,255,0.1); border-radius: 4px; margin-bottom: 6px; animation: pulse 1.5s ease-in-out infinite; animation-delay: 0.1s;"></div>
                        <div style="height: 12px; background: rgba(255,255,255,0.08); border-radius: 3px; width: 60%; animation: pulse 1.5s ease-in-out infinite; animation-delay: 0.2s;"></div>
                    </div>
                </div>
                <div style="width: 12px; height: 12px; background: rgba(255,255,255,0.05); border-radius: 50%; animation: pulse 1.5s ease-in-out infinite; animation-delay: 0.3s;"></div>
            `;
            groupWrapper.appendChild(skeletonItem);
        }

        container.appendChild(groupWrapper);
    }
    showErrorState(container, message) {
        container.innerHTML = '';
        container.style.opacity = '1';
        
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            color: white; 
            text-align: center; 
            width: 100%; 
            padding: 3rem 2rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
        `;
        
        const errorText = document.createElement('p');
        errorText.textContent = message;
        errorText.style.cssText = 'margin: 0; font-size: 1.1rem;';
        
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry';
        retryButton.style.cssText = `
            padding: 0.75rem 1.5rem;
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 8px;
            color: white;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        retryButton.addEventListener('mouseenter', () => {
            retryButton.style.background = 'rgba(255,255,255,0.3)';
        });
        retryButton.addEventListener('mouseleave', () => {
            retryButton.style.background = 'rgba(255,255,255,0.2)';
        });
        retryButton.addEventListener('click', () => {
            this.cacheTimestamp = null; // Force refresh
            this.showYears();
        });
        
        errorDiv.appendChild(errorText);
        errorDiv.appendChild(retryButton);
        container.appendChild(errorDiv);
    }

    showModules(year) {
        this.currentPath = [year];
        this.updateBreadcrumb();
        this.updateHeader(year.name);
        
        const container = document.getElementById('cards-container');
        container.innerHTML = '';
        
        if (!year.modules || year.modules.length === 0) {
            container.innerHTML = '<p style="color: var(--label-secondary); text-align: center; width: 100%; padding: 2rem;">No modules available yet.</p>';
            return;
        }
        
        const groupWrapper = document.createElement('div');
        groupWrapper.className = 'grouped-list';
        
        year.modules.forEach(module => {
            const item = this.createListItem('📚', module.name, `${module.subjects?.length || 0} Subjects`);
            item.addEventListener('click', () => this.showSubjects(year, module));
            groupWrapper.appendChild(item);
        });
        
        container.appendChild(groupWrapper);
        
        // Apply stagger animation to list items
        if (window.motionCoordinator) {
            const items = groupWrapper.querySelectorAll('.list-item');
            window.motionCoordinator.staggerElements(items, 'animate-entrance-slide-up');
        }
    }

    showSubjects(year, module) {
        this.currentPath = [year, module];
        this.updateBreadcrumb();
        this.updateHeader(module.name);
        
        const container = document.getElementById('cards-container');
        this.renderWithTransition(container, () => {
            if (!module.subjects || module.subjects.length === 0) {
                return this.createEmptyState('No subjects available yet.');
            }
            
            const fragment = document.createDocumentFragment();
            const groupWrapper = document.createElement('div');
            groupWrapper.className = 'grouped-list';
            
            module.subjects.forEach(subject => {
                const item = this.createListItem('📖', subject.name, `${subject.lectures?.length || 0} Lectures`);
                item.addEventListener('click', () => this.showLectures(year, module, subject));
                groupWrapper.appendChild(item);
            });
            
            fragment.appendChild(groupWrapper);
            
            // Apply stagger animation after a short delay to ensure DOM is ready
            setTimeout(() => {
                if (window.motionCoordinator) {
                    const items = groupWrapper.querySelectorAll('.list-item');
                    window.motionCoordinator.staggerElements(items, 'animate-entrance-slide-up');
                }
            }, 50);
            
            return fragment;
        });
    }

    /**
     * Show lectures with offline-first strategy
     * Displays cached content immediately, then fetches fresh data in background
     */
    showLectures(year, module, subject) {
        this.currentPath = [year, module, subject];
        this.updateBreadcrumb();
        this.updateHeader(subject.name);
        
        const container = document.getElementById('cards-container');
        
        if (!subject.lectures || subject.lectures.length === 0) {
            this.renderWithTransition(container, () => this.createEmptyState('No lectures available yet.'));
            return;
        }

        // CLEANUP: Remove old event listeners before clearing container
        const oldCards = container.querySelectorAll('.list-item[data-lecture-id]');
        oldCards.forEach(card => {
            if (card._clickHandler) {
                card.removeEventListener('click', card._clickHandler);
                delete card._clickHandler;
                delete card._clickHandlerAdded;
            }
        });
        console.log(`🧹 Cleaned up ${oldCards.length} old lecture cards`);
        
        // Cancel any previous requests immediately
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;  // ← ADD THIS LINE
        }
        
        const abortController = new AbortController();
        this.abortController = abortController;
        
        // START BATCH FETCHING - Single GET request for better caching
        // Note: Offline caching preserved via harviDB.saveLecture() in promise chain
        const lectureIds = subject.lectures.map(lecture => lecture.id);
        const url = `./api/lectures/batch?ids=${lectureIds.join(',')}`;
        
        // Check URL length to prevent 414 Request-URI Too Long errors
        const batchFetchPromise = url.length > 2000 
            ? // Fallback to POST if URL too long
              SafeFetch.fetch('./api/lectures/batch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ lectureIds }),
                  signal: abortController.signal,
                  cache: 'no-cache',
                  timeout: 15000,
                  retries: 2
              })
            : // Use GET for normal cases (better caching)
              SafeFetch.fetch(url, {
                  signal: abortController.signal,
                  cache: 'default',
                  timeout: 15000,
                  retries: 2
              });
        
        // Render cards immediately with loading state (while fetching happens in parallel)
        const loadingCards = new Map();
        this.renderWithTransition(container, () => {
            const fragment = document.createDocumentFragment();
            const groupWrapper = document.createElement('div');
            groupWrapper.className = 'grouped-list';
            
            subject.lectures.forEach(lecture => {
                const item = this.createListItem('📝', lecture.name, 'Loading...');
                item.style.pointerEvents = 'none';
                item.style.opacity = '0.7';
                item.classList.add('loading');
                item.classList.add('skeleton-loader');
                item.dataset.lectureId = lecture.id;
                loadingCards.set(lecture.id, item);
                groupWrapper.appendChild(item);
            });
            
            fragment.appendChild(groupWrapper);
            return fragment;
        });

        // SINGLE CONTINUOUS PROMISE CHAIN: Fetch → Process → Update Cards
        batchFetchPromise
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(lectures => {
                // Create a map for quick lookup
                const lectureMap = new Map(lectures.map(lecture => [lecture.id, lecture]));
                return subject.lectures.map(lecture => {
                    const data = lectureMap.get(lecture.id);
                    if (data) {
                        // Update cache with fresh data
                        if (harviDB && data.questions) {
                            harviDB.saveLecture({
                                id: lecture.id,
                                ...data
                            }).catch(e =>
                                console.warn('Failed to cache lecture:', e)
                            );
                        }
                        return { lecture, data, success: true };
                    } else {
                        return { lecture, error: new Error('Lecture not found in batch response'), success: false };
                    }
                });
            })
            .then(results => {
                // NOW 'results' is the correctly processed array!
                if (abortController.signal.aborted) return;
                
                results.forEach((result) => {
                    if (abortController.signal.aborted) return;
                    
                    const lecture = result.lecture;
                    const currentCard = loadingCards.get(lecture.id);
                    
                    if (!currentCard || !container.contains(currentCard)) {
                        return; // Card was removed, ignore
                    }
                    
                    if (!result.success) {
                        // Handle error
                        if (result.error?.name !== 'AbortError') {
                            this.updateCardError(currentCard);
                        }
                        return;
                    }
                    
                    const { data } = result;
                    lecture.questions = data.questions || [];
                    const questions = lecture.questions;
                    
                    if (questions && questions.length > 0) {
                        this.updateCardSuccess(currentCard, questions, year, module, subject, lecture);
                    } else {
                        this.updateCardEmpty(currentCard);
                    }
                });
                
                this.abortController = null; // Clean up on success
            })
            .catch(error => {
                this.abortController = null; // Clean up on error
                
                if (error.name !== 'AbortError') {
                    console.error('Error loading lectures:', error);
                    // Show error on all remaining cards
                    loadingCards.forEach(card => {
                        if (container.contains(card)) {
                            this.updateCardError(card);
                        }
                    });
                }
            });
    }
    
    /**
     * Update card to success state with questions
     */
    /**
     * Update card to success state with questions
     * FIXED: No longer uses cloneNode - properly manages event listeners
     */
    updateCardSuccess(card, questions, year, module, subject, lecture) {
        const questionCount = questions.length;
        
        // Update card description
        const descriptionEl = card.querySelector('.caption-text');
        if (descriptionEl) {
            descriptionEl.textContent = `${questionCount} Question${questionCount !== 1 ? 's' : ''}`;
        }
        
        // Update card styling
        card.style.cursor = 'pointer';
        card.style.pointerEvents = 'auto';
        card.style.transition = 'opacity 0.3s ease';
        card.classList.remove('loading', 'skeleton-loader');
        card.classList.add('active');
        
        // Animate opacity change
        requestAnimationFrame(() => {
            card.style.opacity = '1';
        });
        
        // CRITICAL FIX: Instead of cloning, use a single-use flag
        // This prevents duplicate event listeners without cloning
        if (!card._clickHandlerAdded) {
            // Create the click handler
            const clickHandler = () => {
                // Haptic feedback
                if (navigator.vibrate) {
                    navigator.vibrate(8);
                }
                
                this.app.startQuiz(questions, {
                    year: year.name,
                    module: module.name,
                    subject: subject.name,
                    lecture: lecture.name,
                    lectureId: lecture.id
                });
            };
            
            // Store handler reference for potential cleanup
            card._clickHandler = clickHandler;
            
            // Add the listener
            card.addEventListener('click', clickHandler);
            
            // Mark as handled
            card._clickHandlerAdded = true;
            
            console.log(`✓ Click handler added for lecture: ${lecture.name}`);
        } else {
            // Handler already exists - just update the closure data
            // This handles the case where cached data is different from fetched data
            console.log(`⚠️  Click handler already exists for: ${lecture.name} - updating data`);
            
            // Remove old listener
            if (card._clickHandler) {
                card.removeEventListener('click', card._clickHandler);
            }
            
            // Add new listener with updated data
            const clickHandler = () => {
                if (navigator.vibrate) {
                    navigator.vibrate(8);
                }
                
                this.app.startQuiz(questions, {
                    year: year.name,
                    module: module.name,
                    subject: subject.name,
                    lecture: lecture.name,
                    lectureId: lecture.id
                });
            };
            
            card._clickHandler = clickHandler;
            card.addEventListener('click', clickHandler);
        }
    }
    
    /**
     * Update card to empty state
     */
    updateCardEmpty(card) {
        const descriptionEl = card.querySelector('.caption-text');
        if (descriptionEl) descriptionEl.textContent = 'No questions found';
        card.style.opacity = '0.6';
        card.style.cursor = 'not-allowed';
        card.style.pointerEvents = 'none';
        card.classList.remove('loading');
    }
    
    /**
     * Update card to error state
     */
    updateCardError(card) {
        const descriptionEl = card.querySelector('.caption-text');
        if (descriptionEl) descriptionEl.textContent = 'Failed to load';
        card.style.opacity = '0.6';
        card.style.cursor = 'not-allowed';
        card.style.pointerEvents = 'none';
        card.classList.remove('loading');
    }
    
    /**
     * Render content with smooth fade transition
     */
    renderWithTransition(container, contentFactory) {
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.2s ease';
        
        requestAnimationFrame(() => {
            container.innerHTML = '';
            const content = contentFactory();
            
            if (content instanceof DocumentFragment) {
                container.appendChild(content);
            } else {
                container.appendChild(content);
            }
            
            requestAnimationFrame(() => {
                container.style.opacity = '1';
            });
        });
    }
    
    /**
     * Create empty state message
     */
    createEmptyState(message) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.cssText = 'color: white; text-align: center; width: 100%; padding: 2rem;';
        emptyDiv.textContent = message;
        return emptyDiv;
    }

    createCard(icon, title, description) {
        const card = document.createElement('div');
        card.className = 'card card-pressable stagger-item';
        card.innerHTML = `
            <div class="card-icon">${icon}</div>
            <h3 class="card-title">${title}</h3>
            <p class="card-description">${description}</p>
        `;
        return card;
    }

    /**
     * Create native iOS list item for inset grouped lists
     * Matches iOS Settings/Notes aesthetic
     */
    createListItem(icon, title, secondary) {
        const item = document.createElement('div');
        item.className = 'list-item pressable stagger-item';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <span style="font-size: 20px; min-width: 28px;">${icon}</span>
                <div style="flex: 1;">
                    <div class="body-text" style="font-weight: 500; color: var(--label-primary);">${title}</div>
                    ${secondary ? `<div class="caption-text" style="color: var(--label-secondary); margin-top: 2px;">${secondary}</div>` : ''}
                </div>
            </div>
            <div style="color: var(--label-tertiary); font-size: 18px;">›</div>
        `;
        return item;
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;

        breadcrumb.innerHTML = '';
        
        const homeItem = document.createElement('span');
        homeItem.className = 'breadcrumb-item';
        homeItem.innerHTML = '🏠 Home';
        homeItem.style.cursor = 'pointer';
        homeItem.addEventListener('click', () => this.app.navigation.showYears());
        breadcrumb.appendChild(homeItem);
        
        this.currentPath.forEach((item, index) => {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = ' > ';
            breadcrumb.appendChild(separator);
            
            const pathItem = document.createElement('span');
            pathItem.className = 'breadcrumb-item';
            if (index === this.currentPath.length - 1) {
                pathItem.classList.add('active');
            }
            pathItem.textContent = item.name;
            pathItem.style.cursor = 'pointer';
            
            // Use path-based navigation instead of hardcoded index checks
            pathItem.addEventListener('click', () => {
                this.navigateToPath(index);
            });
            
            breadcrumb.appendChild(pathItem);
        });
    }
    
    /**
     * Navigate to a specific path level using path-based routing
     * This replaces hardcoded index checks with a flexible navigation system
     * @param {number} targetIndex - The index in currentPath to navigate to
     */
    navigateToPath(targetIndex) {
        if (targetIndex < 0 || targetIndex >= this.currentPath.length) {
            // Invalid index, go to home
            this.showYears();
            return;
        }
        
        // Build path up to target index
        const targetPath = this.currentPath.slice(0, targetIndex + 1);
        
        // Navigate based on path length
        switch (targetPath.length) {
            case 1:
                // Navigate to modules view
                this.showModules(targetPath[0]);
                break;
            case 2:
                // Navigate to subjects view
                this.showSubjects(targetPath[0], targetPath[1]);
                break;
            case 3:
                // Navigate to lectures view
                this.showLectures(targetPath[0], targetPath[1], targetPath[2]);
                break;
            default:
                // Fallback to home for unknown path lengths
                this.showYears();
                break;
        }
    }

    /**
     * Setup Large Title scroll transition
     * Monitors scroll position to collapse header
     */
    setupScrollListener() {
        const screen = document.querySelector('.screen.active');
        if (!screen) return;

        const header = screen.querySelector('.scrollable-header');
        const cardsContainer = screen.querySelector('#cards-container');

        if (!header || !cardsContainer) return;

        // Remove existing listeners to avoid duplicates
        if (this.scrollListener) {
            cardsContainer.removeEventListener('scroll', this.scrollListener, { passive: true });
        }

        this.scrollListener = () => {
            const scrollY = cardsContainer.scrollTop;
            const threshold = 100; // px

            if (scrollY > threshold) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        };

        cardsContainer.addEventListener('scroll', this.scrollListener, { passive: true });
    }
}

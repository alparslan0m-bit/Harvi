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
        const headerContainer = document.querySelector('.header-container');
        if (!headerContainer) return;

        headerContainer.innerHTML = `
            <div class="scrollable-header">
                <h1 class="large-title">${titleText}</h1>
                <div class="inline-title">${titleText}</div>
            </div>
        `;

        // Reset scroll state when header is updated
        const scrollableHeader = headerContainer.querySelector('.scrollable-header');
        if (scrollableHeader) {
            scrollableHeader.classList.remove('scrolled');
        }
    }

    /**
     * Smart years loading with caching and smooth transitions
     */
    async showYears() {
        // Cancel any pending requests
        if (this.abortController) {
            this.abortController.abort();
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
                this.abortController = new AbortController();
                const res = await fetch('/api/years', {
                    signal: this.abortController.signal
                });
                
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const years = await res.json();
                
                // Sort years
                years.sort((a, b) => {
                    const aNum = parseInt(a.id.replace('year', ''));
                    const bNum = parseInt(b.id.replace('year', ''));
                    return aNum - bNum;
                });
                
                // Update cache
                this.remoteYears = years;
                this.cacheTimestamp = Date.now();
                
                // Render with smooth transition
                this.renderYears(container, years, !isCacheValid);
            } catch (e) {
                if (e.name === 'AbortError') {
                    return; // Request was cancelled, ignore
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
        
        // Use SkeletonLoader if available, otherwise fallback to spinner
        if (window.SkeletonLoader) {
            SkeletonLoader.renderGrid(container, {
                columns: 2,
                rows: 3,
                cardHeight: '120px'
            });
        } else {
            // Fallback for older browsers
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'navigation-loading';
            loadingDiv.style.cssText = `
                color: white; 
                text-align: center; 
                width: 100%; 
                padding: 3rem 2rem; 
                font-size: 1.1rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            `;
            
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            spinner.style.cssText = `
                width: 40px; 
                height: 40px; 
                border: 3px solid rgba(255,255,255,0.3); 
                border-top: 3px solid white; 
                border-radius: 50%; 
                animation: spin 1s linear infinite;
            `;
            
            const loadingText = document.createElement('div');
            loadingText.textContent = message;
            
            loadingDiv.appendChild(spinner);
            loadingDiv.appendChild(loadingText);
            container.appendChild(loadingDiv);
        }
    }
    
    /**
     * Show error state with retry option
     */
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

        // Cancel any previous requests immediately
        if (this.abortController) {
            this.abortController.abort();
        }
        
        const abortController = new AbortController();
        this.abortController = abortController;
        
        // OFFLINE-FIRST: Try cache first for instant display
        (async () => {
            const cachedResults = [];
            for (const lecture of subject.lectures) {
                try {
                    const cached = await harviDB.getLecture(lecture.id);
                    if (cached) {
                        cachedResults.push({ lecture, data: cached, source: 'cache', success: true });
                    } else {
                        cachedResults.push({ lecture, source: 'network' });
                    }
                } catch (error) {
                    cachedResults.push({ lecture, source: 'network' });
                }
            }
            
            // Show cached content immediately
            const hasCached = cachedResults.some(r => r.source === 'cache');
            if (hasCached) {
                this.renderWithTransition(container, () => {
                    const fragment = document.createDocumentFragment();
                    const groupWrapper = document.createElement('div');
                    groupWrapper.className = 'grouped-list';
                    
                    cachedResults.forEach(result => {
                        const data = result.data || result.lecture;
                        const item = this.createListItem(
                            '📝',
                            result.lecture.name,
                            `${data.questions?.length || 0} Questions`
                        );
                        if (result.success) {
                            item.addEventListener('click', () => 
                                this.app.startQuiz(result.data.questions, {
                                    lectureId: result.lecture.id,
                                    name: result.lecture.name
                                })
                            );
                        }
                        groupWrapper.appendChild(item);
                    });
                    
                    fragment.appendChild(groupWrapper);
                    return fragment;
                });
            }
        })();
        
        // START FETCHING IN BACKGROUND - Don't wait for rendering
        const fetchPromises = subject.lectures.map(lecture => 
            fetch(`/api/lectures/${encodeURIComponent(lecture.id)}`, {
                signal: abortController.signal,
                cache: 'no-cache' // Ensure fresh data
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
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
            })
            .catch(error => {
                if (error.name === 'AbortError') {
                    throw error; // Re-throw abort errors
                }
                return { lecture, error, success: false };
            })
        );

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

        // Process results as they arrive (progressive loading)
        Promise.allSettled(fetchPromises).then(results => {
            if (abortController.signal.aborted) return;
            
            results.forEach((result, index) => {
                if (abortController.signal.aborted) return;
                
                const lecture = subject.lectures[index];
                const currentCard = loadingCards.get(lecture.id);
                
                if (!currentCard || !container.contains(currentCard)) {
                    return; // Card was removed, ignore
                }
                
                if (result.status === 'rejected' || result.value.error) {
                    // Handle error
                    const error = result.status === 'rejected' ? result.reason : result.value.error;
                    if (error.name !== 'AbortError') {
                        this.updateCardError(currentCard);
                    }
                    return;
                }
                
                const { data } = result.value;
                lecture.questions = data.questions || [];
                const questions = lecture.questions;
                
                if (questions && questions.length > 0) {
                    this.updateCardSuccess(currentCard, questions, year, module, subject, lecture);
                } else {
                    this.updateCardEmpty(currentCard);
                }
            });
        }).catch(error => {
            if (error.name !== 'AbortError') {
                console.error('Error loading lectures:', error);
            }
        });
    }
    
    /**
     * Update card to success state with questions
     */
    updateCardSuccess(card, questions, year, module, subject, lecture) {
        const questionCount = questions.length;
        const descriptionEl = card.querySelector('.card-description');
        if (descriptionEl) {
            descriptionEl.textContent = `${questionCount} Question${questionCount !== 1 ? 's' : ''}`;
        }
        
        // Smooth transition to active state
        card.style.cursor = 'pointer';
        card.style.pointerEvents = 'auto';
        card.style.transition = 'opacity 0.3s ease';
        card.classList.remove('loading');
        card.classList.add('active');
        
        // Animate opacity change
        requestAnimationFrame(() => {
            card.style.opacity = '1';
        });
        
        // Clone to remove old listeners and add new one
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        
        newCard.addEventListener('click', () => {
            this.app.startQuiz(questions, {
                year: year.name,
                module: module.name,
                subject: subject.name,
                lecture: lecture.name
            });
        });
    }
    
    /**
     * Update card to empty state
     */
    updateCardEmpty(card) {
        card.querySelector('.card-description').textContent = 'No questions found';
        card.style.opacity = '0.6';
        card.style.cursor = 'not-allowed';
        card.style.pointerEvents = 'none';
        card.classList.remove('loading');
    }
    
    /**
     * Update card to error state
     */
    updateCardError(card) {
        card.querySelector('.card-description').textContent = 'Failed to load';
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
        card.className = 'card';
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
        item.className = 'list-item';
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
            cardsContainer.removeEventListener('scroll', this.scrollListener);
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

        cardsContainer.addEventListener('scroll', this.scrollListener, false);
    }
}

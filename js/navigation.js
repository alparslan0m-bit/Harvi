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
        
        years.forEach((year, index) => {
            const card = this.createCard(
                year.icon || '📘', 
                year.name, 
                `${year.modules?.length || 0} Modules`
            );
            
            // Mark first card as featured for Bento layout
            if (index === 0) {
                card.classList.add('featured');
            }
            
            card.addEventListener('click', () => this.showModules(year));
            fragment.appendChild(card);
        });
        
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
        
        const container = document.getElementById('cards-container');
        container.innerHTML = '';
        
        if (!year.modules || year.modules.length === 0) {
            container.innerHTML = '<p style="color: white; text-align: center; width: 100%;">No modules available yet.</p>';
            return;
        }
        
        year.modules.forEach(module => {
            const card = this.createCard('📚', module.name, `${module.subjects?.length || 0} Subjects`);
            card.addEventListener('click', () => this.showSubjects(year, module));
            container.appendChild(card);
        });
    }

    showSubjects(year, module) {
        this.currentPath = [year, module];
        this.updateBreadcrumb();
        
        const container = document.getElementById('cards-container');
        this.renderWithTransition(container, () => {
            if (!module.subjects || module.subjects.length === 0) {
                return this.createEmptyState('No subjects available yet.');
            }
            
            const fragment = document.createDocumentFragment();
            module.subjects.forEach(subject => {
                const card = this.createCard('📖', subject.name, `${subject.lectures?.length || 0} Lectures`);
                card.addEventListener('click', () => this.showLectures(year, module, subject));
                fragment.appendChild(card);
            });
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
                    cachedResults.forEach(result => {
                        const data = result.data || result.lecture;
                        const card = this.createCard(
                            '📝',
                            result.lecture.name,
                            `${data.questions?.length || 0} Questions`
                        );
                        if (result.success) {
                            card.addEventListener('click', () => 
                                this.app.startQuiz(result.data.questions, {
                                    lectureId: result.lecture.id,
                                    name: result.lecture.name
                                })
                            );
                        }
                        fragment.appendChild(card);
                    });
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
                    harviDB.saveLecture(lecture.id, data).catch(e => 
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
            subject.lectures.forEach(lecture => {
                const card = this.createCard('📝', lecture.name, 'Loading...');
                card.style.pointerEvents = 'none';
                card.style.opacity = '0.7';
                card.classList.add('loading');
                card.classList.add('skeleton-loader');
                card.dataset.lectureId = lecture.id;
                loadingCards.set(lecture.id, card);
                fragment.appendChild(card);
            });
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
}
class Quiz {
    constructor(app) {
        this.app = app;
        this.questions = [];
        this.metadata = {};
        this.currentIndex = 0;
        this.score = 0;
        this.hasAnswered = false;
        this.selectedOptionIndex = -1;
        this.answers = []; // CRITICAL FIX: Array to collect answers for backend submission

        this.keyboardHandler = null;
        this.continueClickHandler = null;
        this.backClickHandler = null;

        this.confettiCanvas = document.getElementById('confetti-canvas');
        this.loadConfettiLibrary().then(() => {
            this.confetti = this.confettiCanvas ? confetti.create(this.confettiCanvas, { resize: true }) : null;
        });

        // Initialize listeners once, but we will attach/detach carefully
        this.setupKeyboardNavigation();
        this.initButtonHandlers();
    }

    async loadConfettiLibrary() {
        if (window.confetti) return;
        try {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
            script.async = true;
            return new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        } catch (error) {
            console.warn('Failed to load confetti library:', error);
        }
    }

    setupKeyboardNavigation() {
        if (this.keyboardHandler) return;

        this.keyboardHandler = (e) => {
            if (!document.getElementById('quiz-screen')?.classList.contains('active')) return;

            switch (e.key) {
                case 'ArrowUp':
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigateOptions('up');
                    break;
                case 'ArrowDown':
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigateOptions('down');
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (this.hasAnswered) {
                        this.nextQuestion();
                    } else {
                        this.selectOptionWithKeyboard();
                    }
                    break;
                case '1': case '2': case '3': case '4':
                case 'A': case 'B': case 'C': case 'D':
                    e.preventDefault();
                    this.selectOptionByKey(e.key);
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.handleExit();
                    break;
            }
        };

        document.addEventListener('keydown', this.keyboardHandler);
    }

    initButtonHandlers() {
        this.continueClickHandler = (e) => {
            e.preventDefault();
            this.nextQuestion();
        };
        this.backClickHandler = (e) => {
            e.preventDefault();
            this.handleExit();
        };
    }

    attachButtonListeners() {
        const continueBtn = document.getElementById('continue-btn');
        const backToNavBtn = document.getElementById('back-to-nav');

        if (continueBtn) {
            // Remove old to prevent duplicates
            continueBtn.removeEventListener('click', this.continueClickHandler);
            continueBtn.addEventListener('click', this.continueClickHandler);
        }

        if (backToNavBtn) {
            backToNavBtn.removeEventListener('click', this.backClickHandler);
            backToNavBtn.addEventListener('click', this.backClickHandler);
        }
    }

    handleExit() {
        if (confirm('Are you sure you want to exit the quiz?')) {
            this.app.resetApp();
        }
    }

    navigateOptions(direction) {
        if (this.hasAnswered) return;

        const options = this.optionsContainer?.querySelectorAll('.option');
        if (!options || options.length === 0) return;

        if (this.selectedOptionIndex >= 0 && options[this.selectedOptionIndex]) {
            options[this.selectedOptionIndex].classList.remove('keyboard-selected');
        }

        if (direction === 'down') {
            this.selectedOptionIndex = this.selectedOptionIndex >= options.length - 1 ? 0 : this.selectedOptionIndex + 1;
        } else {
            this.selectedOptionIndex = this.selectedOptionIndex <= 0 ? options.length - 1 : this.selectedOptionIndex - 1;
        }

        if (this.selectedOptionIndex >= 0 && options[this.selectedOptionIndex]) {
            options[this.selectedOptionIndex].classList.add('keyboard-selected');
            options[this.selectedOptionIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            if (window.HapticsEngine) HapticsEngine.selection();
        }
    }

    async selectOptionWithKeyboard() {
        if (this.hasAnswered || this.selectedOptionIndex < 0) return;
        const options = this.optionsContainer?.querySelectorAll('.option');
        if (!options || !options[this.selectedOptionIndex]) return;

        const selectedOption = options[this.selectedOptionIndex];
        const visualIndex = parseInt(selectedOption.dataset.visualIndex || this.selectedOptionIndex);
        const originalIndex = parseInt(selectedOption.dataset.originalIndex || visualIndex);

        await this.selectAnswer(selectedOption, visualIndex, originalIndex);
    }

    async selectOptionByKey(key) {
        if (this.hasAnswered) return;
        const options = this.optionsContainer?.querySelectorAll('.option');
        if (!options || options.length === 0) return;

        let index = -1;
        const k = key.toUpperCase();
        if (k >= '1' && k <= '4') index = parseInt(k) - 1;
        else if (k >= 'A' && k <= 'D') index = k.charCodeAt(0) - 65;

        if (index >= 0 && index < options.length) {
            const selectedOption = options[index];
            const visualIndex = parseInt(selectedOption.dataset.visualIndex || index);
            const originalIndex = parseInt(selectedOption.dataset.originalIndex || visualIndex);

            await this.selectAnswer(selectedOption, visualIndex, originalIndex);
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    start(questions, metadata) {
        const isResuming = metadata?.fromSavedProgress === true;

        if (isResuming) {
            this.questions = questions;
        } else {
            const clonedQuestions = questions.map(q => ({
                ...q,
                options: Array.isArray(q.options) ? [...q.options] : q.options
            }));

            this.questions = this.shuffleArray(clonedQuestions);
            this.questions.forEach(question => {
                if (question && question.options && question.options.length > 0) {
                    // CRITICAL FIX: Create shuffledOptions map that tracks both visual and original positions
                    // This is required because backend grading uses originalIndex to verify correctness

                    // 1. Handle both Object options (new format) and String options (legacy)
                    const optionsWithMetadata = question.options.map((option, originalIndex) => {
                        // Check if option is an object (new JSONB format) or string (legacy)
                        if (typeof option === 'object' && option !== null && option.text) {
                            return {
                                text: option.text,
                                originalIndex: originalIndex,
                                id: option.id || `opt_${originalIndex}`
                            };
                        } else {
                            // Legacy format: string
                            return {
                                text: String(option),
                                originalIndex: originalIndex,
                                id: `opt_${originalIndex}`
                            };
                        }
                    });

                    // 2. Shuffle the options for display
                    const shuffledOptions = this.shuffleArray([...optionsWithMetadata]);

                    // 3. Store shuffledOptions for rendering and data retrieval
                    // This maintains the mapping: visual position → original position
                    question.shuffledOptions = shuffledOptions;

                    // 4. Keep options as text array for legacy code compatibility
                    question.options = shuffledOptions.map(opt => opt.text);
                }
            });
        }

        // CRITICAL FIX: Reset answers array to prevent accumulation from previous sessions
        this.answers = [];

        this.metadata = metadata;
        this.currentIndex = isResuming ? (metadata.currentIndex || 0) : 0;
        this.score = isResuming ? (metadata.score || 0) : 0;
        this.hasAnswered = false;
        this.selectedOptionIndex = -1;

        this.app.showScreen('quiz-screen');

        // REFACTORED: Hide Unified Header for Concentration (User Request)
        if (window.HeaderController) {
            window.HeaderController.hide();
        }

        this.waitForDOMElements().then(() => {
            this.attachButtonListeners(); // Ensure listeners are attached to current DOM
            this.showQuestion();
        }).catch(err => {
            console.error('Quiz start error:', err);
            this.app.showScreen('navigation-screen');
        });
    }

    async waitForDOMElements() {
        const maxAttempts = 20;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            this.optionsContainer = document.getElementById('options-container');
            this.questionTextElement = document.getElementById('question-text');
            this.continueBtn = document.getElementById('continue-btn');
            this.progressBar = document.getElementById('progress-bar');
            this.currentQuestionElement = document.getElementById('current-question');
            this.totalQuestionsElement = document.getElementById('total-questions');
            this.contentArea = document.getElementById('quiz-content-area');

            if (this.optionsContainer && this.questionTextElement && this.continueBtn) {
                if (this.totalQuestionsElement) {
                    this.totalQuestionsElement.textContent = this.questions.length;
                }
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        throw new Error('DOM elements not found');
    }

    showQuestion() {
        const currentQuestion = this.questions[this.currentIndex];
        this.hasAnswered = false;
        this.selectedOptionIndex = -1;

        // cleanup previous explanation if any
        const existingExpl = document.getElementById('q-explanation');
        if (existingExpl) existingExpl.remove();

        if (this.contentArea) {
            // 1. HARD LOCK: Hide container via both opacity and visibility
            this.contentArea.style.opacity = '0';
            this.contentArea.style.visibility = 'hidden';
            this.contentArea.classList.remove('question-transition-exit', 'question-transition-enter');

            // 2. Update DOM while invisible
            if (this.questionTextElement && currentQuestion) {
                this.questionTextElement.textContent = currentQuestion.text || 'Question missing';
            }

            if (this.optionsContainer && currentQuestion && currentQuestion.options) {
                this.optionsContainer.innerHTML = '';

                // CRITICAL FIX: Use shuffledOptions to maintain originalIndex mapping
                const optionsToRender = currentQuestion.shuffledOptions ||
                    currentQuestion.options.map((option, idx) => ({
                        text: option,
                        originalIndex: idx,
                        id: `opt_${idx}`
                    }));

                optionsToRender.forEach((optionData, visualIndex) => {
                    const optionElement = this.createOption(optionData, visualIndex);
                    this.optionsContainer.appendChild(optionElement);
                });
            }

            if (this.progressBar) this.updateProgress();
            if (this.continueBtn) {
                this.continueBtn.disabled = true;
                this.continueBtn.textContent = 'Continue'; // Reset button text for next question
            }

            // 3. SECURE REVEAL: Wait for frame synchronization
            requestAnimationFrame(() => {
                // Restore visibility only when we are ready to slide in
                this.contentArea.style.visibility = 'visible';
                this.contentArea.style.opacity = '1';

                // Determine transition direction based on a flag or heuristics (default to forward)
                // For simplicity, we check if the back-exit class was just present (cleaned up in prevQuestion)
                // ideally passed as arg, but this works given the flow:
                // prevQuestion adds back-exit -> waits -> showQuestion

                // Actually, cleaner to rely on caller or check state. 
                // Since this.showQuestion doesn't take args, we'll default to standard enter
                // UNLESS we want to add an argument. Let's make it standard 'enter' for now to keep it simple,
                // OR add the back-enter logic if we want full bi-directional feel.

                // NOTE: To support "Back" slide-in, we need to know direction.
                // Assuming standard "Next" flow for now as requested by user optimization focus.
                this.contentArea.classList.add('question-transition-enter');

                // Reset scroll for next question
                window.scrollTo({ top: 0, behavior: 'instant' });
            });

            // Cleanup enter class after animation completes
            setTimeout(() => {
                this.contentArea.classList.remove('question-transition-enter');
                this.contentArea.classList.remove('question-transition-back-enter'); // Cleanup potential back class
            }, 800);
        }
    }

    createOption(optionData, visualIndex) {
        // CRITICAL FIX: optionData is now an object with {text, originalIndex, id}
        // Extract text safely for both Object and String formats
        let optionText;
        let originalIndex;

        if (typeof optionData === 'object' && optionData !== null && optionData.text !== undefined) {
            optionText = optionData.text;
            originalIndex = optionData.originalIndex;
        } else {
            // Fallback for legacy string format
            optionText = String(optionData);
            originalIndex = visualIndex;
        }

        const option = document.createElement('div');
        option.className = 'option';
        option.tabIndex = 0;
        option.setAttribute('role', 'button');
        option.setAttribute('aria-label', `Option ${String.fromCharCode(65 + visualIndex)}: ${optionText}`);

        // CRITICAL: Store originalIndex on DOM element for retrieval in selectAnswer()
        option.dataset.originalIndex = originalIndex;
        option.dataset.visualIndex = visualIndex;

        const optionContent = document.createElement('div');
        optionContent.className = 'option-content';

        const optionLetter = document.createElement('div');
        optionLetter.className = 'option-letter';
        optionLetter.textContent = String.fromCharCode(65 + visualIndex);

        const optionText_el = document.createElement('div');
        optionText_el.className = 'option-text';
        optionText_el.textContent = optionText;

        optionContent.appendChild(optionLetter);
        optionContent.appendChild(optionText_el);
        option.appendChild(optionContent);

        const handleSelection = async (e) => {
            if (!this.hasAnswered) {
                if (window.HapticsEngine) HapticsEngine.selection();
                await this.selectAnswer(option, visualIndex, originalIndex);
            }
        };

        option.addEventListener('click', handleSelection);
        option.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelection(e);
            }
        });

        option.addEventListener('focus', () => {
            if (!this.hasAnswered) {
                this.selectedOptionIndex = visualIndex;
                option.classList.add('keyboard-selected');
                if (window.HapticsEngine) HapticsEngine.tap();
            }
        });

        option.addEventListener('blur', () => {
            option.classList.remove('keyboard-selected');
        });

        return option;
    }

    async selectAnswer(selectedOption, visualIndex, originalIndex) {
        this.hasAnswered = true;
        const currentQuestion = this.questions[this.currentIndex];

        // 1. Lock UI: Disable all options
        const allOptions = this.optionsContainer.querySelectorAll('.option');
        allOptions.forEach(opt => {
            opt.classList.add('disabled');
            opt.style.pointerEvents = 'none';
        });

        // 2. Visual Feedback: Show checking state
        selectedOption.classList.add('selected'); // Neutral state

        if (this.continueBtn) {
            this.continueBtn.disabled = true;
        }

        try {
            // 3. API Call: Verify answer with Backend (Practice Mode)
            const result = await this.app.checkAnswer(currentQuestion.id, originalIndex);

            selectedOption.classList.remove('selected'); // Remove neutral state

            if (result && result.success) {
                // A. Correct Answer
                if (result.is_correct) {
                    selectedOption.classList.add('correct');

                    this.score++;

                    if (window.HapticsEngine) HapticsEngine.notification('success');
                }
                // B. Incorrect Answer
                else {
                    selectedOption.classList.add('incorrect'); // CSS uses 'incorrect'

                    if (window.HapticsEngine) HapticsEngine.notification('error');

                    // Highlight the actual correct answer
                    // NOTE: dataset attributes are strings! compare with String() or ==
                    const correctOption = Array.from(allOptions).find(opt =>
                        opt.dataset.originalIndex == result.correct_answer_index
                    );

                    if (correctOption) {
                        correctOption.classList.add('correct');
                    }
                }

                // C. Show Explanation
                if (result.explanation) {
                    const existingExpl = document.getElementById('q-explanation');
                    if (existingExpl) existingExpl.remove();

                    const explDiv = document.createElement('div');
                    explDiv.id = 'q-explanation';
                    explDiv.className = 'explanation-card fade-in-up';
                    explDiv.style.cssText = 'margin-top: 1.5rem; padding: 1rem; background: var(--bg-secondary, #f5f5f7); border-radius: 12px; border-left: 4px solid var(--accent-color, #007aff); animation: fadeInUp 0.3s ease-out forwards;';
                    explDiv.innerHTML = `
                        <h4 style="margin:0 0 0.5rem 0; font-size: 0.9rem; text-transform:uppercase; color: var(--text-secondary, #666);">Explanation</h4>
                        <p style="margin:0; line-height: 1.5; color: var(--text-primary, #000);">${result.explanation}</p>
                    `;
                    this.optionsContainer.parentNode.appendChild(explDiv);

                    setTimeout(() => explDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
                }

            } else {
                // Fallback: Network Error or Offline
                console.warn('Grading result missing or failed');
                selectedOption.classList.add('selected'); // Revert to neutral
                selectedOption.innerHTML += ' <span style="font-size:0.8em;opacity:0.7">( Offline )</span>';
            }

        } catch (err) {
            console.error('Select answer flow error:', err);
            selectedOption.classList.remove('checking');
            selectedOption.classList.add('selected');
        } finally {
            // 4. ALWAYS Enable Navigation Button
            // 4. ALWAYS Enable Navigation Button
            if (this.continueBtn) {
                this.continueBtn.disabled = false;

                // Allow immediate click
                this.continueBtn.style.pointerEvents = 'auto';

                // Auto-focus button for keyboard users
                setTimeout(() => this.continueBtn.focus(), 150);
            }
        }
    }

    async prevQuestion() {
        if (this.currentIndex <= 0) return;

        // 1. Visual Transition (Backwards)
        if (this.contentArea) {
            this.contentArea.classList.add('question-transition-back-exit');
        }

        // 2. State Update
        this.currentIndex--;

        // 3. Background Persistence
        if (this.app.lastLectureId && harviDB) {
            harviDB.saveQuizProgress(this.app.lastLectureId, {
                currentIndex: this.currentIndex,
                score: this.score,
                questions: this.questions,
                metadata: this.metadata
            }).catch(console.warn);
        }

        // 4. Wait for Animation
        await new Promise(r => setTimeout(r, 400));

        // Remove the exit class (cleanup happens in showQuestion's reset logic too)
        if (this.contentArea) {
            this.contentArea.classList.remove('question-transition-back-exit');
        }

        this.showQuestion();
    }

    async nextQuestion() {
        if (!this.hasAnswered) return; // Prevent skipping by accidental double clicks

        // 1. Visual Transition (Start Immediately)
        if (this.contentArea) {
            this.contentArea.classList.add('question-transition-exit');
        }

        // 2. State Update (Synchronous)
        this.currentIndex++;

        // 3. Background Persistence (Non-blocking / Fire-and-Forget)
        // We do NOT await this. It happens in the background to avoid UI jank.
        if (this.app.lastLectureId && harviDB) {
            harviDB.saveQuizProgress(this.app.lastLectureId, {
                currentIndex: this.currentIndex,
                score: this.score,
                questions: this.questions,
                metadata: this.metadata
            }).catch(err => console.warn('Background progress save warning:', err));
        }

        // 4. Wait for Animation (Parallel with persistence)
        // Ensure strictly 400ms delay to match CSS transition
        await new Promise(r => setTimeout(r, 400));

        if (this.currentIndex < this.questions.length) {
            this.showQuestion();
        } else {
            this.finishQuiz();
        }
    }

    finishQuiz() {
        this.cleanup();

        // PRACTICE MODE UPDATE:
        // We have verified every answer individually via 'checkAnswer'.
        // The 'this.score' is now accurate and verified.
        // We can show results immediately without a batch submission.

        // Pass the locally verified results to the results screen logic
        this.app.showResults(
            this.score,
            this.questions.length,
            {
                ...this.metadata,
                mode: 'practice'
            }
        );
    }

    cleanup() {
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }

        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.removeEventListener('click', this.continueClickHandler);
        }

        const backToNavBtn = document.getElementById('back-to-nav');
        if (backToNavBtn) {
            backToNavBtn.removeEventListener('click', this.backClickHandler);
        }
    }

    updateProgress() {
        if (this.progressBar && this.currentQuestionElement) {
            const progress = ((this.currentIndex + 1) / this.questions.length) * 100;
            this.progressBar.style.width = `${progress}%`;
            this.currentQuestionElement.textContent = this.currentIndex + 1;
        }
    }

    triggerConfetti() {
        if (this.confettiCanvas && this.confetti) {
            this.confettiCanvas.style.display = 'block';
            this.confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
            setTimeout(() => {
                this.confettiCanvas.style.display = 'none';
            }, 3000);
        }
    }
}

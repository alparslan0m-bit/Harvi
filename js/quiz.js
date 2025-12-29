/**
 * Quiz Engine
 * Manages quiz state, question display, and answer selection
 * Features: Keyboard navigation, option shuffling, score calculation
 */
class Quiz {
    constructor(app) {
        this.app = app;
        this.questions = [];
        this.metadata = {};
        this.currentIndex = 0;
        this.score = 0;
        this.hasAnswered = false;
        this.selectedOptionIndex = -1;
        this.lastCorrectAnswer = false;
        
        // ADD THESE to store listener references
        this.keyboardHandler = null;  // ← Store reference
        this.continueClickHandler = null;
        this.backClickHandler = null;
        
        this.confettiCanvas = document.getElementById('confetti-canvas');
        this.confetti = this.confettiCanvas ? confetti.create(this.confettiCanvas, { resize: true }) : null;

        this.setupKeyboardNavigation();
        this.setupButtonListeners(); // ← Move button listeners to separate method
    }

    setupKeyboardNavigation() {
        // Only setup if not already set up
        if (this.keyboardHandler) {
            return; // Already set up
        }
        
        // Create a NAMED function that we can remove later
        this.keyboardHandler = (e) => {
            // Only handle if quiz screen is active
            if (!document.getElementById('quiz-screen')?.classList.contains('active')) {
                return;
            }
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateOptions('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateOptions('down');
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigateOptions('up');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigateOptions('down');
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    this.selectOptionWithKeyboard();
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case 'A':
                case 'B':
                case 'C':
                case 'D':
                    e.preventDefault();
                    this.selectOptionByKey(e.key);
                    break;
                case 'Escape':
                    e.preventDefault();
                    if (confirm('Are you sure you want to exit the quiz?')) {
                        this.app.resetApp();
                    }
                    break;
            }
        };
        
        // Add the listener
        document.addEventListener('keydown', this.keyboardHandler);
        console.log('🎹 Keyboard navigation enabled');
    }

    setupButtonListeners() {
        // Create and store button click handlers if not already created
        if (!this.continueClickHandler) {
            this.continueClickHandler = () => this.nextQuestion();
        }
        if (!this.backClickHandler) {
            this.backClickHandler = () => {
                if (confirm('Are you sure you want to exit the quiz?')) {
                    this.app.resetApp();
                }
            };
        }
        
        // Add listeners with stored references
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn && this.continueClickHandler) {
            continueBtn.addEventListener('click', this.continueClickHandler);
        }
        const backToNavBtn = document.getElementById('back-to-nav');
        if (backToNavBtn && this.backClickHandler) {
            backToNavBtn.addEventListener('click', this.backClickHandler);
        }
        
        console.log('🔘 Button listeners enabled');
    }

    navigateOptions(direction) {
        if (this.hasAnswered) return;

        const options = this.optionsContainer?.querySelectorAll('.option');
        if (!options || options.length === 0) return;

        if (this.selectedOptionIndex >= 0) {
            options[this.selectedOptionIndex].classList.remove('keyboard-selected');
        }

        if (direction === 'down') {
            this.selectedOptionIndex = this.selectedOptionIndex >= options.length - 1 ? 0 : this.selectedOptionIndex + 1;
        } else {
            this.selectedOptionIndex = this.selectedOptionIndex <= 0 ? options.length - 1 : this.selectedOptionIndex - 1;
        }

        if (this.selectedOptionIndex >= 0) {
            options[this.selectedOptionIndex].classList.add('keyboard-selected');
            options[this.selectedOptionIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    async selectOptionWithKeyboard() {
        if (this.hasAnswered || this.selectedOptionIndex < 0) return;

        const options = this.optionsContainer?.querySelectorAll('.option');
        if (!options || !options[this.selectedOptionIndex]) return;

        await this.selectAnswer(options[this.selectedOptionIndex], this.selectedOptionIndex);
    }

    async selectOptionByKey(key) {
        if (this.hasAnswered) return;

        const options = this.optionsContainer?.querySelectorAll('.option');
        if (!options || options.length === 0) return;

        let index = -1;
        
        if (key >= '1' && key <= '4') {
            index = parseInt(key) - 1;
        } else if (key >= 'A' && key <= 'D') {
            index = key.charCodeAt(0) - 65;
        }

        if (index >= 0 && index < options.length) {
            await this.selectAnswer(options[index], index);
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
        // ADD THIS CHECK at the very beginning
        const isResuming = metadata?.fromSavedProgress === true;
        
        // Re-setup event listeners if they were cleaned up
        if (!this.continueClickHandler || !this.backClickHandler) {
            this.setupButtonListeners();
        }
        
        // Initialize confetti (existing code)
        if (!this.confetti && !this.confettiCanvas) {
            this.confettiCanvas = document.getElementById('confetti-canvas');
            this.confetti = this.confettiCanvas ? confetti.create(this.confettiCanvas, { resize: true }) : null;
        }
        
        // CONDITIONAL SHUFFLING based on resume state
        if (isResuming) {
            // DON'T shuffle - questions are ALREADY shuffled and saved with correct indices
            console.log('📋 Resuming quiz - using pre-shuffled questions');
            this.questions = questions; // Use as-is, NO cloning, NO shuffling
        } else {
            // NEW quiz - perform full shuffle
            console.log('🎲 Starting new quiz - shuffling questions and options');
            
            // Deep clone questions to avoid mutating the original data
            const clonedQuestions = questions.map(q => ({
                ...q,
                options: Array.isArray(q.options) ? [...q.options] : q.options
            }));
            
            // Shuffle question order
            this.questions = this.shuffleArray(clonedQuestions);
            
            // Shuffle options for EACH question and update correctAnswer indices
            this.questions.forEach(question => {
                if (question && question.options && question.options.length > 0) {
                    const optionsWithIndices = question.options.map((text, index) => ({
                        text,
                        originalIndex: index
                    }));
                    
                    const shuffledOptions = this.shuffleArray([...optionsWithIndices]);
                    question.options = shuffledOptions.map(opt => opt.text);
                    
                    const correctOptionObject = shuffledOptions.find(opt => 
                        opt.originalIndex === question.correctAnswer
                    );
                    question.correctAnswer = shuffledOptions.indexOf(correctOptionObject);
                }
            });
        }
        
        // Rest of initialization (existing code)
        this.metadata = metadata;
        this.currentIndex = isResuming ? (metadata.currentIndex || 0) : 0;
        this.score = isResuming ? (metadata.score || 0) : 0;
        this.hasAnswered = false;
        this.selectedOptionIndex = -1;
        
        this.app.showScreen('quiz-screen');
        
        this.waitForDOMElements().then(() => {
            if (this.questionTextElement && this.optionsContainer) {
                this.showQuestion();
            } else {
                this.cleanup();
                this.app.showScreen('navigation-screen');
                alert('Error: Quiz interface failed to load. Please try again.');
            }
        }).catch(err => {
            this.cleanup();
            this.app.showScreen('navigation-screen');
            alert('Error: Quiz interface failed to load. Please try again.');
        });
    }

    async waitForDOMElements() {
        const maxAttempts = 20;
        const delayMs = 50;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            this.optionsContainer = document.getElementById('options-container');
            this.questionTextElement = document.getElementById('question-text');
            this.continueBtn = document.getElementById('continue-btn');
            this.progressBar = document.getElementById('progress-bar');
            this.currentQuestionElement = document.getElementById('current-question');
            this.totalQuestionsElement = document.getElementById('total-questions');
            
            if (this.optionsContainer && this.questionTextElement) {
                if (this.totalQuestionsElement) {
                    this.totalQuestionsElement.textContent = this.questions.length;
                }
                return true;
            }
            
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        throw new Error(`DOM elements not found after ${maxAttempts * delayMs}ms`);
    }

    showQuestion() {
        const currentQuestion = this.questions[this.currentIndex];
        
        // PHASE 1 FIX: showQuestion() is now a "dumb" renderer
        // The options are already shuffled in start(), so we just display them as-is
        // No re-shuffling happens here!
        
        this.hasAnswered = false;
        this.selectedOptionIndex = -1;
        
        if (this.progressBar && this.currentQuestionElement) {
            this.updateProgress();
        }
        
        if (this.questionTextElement && currentQuestion) {
            this.questionTextElement.textContent = currentQuestion.text || 'Question not found';
        }

        if (this.optionsContainer && currentQuestion && currentQuestion.options) {
            this.optionsContainer.innerHTML = '';
            
            // PHASE 1 FIX: Render pre-shuffled options directly from currentQuestion.options
            // The correctAnswer index in currentQuestion already points to the shuffled position
            currentQuestion.options.forEach((option, index) => {
                const optionElement = this.createOption(option, index);
                this.optionsContainer.appendChild(optionElement);
            });

            setTimeout(() => {
                const firstOption = this.optionsContainer.querySelector('.option');
                if (firstOption) {
                    firstOption.focus();
                }
            }, 100);
        }
        
        if (this.continueBtn) {
            this.continueBtn.disabled = true;
        }
    }
    
    createOption(text, index) {
        const option = document.createElement('div');
        option.className = 'option';
        option.tabIndex = 0;
        option.setAttribute('role', 'button');
        option.setAttribute('aria-label', `Option ${index + 1}: ${text}`);
        
        const optionContent = document.createElement('div');
        optionContent.className = 'option-content';
        
        const optionLetter = document.createElement('div');
        optionLetter.className = 'option-letter';
        optionLetter.textContent = String.fromCharCode(65 + index);
        
        const optionText = document.createElement('div');
        optionText.className = 'option-text';
        optionText.textContent = text;
        
        optionContent.appendChild(optionLetter);
        optionContent.appendChild(optionText);
        option.appendChild(optionContent);
        
        option.dataset.index = index;
        let touchStartTime = 0;
        let touchMoved = false;
        
        option.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            touchMoved = false;
            option.classList.add('touch-active');
            
            // Add haptic feedback on touch (selection tick)
            if (navigator.vibrate) {
                navigator.vibrate(5); // Light feedback - 5ms tick
            }
            
            // Note: e.preventDefault() removed to allow scrolling through long option lists
            // Touch action controlled via CSS touch-action: manipulation;
        }, { passive: false });
        
        option.addEventListener('touchmove', (e) => {
            touchMoved = true;
            option.classList.remove('touch-active');
        }, { passive: true });
        option.addEventListener('touchend', async (e) => {
            const touchDuration = Date.now() - touchStartTime;
            
            option.classList.remove('touch-active');
            
            if (!touchMoved && touchDuration < 500 && !this.hasAnswered) {
                e.preventDefault();
                e.stopPropagation();
                await this.selectAnswer(option, index);
            }
        }, { passive: false });
        
        option.addEventListener('click', async (e) => {
            if (!this.hasAnswered && !touchMoved) {
                await this.selectAnswer(option, index);
            }
        });

        option.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!this.hasAnswered) {
                    await this.selectAnswer(option, index);
                }
            }
        });

        option.addEventListener('focus', () => {
            if (!this.hasAnswered) {
                this.selectedOptionIndex = index;
                option.classList.add('keyboard-selected');
                
                // Add haptic feedback on focus (hover/keyboard navigation)
                if (navigator.vibrate) {
                    navigator.vibrate(3); // Subtle feedback - 3ms tick
                }
            }
        });

        option.addEventListener('blur', () => {
            option.classList.remove('keyboard-selected');
        });
        
        return option;
    }
    
    async selectAnswer(selectedOption, selectedIndex) {
        this.hasAnswered = true;
        const currentQuestion = this.questions[this.currentIndex];
        const correctAnswerIndex = currentQuestion.correctAnswer;
        
        const allOptions = this.optionsContainer ? this.optionsContainer.querySelectorAll('.option') : [];
        allOptions.forEach(option => {
            option.style.pointerEvents = 'none';
            option.classList.remove('keyboard-selected');
            option.setAttribute('tabindex', '-1');
        });
        
        // IMMEDIATE OPTIMISTIC UI FEEDBACK (before validation)
        if (window.OptimisticUI) {
            OptimisticUI.updateOptionSelection(selectedOption);
        }
        
        if (selectedIndex === correctAnswerIndex) {
            this.score++;
            selectedOption.classList.add('correct');
            celebrateCorrectAnswer(selectedOption);
            
            // Audio feedback for correct answer
            if (window.audioToolkit) {
                await audioToolkit.play('ding');
            }
            
            // Haptic feedback for correct answer using HapticsEngine
            if (window.HapticsEngine) {
                HapticsEngine.success();
            }
        } else {
            selectedOption.classList.add('incorrect');
            const correctOption = this.optionsContainer.children[correctAnswerIndex];
            if (correctOption) {
                correctOption.classList.add('correct');
            }
            
            // Audio feedback for incorrect answer
            if (window.audioToolkit) {
                await audioToolkit.play('thud');
            }
            
            // Haptic feedback for incorrect answer using HapticsEngine
            if (window.HapticsEngine) {
                HapticsEngine.failure();
            }
        }
        
        if (this.continueBtn) {
            this.continueBtn.disabled = false;
            this.continueBtn.focus();
        }
    }

    
    /**
     * Move to next question with real-time progress saving
     * Ensures quiz progress is saved after each question for resume capability
     */
    async nextQuestion() {
        this.currentIndex++;
        this.hasAnswered = false;
        this.selectedOptionIndex = -1;
        
        // Save progress in real-time for recovery if app crashes
        try {
            if (this.app.lastLectureId && harviDB) {
                await harviDB.saveQuizProgress(this.app.lastLectureId, {
                    currentIndex: this.currentIndex,
                    score: this.score,
                    questions: this.questions,
                    metadata: this.metadata
                });
            }
        } catch (error) {
            console.warn('Failed to save progress:', error);
            // Continue even if save fails
        }
        
        if (this.currentIndex < this.questions.length) {
            this.showQuestion();
        } else {
            this.finishQuiz();
        }
    }
    
    finishQuiz() {
        // Cleanup confetti canvas to prevent memory leaks
        this.cleanup();
        this.app.showResults(this.score, this.questions.length, this.metadata);
    }
    
    cleanup() {
        console.log('🧹 Cleaning up quiz resources...');
        
        // 1. Remove keyboard event listener
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
            console.log('✓ Keyboard listener removed');
        }
        
        // 2. Remove button click listeners
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn && this.continueClickHandler) {
            continueBtn.removeEventListener('click', this.continueClickHandler);
            this.continueClickHandler = null;
        }
        
        const backToNavBtn = document.getElementById('back-to-nav');
        if (backToNavBtn && this.backClickHandler) {
            backToNavBtn.removeEventListener('click', this.backClickHandler);
            this.backClickHandler = null;
        }
        
        // 3. Clean up confetti canvas (existing code)
        if (this.confettiCanvas) {
            if (this.confetti) {
                try {
                    const ctx = this.confettiCanvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
                    }
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }
            this.confettiCanvas.style.display = 'none';
        }
        
        // 4. Reset confetti instance reference
        this.confetti = null;
        
        // 5. Clear any timers/intervals if they exist
        if (this.progressSaveTimer) {
            clearTimeout(this.progressSaveTimer);
            this.progressSaveTimer = null;
        }
        
        console.log('✓ Quiz cleanup complete');
    }
    
    updateProgress() {
        if (this.progressBar && this.currentQuestionElement) {
            const progress = ((this.currentIndex + 1) / this.questions.length) * 100;
            this.progressBar.style.width = `${progress}%`;
            this.currentQuestionElement.textContent = this.currentIndex + 1;
            
            // Subtle haptic tick on progress update
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
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
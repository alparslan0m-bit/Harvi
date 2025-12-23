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

        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.nextQuestion());
        }

        const backToNavBtn = document.getElementById('back-to-nav');
        if (backToNavBtn) {
            backToNavBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to exit the quiz?')) {
                    this.app.resetApp();
                }
            });
        }
        
        this.confettiCanvas = document.getElementById('confetti-canvas');
        this.confetti = this.confettiCanvas ? confetti.create(this.confettiCanvas, { resize: true }) : null;

        this.setupKeyboardNavigation();
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('quiz-screen').classList.contains('active')) {
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
        });
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

    selectOptionWithKeyboard() {
        if (this.hasAnswered || this.selectedOptionIndex < 0) return;

        const options = this.optionsContainer?.querySelectorAll('.option');
        if (!options || !options[this.selectedOptionIndex]) return;

        this.selectAnswer(options[this.selectedOptionIndex], this.selectedOptionIndex);
    }

    selectOptionByKey(key) {
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
            this.selectAnswer(options[index], index);
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
        // Reinitialize confetti canvas if needed (in case it was cleaned up)
        if (!this.confettiCanvas) {
            this.confettiCanvas = document.getElementById('confetti-canvas');
            this.confetti = this.confettiCanvas ? confetti.create(this.confettiCanvas, { resize: true }) : null;
        }
        
        this.questions = this.shuffleArray([...questions]);
        this.metadata = metadata;
        this.currentIndex = 0;
        this.score = 0;
        this.hasAnswered = false;
        this.selectedOptionIndex = -1;
        
        this.app.showScreen('quiz-screen');
        
        this.waitForDOMElements().then(() => {
            if (this.questionTextElement && this.optionsContainer) {
                this.showQuestion();
            } else {
                this.cleanup();
                this.app.showScreen('nav-screen');
                alert('Error: Quiz interface failed to load. Please try again.');
            }
        }).catch(err => {
            this.cleanup();
            this.app.showScreen('nav-screen');
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
        const question = this.questions[this.currentIndex];
        this.hasAnswered = false;
        this.selectedOptionIndex = -1;
        
        if (this.progressBar && this.currentQuestionElement) {
            this.updateProgress();
        }
        
        if (this.questionTextElement && question) {
            this.questionTextElement.textContent = question.text || 'Question not found';
        }

        if (question && question.options) {
            const optionsWithIndices = question.options.map((text, index) => ({
                text,
                originalIndex: index
            }));
            
            const shuffledOptions = this.shuffleArray([...optionsWithIndices]);
            
            question.options = shuffledOptions.map(opt => opt.text);
            const correctOptionObject = shuffledOptions.find(opt => opt.originalIndex === question.correctAnswer);
            question.correctAnswer = shuffledOptions.indexOf(correctOptionObject);
        }
        
        if (this.optionsContainer && question && question.options) {
            this.optionsContainer.innerHTML = '';
            
            question.options.forEach((option, index) => {
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
            
            e.preventDefault();
        }, { passive: false });
        
        option.addEventListener('touchmove', (e) => {
            touchMoved = true;
            option.classList.remove('touch-active');
        }, { passive: true });
        option.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;
            
            option.classList.remove('touch-active');
            
            if (!touchMoved && touchDuration < 500 && !this.hasAnswered) {
                e.preventDefault();
                e.stopPropagation();
                this.selectAnswer(option, index);
            }
        }, { passive: false });
        
        option.addEventListener('click', (e) => {
            if (!this.hasAnswered && !touchMoved) {
                this.selectAnswer(option, index);
            }
        });

        option.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!this.hasAnswered) {
                    this.selectAnswer(option, index);
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
    
    selectAnswer(selectedOption, selectedIndex) {
        this.hasAnswered = true;
        const currentQuestion = this.questions[this.currentIndex];
        const correctAnswerIndex = currentQuestion.correctAnswer;
        
        const allOptions = this.optionsContainer ? this.optionsContainer.querySelectorAll('.option') : [];
        allOptions.forEach(option => {
            option.style.pointerEvents = 'none';
            option.classList.remove('keyboard-selected');
            option.setAttribute('tabindex', '-1');
        });
        
        if (selectedIndex === correctAnswerIndex) {
            this.score++;
            selectedOption.classList.add('correct');
            celebrateCorrectAnswer(selectedOption);
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
        // Clean up confetti canvas and instance
        if (this.confettiCanvas) {
            // Clear any ongoing animations
            if (this.confetti) {
                try {
                    // Reset canvas if confetti library supports it
                    const ctx = this.confettiCanvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
                    }
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }
            // Hide canvas
            this.confettiCanvas.style.display = 'none';
        }
        // Reset confetti instance reference
        this.confetti = null;
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
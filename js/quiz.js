class Quiz {
    constructor(app) {
        this.app = app;
        this.questions = [];
        this.metadata = {};
        this.currentIndex = 0;
        this.score = 0;
        this.hasAnswered = false;
        this.selectedOptionIndex = -1;

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
        await this.selectAnswer(options[this.selectedOptionIndex], this.selectedOptionIndex);
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

        this.metadata = metadata;
        this.currentIndex = isResuming ? (metadata.currentIndex || 0) : 0;
        this.score = isResuming ? (metadata.score || 0) : 0;
        this.hasAnswered = false;
        this.selectedOptionIndex = -1;

        this.app.showScreen('quiz-screen');

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
                currentQuestion.options.forEach((option, index) => {
                    const optionElement = this.createOption(option, index);
                    this.optionsContainer.appendChild(optionElement);
                });
            }

            if (this.progressBar) this.updateProgress();
            if (this.continueBtn) this.continueBtn.disabled = true;

            // 3. SECURE REVEAL: Wait for frame synchronization
            requestAnimationFrame(() => {
                // Restore visibility only when we are ready to slide in
                this.contentArea.style.visibility = 'visible';
                this.contentArea.style.opacity = '1';
                this.contentArea.classList.add('question-transition-enter');

                // Reset scroll for next question
                window.scrollTo({ top: 0, behavior: 'instant' });
            });

            // Cleanup enter class after animation completes
            setTimeout(() => {
                this.contentArea.classList.remove('question-transition-enter');
            }, 800);
        }
    }

    createOption(text, index) {
        const option = document.createElement('div');
        option.className = 'option';
        option.tabIndex = 0;
        option.setAttribute('role', 'button');
        option.setAttribute('aria-label', `Option ${String.fromCharCode(65 + index)}: ${text}`);

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

        const handleSelection = async (e) => {
            if (!this.hasAnswered) {
                if (window.HapticsEngine) HapticsEngine.selection();
                await this.selectAnswer(option, index);
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
                this.selectedOptionIndex = index;
                option.classList.add('keyboard-selected');
                if (window.HapticsEngine) HapticsEngine.tap();
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

        const allOptions = this.optionsContainer.querySelectorAll('.option');
        allOptions.forEach(opt => {
            opt.classList.add('disabled');
            opt.style.pointerEvents = 'none';
        });

        if (selectedIndex === correctAnswerIndex) {
            this.score++;
            selectedOption.classList.add('correct');

            // Swap Letter with Checkmark for undisputed clarity
            const letterEl = selectedOption.querySelector('.option-letter');
            if (letterEl) letterEl.textContent = '✓';

            if (window.celebrateCorrectAnswer) {
                window.celebrateCorrectAnswer(selectedOption);
            }

            if (window.HapticsEngine) HapticsEngine.success();
            if (window.audioToolkit) audioToolkit.play('ding');
        } else {
            selectedOption.classList.add('incorrect');

            // Swap Letter with Cross
            const letterEl = selectedOption.querySelector('.option-letter');
            if (letterEl) letterEl.textContent = '✕';

            const correctOption = this.optionsContainer.children[correctAnswerIndex];
            if (correctOption) {
                correctOption.classList.add('correct');
                // Also show checkmark on the correct one
                const correctLetterEl = correctOption.querySelector('.option-letter');
                if (correctLetterEl) correctLetterEl.textContent = '✓';
            }
            if (window.HapticsEngine) HapticsEngine.failure();
            if (window.audioToolkit) audioToolkit.play('thud');
        }

        if (this.continueBtn) {
            this.continueBtn.disabled = false;
            // Delay focus slightly to allow animations to settle
            setTimeout(() => this.continueBtn.focus(), 300);
        }
    }

    async nextQuestion() {
        if (!this.hasAnswered) return; // Prevent skipping by accidental double clicks

        if (this.contentArea) {
            this.contentArea.classList.add('question-transition-exit');
            await new Promise(r => setTimeout(r, 400));
        }

        this.currentIndex++;

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
            console.warn('Progress save failed:', error);
        }

        if (this.currentIndex < this.questions.length) {
            this.showQuestion();
        } else {
            this.finishQuiz();
        }
    }

    finishQuiz() {
        this.cleanup();
        this.app.showResults(this.score, this.questions.length, this.metadata);
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

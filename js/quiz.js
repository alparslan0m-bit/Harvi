// quiz.js
class Quiz {
    constructor(app) {
        this.app = app;
        this.questions = [];
        this.metadata = {};
        this.currentIndex = 0;
        this.score = 0;
        this.hasAnswered = false;
        this.selectedOptionIndex = -1;
        this.lastCorrectAnswer = false; // Track if the last answer was correct

        // Attaching a single event listener for the continue button.
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.nextQuestion());
        }

        // Attaching a single event listener for the back button.
        const backToNavBtn = document.getElementById('back-to-nav');
        if (backToNavBtn) {
            backToNavBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to exit the quiz?')) {
                    this.app.resetApp();
                }
            });
        }
        
        // Initialize confetti once.
        this.confettiCanvas = document.getElementById('confetti-canvas');
        this.confetti = this.confettiCanvas ? confetti.create(this.confettiCanvas, { resize: true }) : null;

        // Add keyboard navigation
        this.setupKeyboardNavigation();
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Only handle keyboard events when quiz screen is active
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

        // Remove previous selection
        if (this.selectedOptionIndex >= 0) {
            options[this.selectedOptionIndex].classList.remove('keyboard-selected');
        }

        // Calculate new selection
        if (direction === 'down') {
            this.selectedOptionIndex = this.selectedOptionIndex >= options.length - 1 ? 0 : this.selectedOptionIndex + 1;
        } else {
            this.selectedOptionIndex = this.selectedOptionIndex <= 0 ? options.length - 1 : this.selectedOptionIndex - 1;
        }

        // Add selection to new option
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
        
        // Map number keys and letter keys to option indices
        if (key >= '1' && key <= '4') {
            index = parseInt(key) - 1;
        } else if (key >= 'A' && key <= 'D') {
            index = key.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
        }

        if (index >= 0 && index < options.length) {
            this.selectAnswer(options[index], index);
        }
    }

    start(questions, metadata) { // Add metadata parameter
        // Reset quiz state for a new test
        this.questions = questions;
        this.metadata = metadata;
        this.currentIndex = 0;
        this.score = 0;
        this.hasAnswered = false; // Reset hasAnswered for a new quiz
        this.selectedOptionIndex = -1;
        
        // Add debugging
        console.log('Quiz started with questions:', questions);
        console.log('Metadata:', metadata);
        
        // Activate the quiz screen AND THEN get the DOM elements
        this.app.showScreen('quiz-screen');
        
        // Wait a bit for the screen to be visible, then get DOM elements
        setTimeout(() => {
            // Get DOM elements immediately after screen change
            this.optionsContainer = document.getElementById('options-container');
            this.questionTextElement = document.getElementById('question-text');
            this.continueBtn = document.getElementById('continue-btn');
            this.progressBar = document.getElementById('progress-bar');
            this.currentQuestionElement = document.getElementById('current-question');
            this.totalQuestionsElement = document.getElementById('total-questions');
            
            // Add debugging for DOM elements
            console.log('DOM elements found:', {
                optionsContainer: !!this.optionsContainer,
                questionTextElement: !!this.questionTextElement,
                continueBtn: !!this.continueBtn,
                progressBar: !!this.progressBar,
                currentQuestionElement: !!this.currentQuestionElement
            });
            
            if (this.totalQuestionsElement) {
                this.totalQuestionsElement.textContent = questions.length;
            }

            // Only call showQuestion if DOM elements are found
            if (this.questionTextElement && this.optionsContainer) {
                this.showQuestion();
            } else {
                console.error('Required DOM elements not found');
            }
        }, 100);
    }

    showQuestion() {
        const question = this.questions[this.currentIndex];
        this.hasAnswered = false;
        this.selectedOptionIndex = -1;
        
        // Add debugging to check if questions are loaded
        console.log('Current question:', question);
        console.log('Questions array:', this.questions);
        console.log('Options container:', this.optionsContainer);
        console.log('Question text element:', this.questionTextElement);
        
        // Only call updateProgress if elements exist
        if (this.progressBar && this.currentQuestionElement) {
            this.updateProgress();
        }
        
        if (this.questionTextElement && question) {
            // Use the correct property name from your JSON
            this.questionTextElement.textContent = question.text || 'Question not found';
            console.log('Question text set to:', question.text);
        }
        
        if (this.optionsContainer && question && question.options) {
            this.optionsContainer.innerHTML = '';
            console.log('Creating options for:', question.options);
            
            question.options.forEach((option, index) => {
                const optionElement = this.createOption(option, index);
                this.optionsContainer.appendChild(optionElement);
                console.log('Added option:', option);
            });

            // Set focus to first option for keyboard navigation
            setTimeout(() => {
                const firstOption = this.optionsContainer.querySelector('.option');
                if (firstOption) {
                    firstOption.focus();
                }
            }, 100);
        } else {
            console.error('Missing elements or data:', {
                optionsContainer: !!this.optionsContainer,
                question: !!question,
                options: question ? question.options : 'no question'
            });
        }
        
        if (this.continueBtn) {
            this.continueBtn.disabled = true;
        }
    }
    
    createOption(text, index) {
        const option = document.createElement('div');
        option.className = 'option';
        option.tabIndex = 0; // Make focusable
        option.setAttribute('role', 'button');
        option.setAttribute('aria-label', `Option ${index + 1}: ${text}`);
        
        const optionContent = document.createElement('div');
        optionContent.className = 'option-content';
        
        const optionLetter = document.createElement('div');
        optionLetter.className = 'option-letter';
        optionLetter.textContent = String.fromCharCode(65 + index); // A, B, C, D
        
        const optionText = document.createElement('div');
        optionText.className = 'option-text';
        optionText.textContent = text;
        
        optionContent.appendChild(optionLetter);
        optionContent.appendChild(optionText);
        option.appendChild(optionContent);
        
        option.dataset.index = index;
        
        // Mouse click handler
        option.addEventListener('click', () => {
            if (!this.hasAnswered) {
                this.selectAnswer(option, index);
            }
        });

        // Keyboard handlers
        option.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!this.hasAnswered) {
                    this.selectAnswer(option, index);
                }
            }
        });

        // Focus handlers for visual feedback
        option.addEventListener('focus', () => {
            if (!this.hasAnswered) {
                this.selectedOptionIndex = index;
                option.classList.add('keyboard-selected');
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
            option.setAttribute('tabindex', '-1'); // Remove from tab order after selection
        });
        
        if (selectedIndex === correctAnswerIndex) {
            this.score++;
            selectedOption.classList.add('correct');
            this.triggerConfetti();
        } else {
            selectedOption.classList.add('incorrect');
            const correctOption = this.optionsContainer.children[correctAnswerIndex];
            if (correctOption) {
                correctOption.classList.add('correct');
            }
        }
        
        if (this.continueBtn) {
            this.continueBtn.disabled = false;
            this.continueBtn.focus(); // Focus the continue button after selection
        }
    }
    
    nextQuestion() {
        this.currentIndex++;
        if (this.currentIndex < this.questions.length) {
            this.showQuestion();
        } else {
            this.finishQuiz();
        }
    }
    
    finishQuiz() {
        this.app.showResults(this.score, this.questions.length, this.metadata); // Pass metadata
    }
    
    updateProgress() {
        // Add null checks to prevent errors
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
            // Hide confetti after a short delay
            setTimeout(() => {
                this.confettiCanvas.style.display = 'none';
            }, 3000);
        }
    }
}
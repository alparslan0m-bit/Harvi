// results.js
class Results {
    constructor(app) {
        this.app = app;
        this.bindEvents();
        this.lastQuizQuestions = null;
        this.lastQuizMetadata = null;
    }

    bindEvents() {
        document.getElementById('retake-quiz').addEventListener('click', () => {
            if (this.lastQuizQuestions && this.lastQuizMetadata) {
                this.app.startQuiz(this.lastQuizQuestions, this.lastQuizMetadata);
            }
        });

        document.getElementById('back-to-home').addEventListener('click', () => {
            this.app.resetApp();
        });
    }

    show(score, total, metadata) { // Add metadata parameter
        this.app.showScreen('results-screen');
        
        // Store the questions and metadata for the "Retake Quiz" button
        this.lastQuizQuestions = this.app.currentQuiz.questions;
        this.lastQuizMetadata = metadata;

        const percentage = Math.round((score / total) * 100);
        
        // Update score display
        document.getElementById('score-number').textContent = score;
        document.getElementById('total-score').textContent = total;
        document.getElementById('score-percentage').textContent = `${percentage}%`;
        
        // Update message based on performance
        const messageElement = document.getElementById('results-message');
        let message = '';
        let color = '';
        
        if (percentage >= 90) {
            message = 'Outstanding! You have excellent knowledge!';
            color = '#10B981';
        } else if (percentage >= 70) {
            message = 'Great job! Keep up the good work!';
            color = '#3B82F6';
        } else if (percentage >= 50) {
            message = 'Good effort! A bit more practice will help!';
            color = '#F59E0B';
        } else {
            message = 'Keep studying! You can do better next time!';
            color = '#EF4444';
        }
        
        messageElement.textContent = message;
        document.getElementById('score-percentage').style.color = color;
        
        // Animate score counter
        this.animateScore(score);
    }

    animateScore(targetScore) {
        const scoreElement = document.getElementById('score-number');
        let currentScore = 0;
        const increment = targetScore / 30;
        const timer = setInterval(() => {
            currentScore += increment;
            if (currentScore >= targetScore) {
                currentScore = targetScore;
                clearInterval(timer);
            }
            scoreElement.textContent = Math.floor(currentScore);
        }, 30);
    }
}
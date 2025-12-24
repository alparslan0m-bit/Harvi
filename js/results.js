/**
 * Results Screen Manager
 * Handles quiz results display, sharing, and retake functionality
 */
class Results {
    constructor(app) {
        this.app = app;
        this.bindEvents();
        this.lastQuizQuestions = null;
        this.lastQuizMetadata = null;
        this.lastScore = 0;
        this.lastTotal = 0;
    }

    bindEvents() {
        document.getElementById('retake-quiz').addEventListener('click', () => {
            // PHASE 2 FIX: Use master copy (unshuffled original) instead of session questions
            // This ensures retakes start fresh without the previous session's shuffle corruption
            if (this.app.masterCopyQuestions && this.lastQuizMetadata) {
                this.app.startQuiz(this.app.masterCopyQuestions, this.lastQuizMetadata);
            } else if (this.lastQuizQuestions && this.lastQuizMetadata) {
                // Fallback: if master copy not available, use what we have
                this.app.startQuiz(this.lastQuizQuestions, this.lastQuizMetadata);
            }
        });

        document.getElementById('back-to-home').addEventListener('click', () => {
            this.app.resetApp();
        });

        // Share button event listener (if exists)
        const shareBtn = document.getElementById('share-results');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.shareResults());
        }
    }

    show(score, total, metadata = {}) {
        this.app.showScreen('results-screen');
        
        this.lastQuizMetadata = metadata && typeof metadata === 'object' ? metadata : {};
        this.lastQuizQuestions = this.app.currentQuiz.questions;
        this.lastScore = score;
        this.lastTotal = total;

        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
        
        document.getElementById('score-number').textContent = score;
        document.getElementById('total-score').textContent = total;
        document.getElementById('score-percentage').textContent = `${percentage}%`;
        
        const messageElement = document.getElementById('results-message');
        let message = '';
        let color = '';
        let notificationIcon = '';
        let notificationType = '';
        
        if (percentage >= 90) {
            message = 'Outstanding! You have excellent knowledge!';
            color = '#10B981';
            notificationIcon = '🏆';
            notificationType = 'success';
        } else if (percentage >= 70) {
            message = 'Great job! Keep up the good work!';
            color = '#3B82F6';
            notificationIcon = '⭐';
            notificationType = 'success';
        } else if (percentage >= 50) {
            message = 'Good effort! A bit more practice will help!';
            color = '#F59E0B';
            notificationIcon = '📚';
            notificationType = 'info';
        } else {
            message = 'Keep studying! You can do better next time!';
            color = '#EF4444';
            notificationIcon = '💪';
            notificationType = 'info';
        }
        
        messageElement.textContent = message;
        document.getElementById('score-percentage').style.color = color;
        
        // Show Dynamic Island notification for quiz completion
        if (window.dynamicIsland) {
            window.dynamicIsland.show({
                title: `${notificationIcon} Quiz Complete!`,
                subtitle: `${score}/${total} correct (${percentage}%)`,
                type: notificationType,
                duration: 4000, // Auto-dismiss after 4 seconds
                onTap: () => {
                    // User can tap to close or dismiss
                    window.dynamicIsland.hide();
                }
            });
        }
        
        // Show share button if Web Share API is available
        if (navigator.share) {
            const shareBtn = document.getElementById('share-results');
            if (shareBtn) {
                shareBtn.style.display = 'inline-block';
            }
        }
        
        this.animateScore(score);
        celebrateQuizCompletion(score, total);
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

    async shareResults() {
        const percentage = Math.round((this.lastScore / this.lastTotal) * 100);
        const shareTitle = 'My Quiz Results - Harvi';
        const shareText = `I scored ${this.lastScore}/${this.lastTotal} (${percentage}%) on the Harvi medical quiz! Can you beat my score?`;
        
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([5, 10, 5]);
        }

        try {
            // Share text using Web Share API
            if (navigator.share) {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: window.location.href
                });
            } else {
                // Fallback to clipboard if Web Share API not available
                this.copyToClipboard(shareText);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.warn('Share error:', error);
                this.copyToClipboard(shareText);
            }
        }
    }

    /**
     * Fallback: Copy result text to clipboard
     */
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                console.log('Result copied to clipboard');
                // Optional: Show toast notification
            }).catch(() => {
                console.warn('Clipboard copy failed');
            });
        }
    }
}
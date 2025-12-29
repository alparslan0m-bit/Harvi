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

    /**
     * Lazy-load html2canvas library for screenshot sharing
     */
    async loadHtml2Canvas() {
        if (window.html2canvas) return; // Already loaded

        try {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.async = true;

            return new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        } catch (error) {
            console.warn('Failed to load html2canvas library:', error);
        }
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
            // Try screenshot if html2canvas is available
            if (window.html2canvas) {
                await this.shareWithScreenshot(shareTitle, shareText);
            } else if (navigator.share) {
                // Fallback: Share text only using Web Share API
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: window.location.href
                });
            } else {
                // Last resort: Copy to clipboard
                this.copyToClipboard(shareText);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.warn('Share error:', error);
                // Try next fallback option
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: shareTitle,
                            text: shareText,
                            url: window.location.href
                        });
                    } catch (shareError) {
                        this.copyToClipboard(shareText);
                    }
                } else {
                    this.copyToClipboard(shareText);
                }
            }
        }
    }

    /**
     * Share results with screenshot using html2canvas
     * Falls back gracefully if html2canvas unavailable
     */
    async shareWithScreenshot(title, text) {
        try {
            // Lazy-load html2canvas if not available
            if (!window.html2canvas) {
                await this.loadHtml2Canvas();
            }

            if (!window.html2canvas) {
                throw new Error('html2canvas not loaded');
            }

            const resultsContainer = document.getElementById('results-container');
            if (!resultsContainer) {
                throw new Error('Results container not found');
            }

            const canvas = await window.html2canvas(resultsContainer, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                allowTaint: true
            });

            canvas.toBlob(async (blob) => {
                try {
                    // Try Web Share API with file if available
                    if (navigator.share && navigator.canShare && blob) {
                        const file = new File([blob], 'quiz-results.png', { type: 'image/png' });
                        if (navigator.canShare({ files: [file] })) {
                            await navigator.share({
                                title: title,
                                text: text,
                                files: [file]
                            });
                            return;
                        }
                    }
                    
                    // Fallback to text sharing
                    if (navigator.share) {
                        await navigator.share({
                            title: title,
                            text: text,
                            url: window.location.href
                        });
                    } else {
                        this.copyToClipboard(text);
                    }
                } catch (shareError) {
                    console.warn('Screenshot share failed, falling back:', shareError);
                    this.copyToClipboard(text);
                }
            }, 'image/png');
        } catch (error) {
            console.warn('Screenshot generation failed:', error);
            // Fallback to text-only sharing
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: title,
                        text: text,
                        url: window.location.href
                    });
                } catch (shareError) {
                    this.copyToClipboard(text);
                }
            } else {
                this.copyToClipboard(text);
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
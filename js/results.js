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
            if (this.lastQuizQuestions && this.lastQuizMetadata) {
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
        
        // PHASE 1: Invalidate stats cache so fresh stats are shown on stats screen
        if (this.app && this.app.invalidateStatsCache) {
            this.app.invalidateStatsCache();
        }
        
        // Record activity for gamification tracking
        this.recordGamificationProgress(score, total, percentage);
        
        this.animateScore(score);
        celebrateQuizCompletion(score, total);
    }

    /**
     * Record gamification progress (streaks, heatmap, badges)
     */
    recordGamificationProgress(score, total, percentage) {
        try {
            // Record quiz completion for streak tracking
            if (window.StreakTracker) {
                const tracker = new StreakTracker();
                tracker.recordQuizCompletion();
            }
            
            // Record heatmap activity
            if (window.HeatmapGenerator) {
                const heatmap = new HeatmapGenerator('#activity-heatmap');
                heatmap.recordActivity(new Date());
            }
            
            // Get stats for badge checking
            if (window.StatisticsAggregator && window.BadgeSystem) {
                // WIRED: Use getCachedStats from app instead of expensive recalculation
                this.app.getCachedStats().then(stats => {
                    if (stats) {
                        const unlocked = BadgeSystem.getUnlockedBadges(stats);
                        if (unlocked && unlocked.length > 0) {
                            unlocked.forEach(badge => {
                                console.log('🏆 Badge unlocked:', badge.name);
                                if (window.HapticsEngine) {
                                    try { HapticsEngine.strongPulse(); } catch (e) { }
                                }
                                if (window.audioToolkit) {
                                    try { audioToolkit.play('celebration'); } catch (e) { }
                                }
                            });
                        }
                    }
                }).catch(e => console.warn('Badge check failed:', e));
            }
        } catch (e) {
            console.warn('Gamification tracking error:', e);
        }
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

    /**
     * Share Quiz Results using Web Share API
     * Generates a summary card and shares it via native share sheet
     */
    async shareResults() {
        const percentage = Math.round((this.lastScore / this.lastTotal) * 100);
        const shareTitle = 'My Quiz Results - Harvi';
        const shareText = `I scored ${this.lastScore}/${this.lastTotal} (${percentage}%) on the Harvi medical quiz! Can you beat my score?`;
        
        // PHASE 3: Ensure fonts are loaded before generating image for professional quality
        try {
            await document.fonts.ready;
        } catch (e) {
            console.warn('Font loading check failed:', e);
        }
        
        // PHASE 3: Haptic feedback (iOS-style short pulses instead of long 50ms vibrate)
        if (navigator.vibrate) {
            navigator.vibrate([5, 10, 5]);
        }

        try {
            // Generate and share result card image
            const canvas = await this.generateResultCard();
            
            if (canvas && navigator.share) {
                // Convert canvas to blob and share
                canvas.toBlob(async (blob) => {
                    const file = new File([blob], 'quiz-results.png', { type: 'image/png' });
                    
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        try {
                            await navigator.share({
                                title: shareTitle,
                                text: shareText,
                                files: [file],
                                url: window.location.href
                            });
                        } catch (err) {
                            // Fallback if file sharing fails
                            this.fallbackShare(shareTitle, shareText);
                        }
                    } else {
                        // Fallback if file sharing not supported
                        this.fallbackShare(shareTitle, shareText);
                    }
                });
            } else if (navigator.share) {
                // Share text only if canvas generation failed
                this.fallbackShare(shareTitle, shareText);
            }
        } catch (error) {
            console.warn('Share error:', error);
            this.fallbackShare('My Quiz Results', shareText);
        }
    }

    /**
     * Fallback share method for text-only sharing
     */
    fallbackShare(title, text) {
        navigator.share({
            title: title,
            text: text,
            url: window.location.href
        }).catch((error) => {
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error);
                // Show fallback copy-to-clipboard option
                this.copyToClipboard(text);
            }
        });
    }

    /**
     * Generate a visual result card as canvas image
     */
    async generateResultCard() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const percentage = Math.round((this.lastScore / this.lastTotal) * 100);

            // Canvas dimensions
            canvas.width = 800;
            canvas.height = 600;

            // Background gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#0EA5E9');
            gradient.addColorStop(1, '#14B8A6');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // White card with shadow
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetY = 10;
            ctx.fillRect(50, 100, 700, 400);

            // Reset shadow
            ctx.shadowColor = 'transparent';

            // Title
            ctx.font = 'bold 48px "Inter", sans-serif';
            ctx.fillStyle = '#1F2937';
            ctx.textAlign = 'center';
            ctx.fillText('Quiz Completed!', 400, 180);

            // Score circle
            const circleX = 400;
            const circleY = 300;
            const radius = 80;
            
            // Circle background
            ctx.fillStyle = '#F0F9FF';
            ctx.beginPath();
            ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
            ctx.fill();

            // Circle border (gradient)
            const circleGradient = ctx.createLinearGradient(circleX - radius, circleY - radius, circleX + radius, circleY + radius);
            circleGradient.addColorStop(0, '#0EA5E9');
            circleGradient.addColorStop(1, '#14B8A6');
            ctx.strokeStyle = circleGradient;
            ctx.lineWidth = 4;
            ctx.stroke();

            // Score text
            ctx.font = 'bold 64px "Inter", sans-serif';
            ctx.fillStyle = '#0EA5E9';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${percentage}%`, circleX, circleY);

            // Score label
            ctx.font = '24px "Inter", sans-serif';
            ctx.fillStyle = '#475569';
            ctx.fillText(`${this.lastScore}/${this.lastTotal} correct`, 400, 450);

            // Harvi branding
            ctx.font = 'bold 32px "Inter", sans-serif';
            ctx.fillStyle = '#6B7280';
            ctx.textAlign = 'center';
            ctx.fillText('Harvi', 400, 530);

            return canvas;
        } catch (error) {
            console.warn('Canvas generation failed:', error);
            return null;
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
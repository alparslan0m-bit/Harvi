/**
 * Gamification Utilities & Progress Visualization
 * Heatmap, streak tracking, and shareable result cards
 */

// ============================================
// DAILY STREAK TRACKER
// ============================================

class StreakTracker {
    constructor() {
        this.STORAGE_KEY = 'harvi_streak_data';
        this.LAST_SESSION_KEY = 'harvi_last_session_date';
        this.init();
    }

    init() {
        this.loadStreak();
        this.checkStreakContinuation();
    }

    loadStreak() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            this.streak = JSON.parse(data);
        } else {
            this.streak = {
                current: 0,
                longest: 0,
                lastDate: null,
                totalDays: 0
            };
        }
    }

    saveStreak() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.streak));
    }

    checkStreakContinuation() {
        const today = new Date().toDateString();
        const lastSession = localStorage.getItem(this.LAST_SESSION_KEY);

        if (lastSession !== today) {
            const lastDate = this.streak.lastDate ? new Date(this.streak.lastDate) : null;
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (lastDate && lastDate.toDateString() === yesterday.toDateString()) {
                // Streak continues
                this.streak.current++;
                if (this.streak.current > this.streak.longest) {
                    this.streak.longest = this.streak.current;
                }
            } else if (!lastDate || lastDate.toDateString() !== today) {
                // Streak broken or first day
                this.streak.current = 1;
            }

            this.streak.totalDays++;
            this.streak.lastDate = today;
            this.saveStreak();
            localStorage.setItem(this.LAST_SESSION_KEY, today);
        }
    }

    recordQuizCompletion() {
        this.checkStreakContinuation();
        return this.streak.current;
    }

    getStreak() {
        return this.streak;
    }
}

// ============================================
// HEATMAP GENERATOR (GitHub-style)
// ============================================

class HeatmapGenerator {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.STORAGE_KEY = 'harvi_heatmap_data';
        this.loadData();
    }

    loadData() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            this.data = JSON.parse(data);
        } else {
            this.data = {};
        }
    }

    recordActivity(date = null) {
        const dateStr = date ? new Date(date).toDateString() : new Date().toDateString();
        this.data[dateStr] = (this.data[dateStr] || 0) + 1;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    }

    render() {
        if (!this.container) return;

        const now = new Date();
        const grid = document.createElement('div');
        grid.className = 'heatmap-grid';

        // Generate last 56 days (8 weeks)
        for (let i = 55; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();

            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';

            const count = this.data[dateStr] || 0;
            const intensity = this.getIntensity(count);

            if (intensity > 0) {
                cell.classList.add(`intensity-${intensity}`);
            }

            const tooltip = document.createElement('div');
            tooltip.className = 'heatmap-cell-tooltip';
            tooltip.textContent = `${count} quiz${count !== 1 ? 'zes' : ''} on ${this.formatDate(date)}`;

            cell.appendChild(tooltip);
            grid.appendChild(cell);
        }

        this.container.innerHTML = '';
        this.container.appendChild(grid);
    }

    getIntensity(count) {
        if (count === 0) return 0;
        if (count <= 2) return 1;
        if (count <= 4) return 2;
        if (count <= 6) return 3;
        if (count <= 8) return 4;
        return 5;
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
}

// ============================================
// PROGRESS CIRCLE ANIMATOR
// ============================================

class ProgressCircleAnimator {
    static create(percentage, container) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 200 200');

        // Background circle
        const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bgCircle.setAttribute('cx', '100');
        bgCircle.setAttribute('cy', '100');
        bgCircle.setAttribute('r', '90');
        bgCircle.setAttribute('class', 'progress-circle-background');

        // Gradient definition
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', 'progress-gradient');
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '100%');

        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#0EA5E9');

        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', '#14B8A6');

        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);

        // Progress circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '100');
        circle.setAttribute('cy', '100');
        circle.setAttribute('r', '90');
        circle.setAttribute('class', 'progress-circle-fill');
        
        const circumference = 2 * Math.PI * 90;
        circle.setAttribute('stroke-dasharray', circumference);
        circle.style.animation = `fill-progress 2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`;
        
        // Calculate dash offset for percentage
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;

        svg.appendChild(defs);
        svg.appendChild(bgCircle);
        svg.appendChild(circle);

        const textContainer = document.createElement('div');
        textContainer.className = 'progress-circle-text';
        textContainer.innerHTML = `
            <div class="progress-circle-percentage">${Math.round(percentage)}%</div>
            <div class="progress-circle-label">Complete</div>
        `;

        container.appendChild(svg);
        container.appendChild(textContainer);
    }
}

// ============================================
// SHAREABLE RESULT CARD GENERATOR
// ============================================

class ResultCardGenerator {
    static async generateImage(score, totalQuestions, lectureTitle) {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.innerHTML = this.buildCardHTML(score, totalQuestions, lectureTitle);
        document.body.appendChild(container);

        // Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const canvas = await html2canvas(container);
            document.body.removeChild(container);
            return canvas.toDataURL('image/png');
        } catch (e) {
            console.warn('Result card generation failed:', e);
            document.body.removeChild(container);
            return null;
        }
    }

    static buildCardHTML(score, totalQuestions, lectureTitle) {
        const percentage = Math.round((score / totalQuestions) * 100);
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        return `
            <div class="result-card-container">
                <div class="result-card-header">
                    <div class="result-card-logo">🏥</div>
                    <p class="result-card-title">HARVI ACHIEVEMENT</p>
                </div>

                <div class="result-card-body">
                    <div class="result-card-score">${score}/${totalQuestions}</div>
                    <div class="result-card-score-label">${percentage}% Correct</div>
                    
                    <div class="result-card-breakdown">
                        <div class="result-card-stat">
                            <span class="result-card-stat-value">${percentage}%</span>
                            <span class="result-card-stat-label">Score</span>
                        </div>
                        <div class="result-card-stat">
                            <span class="result-card-stat-value">${score}</span>
                            <span class="result-card-stat-label">Correct</span>
                        </div>
                    </div>
                </div>

                <div class="result-card-footer">
                    <p class="result-card-date">${dateStr}</p>
                    <p class="result-card-cta">Keep Learning 📚</p>
                </div>
            </div>
        `;
    }

    static downloadImage(imageUrl, filename = 'harvi-result.png') {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    static shareViaURL(imageUrl) {
        // For sharing to social media
        if (navigator.share) {
            fetch(imageUrl)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], 'harvi-result.png', { type: 'image/png' });
                    navigator.share({
                        files: [file],
                        title: 'My Harvi Quiz Result',
                        text: 'Check out my score on Harvi! 🏥'
                    });
                });
        }
    }
}

// ============================================
// ACHIEVEMENT BADGES SYSTEM
// ============================================

class BadgeSystem {
    static ACHIEVEMENTS = {
        'first-quiz': {
            name: 'First Step',
            desc: 'Complete your first quiz',
            icon: '🎯',
            condition: (stats) => stats.totalQuizzes >= 1
        },
        'perfect-score': {
            name: 'Perfect Score',
            desc: 'Get 100% on any quiz',
            icon: '⭐',
            condition: (stats) => stats.perfectScores > 0
        },
        'streak-7': {
            name: '7-Day Streak',
            desc: 'Study 7 days in a row',
            icon: '🔥',
            condition: (stats) => stats.streak >= 7
        },
        'streak-30': {
            name: '30-Day Streak',
            desc: 'Study 30 days in a row',
            icon: '🌟',
            condition: (stats) => stats.streak >= 30
        },
        'quiz-100': {
            name: 'Century Club',
            desc: 'Complete 100 quizzes',
            icon: '🏆',
            condition: (stats) => stats.totalQuizzes >= 100
        },
        'speed-demon': {
            name: 'Speed Demon',
            desc: 'Complete a quiz in under 2 minutes',
            icon: '⚡',
            condition: (stats) => stats.fastestQuizTime < 120
        },
        'consistency': {
            name: 'Consistency King',
            desc: 'Maintain 80%+ average score',
            icon: '👑',
            condition: (stats) => stats.averageScore >= 80
        },
        'comeback': {
            name: 'Comeback',
            desc: 'Improve score by 30% on retake',
            icon: '📈',
            condition: (stats) => stats.bestImprovement >= 30
        }
    };

    static getUnlockedBadges(stats) {
        const unlocked = [];
        for (const [key, badge] of Object.entries(this.ACHIEVEMENTS)) {
            if (badge.condition(stats)) {
                unlocked.push({ id: key, ...badge });
            }
        }
        return unlocked;
    }

    static renderBadges(containerSelector, stats) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        const unlocked = this.getUnlockedBadges(stats);
        const all = Object.entries(this.ACHIEVEMENTS);

        container.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'badge-grid';

        all.forEach(([id, badge]) => {
            const badgeEl = document.createElement('div');
            const isUnlocked = unlocked.some(b => b.id === id);
            
            badgeEl.className = `badge ${isUnlocked ? 'unlocked' : 'locked'}`;
            badgeEl.innerHTML = `
                <div class="badge-icon">${badge.icon}</div>
                <h3 class="badge-name">${badge.name}</h3>
                <p class="badge-desc">${badge.desc}</p>
                <div class="badge-tooltip">${badge.desc}</div>
            `;

            if (isUnlocked) {
                badgeEl.style.opacity = '1';
                badgeEl.style.cursor = 'pointer';
                badgeEl.addEventListener('click', () => {
                    HapticsEngine.success();
                    audioToolkit.play('ding');
                    SpringPhysics.bounce(badgeEl);
                });
            }

            grid.appendChild(badgeEl);
        });

        container.appendChild(grid);
    }
}

// ============================================
// STATISTICS AGGREGATOR
// ============================================

class StatisticsAggregator {
    static async aggregateStats() {
        try {
            const allProgress = await harviDB.getAllQuizProgress();
            
            let stats = {
                totalQuizzes: allProgress.length,
                perfectScores: 0,
                averageScore: 0,
                totalCorrect: 0,
                totalQuestions: 0,
                fastestQuizTime: Infinity,
                bestImprovement: 0
            };

            let totalScore = 0;

            for (const progress of allProgress) {
                const score = Math.round((progress.correctCount / progress.questions.length) * 100);
                totalScore += score;

                if (score === 100) {
                    stats.perfectScores++;
                }

                stats.totalCorrect += progress.correctCount;
                stats.totalQuestions += progress.questions.length;

                if (progress.completionTime) {
                    stats.fastestQuizTime = Math.min(stats.fastestQuizTime, progress.completionTime);
                }

                // Check for improvement on retakes
                // This would need to be tracked in your DB
            }

            stats.averageScore = totalScore / allProgress.length || 0;
            stats.streak = (new StreakTracker()).getStreak().current;

            return stats;
        } catch (e) {
            console.warn('Failed to aggregate stats:', e);
            return null;
        }
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize features when DOM is ready
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StreakTracker,
        HeatmapGenerator,
        ProgressCircleAnimator,
        ResultCardGenerator,
        BadgeSystem,
        StatisticsAggregator
    };
}

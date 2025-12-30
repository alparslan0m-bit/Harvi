/**
 * Stats Screen Manager - Premium Dashboard Edition
 * Displays quiz history and performance statistics in a Bento Grid
 */
class Stats {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('stats-content');
    }

    /**
     * Initialize and display statistics
     */
    async init() {
        if (!this.container) return;

        try {
            const results = await harviDB.getAllResults();
            this.renderStats(results);
        } catch (error) {
            console.error('Failed to load stats:', error);
            this.renderError();
        }
    }

    /**
     * Render statistics content using Bento Grid Layout
     */
    renderStats(results) {
        if (!results || results.length === 0) {
            this.renderEmptyState();
            return;
        }

        // 1. Process Data
        const stats = this.calculateStats(results);
        const streak = this.calculateStreak(results);
        const weeklyData = this.calculateWeeklyActivity(results);

        // 2. Build Dashboard
        this.container.innerHTML = `
            <div class="stats-grid">
                <!-- 1. Flame/Streak Widget -->
                <div class="bento-card streak-widget">
                    <div class="card-header">
                        <svg class="card-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C15.63 9.13 15.63 6.9 15.63 6.9C15.63 6.9 14.53 7.63 13.78 8.88C13.25 9.77 13.56 10.42 13.68 10.88C13.84 11.53 13.43 12.18 12.78 12.33C12.13 12.48 11.48 12.07 11.33 11.42C11.13 10.59 11.47 9.49 12.24 8.24C12.98 7.02 12.63 5.42 11.44 4.67C10.25 3.92 8.65 4.26 7.9 5.45C7.29 6.42 6.96 7.55 6.96 8.7C6.96 12.72 10.24 16 14.26 16C18.28 16 21.56 12.72 21.56 8.7C21.56 7.15 21.09 5.7 20.28 4.5C20.28 4.5 20.27 4.5 20.27 4.5C20.22 8.5 17.66 11.2 17.66 11.2Z" /></svg>
                        <span>Streak</span>
                    </div>
                    <div class="metric-value">${streak} <span class="metric-unit">days</span></div>
                    <div class="metric-context">${streak > 1 ? "You're on fire! 🔥" : "Keep it going!"}</div>
                    <div class="flame-container">🔥</div>
                </div>

                <!-- 2. Accuracy Ring Widget -->
                <div class="bento-card accuracy-widget">
                    <div class="ring-container">
                        <svg class="ring-svg" viewBox="0 0 100 100">
                            <circle class="ring-bg" cx="50" cy="50" r="40" />
                            <circle class="ring-progress" cx="50" cy="50" r="40" />
                        </svg>
                        <div class="ring-center-text">
                            <span class="ring-percent">${stats.averageScore}%</span>
                        </div>
                    </div>
                    <div class="ring-label">Average Accuracy</div>
                </div>

                <!-- 3. Weekly Activity Chart (Span 2) -->
                <div class="bento-card col-span-2">
                    <div class="card-header">
                        <svg class="card-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
                        <span>Weekly Activity</span>
                    </div>
                    <div class="chart-container">
                        ${weeklyData.map(day => `
                            <div class="bar-column ${day.isToday ? 'today' : ''}">
                                <div class="bar-bg">
                                    <div class="bar-fill" style="height: ${Math.min(day.count * 10, 100)}%;"></div>
                                </div>
                                <div class="bar-label">${day.label}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- 4. Total Quizzes -->
                <div class="bento-card">
                    <div class="card-header">
                        <svg class="card-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H6V4h2v5l2.5-1.5L13 9V4h5v16z"/></svg>
                        <span>Completed</span>
                    </div>
                    <div class="metric-value">${stats.totalQuizzes}</div>
                    <div class="metric-context" style="color: #3B82F6;">Quizzes</div>
                </div>

                <!-- 5. Best Score -->
                <div class="bento-card">
                    <div class="card-header">
                        <svg class="card-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                        <span>Best Run</span>
                    </div>
                    <div class="metric-value" style="color: #34C759;">${stats.bestScore}%</div>
                    <div class="metric-context">High Score</div>
                </div>
            </div>

            <!-- Recent History List -->
            <h3 class="list-section-title">Recent History</h3>
            <div class="ios-list-group">
                ${results.slice(0, 10).map((result, index) => this.renderListItem(result, index)).join('')}
            </div>
        `;

        // 3. Post-Render Animations
        requestAnimationFrame(() => {
            // Animate Ring
            const ring = this.container.querySelector('.ring-progress');
            if (ring) {
                // Calculate circumference (2 * PI * 40 ≈ 251)
                const offset = 251 - (251 * stats.averageScore) / 100;
                ring.style.strokeDashoffset = offset;

                // Color based on score
                if (stats.averageScore >= 80) ring.style.stroke = '#34C759'; // Green
                else if (stats.averageScore >= 50) ring.style.stroke = '#FF9500'; // Orange
                else ring.style.stroke = '#FF3B30'; // Red
            }


        });
    }

    renderListItem(result, index) {
        // Initials from lecture name
        const initials = (result.lectureName || 'L').substring(0, 2).toUpperCase();
        const scoreClass = result.percentage >= 80 ? 'score-high' : (result.percentage >= 50 ? 'score-med' : 'score-low');

        return `
            <div class="ios-list-item">
                <div class="item-icon-box color-${index % 5}">
                    ${initials}
                </div>
                <div class="item-content">
                    <div class="item-title">${result.lectureName || `Lecture ${result.lectureId}`}</div>
                    <div class="item-subtitle">${new Date(result.date).toLocaleDateString()} • ${result.total} Questions</div>
                </div>
                <div class="item-trailing">
                    <div class="score-badge ${scoreClass}">${result.percentage}%</div>
                    <div class="item-chevron"></div>
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        this.container.innerHTML = `
            <div class="stats-empty">
                <div class="stats-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20V10M18 20V4M6 20v-4"/>
                    </svg>
                </div>
                <h3>No Data Yet</h3>
                <p>Complete your first quiz to see your performance metrics here.</p>
            </div>
        `;
    }

    renderError() {
        this.container.innerHTML = `
            <div class="stats-error">
                <div class="stats-error-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                </div>
                <h3>Unable to Load Statistics</h3>
                <p>We couldn't retrieve your progress data. Please try again later.</p>
            </div>
       `;
    }

    // --- Helpers ---

    calculateStats(results) {
        const totalQuizzes = results.length;
        const totalScore = results.reduce((sum, r) => sum + (r.percentage || 0), 0);
        return {
            totalQuizzes,
            averageScore: Math.round(totalScore / totalQuizzes),
            bestScore: Math.max(...results.map(r => r.percentage || 0))
        };
    }

    calculateStreak(results) {
        // Sort by date descending
        const dates = [...new Set(results.map(r => new Date(r.date).toDateString()))];
        let streak = 0;
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        // Check if user played today
        let hasPlayedToday = dates.includes(today);
        if (!hasPlayedToday && !dates.includes(yesterday)) return 0;

        let currentDate = new Date();
        // If not played today, start checking from yesterday for streak continuity
        if (!hasPlayedToday) currentDate.setDate(currentDate.getDate() - 1);

        while (true) {
            const dateStr = currentDate.toDateString();
            if (dates.includes(dateStr)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }

    calculateWeeklyActivity(results) {
        const week = [];
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayStr = d.toDateString();

            // Count quizzes for this day
            const count = results.filter(r => new Date(r.date).toDateString() === dayStr).length;

            week.push({
                label: days[d.getDay()],
                count: count,
                isToday: i === 0
            });
        }
        return week;
    }
}
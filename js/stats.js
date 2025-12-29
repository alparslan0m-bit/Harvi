/**
 * Stats Screen Manager
 * Displays quiz history and performance statistics
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
     * Render statistics content
     */
    renderStats(results) {
        if (!results || results.length === 0) {
            this.container.innerHTML = `
                <div class="stats-empty">
                    <div class="stats-empty-icon">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 3v18h18M7 16v-8m4 8V8m4 8v-4m4 4V6"/>
                        </svg>
                    </div>
                    <h3>No Statistics Yet</h3>
                    <p>Complete some quizzes to see your progress here!</p>
                </div>
            `;
            return;
        }

        // Calculate statistics
        const totalQuizzes = results.length;
        const totalScore = results.reduce((sum, r) => sum + (r.percentage || 0), 0);
        const averageScore = Math.round(totalScore / totalQuizzes);
        const bestScore = Math.max(...results.map(r => r.percentage || 0));
        const recentResults = results.slice(0, 5); // Last 5 quizzes

        this.container.innerHTML = `
            <div class="stats-overview">
                <div class="stats-card">
                    <div class="stats-number">${totalQuizzes}</div>
                    <div class="stats-label">Total Quizzes</div>
                </div>
                <div class="stats-card">
                    <div class="stats-number">${averageScore}%</div>
                    <div class="stats-label">Average Score</div>
                </div>
                <div class="stats-card">
                    <div class="stats-number">${bestScore}%</div>
                    <div class="stats-label">Best Score</div>
                </div>
            </div>

            <div class="stats-recent">
                <h3>Recent Performance</h3>
                <div class="recent-list">
                    ${recentResults.map(result => `
                        <div class="recent-item">
                            <div class="recent-info">
                                <div class="recent-title">${result.lectureName || `Lecture ${result.lectureId}`}</div>
                                <div class="recent-date">${new Date(result.date).toLocaleDateString()}</div>
                            </div>
                            <div class="recent-score">${result.percentage || 0}%</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderError() {
        this.container.innerHTML = `
            <div class="stats-error">
                <div class="stats-error-icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="m15 9-6 6m0-6 6 6"/>
                    </svg>
                </div>
                <h3>Unable to Load Statistics</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
}
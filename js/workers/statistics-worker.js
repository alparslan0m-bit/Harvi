/**
 * Statistics Aggregator Worker
 * 
 * Runs statistical calculations off the main thread
 * Main thread stays at 60 FPS while heavy computations happen here
 * 
 * Messages received:
 * - { type: 'aggregate', quizResults: [...] }
 * - { type: 'calculate', stats: {...} }
 */

class StatisticsProcessor {
    constructor() {
        this.quizResults = [];
        this.stats = null;
    }

    /**
     * Aggregate quiz results into statistics
     * Heavy computation - perfect for worker
     */
    aggregateResults(quizResults) {
        const total = quizResults.length;
        if (total === 0) {
            return {
                total: 0,
                correct: 0,
                incorrect: 0,
                accuracy: 0,
                averageTime: 0,
                byModule: {},
                byDifficulty: {},
                trend: []
            };
        }

        let correct = 0;
        let totalTime = 0;
        const byModule = {};
        const byDifficulty = { 1: [], 2: [], 3: [], 4: [], 5: [] };
        const trend = [];

        quizResults.forEach((result, index) => {
            if (result.isCorrect) correct++;
            
            totalTime += result.timeSpent || 0;

            // By module
            if (!byModule[result.moduleId]) {
                byModule[result.moduleId] = {
                    total: 0,
                    correct: 0,
                    accuracy: 0
                };
            }
            byModule[result.moduleId].total++;
            if (result.isCorrect) byModule[result.moduleId].correct++;

            // By difficulty
            const difficulty = result.difficulty || 3;
            byDifficulty[difficulty].push(result.isCorrect ? 1 : 0);

            // Calculate trend (moving average of last 10)
            if (index % 10 === 9 || index === total - 1) {
                const lastTen = quizResults.slice(Math.max(0, index - 9), index + 1);
                const tenCorrect = lastTen.filter(r => r.isCorrect).length;
                trend.push({
                    index: index,
                    accuracy: (tenCorrect / lastTen.length) * 100
                });
            }
        });

        // Calculate accuracy by difficulty
        const difficultyStats = {};
        for (let d = 1; d <= 5; d++) {
            const answers = byDifficulty[d];
            if (answers.length > 0) {
                difficultyStats[d] = {
                    total: answers.length,
                    correct: answers.reduce((a, b) => a + b, 0),
                    accuracy: (answers.reduce((a, b) => a + b, 0) / answers.length) * 100
                };
            }
        }

        // Calculate module accuracy
        Object.keys(byModule).forEach(moduleId => {
            const module = byModule[moduleId];
            module.accuracy = (module.correct / module.total) * 100;
        });

        return {
            total,
            correct,
            incorrect: total - correct,
            accuracy: (correct / total) * 100,
            averageTime: totalTime / total,
            byModule,
            byDifficulty: difficultyStats,
            trend,
            calculated: Date.now()
        };
    }

    /**
     * Calculate additional metrics
     */
    calculateMetrics(stats) {
        if (!stats || stats.total === 0) {
            return {
                strongAreas: [],
                weakAreas: [],
                recommendedFocus: [],
                practiceStreak: 0
            };
        }

        const moduleStats = stats.byModule;
        const modules = Object.entries(moduleStats)
            .map(([id, data]) => ({
                moduleId: id,
                accuracy: data.accuracy
            }))
            .sort((a, b) => b.accuracy - a.accuracy);

        const strong = modules.slice(0, 3);
        const weak = modules.slice(-3).reverse();

        return {
            strongAreas: strong.map(m => m.moduleId),
            weakAreas: weak.map(m => m.moduleId),
            recommendedFocus: weak.map(m => m.moduleId),
            overallAccuracy: stats.accuracy,
            trend: stats.trend || []
        };
    }
}

const processor = new StatisticsProcessor();

// Listen for messages from main thread
self.addEventListener('message', (event) => {
    const { type, data, id } = event.data;

    try {
        let result;

        if (type === 'aggregate') {
            // Decode ArrayBuffer (zero-copy transfer)
            const quizResults = decodeQuizResults(data.buffer);
            result = processor.aggregateResults(quizResults);
        } else if (type === 'calculate') {
            result = processor.calculateMetrics(data.stats);
        } else {
            throw new Error(`Unknown message type: ${type}`);
        }

        // Send result back to main thread
        self.postMessage({
            type,
            success: true,
            result,
            timestamp: Date.now(),
            id
        });

    } catch (error) {
        // Send error back to main thread
        self.postMessage({
            type,
            success: false,
            error: error.message,
            timestamp: Date.now(),
            id
        });
    }
});

/**
 * Decode ArrayBuffer quiz results (zero-copy format)
 */
function decodeQuizResults(buffer) {
    const view = new DataView(buffer);
    const count = view.getUint32(0, true);
    const results = [];

    for (let i = 0; i < count; i++) {
        const offset = 4 + i * 16;
        results.push({
            moduleId: view.getUint32(offset, true),
            isCorrect: view.getUint8(offset + 4) === 1,
            timeSpent: view.getUint32(offset + 5, true),
            difficulty: view.getUint8(offset + 9)
        });
    }

    return results;
}

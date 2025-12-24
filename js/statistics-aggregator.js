/**
 * Statistics Worker Manager - Main Thread Interface
 * 
 * Spawns web worker for heavy statistics calculations
 * Main thread delegates computation, stays at 60 FPS
 * Binary encoding via ArrayBuffer + Transferables for zero-copy
 */

class StatisticsWorkerManager {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.pendingRequests = new Map();
        this.requestId = 0;
    }

    /**
     * Initialize the worker
     */
    init() {
        if (this.isInitialized) return;

        try {
            this.worker = new Worker('./js/workers/statistics-worker.js');
            
            this.worker.addEventListener('message', (event) => {
                this.onWorkerMessage(event);
            });

            this.worker.addEventListener('error', (event) => {
                console.error('[StatisticsAggregator] Worker error:', event.message);
            });

            this.isInitialized = true;
            console.log('[StatisticsAggregator] Worker initialized');
        } catch (error) {
            console.warn('[StatisticsAggregator] Worker not available, using main thread:', error);
            this.isInitialized = true; // Fallback to main thread
        }
    }

    /**
     * Aggregate quiz results using zero-copy ArrayBuffer transfer
     */
    async aggregateResults(quizResults) {
        if (!this.isInitialized) {
            this.init();
        }

        // Fallback to main thread if no worker
        if (!this.worker) {
            return this.aggregateResultsMainThread(quizResults);
        }

        return new Promise((resolve, reject) => {
            const id = this.requestId++;
            
            // Store promise handlers
            this.pendingRequests.set(id, { resolve, reject });

            // Convert data to binary for zero-copy transfer
            const buffer = this.encodeQuizResults(quizResults);

            // Send to worker with Transferable object (zero-copy)
            // The worker receives the buffer directly without copying
            this.worker.postMessage({
                type: 'aggregate',
                data: { buffer },
                id
            }, [buffer]); // Pass as Transferable - main thread loses access

            // Timeout after 10s
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Statistics calculation timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Encode quiz results to ArrayBuffer for zero-copy transfer
     * Format: [count:4][...per-result-data...]
     */
    encodeQuizResults(quizResults) {
        // Simple binary encoding: 4-byte count, then compact per-result data
        const buffer = new ArrayBuffer(4 + quizResults.length * 16);
        const view = new DataView(buffer);

        // Write count
        view.setUint32(0, quizResults.length, true);

        // Write each result (moduleId: 4, isCorrect: 1, timeSpent: 4, difficulty: 1, padding: 6)
        quizResults.forEach((result, i) => {
            const offset = 4 + i * 16;
            view.setUint32(offset, result.moduleId || 0, true);
            view.setUint8(offset + 4, result.isCorrect ? 1 : 0);
            view.setUint32(offset + 5, result.timeSpent || 0, true);
            view.setUint8(offset + 9, result.difficulty || 3);
        });

        return buffer;
    }

    /**
     * Decode ArrayBuffer back to quiz results (in worker)
     */
    static decodeQuizResults(buffer) {
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

    /**
     * Calculate metrics (offloaded to worker)
     */
    async calculateMetrics(stats) {
        if (!this.isInitialized) {
            this.init();
        }

        if (!this.worker) {
            return this.calculateMetricsMainThread(stats);
        }

        return new Promise((resolve, reject) => {
            const id = this.requestId++;
            
            this.pendingRequests.set(id, { resolve, reject });

            this.worker.postMessage({
                type: 'calculate',
                data: { stats },
                id
            });

            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Metrics calculation timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Handle worker message
     */
    onWorkerMessage(event) {
        const { type, success, result, error, id } = event.data;

        const pending = this.pendingRequests.get(id);
        if (!pending) return;

        this.pendingRequests.delete(id);

        if (success) {
            pending.resolve(result);
        } else {
            pending.reject(new Error(error));
        }
    }

    /**
     * Fallback: Main thread aggregation
     */
    aggregateResultsMainThread(quizResults) {
        const total = quizResults.length;
        if (total === 0) {
            return {
                total: 0,
                correct: 0,
                accuracy: 0,
                byModule: {},
                byDifficulty: {}
            };
        }

        let correct = 0;
        const byModule = {};

        quizResults.forEach(result => {
            if (result.isCorrect) correct++;
            
            if (!byModule[result.moduleId]) {
                byModule[result.moduleId] = { total: 0, correct: 0 };
            }
            byModule[result.moduleId].total++;
            if (result.isCorrect) byModule[result.moduleId].correct++;
        });

        Object.keys(byModule).forEach(id => {
            const m = byModule[id];
            m.accuracy = (m.correct / m.total) * 100;
        });

        return {
            total,
            correct,
            accuracy: (correct / total) * 100,
            byModule
        };
    }

    /**
     * Fallback: Main thread metrics calculation
     */
    calculateMetricsMainThread(stats) {
        if (!stats || stats.total === 0) {
            return {
                strongAreas: [],
                weakAreas: [],
                recommendedFocus: []
            };
        }

        const modules = Object.entries(stats.byModule || {})
            .map(([id, data]) => ({
                moduleId: id,
                accuracy: data.accuracy
            }))
            .sort((a, b) => b.accuracy - a.accuracy);

        return {
            strongAreas: modules.slice(0, 3).map(m => m.moduleId),
            weakAreas: modules.slice(-3).map(m => m.moduleId),
            recommendedFocus: modules.slice(-3).map(m => m.moduleId)
        };
    }

    /**
     * Terminate worker
     */
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}

// Global instance - use StatisticsWorkerManager
window.__StatisticsWorkerManager = new StatisticsWorkerManager();

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.__StatisticsWorkerManager.init();
    });
} else {
    window.__StatisticsWorkerManager.init();
}

/**
 * Database Sync Manager - Main Thread Interface
 * 
 * Offloads IndexedDB writes to worker (HarviDB)
 * Stores: lectures, quizProgress, quizResults, settings, syncQueue
 * Keeps main thread at 60 FPS during data persistence
 */

class DatabaseSyncManager {
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
            this.worker = new Worker('./js/workers/db-sync-worker.js');

            this.worker.addEventListener('message', (event) => {
                this.onWorkerMessage(event);
            });

            this.worker.addEventListener('error', (event) => {
                console.error('[DatabaseSyncManager] Worker error:', event.message);
            });

            this.isInitialized = true;
            console.log('[DatabaseSyncManager] Worker initialized');
        } catch (error) {
            console.warn('[DatabaseSyncManager] Worker not available:', error);
            this.isInitialized = true;
        }
    }

    /**
     * Save data to IndexedDB (via worker)
     */
    async save(store, data) {
        if (!this.isInitialized) {
            this.init();
        }

        if (!this.worker) {
            return this.saveMainThread(store, data);
        }

        return new Promise((resolve, reject) => {
            const id = this.requestId++;

            this.pendingRequests.set(id, { resolve, reject });

            this.worker.postMessage({
                type: 'save',
                data: { store, data },
                id
            });

            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Save operation timeout'));
                }
            }, 5000);
        });
    }

    /**
     * Batch save operations
     */
    async batchSave(operations) {
        if (!this.isInitialized) {
            this.init();
        }

        if (!this.worker) {
            return Promise.all(
                operations.map(op => this.saveMainThread(op.store, op.data))
            );
        }

        return new Promise((resolve, reject) => {
            const id = this.requestId++;

            this.pendingRequests.set(id, { resolve, reject });

            this.worker.postMessage({
                type: 'batchSave',
                data: { operations },
                id
            });

            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Batch save timeout'));
                }
            }, 5000);
        });
    }

    /**
     * Delete from IndexedDB
     */
    async delete(store, key) {
        if (!this.isInitialized) {
            this.init();
        }

        if (!this.worker) {
            return this.deleteMainThread(store, key);
        }

        return new Promise((resolve, reject) => {
            const id = this.requestId++;

            this.pendingRequests.set(id, { resolve, reject });

            this.worker.postMessage({
                type: 'delete',
                data: { store, key },
                id
            });

            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Delete operation timeout'));
                }
            }, 5000);
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
     * Fallback: Main thread save
     */
    async saveMainThread(store, data) {
        // Use harviDB.db (the actual IDBDatabase instance)
        if (!window.harviDB || !window.harviDB.db || !window.harviDB.db.objectStoreNames.contains(store)) {
            console.warn(`[DatabaseSyncManager] Store ${store} not available in HarviDB`);
            return null;
        }

        try {
            const tx = window.harviDB.db.transaction([store], 'readwrite');
            const objectStore = tx.objectStore(store);
            return new Promise((resolve, reject) => {
                const request = objectStore.put(data);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`[DatabaseSyncManager] Save failed for ${store}:`, error);
            throw error;
        }
    }

    /**
     * Fallback: Main thread delete
     */
    async deleteMainThread(store, key) {
        if (!window.harviDB || !window.harviDB.db || !window.harviDB.db.objectStoreNames.contains(store)) {
            return null;
        }

        try {
            const tx = window.harviDB.db.transaction([store], 'readwrite');
            const objectStore = tx.objectStore(store);
            return new Promise((resolve, reject) => {
                const request = objectStore.delete(key);
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`[DatabaseSyncManager] Delete failed:`, error);
            throw error;
        }
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

// Global instance
window.__DatabaseSyncManager = new DatabaseSyncManager();

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.__DatabaseSyncManager.init();
    });
} else {
    window.__DatabaseSyncManager.init();
}

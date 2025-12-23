/**
 * IndexedDB Module - Harvi PWA
 * Handles offline-first data persistence and caching
 */
class HarviDatabase {
    constructor() {
        this.dbName = 'HarviDB';
        this.version = 1;
        this.db = null;
        this.initialized = false;
        this.initPromise = null; // Track initialization promise to prevent race conditions
    }

    /**
     * Initialize IndexedDB with object stores
     */
    async init() {
        // Return existing initialization promise if one is in progress
        if (this.initPromise) {
            return this.initPromise;
        }

        if (this.initialized && this.db) {
            return this.db;
        }

        // Create and store the initialization promise
        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('IndexedDB initialization failed:', request.error);
                this.initPromise = null; // Reset on error so retry is possible
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.initialized = true;
                console.log('✓ IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains('lectures')) {
                    db.createObjectStore('lectures', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('quizProgress')) {
                    const progressStore = db.createObjectStore('quizProgress', { keyPath: 'id', autoIncrement: true });
                    progressStore.createIndex('lectureId', 'lectureId', { unique: false });
                    progressStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('quizResults')) {
                    const resultsStore = db.createObjectStore('quizResults', { keyPath: 'id', autoIncrement: true });
                    resultsStore.createIndex('lectureId', 'lectureId', { unique: false });
                    resultsStore.createIndex('date', 'date', { unique: false });
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                }

                console.log('✓ Object stores created');
            };
        });

        return this.initPromise;
    }

    /**
     * Save a lecture with all its questions for offline access
     */
    async saveLecture(lectureData) {
        try {
            await this.init();
            const tx = this.db.transaction(['lectures'], 'readwrite');
            const store = tx.objectStore('lectures');
            
            const lecture = {
                ...lectureData,
                cachedAt: new Date().toISOString(),
                isOfflineEnabled: true
            };

            return new Promise((resolve, reject) => {
                const request = store.put(lecture);
                request.onsuccess = () => {
                    console.log(`✓ Lecture ${lecture.id} cached for offline`);
                    resolve(lecture);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to save lecture:', error);
            throw error;
        }
    }

    /**
     * Get a cached lecture
     */
    async getLecture(lectureId) {
        try {
            await this.init();
            const tx = this.db.transaction(['lectures'], 'readonly');
            const store = tx.objectStore('lectures');

            return new Promise((resolve, reject) => {
                const request = store.get(lectureId);
                request.onsuccess = () => {
                    if (request.result) {
                        console.log(`✓ Retrieved cached lecture ${lectureId}`);
                    }
                    resolve(request.result || null);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get lecture:', error);
            return null;
        }
    }

    /**
     * Get all cached lectures
     */
    async getAllLectures() {
        try {
            await this.init();
            const tx = this.db.transaction(['lectures'], 'readonly');
            const store = tx.objectStore('lectures');

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    console.log(`✓ Retrieved ${request.result.length} cached lectures`);
                    resolve(request.result);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get lectures:', error);
            return [];
        }
    }

    /**
     * Save quiz progress to resume later
     */
    async saveQuizProgress(lectureId, progress) {
        try {
            await this.init();
            const tx = this.db.transaction(['quizProgress'], 'readwrite');
            const store = tx.objectStore('quizProgress');

            const progressData = {
                lectureId,
                currentIndex: progress.currentIndex,
                score: progress.score,
                questions: progress.questions,
                metadata: progress.metadata,
                timestamp: new Date().toISOString()
            };

            return new Promise((resolve, reject) => {
                // First, clear old progress for this lecture
                const deleteRequest = store.index('lectureId').openCursor(IDBKeyRange.only(lectureId));
                deleteRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        // Now save new progress
                        const saveRequest = store.add(progressData);
                        saveRequest.onsuccess = () => {
                            console.log(`✓ Quiz progress saved for lecture ${lectureId}`);
                            resolve(progressData);
                        };
                        saveRequest.onerror = () => reject(saveRequest.error);
                    }
                };
                deleteRequest.onerror = () => reject(deleteRequest.error);
            });
        } catch (error) {
            console.error('Failed to save quiz progress:', error);
            throw error;
        }
    }

    /**
     * Get saved quiz progress for a lecture
     */
    async getQuizProgress(lectureId) {
        try {
            await this.init();
            const tx = this.db.transaction(['quizProgress'], 'readonly');
            const store = tx.objectStore('quizProgress');
            const index = store.index('lectureId');

            return new Promise((resolve, reject) => {
                const request = index.getAll(lectureId);
                request.onsuccess = () => {
                    const results = request.result;
                    if (results.length > 0) {
                        // Return the most recent progress
                        const mostRecent = results.sort((a, b) => 
                            new Date(b.timestamp) - new Date(a.timestamp)
                        )[0];
                        console.log(`✓ Retrieved quiz progress for lecture ${lectureId}`);
                        resolve(mostRecent);
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get quiz progress:', error);
            return null;
        }
    }

    /**
     * Save quiz results for history/statistics
     */
    async saveQuizResult(lectureId, result) {
        try {
            await this.init();
            const tx = this.db.transaction(['quizResults'], 'readwrite');
            const store = tx.objectStore('quizResults');

            const resultData = {
                lectureId,
                score: result.score,
                total: result.total,
                percentage: result.total > 0 ? Math.round((result.score / result.total) * 100) : 0,
                timeSpent: result.timeSpent,
                date: new Date().toISOString(),
                synced: false
            };

            return new Promise((resolve, reject) => {
                const request = store.add(resultData);
                request.onsuccess = () => {
                    console.log(`✓ Quiz result saved for lecture ${lectureId}`);
                    resolve(resultData);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to save quiz result:', error);
            throw error;
        }
    }

    /**
     * Get quiz results for a lecture
     */
    async getQuizResults(lectureId) {
        try {
            await this.init();
            const tx = this.db.transaction(['quizResults'], 'readonly');
            const store = tx.objectStore('quizResults');
            const index = store.index('lectureId');

            return new Promise((resolve, reject) => {
                const request = index.getAll(lectureId);
                request.onsuccess = () => {
                    const results = request.result.sort((a, b) => 
                        new Date(b.date) - new Date(a.date)
                    );
                    console.log(`✓ Retrieved ${results.length} results for lecture ${lectureId}`);
                    resolve(results);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get quiz results:', error);
            return [];
        }
    }

    /**
     * Get all quiz results across all lectures
     */
    async getAllResults() {
        try {
            await this.init();
            const tx = this.db.transaction(['quizResults'], 'readonly');
            const store = tx.objectStore('quizResults');

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const results = request.result.sort((a, b) => 
                        new Date(b.date) - new Date(a.date)
                    );
                    resolve(results);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get all results:', error);
            return [];
        }
    }

    /**
     * Get user settings
     */
    async getSetting(key) {
        try {
            await this.init();
            const tx = this.db.transaction(['settings'], 'readonly');
            const store = tx.objectStore('settings');

            return new Promise((resolve, reject) => {
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result?.value || null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get setting:', error);
            return null;
        }
    }

    /**
     * Save user settings
     */
    async setSetting(key, value) {
        try {
            await this.init();
            const tx = this.db.transaction(['settings'], 'readwrite');
            const store = tx.objectStore('settings');

            return new Promise((resolve, reject) => {
                const request = store.put({ key, value, timestamp: new Date().toISOString() });
                request.onsuccess = () => {
                    console.log(`✓ Setting '${key}' saved`);
                    resolve(value);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to save setting:', error);
            throw error;
        }
    }

    /**
     * Queue an action for syncing when online
     */
    async queueSync(action, data) {
        try {
            await this.init();
            const tx = this.db.transaction(['syncQueue'], 'readwrite');
            const store = tx.objectStore('syncQueue');

            const queueItem = {
                action,
                data,
                timestamp: new Date().toISOString(),
                synced: false
            };

            return new Promise((resolve, reject) => {
                const request = store.add(queueItem);
                request.onsuccess = () => {
                    console.log(`✓ Action queued for sync: ${action}`);
                    resolve(queueItem);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to queue sync:', error);
            throw error;
        }
    }

    /**
     * Get all pending sync items
     */
    async getSyncQueue() {
        try {
            await this.init();
            const tx = this.db.transaction(['syncQueue'], 'readonly');
            const store = tx.objectStore('syncQueue');

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const items = request.result.filter(item => !item.synced);
                    console.log(`✓ Retrieved ${items.length} pending sync items`);
                    resolve(items);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get sync queue:', error);
            return [];
        }
    }

    /**
     * Mark sync item as completed
     */
    async markSynced(itemId) {
        try {
            await this.init();
            const tx = this.db.transaction(['syncQueue'], 'readwrite');
            const store = tx.objectStore('syncQueue');

            return new Promise((resolve, reject) => {
                const getRequest = store.get(itemId);
                getRequest.onsuccess = () => {
                    const item = getRequest.result;
                    if (item) {
                        item.synced = true;
                        item.syncedAt = new Date().toISOString();
                        const updateRequest = store.put(item);
                        updateRequest.onsuccess = () => {
                            console.log(`✓ Sync item ${itemId} marked as completed`);
                            resolve(item);
                        };
                        updateRequest.onerror = () => reject(updateRequest.error);
                    }
                };
                getRequest.onerror = () => reject(getRequest.error);
            });
        } catch (error) {
            console.error('Failed to mark sync item:', error);
            throw error;
        }
    }

    /**
     * Clear all data (useful for logout/reset)
     */
    async clearAll() {
        try {
            await this.init();
            const storeNames = ['lectures', 'quizProgress', 'quizResults', 'settings', 'syncQueue'];
            
            return Promise.all(storeNames.map(storeName => {
                return new Promise((resolve, reject) => {
                    const tx = this.db.transaction([storeName], 'readwrite');
                    const store = tx.objectStore(storeName);
                    const request = store.clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            })).then(() => {
                console.log('✓ All IndexedDB data cleared');
            });
        } catch (error) {
            console.error('Failed to clear database:', error);
            throw error;
        }
    }

    /**
     * Get database statistics
     */
    async getStats() {
        try {
            const lectures = await this.getAllLectures();
            const results = await this.getAllResults();
            const syncQueue = await this.getSyncQueue();

            return {
                cachedLectures: lectures.length,
                quizResults: results.length,
                pendingSyncs: syncQueue.length,
                cacheSize: lectures.length * 50 // Approximate, in KB
            };
        } catch (error) {
            console.error('Failed to get stats:', error);
            return null;
        }
    }
}

// Create global instance
const harviDB = new HarviDatabase();

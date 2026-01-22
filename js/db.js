/**
 * IndexedDB Module - Harvi PWA
 * Handles offline-first data persistence and caching
 */
class HarviDatabase {
    constructor() {
        this.dbName = 'HarviDB';
        this.version = 2;  // ← BUMPED: Version 1→2 to clear cached JSONB format data
        this.db = null;
        this.initialized = false;
        this.initPromise = null;

        // ADD THESE to track failures
        this.initAttempts = 0;           // ← Count attempts
        this.maxAttempts = 3;             // ← Maximum retries
        this.permanentlyFailed = false;   // ← Flag for unrecoverable errors
        this.lastError = null;            // ← Store last error for debugging

        // L1 Memory Cache (Performance Optimization)
        this.cache = new Map();
        this.intialCacheLoaded = false;
        this.idbLoadComplete = false; // PWA Strategy: set after getAll(); "all in IDB" not "all for subject"
    }

    /**
     * Initialize IndexedDB with object stores
     */
    async init() {
        // Check for permanent failure state
        if (this.permanentlyFailed) {
            throw new Error(`IndexedDB permanently failed: ${this.lastError?.message || 'Unknown error'}. The app cannot store data offline.`);
        }

        // Return existing promise if initialization in progress
        if (this.initPromise) {
            return this.initPromise;
        }
        // Return existing DB if already initialized
        if (this.initialized && this.db) {
            console.log('✓ Using existing IndexedDB connection');
            return this.db;
        }

        // Check if we've exceeded retry limit
        if (this.initAttempts >= this.maxAttempts) {
            this.permanentlyFailed = true;
            throw new Error(`IndexedDB initialization failed after ${this.maxAttempts} attempts. Last error: ${this.lastError?.message}`);
        }

        // Increment attempt counter
        this.initAttempts++;
        console.log(`🔄 IndexedDB initialization attempt ${this.initAttempts}/${this.maxAttempts}`);
        // Create and store the initialization promise
        this.initPromise = new Promise((resolve, reject) => {
            // Check if IndexedDB is supported
            if (!window.indexedDB) {
                const error = new Error('IndexedDB is not supported in this browser');
                this.lastError = error;
                this.permanentlyFailed = true; // No point retrying
                reject(error);
                return;
            }

            const request = indexedDB.open(this.dbName, this.version);
            request.onerror = () => {
                const error = request.error || new Error('Unknown IndexedDB error');
                console.error(`❌ IndexedDB initialization failed (attempt ${this.initAttempts}):`, error);

                // Store error for debugging
                this.lastError = error;

                // Check if this is a permanent error (user blocked, private mode, etc.)
                if (error.name === 'SecurityError' ||
                    error.name === 'InvalidStateError' ||
                    error.message?.includes('private browsing')) {
                    console.error('⚠️  Permanent error detected - IndexedDB unavailable');
                    this.permanentlyFailed = true;
                }

                // DON'T reset initPromise immediately - let it reject naturally
                // Reset will happen in the next init() call
                reject(error);
            };
            request.onsuccess = () => {
                this.db = request.result;
                this.initialized = true;
                this.initAttempts = 0; // Reset counter on success
                console.log('✓ IndexedDB initialized successfully');
                resolve(this.db);

                // Handle unexpected DB close
                this.db.onclose = () => {
                    console.warn('⚠️  IndexedDB connection closed unexpectedly');
                    this.initialized = false;
                    this.db = null;
                };

                // Handle version change from another tab
                this.db.onversionchange = () => {
                    console.warn('⚠️  IndexedDB version changed in another tab');
                    this.db.close();
                    this.initialized = false;
                    this.db = null;
                };
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                const newVersion = event.newVersion;

                console.log(`🔄 IndexedDB upgrade: v${oldVersion} → v${newVersion}`);

                // Version 1 → 2: Clear lectures cache due to JSONB format change
                if (oldVersion < 2) {
                    console.log('📦 Migration v1→v2: Clearing cached lectures (JSONB format change)');

                    // If lectures store exists, clear it
                    if (db.objectStoreNames.contains('lectures')) {
                        const transaction = event.target.transaction;
                        const lectureStore = transaction.objectStore('lectures');
                        lectureStore.clear();
                        console.log('✅ Lectures cache cleared - will refetch with new format');
                    }
                }

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains('lectures')) {
                    db.createObjectStore('lectures', { keyPath: 'id' });
                    console.log('✅ Created object store: lectures');
                }
                if (!db.objectStoreNames.contains('quizProgress')) {
                    const progressStore = db.createObjectStore('quizProgress', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    progressStore.createIndex('lectureId', 'lectureId', { unique: false });
                    progressStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                if (!db.objectStoreNames.contains('quizResults')) {
                    const resultsStore = db.createObjectStore('quizResults', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    resultsStore.createIndex('lectureId', 'lectureId', { unique: false });
                    resultsStore.createIndex('date', 'date', { unique: false });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                }
                console.log('✓ Object stores created/verified');
            };
        }).catch(error => {
            // Reset promise on error so next call can retry
            this.initPromise = null;
            throw error; // Re-throw to propagate to caller
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

            // L1 Cache: Update memory immediately
            this.cache.set(lecture.id, lecture);

            return new Promise((resolve, reject) => {
                const request = store.put(lecture);
                request.onsuccess = () => {
                    // console.log(`✓ Lecture ${lecture.id} cached for offline`);
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
     * Get a cached lecture (Memory First Strategy)
     */
    async getLecture(lectureId) {
        // L1 Cache Check (Sync/Instant)
        if (this.cache.has(lectureId)) {
            console.log(`⚡ Served lecture ${lectureId} from memory cache`);
            return this.cache.get(lectureId);
        }

        try {
            await this.init();
            const tx = this.db.transaction(['lectures'], 'readonly');
            const store = tx.objectStore('lectures');

            return new Promise((resolve, reject) => {
                const request = store.get(lectureId);
                request.onsuccess = () => {
                    if (request.result) {
                        // Populate L1 Cache
                        this.cache.set(lectureId, request.result);
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
     * Get multiple lectures by IDs. Returns Map<id, lecture> for found items only.
     * PWA Caching Strategy: used for lecture read-through.
     */
    async getLecturesByIds(ids) {
        if (!ids || !ids.length) return new Map();
        const out = new Map();
        for (const id of ids) {
            const l = await this.getLecture(id);
            if (l) out.set(id, l);
        }
        return out;
    }

    /**
     * Get all cached lectures (Memory First).
     * idbLoadComplete: set only after a successful getAll(); means "all lectures in IDB loaded",
     * not "all lectures for current subject". Use getLecturesByIds for subject-scoped data.
     */
    async getAllLectures() {
        if (this.cache.size > 0 && this.idbLoadComplete) {
            console.log(`⚡ Served all lectures from memory cache (${this.cache.size})`);
            return Array.from(this.cache.values());
        }

        try {
            await this.init();
            const tx = this.db.transaction(['lectures'], 'readonly');
            const store = tx.objectStore('lectures');

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const results = request.result;
                    results.forEach(l => this.cache.set(l.id, l));
                    this.idbLoadComplete = true;
                    this.intialCacheLoaded = true; // legacy alias

                    console.log(`✓ Retrieved ${results.length} cached lectures`);
                    resolve(results);
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
     * Delete quiz progress for a lecture (used when quiz is completed)
     */
    async deleteQuizProgress(lectureId) {
        try {
            await this.init();
            const tx = this.db.transaction(['quizProgress'], 'readwrite');
            const store = tx.objectStore('quizProgress');
            const index = store.index('lectureId');

            return new Promise((resolve) => {
                const request = index.openCursor(IDBKeyRange.only(lectureId));
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        console.log(`✓ Quiz progress deleted for lecture ${lectureId}`);
                        resolve();
                    }
                };
                request.onerror = () => {
                    console.warn('Error in delete cursor:', request.error);
                    resolve();
                };
            });
        } catch (error) {
            console.error('Failed to delete quiz progress:', error);
            // Return resolved promise so caller isn't blocked by DB failures
            return Promise.resolve();
        }
    }

    /**
     * Save quiz results for history/statistics
     */
    async saveQuizResult(lectureId, result, lectureName) {
        try {
            await this.init();
            const tx = this.db.transaction(['quizResults'], 'readwrite');
            const store = tx.objectStore('quizResults');

            const resultData = {
                lectureId,
                lectureName, // ← Add lecture name
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
     * Generate HMAC signature for data integrity
     * @private
     */
    async _generateSignature(data) {
        try {
            const encoder = new TextEncoder();
            const signData = encoder.encode(JSON.stringify(data));

            // In a real app, this secret would be device-specific or from a secure cookie
            // For now, we use a consistent salt to detect basic tampering
            const salt = 'harvi-secure-sync-v1';
            const keyData = encoder.encode(salt);

            const cryptoKey = await crypto.subtle.importKey(
                'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
            );

            const signature = await crypto.subtle.sign('HMAC', cryptoKey, signData);
            return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            console.warn('⚠️ HMAC generation failed, falling back to basic check:', e);
            return 'legacy-' + Date.now();
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

            // 🛡️ Integrity: Sign the data before queuing
            const signature = await this._generateSignature({ action, data });

            const queueItem = {
                action,
                data,
                signature, // ← Store signature
                timestamp: new Date().toISOString(),
                synced: false
            };

            return new Promise((resolve, reject) => {
                const request = store.add(queueItem);
                request.onsuccess = () => {
                    console.log(`✓ Action queued for sync: ${action} (Signed)`);
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
                request.onsuccess = async () => {
                    const items = request.result.filter(item => !item.synced);

                    // 🛡️ Verify integrity of each item
                    for (const item of items) {
                        if (!item.signature) {
                            item.tampered = true;
                            console.warn('⚠️ Sync item missing signature:', item.id);
                            continue;
                        }

                        const expectedSignature = await this._generateSignature({
                            action: item.action,
                            data: item.data
                        });

                        if (item.signature !== expectedSignature) {
                            item.tampered = true;
                            console.error('❌ Sync item signature mismatch (tampering detected):', item.id);
                        }
                    }

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
     * Close the database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initialized = false;
            console.log('✓ IndexedDB connection closed');
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
                // Also clear L1 Cache
                this.cache.clear();
                this.intialCacheLoaded = false;
                this.idbLoadComplete = false;
                console.log('✓ All IndexedDB data & Memory Cache cleared');
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

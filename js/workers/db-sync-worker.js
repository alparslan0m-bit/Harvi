/**
 * Database Sync Worker
 * 
 * Handles IndexedDB write operations off the main thread
 * Prevents UI blocking during data persistence
 * 
 * Messages received:
 * - { type: 'save', store, data }
 * - { type: 'batchSave', operations: [...] }
 * - { type: 'delete', store, key }
 */

let db = null;

/**
 * Initialize IndexedDB connection in worker context
 * Matches HarviDB stores: lectures, quizProgress, quizResults, settings, syncQueue
 */
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('HarviDB', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            
            // Create stores if needed - aligned with HarviDB structure
            const stores = {
                'lectures': { keyPath: 'id' },
                'quizProgress': { keyPath: 'id', autoIncrement: true },
                'quizResults': { keyPath: 'id', autoIncrement: true },
                'settings': { keyPath: 'key' },
                'syncQueue': { keyPath: 'id', autoIncrement: true }
            };
            
            Object.entries(stores).forEach(([storeName, config]) => {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, config);
                }
            });
        };
    });
}

/**
 * Save data to IndexedDB
 */
async function saveToStore(store, data) {
    if (!db) {
        await initDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.put(data);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

/**
 * Batch save multiple items
 */
async function batchSave(operations) {
    if (!db) {
        await initDB();
    }

    const stores = [...new Set(operations.map(op => op.store))];
    const transaction = db.transaction(stores, 'readwrite');
    
    const promises = operations.map(({ store, data }) => {
        return new Promise((resolve, reject) => {
            const objectStore = transaction.objectStore(store);
            const request = objectStore.put(data);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    });

    return Promise.all(promises);
}

/**
 * Delete from IndexedDB
 */
async function deleteFromStore(store, key) {
    if (!db) {
        await initDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(true);
    });
}

// Listen for messages
self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    try {
        let result;

        if (type === 'save') {
            result = await saveToStore(data.store, data.data);
        } else if (type === 'batchSave') {
            result = await batchSave(data.operations);
        } else if (type === 'delete') {
            result = await deleteFromStore(data.store, data.key);
        } else {
            throw new Error(`Unknown message type: ${type}`);
        }

        self.postMessage({
            type,
            success: true,
            result,
            timestamp: Date.now()
        });

    } catch (error) {
        self.postMessage({
            type,
            success: false,
            error: error.message,
            timestamp: Date.now()
        });
    }
});

// Initialize on load
initDB().catch(error => {
    console.error('[DBSyncWorker] Failed to initialize:', error);
});

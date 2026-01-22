/**
 * Cache Utilities — PWA Caching Strategy (Phase 2)
 * Staleness checks for lecture cache; used by Navigation and HarviDB.
 */
(function (global) {
    'use strict';

    var MAX_LECTURE_AGE_MS = 24 * 60 * 60 * 1000; // 24h

    /**
     * @param {?{ cachedAt?: string }} lecture — Cached lecture (may have cachedAt).
     * @returns {boolean} — True if missing, invalid, or older than MAX_LECTURE_AGE.
     */
    function isLectureStale(lecture) {
        if (!lecture || !lecture.cachedAt) return true;
        var cached = Date.parse(lecture.cachedAt);
        if (isNaN(cached)) return true;
        return (Date.now() - cached) > MAX_LECTURE_AGE_MS;
    }

    global.CacheUtils = {
        MAX_LECTURE_AGE_MS: MAX_LECTURE_AGE_MS,
        isLectureStale: isLectureStale
    };
})(typeof window !== 'undefined' ? window : this);

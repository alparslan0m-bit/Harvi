/**
 * Cache Utilities — PWA Caching Strategy (Phase 2)
 * Staleness checks for lecture cache; used by Navigation and HarviDB.
 * 
 * Updated: Extended cache times for request minimization
 */
(function (global) {
    'use strict';

    // PWA Optimization: Extended from 24h to 7 days
    // Lecture content rarely changes, and we need to minimize network requests
    var MAX_LECTURE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Years cache (for Navigation.js cross-check)
    var MAX_YEARS_AGE_MS = 60 * 60 * 1000; // 1 hour

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

    /**
     * @param {number} timestamp — Timestamp when years were cached.
     * @returns {boolean} — True if older than MAX_YEARS_AGE.
     */
    function isYearsStale(timestamp) {
        if (!timestamp) return true;
        return (Date.now() - timestamp) > MAX_YEARS_AGE_MS;
    }

    global.CacheUtils = {
        MAX_LECTURE_AGE_MS: MAX_LECTURE_AGE_MS,
        MAX_YEARS_AGE_MS: MAX_YEARS_AGE_MS,
        isLectureStale: isLectureStale,
        isYearsStale: isYearsStale
    };
})(typeof window !== 'undefined' ? window : this);


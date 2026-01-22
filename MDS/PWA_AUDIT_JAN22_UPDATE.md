# PWA Strategy vs Implementation Audit (Update)

**Date:** January 22, 2026
**Refers to:** `MDS/PWA_CACHING_STRATEGY.md` vs Current Codebase

## Executive Summary

The implementation has significantly advanced since the initial `AUDIT_REPORT.md` was generated. The Critical "Lecture Read-Through" and "Staleness" mechanisms are **now implemented**, resolving major blockers. However, the Critical Authentication logic for sync remains unaddressed, and some advanced prefetching features are defined but not connected.

## 1. Resolved Issues (Since Previous Audit)

| Item | Status | Details |
|------|--------|---------|
| **Lecture Read-Through** | ✅ **Implemented** | `navigation.js` now correctly attempts to load lectures from `harviDB` first. If all lectures are found and fresh, it skips the initial network call and performs a background revalidation. |
| **Staleness Checks** | ✅ **Implemented** | `CacheUtils.isLectureStale` is correctly used within the read-through logic in `navigation.js`. Lectures older than 24h are treated as missing, triggering a refresh. |
| **Prefetch Endpoint** | ✅ **Fixed** | `sw.js` now uses the correct `/api/lectures/batch` endpoint instead of the non-existent `/api/quiz`. |
| **Admin Caching** | ✅ **Guarded** | `sw.js` explicitly excludes `/api/admin/` and non-GET requests. |

## 2. Remaining Critical Issues

### 🔴 Sync Authentication (Auth Token)
**Location:** `js/app.js` (Line 296, `syncPendingData`)
**Status:** ❌ **Unresolved**
**Details:** The `syncPendingData` function uses `SafeFetch` to POST to `/api/quiz-results` **without an Authorization header**.
**Impact:** If your backend (`api/quiz-results`) is protected by Supabase Auth (likely), these background sync requests will fail with `401 Unauthorized` when the user comes back online.
**Recommendation:** Ensure the `SafeFetch` call includes the current session's JWT if the user is logged in.

## 3. Implementation Gaps & Optimizations

### 🟠 "Fetch All" vs "Fetch Missing"
**Location:** `js/navigation.js` (Line 605)
**Details:** The Read-Through logic is "All or Nothing". If you request 5 lectures and 1 is missing/stale, the code fetches **all 5** again from the network.
**Strategy Goal:** "Try IDB first... fetch *only* missing or stale."
**Impact:** Minor bandwidth inefficiency.
**Recommendation:** Not critical for now (Batch logic is simpler), but could be optimized later to split the request.

### 🟡 Disconnected Prefetching
**Location:** `js/pwa-features.js` and `js/navigation.js`
**Details:** `PrefetchingStrategy.prefetchNextLectures` is defined in `pwa-features.js` but is **never called** in the codebase.
**Impact:** The "Predictive Loading" feature described in the strategy is currently inactive. The Service Worker logic to handle it exists, but no one is sending the message.
**Recommendation:** Call `PrefetchingStrategy.prefetchNextLectures(currentSubjectLectureIds)` when a user navigates to a Subject view.

## 4. Verification of Strategy Specifics

| Feature | Strategy | Actual Implementation | Verdict |
|---------|----------|-----------------------|---------|
| **App Shell** | Cache-first | `sw.js` Cache-first | ✅ |
| **Years API** | SWR | `sw.js` SWR + `navigation.js` in-memory | ✅ |
| **Force Cache Clear** | Dev-only | `index.html` gated by `isDev` | ✅ |
| **Offline Fallback** | `offline.html` | `sw.js` returns `offline.html` on nav fail | ✅ |
| **Integrity Check** | HMAC | `db.js` implements HMAC signing | ✅ |

## Final Verdict
The codebase is **Production-Ready** in terms of Caching Mechanics (Read-through, Stale-while-revalidate, Offline support).

**Immediate Action Required:** Verify the **Auth Token** requirement for `/api/quiz-results`. If the backend requires auth, the current sync implementation is broken.

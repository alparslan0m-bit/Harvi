# PWA Caching Strategy — Harvi

**Role:** Senior PWA Performance Architect  
**Objective:** A clear, scalable, bug-free caching strategy that improves app speed, offline reliability, navigation smoothness, and data freshness — without breaking current functionality or introducing stale-data bugs.

**Scope:** PWA with Supabase backend; dynamic content (questions, lectures, progress); IndexedDB in use; Service Worker enabled.  
**Environments:** Localhost (dev) vs Vercel (production).

---

## 1. Current-State Summary

### 1.1 Service Worker (`sw.js`)

- **Versioning:** `APP_VERSION` + `BUILD_TIMESTAMP`; caches keyed by version (`harvi-shell-v*`, `harvi-runtime-v*`, `harvi-api-v*`, `harvi-images-v*`).
- **App Shell:** Install pre-caches a fixed list of HTML, CSS, JS, `offline.html`. Cache-first for static assets.
- **API:**
  - `/api/years`: Custom “cache-first + background revalidate” (serves cache, fetches in background, updates cache).
  - All other `/api/*`: **Network-first**, then cache success; on failure, serve cache or `{ error: 'Offline' }`.
- **Navigation:** Network-first for `request.mode === 'navigate'`; fallback to cached page or `offline.html`.
- **Prefetch:** `PREFETCH_QUIZZES` uses `/api/quiz/${lectureId}` — **this route does not exist** (real API: `/api/lectures/:lectureId` and `/api/lectures/batch`).
- **Issues:** POST responses (e.g. `quiz-results`, `practice/check-answer`) are cached; admin endpoints not explicitly excluded; prefetch URL wrong.

### 1.2 IndexedDB (`db.js` — HarviDB)

- **Stores:** `lectures`, `quizProgress`, `quizResults`, `settings`, `syncQueue`.
- **L1:** In-memory `Map` for lectures; `getLecture` / `getAllLectures` use memory-first, then IDB.
- **Lectures:** `saveLecture` adds `cachedAt`, `isOfflineEnabled`; used after batch fetch in `navigation.js`.
- **Quiz:** Progress and results stored locally; sync queue with HMAC signatures for integrity.
- **Gaps:** No TTL or version-based invalidation for lectures; `getAllLectures` “complete” heuristic is fragile; no explicit use of IDB when rendering the **lecture list** (always network fetch first).

### 1.3 Fetch & Data Flow

- **Years:** `SafeFetch('./api/years')` → in-memory `remoteYears` + `cacheTimestamp` (5 min) in `Navigation`. SW also caches `/api/years`.
- **Lectures:** `SafeFetch('/api/lectures/batch')` (GET or POST by URL length). On success, batch is written to HarviDB. **Lecture list UI always fetches; IDB is write-through, not read-first.**
- **Quiz:** Questions from Navigation → `startQuiz(questions, pathInfo)`. Resume uses `harviDB.getQuizProgress` → `startQuiz(progress.questions, …)`.
- **Stats / Profile:** Stats use `harviDB.getAllResults()` only; Profile is local UI + clear data. No API calls for these screens.
- **Sync:** On `online`, `syncPendingData()` processes `syncQueue`, POSTs to `./api/quiz-results`, marks items synced. **No `Authorization` header** in app fetches; backend requires auth for `quiz-results` — potential auth mismatch.

### 1.4 Environment Notes

- **Vercel:** `/api/*` → serverless `api/index.js`; static assets get `Cache-Control: max-age=31536000, immutable`; HTML `max-age=3600, stale-while-revalidate=86400`.
- **Localhost:** Usually different server (e.g. `server/index.js`). Same app code; SW uses `location.origin` and `BASE_PATH`.
- **index.html:** Contains a “force cache clear” script that **unregisters the SW and clears all caches on every load**. This undermines PWA caching and should be environment-gated (e.g. dev-only).

### 1.5 Prefetch / Predictive Loaders

- **Hierarchical prefetch:** Uses `/api/years/${yearId}/modules` and `/api/modules/${moduleId}/questions` — **these endpoints do not exist** (hierarchy comes from `GET /api/years` and lectures from `/api/lectures/batch`).
- **Predictive loader:** Uses `/api/years/${yearId}/modules` — also invalid.
- **Asset optimizer:** References `/api/years`, `/api/modules`, `/api/questions`, `/api/stats` — partially aligned.

---

## 2. Cache Layers (Multi-Layer Model)

### 2.1 Layer 1: Service Worker Cache (Static Assets)

**What:** App shell and static resources.

**Includes:**

- `index.html`, `offline.html`, `manifest.json`
- All CSS (e.g. `main.css`, components, themes, utils)
- All JS (app, quiz, navigation, db, etc.)
- Icons (e.g. `icon-192x192.svg`, `icon-512x512.svg`)

**Why:**

- Changes only on deploy; versioned via `APP_VERSION` / `BUILD_TIMESTAMP`.
- Cache-first gives instant loads and reliable offline shell.
- No user-specific or dynamic data.

**Excludes:**

- API responses (handled in Layer 2 / 3).
- User-uploaded or personalized binary assets (if any later).

### 2.2 Layer 2: IndexedDB (Dynamic Data)

**What:** Structured, queryable dynamic data.

**Stores & roles:**

| Store         | Content                          | Use case                                |
|---------------|----------------------------------|-----------------------------------------|
| `lectures`    | Lecture + questions payloads     | Offline quiz, faster lecture list       |
| `quizProgress`| In-progress quiz state           | Resume quiz                             |
| `quizResults` | Completed quiz results           | Stats, history                          |
| `settings`    | `lastActiveLectureId`, etc.      | UX state                                |
| `syncQueue`   | Pending sync items (signed)      | Offline → online sync                   |

**Why:**

- Survives reloads and restarts; works offline.
- Supports indexes (e.g. by `lectureId`, `date`) for resume and stats.
- Already used for progress, results, and sync; extend for **read-through** lecture caching.

### 2.3 Layer 3: In-Memory (Session)

**What:** Hot data for the current session.

**Includes:**

- **Navigation:** `remoteYears`, `cacheTimestamp` (years hierarchy).
- **HarviDB L1:** `Map` of lectures (already implemented).
- **Optional:** Small “session cache” for recently viewed lecture IDs or batch keys to avoid duplicate work (e.g. repeat navigations).

**Why:**

- Fastest reads; no IDB or network.
- Reduces repeated IDB hits and redundant fetches during a session.
- Cleared on refresh; no stale-data across sessions.

### 2.4 What Goes Where — Summary

| Data type              | SW cache | IndexedDB     | In-memory        |
|------------------------|----------|---------------|------------------|
| App shell (HTML/CSS/JS)| ✅       | ❌            | ❌               |
| Icons, static assets   | ✅       | ❌            | ❌               |
| Years hierarchy        | ✅ (API) | ❌            | ✅ `remoteYears` |
| Lectures + questions   | ✅ (API) | ✅ `lectures` | ✅ HarviDB L1    |
| Quiz progress          | ❌       | ✅            | ❌               |
| Quiz results           | ❌       | ✅            | ❌               |
| User settings          | ❌       | ✅            | ❌               |
| Sync queue             | ❌       | ✅            | ❌               |

---

## 3. Caching Policies

### 3.1 Policy Definitions

- **Cache-first:** Use cache if present; optionally revalidate in background. Use for stable, versioned, or long-TTL data.
- **Network-first:** Try network; on success use response and optionally cache; on failure use cache or fallback.
- **Stale-while-revalidate (SWR):** Serve cache immediately if available, fetch in background, update cache for next time. Good for “fresh enough” data.

### 3.2 By Data Type

| Data type        | Policy            | Rationale |
|------------------|-------------------|-----------|
| **App shell**    | Cache-first       | Versioned at deploy; immutable per version. |
| **Years**        | SWR               | Metadata changes occasionally; instant UI from cache, refresh in background. |
| **Modules / subjects** | Same as years | Inlined in `GET /api/years`; treat as one unit. |
| **Lectures + questions** | Network-first with IDB fallback | Questions can change (fixes, updates); prefer fresh. Offline: serve from IDB. |
| **User progress**| Never in SW cache | Stored only in IDB; never cache API for progress. |
| **User answers / results** | Never in SW cache | Sensitive; POST-only; sync via IDB queue. |

### 3.3 Request-Type Rules

- **GET (read-only):** Can be cached (by policy above). Exclude admin and auth-only endpoints.
- **POST / PUT / PATCH / DELETE:** **Never cache** in the Service Worker. No `cache.put` for these.
- **Admin endpoints:** `/api/admin/*` must **never** be cached by the SW.

---

## 4. Invalidation Strategy

### 4.1 Principles

- Avoid serving outdated questions or hierarchy.
- Use versioning and timestamps where useful.
- Revalidate on high-signal events (focus, reconnect) without breaking UX.

### 4.2 App Shell & Static Assets

- **When:** On deploy.
- **How:** Bump `APP_VERSION` (or `BUILD_TIMESTAMP`) in `sw.js` → new cache names → activate handler deletes old Harvi caches.
- **No** per-request invalidation.

### 4.3 Years (Metadata)

- **When:** 
  - After TTL (e.g. 5 min) — keep existing `cacheTimeout` in Navigation.
  - On **visibility change** (tab focus) or **online**: optionally revalidate in background; update `remoteYears` and `cacheTimestamp` if new data arrives.
- **How:** 
  - In-memory: clear or refresh `cacheTimestamp` / `remoteYears` per TTL or on focus.
  - SW: continue SWR; background fetch updates API cache.

### 4.4 Lectures & Questions

- **When:** 
  - On **navigate to lecture list**: prefer network; if fail, use IDB.
  - **Timestamp-based:** Store `cachedAt` with each lecture (already done). Consider a **max age** (e.g. 24–48 h): if exceeded, treat as stale, fetch when online, then update IDB.
  - On **focus / reconnect**: optionally revalidate IDs for “visible” or “recent” lectures in background; update IDB on success.
- **How:**
  - Add `isLectureStale(lecture)` (e.g. `Date.now() - new Date(lecture.cachedAt) > MAX_LECTURE_AGE`).
  - Use for “show from IDB but mark as stale” vs “must refetch before use” (e.g. resume always allowed; fresh quiz can require fetch if stale).

### 4.5 User Progress & Results

- **Progress:** Ephemeral; cleared when quiz is completed or abandoned. No versioning.
- **Results:** Append-only. Synced via queue; no “invalidation” of historical results.
- **Sync queue:** Items removed when synced; tampered ones skipped (already).

### 4.6 Safe Revalidation on Focus / Reconnect

- **Focus:** `visibilitychange` → if document visible and online, trigger background revalidation for years (and optionally recent lectures). Do **not** block UI.
- **Reconnect:** `online` → existing `syncPendingData()`; **additionally** trigger same background revalidation as focus.
- **Rules:** Never clear in-memory or IDB before new data is successfully fetched; avoid race conditions (e.g. single “revalidate” promise per type, debounced).

---

## 5. Offline & Recovery

### 5.1 Fully Offline

- **App shell:** Served from SW cache (cache-first).
- **Years:** From SW API cache or Navigation in-memory if already loaded; otherwise show error or “offline” message with retry.
- **Lecture list:** From IDB when network fails (once we add read-through). Show “cached” / “offline” indicator if we use stale data.
- **Start quiz:** From IDB (or in-memory) when lectures are cached; full flow works offline.
- **Check-answer:** Requires network; offline → skip or defer validation (e.g. queue; validate on reconnect). **Do not** cache check-answer responses.
- **Submit quiz:** Offline → save to IDB, add to `syncQueue`; show “synced when online” message. Already partially implemented.
- **Stats / Profile:** From IDB only; no network needed.

### 5.2 When Network Returns

- **`online` event:** 
  - Run `syncPendingData()` (existing).
  - Trigger background revalidation (years, optional lectures).
  - Optional: gentle UI hint (“Back online”) without blocking.
- **Conflict resolution:** 
  - Progress is local-only; cleared on complete/exit. No server progress to merge.
  - Results: last-write-wins on server (submit from queue). Ensure sync payload includes full graded data if backend supports it; otherwise current “answers + score” approach.

### 5.3 Offline Page

- Navigate requests use network-first; failure → cached `index.html` or `offline.html`. Keep `offline.html` in shell cache; ensure it’s helpful (e.g. “You’re offline”, retry, list of what works offline).

---

## 6. Performance Optimizations

### 6.1 Reduce Unnecessary Network Calls

- **Years:** Use SWR + in-memory TTL; avoid refetch within TTL; background revalidate on focus/reconnect only.
- **Lectures:** 
  - **Read-through:** When opening a subject’s lectures, try IDB first for **all** requested IDs; fetch only missing or stale. Merge with network response when fetched.
  - Reuse existing batch endpoint; don’t split into per-lecture calls.
- **No caching of POST** (quiz-results, check-answer); avoid duplicate submissions via normal app flow.

### 6.2 Preload Critical Data

- **Critical:** Years hierarchy (initial view). Optional: preload first module’s subjects/metadata if easily available from years response.
- **Preload:** Keep `GET /api/years` as early as possible (e.g. right after shell); already triggered from Navigation.

### 6.3 Lazy-Load Heavy Data

- **Lectures:** Load per subject on drill-down (current batch fetch). Do not load all lectures for all subjects upfront.
- **Stats:** Already lazy (on Stats tab); data from IDB only.
- **Confetti / heavy libs:** Already lazy in Quiz; keep as-is.

### 6.4 Fast Navigation Between Questions

- Questions for a quiz are in memory; no per-question fetch. Keep it that way.
- Ensure progress save (e.g. on “next”) is non-blocking (already async). Avoid main-thread jank.

### 6.5 Prefetch Fixes (Optional Enhancements)

- **Fix SW prefetch:** Use real endpoints. For example, prefetch `GET /api/lectures/batch?ids=id1,id2` for “likely next” lectures (e.g. same subject) instead of non-existent `/api/quiz/:id`.
- **Align hierarchical / predictive loaders** with real API: e.g. prefetch `GET /api/years` once, then prefetch batch lecture IDs for visible or likely-to-open subjects (from years response). Remove or rewrite references to `/api/years/:id/modules` and `/api/modules/:id/questions`.

---

## 7. Safety Rules

- **Sensitive data:** Do not cache auth tokens, refresh tokens, or PII in SW cache or in unencrypted IDB beyond what’s already stored (e.g. results). Keep sync queue integrity checks (HMAC).
- **Auth:** Do not break Supabase auth. Never cache `Authorization` headers or auth endpoints. Exclude `/api/admin/*` and any auth-specific routes from SW caching.
- **Admin:** All `/api/admin/*` requests must bypass SW cache (network-only).
- **POST requests:** Do not cache any POST (or other mutating) responses in the SW.
- **Race conditions:** Use a single revalidation flow per data type where applicable; debounce focus/reconnect revalidation; avoid clearing caches before successful fetch.

---

## 8. Implementation Plan (Step-by-Step)

### Phase 1: Stabilize & Harden (No New Features)

1. **Remove or gate “force cache clear” in `index.html`**  
   - Run only in dev (e.g. `location.hostname === 'localhost'` or `?dev=1`). Ensure production never unregisters SW or clears caches on load.

2. **Service Worker — API handling**  
   - Exclude all `POST` (and `PUT`/`PATCH`/`DELETE`) from caching. Use `request.method === 'GET'` before any `cache.put` for API.
   - Exclude `/api/admin/*` explicitly: never cache, always pass through to network.
   - Keep `/api/years` SWR; ensure only GET is cached.

3. **Fix or disable broken prefetch**  
   - Either remove `PREFETCH_QUIZZES` usage of `/api/quiz/:id`, or switch to `GET /api/lectures/batch?ids=...` for known lecture IDs. Update callers accordingly.

4. **Optional: Hierarchical / predictive loaders**  
   - Remove or refactor use of `/api/years/:id/modules` and `/api/modules/:id/questions`. Replace with prefetch of `GET /api/years` and/or `GET /api/lectures/batch` based on actual API.

### Phase 2: Lecture Read-Through & Staleness

5. **Navigation — lecture list**  
   - Before batch fetch, read from HarviDB for requested lecture IDs (respecting `cachedAt`).
   - If all found and not stale, render from IDB immediately; optionally still fetch in background and update IDB + UI.
   - If any missing or stale, fetch batch; merge with IDB; write back; render.

6. **Staleness helper**  
   - Add `MAX_LECTURE_AGE` (e.g. 24h) and `isLectureStale(lecture)` in `db.js` or a small `cache-utils` module. Use in step 5.

7. **HarviDB `getAllLectures`**  
   - Tighten “complete” heuristic or add an explicit “preload complete” flag if you use it for bulk lecture checks. Avoid over-relying on `cache.size` for “all loaded”.

### Phase 3: Revalidation & UX

8. **Focus / reconnect revalidation**  
   - On `visibilitychange` (visible) and `online`: debounced background revalidation for years (and optionally recent-lecture IDs). Update in-memory and SW cache; do not block UI.

9. **Offline indicators**  
   - When showing years or lectures from cache only (e.g. offline or network failed), show a small “Cached” or “Offline” indicator. Ensure `offline.html` and nav fallback are consistent.

### Phase 4: Optional Optimizations

10. **Prefetch**  
    - Implement prefetch for “next likely” lectures (e.g. same subject) via `GET /api/lectures/batch`, and wire to SW or a small prefetch module.

11. **Session-level cache**  
    - Optional: lightweight session map of “recently fetched batch keys” to avoid redundant work during rapid back/forward in same subject.

12. **Metrics**  
    - Optional: minimal logging (e.g. “served from IDB” vs “from network”) to validate policies and debug stale issues.

---

## 9. Risk List & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stale questions shown | High | Network-first for lectures; optional max-age + background revalidate; clear “cached” indicator. |
| SW caches POST responses | Medium | Explicitly skip caching for non-GET in API handler. |
| Admin data cached | High | Never cache `/api/admin/*`; network-only. |
| Force cache clear in prod | High | Gate clear + unregister to dev only. |
| Prefetch hits wrong URL | Low | Fix prefetch to use real endpoints or disable. |
| IDB “complete” heuristic wrong | Medium | Prefer explicit flags / smarter checks; avoid `getAllLectures` for “all data loaded” unless defined clearly. |
| Revalidation races | Medium | Single revalidation flow per type; debounce; no clear-before-fetch. |
| Auth vs quiz-results | Medium | Align app and backend: either send `Authorization` for logged-in users or use an anonymous-friendly endpoint. Document and fix. |
| IndexedDB full / quota | Low | Monitor usage; periodic cleanup of old `lectures` beyond retention (e.g. 7–30 days) if needed. |
| Vercel vs localhost behavior | Low | Use relative `/api` URLs; SW uses `location.origin`. Test both. |

---

## 10. Migration Plan (Current → Optimized)

### 10.1 Pre-Migration

- **Backup:** Ensure HarviDB schema and sync queue format are documented. No DB migration required for Phase 1–2.
- **Feature flags:** Optional `ENABLE_LECTURE_READ_THROUGH`, `ENABLE_FOCUS_REVALIDATION` to toggle new behavior.

### 10.2 Order of Changes

1. **index.html:** Gate cache-clear script → deploy → verify SW stays registered in prod.
2. **sw.js:**  
   - Exclude POST and `/api/admin/*` from caching; fix prefetch URL or disable.  
   - Bump `APP_VERSION` so old caches are dropped.  
   - Deploy and verify API behavior (years SWR, lectures network-first, no POST cached).
3. **Navigation + db.js:**  
   - Add read-through and staleness for lectures (Phases 2–3).  
   - Deploy behind flag if used; test offline and online.
4. **Focus / reconnect:** Add revalidation (Phase 3). Test with devtools “offline” and “online”.
5. **Prefetch / loaders:** Fix or remove invalid endpoints (Phase 1 + 4). Test prefetch only if enabled.

### 10.3 Rollback

- Revert SW version → old caches already deleted; new installs get old SW. Existing clients get previous SW on next update.
- If read-through causes issues, disable via flag and fall back to “always network” for lectures.
- Keep sync queue and IDB format backward-compatible; no rollback of IDB schema needed for this plan.

### 10.4 Verification Checklist

- [ ] Production never runs “force cache clear” on load.
- [ ] `/api/years` usable offline after first load; SWR works.
- [ ] `/api/lectures/batch` network-first; offline falls back to IDB when read-through is on.
- [ ] POST to quiz-results / check-answer never cached.
- [ ] `/api/admin/*` never cached.
- [ ] Resume quiz works offline from IDB.
- [ ] Sync on reconnect works; no duplicate submissions.
- [ ] Focus/reconnect revalidation does not block UI or cause flashes.
- [ ] Same app works on localhost and Vercel (relative `/api`).

---

## 11. Optional Code Snippets (After Plan Approval)

Below are minimal, focused snippets. Integrate only after the plan is approved and you’re ready to implement.

### 11.1 Gate “Force Cache Clear” (index.html)

```html
<script>
  (function () {
    var isDev = location.hostname === 'localhost' || location.search.indexOf('dev=1') !== -1;
    if (!isDev) return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (r) { r.unregister(); });
      });
    }
    if ('caches' in window) {
      caches.keys().then(function (names) {
        names.forEach(function (n) { caches.delete(n); });
      });
    }
  })();
</script>
```

### 11.2 SW: Skip Non-GET and Admin

```js
// Inside fetch handler, for /api/ requests:
if (url.pathname.startsWith('/api/')) {
  if (url.pathname.startsWith('/api/admin/') || request.method !== 'GET') {
    return; // pass through, no cache
  }
  // ... existing GET caching logic for /api/years and others
}
```

### 11.3 Staleness Helper (e.g. `js/cache-utils.js`)

```js
const MAX_LECTURE_AGE_MS = 24 * 60 * 60 * 1000; // 24h

function isLectureStale(lecture) {
  if (!lecture || !lecture.cachedAt) return true;
  return (Date.now() - new Date(lecture.cachedAt).getTime()) > MAX_LECTURE_AGE_MS;
}
```

### 11.4 Focus Revalidation (Sketch)

```js
var revalidateDebounce = null;
function scheduleRevalidate() {
  if (revalidateDebounce) clearTimeout(revalidateDebounce);
  revalidateDebounce = setTimeout(function () {
    revalidateDebounce = null;
    if (!navigator.onLine) return;
    // e.g. Navigation.refreshYearsInBackground() -> fetch /api/years, update cache + remoteYears
  }, 500);
}
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible') scheduleRevalidate();
});
window.addEventListener('online', scheduleRevalidate);
```

---

## 12. Summary

- **Layers:** SW cache (shell + static assets); IndexedDB (lectures, progress, results, settings, sync); in-memory (years, HarviDB L1).
- **Policies:** Cache-first for shell; SWR for years; network-first with IDB fallback for lectures; never cache POST or admin.
- **Invalidation:** Version-based for shell; TTL + focus/reconnect for years; timestamp-based optional staleness for lectures.
- **Offline:** Shell + cached years + IDB lectures and progress enable offline quiz; sync on reconnect; no conflict resolution for progress.
- **Safety:** No caching of auth or admin; no POST caching; debounced revalidation to avoid races.

Implement in phases: first harden SW and remove cache-clear in prod, then add lecture read-through and revalidation, then optional prefetch and loaders. This keeps the PWA **instant**, **offline-resilient**, and **fresh** without introducing stale-data or auth bugs.

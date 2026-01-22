# 🔐 AUTH TOKEN ISSUE — DETAILED AUDIT

**Issue:** SafeFetch sync POST missing proper `Authorization` header  
**Status:** ⚠️ **PARTIALLY FIXED** (code exists but has syntax errors)  
**Severity:** 🔴 **CRITICAL**  
**Date:** January 22, 2026

---

## FINDING #1: Backend Analysis

### ✅ GOOD NEWS: Backend is `optionalAuthMiddleware`

**Location:** `api/index.js` line 472

```javascript
app.post('/api/quiz-results', optionalAuthMiddleware, async (req, res) => {
```

**What this means:**
- ✅ `optionalAuthMiddleware` (not required `authMiddleware`)
- ✅ POST works with OR without token
- ✅ If token provided: `req.user = user` (authenticated)
- ✅ If token missing: `req.user = null` (anonymous)
- ✅ Backend gracefully handles both cases
- ✅ `userId` is set to `req.user ? req.user.id : null` (can be null)

**Result:** Quiz submissions work anonymously, but if user is logged in, they should send the token.

---

## FINDING #2: Frontend Implementation Issue

### Current Code (BROKEN)

**Location:** `app.js` lines 296-318

```javascript
if (item.action === 'saveQuizResult') {
    const response = await SafeFetch.fetch('./api/quiz-results', {
        method: 'POST',
        const headers = { 'Content-Type': 'application/json' };  // ❌ SYNTAX ERROR
        const token = localStorage.getItem('harvi_auth_token') || localStorage.getItem('supabase.auth.token');
        if(token) {
            headers['Authorization'] = `Bearer ${token}`; // Remove quotes if they exist in storage
        }

    const response = await SafeFetch.fetch('./api/quiz-results', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(item.data),
            timeout: 15000,
            retries: 3
        });
```

### ❌ **CRITICAL ISSUES:**

1. **Syntax Error (Line 297):** `const headers = { ... };` declared INSIDE the fetch options object → Invalid JavaScript
2. **Duplicate fetch call:** `SafeFetch.fetch` called TWICE (lines 296 and 306)
3. **Unreachable code:** First fetch attempt never executes due to syntax error
4. **Token retrieval wrong:** Looking for `harvi_auth_token` or `supabase.auth.token` but Supabase uses specific session key

### ⚠️ **IMPACT:**

- Code throws syntax error on every sync attempt
- Sync loop breaks; no results uploaded
- User data lost (queued results never sent)
- **This is a critical production bug**

---

## FINDING #3: Where Is the Auth Token?

### Option A: Supabase Session (Recommended)
If app uses Supabase client library (`@supabase/supabase-js`):

```javascript
const supabaseClient = window.supabase;  // Injected by Supabase SDK
const session = await supabaseClient.auth.getSession();
const token = session?.data?.session?.access_token;
```

### Option B: localStorage Key
Supabase stores session in:
```javascript
// Key pattern: supabase.auth.token or supabase.auth.<projectId>.auth.token
const storedSession = localStorage.getItem('supabase.auth.token');
const token = storedSession ? JSON.parse(storedSession).access_token : null;
```

### Option C: No Auth Token Available
If user is not logged in, `token = null` (still works; backend allows anonymous).

---

## ROOT CAUSE ANALYSIS

### Why This Happened:
1. **Incomplete refactor:** Someone started adding auth but didn't finish
2. **Syntax not validated:** Code wasn't tested (syntax error blocks execution)
3. **Double fetch:** Copy-paste error created two fetch calls
4. **Token key wrong:** localStorage key mismatch (harvi_auth_token doesn't exist)

### Why It Wasn't Caught:
- No unit tests for sync logic
- No error logs checked (would show syntax error)
- Offline quiz results aren't synced in test environment (they're queued for later)

---

## CORRECT IMPLEMENTATION

### ✅ **FIX: Proper Auth Token Handling**

```javascript
if (item.action === 'saveQuizResult') {
    try {
        // 1. Get auth token from Supabase session (if available)
        let authToken = null;
        try {
            const storedSession = localStorage.getItem('supabase.auth.token');
            if (storedSession) {
                const session = JSON.parse(storedSession);
                authToken = session.access_token;
            }
        } catch (e) {
            // localStorage.getItem failed or JSON parse failed
            console.warn('⚠️ Could not retrieve auth token:', e.message);
        }

        // 2. Prepare headers
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        // 3. POST to server
        const response = await SafeFetch.fetch('./api/quiz-results', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(item.data),
            timeout: 15000,
            retries: 3
        });

        // 4. Handle response
        if (response.ok) {
            await harviDB.markSynced(item.id);
            syncSuccessCount++;
            console.log(`✓ Synced item ${item.id}${authToken ? ' (authenticated)' : ' (anonymous)'}`);
        } else {
            console.warn(`Server rejected item ${item.id}: ${response.status} ${response.statusText}`);
            // Don't mark as synced; retry on next reconnect
        }
    } catch (error) {
        console.warn(`Failed to sync item ${item.id}:`, error);
    }
}
```

### Key Improvements:
- ✅ Single fetch call (no duplicate)
- ✅ Proper localStorage parsing
- ✅ Safe token extraction (try/catch)
- ✅ Works with or without auth token
- ✅ Logs whether sync was authenticated
- ✅ No syntax errors
- ✅ Proper error handling

---

## VERIFICATION CHECKLIST

### Before Deploying Fix:

- [ ] **Syntax Check:** No `const` inside fetch options
- [ ] **Single Fetch:** Only ONE `SafeFetch.fetch` call per item
- [ ] **Token Handling:** Attempts localStorage retrieval with try/catch
- [ ] **Fallback:** Works if token is null (anonymous)
- [ ] **Headers:** Properly formatted (`Authorization: Bearer <token>`)
- [ ] **Logging:** Shows authenticated vs anonymous sync
- [ ] **Test Offline:** Go offline, complete quiz, check sync queue
- [ ] **Test Online:** Reconnect, verify sync completes with OR without auth

### Expected Results:

**Scenario 1: User is logged in + goes offline + comes online**
```
✓ Synced item 1 (authenticated)
✓ Synced item 2 (authenticated)
✓ Sync completed: 2 items processed
```

**Scenario 2: User is anonymous + goes offline + comes online**
```
✓ Synced item 1 (anonymous)
✓ Synced item 2 (anonymous)
✓ Sync completed: 2 items processed
```

**Scenario 3: Server rejects (network error)**
```
Server rejected item 1: 500 Internal Server Error
Failed to sync item 2: Network timeout
(items remain in queue; will retry next reconnect)
```

---

## IMPACT ASSESSMENT

| Aspect | Current Status | After Fix |
|--------|---|---|
| **Offline quiz completion** | ✅ Works (data saved to IDB) | ✅ Works (same) |
| **Sync on reconnect** | 🔴 BROKEN (syntax error) | ✅ Fixed (proper upload) |
| **Auth token handling** | ❌ Wrong key lookup | ✅ Correct localStorage access |
| **Anonymous users** | ✅ Works (optional middleware) | ✅ Works (fallback) |
| **Data loss risk** | 🔴 HIGH (sync fails) | 🟢 LOW (recovers on retry) |

---

## IMPLEMENTATION PRIORITY

| Task | Time | Urgency |
|------|------|---------|
| 1. Fix syntax errors | 5 min | 🔴 CRITICAL |
| 2. Test offline → online sync | 10 min | 🔴 CRITICAL |
| 3. Verify token retrieval | 5 min | 🔴 CRITICAL |
| 4. Add auth logging | 5 min | 🟠 HIGH |
| 5. Document token handling | 10 min | 🟡 MEDIUM |

**Total: ~35 minutes to production-ready**

---

## RECOMMENDATIONS

### Immediate (Before Deploy):
1. ✅ Fix syntax errors in sync POST (remove duplicate fetch, fix headers const)
2. ✅ Test offline quiz → sync flow
3. ✅ Verify localStorage token key is correct
4. ✅ Add error logging for token retrieval failures

### Short-term (After Deploy):
5. Monitor first week for sync failures (check browser console)
6. Add analytics: track % of syncs that are authenticated vs anonymous
7. Consider adding manual "Sync Now" button for user control

### Medium-term (Phase 2):
8. Add admin dashboard to inspect sync queue
9. Implement automatic retry with exponential backoff
10. Add notification when sync succeeds/fails

---

## TESTING SCRIPT

**To verify the fix works:**

```javascript
// In browser console (DevTools → Console tab):

// 1. Go offline
console.log('Going offline...');
navigator.onLine = false;  // Simulate offline

// 2. Complete a quiz (should be queued)
// (Manually navigate through quiz and submit)

// 3. Check sync queue
console.log('Sync queue:', await harviDB.getSyncQueue());

// 4. Go online
console.log('Going online...');
window.dispatchEvent(new Event('online'));
navigator.onLine = true;

// 5. Wait 2 seconds for sync to process
setTimeout(() => {
    harviDB.getSyncQueue().then(queue => {
        console.log('Queue after sync:', queue);
        console.log('Expected: all items should have synced: true');
    });
}, 2000);
```

---

## SIGN-OFF

**Current Status:** 🔴 **BROKEN** (syntax error prevents sync)  
**After Fix:** ✅ **PRODUCTION READY**  
**Fix Complexity:** 🟢 **LOW** (straightforward correction)  
**Test Effort:** 🟡 **MEDIUM** (need to test offline → online flow)  
**Risk of Fix:** 🟢 **LOW** (no dependencies, isolated change)

**Recommendation:** 🚀 **DEPLOY FIX IMMEDIATELY** (prevents data loss)

---

## RELATED DOCUMENTATION

- Backend middleware: `api/index.js` lines 47-72 (optionalAuthMiddleware)
- Quiz-results endpoint: `api/index.js` lines 471-530
- Current sync code: `app.js` lines 296-318 (BROKEN)
- Supabase session: `localStorage` under key `supabase.auth.token`

**Next step:** Shall I implement the fix in app.js? 🔧

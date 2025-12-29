# 🧪 COMPREHENSIVE TEST SUITE - Harvi Quiz App

**Version**: 2.1.0  
**Created**: 2025-12-29  
**Purpose**: Discover any minor bugs before deployment

---

## 📋 PRE-TEST SETUP

### Browser Requirements
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (if on Mac)
- [ ] Mobile Chrome
- [ ] Mobile Safari

### Test Environment Setup
```bash
# 1. Start fresh
npm run clean
npm run seed

# 2. Start server
npm run dev

# 3. Open DevTools
# - Console tab (for errors)
# - Network tab (for failed requests)
# - Application tab (for SW/Cache/IndexedDB)
# - Performance tab (for memory leaks)
```

### Initial State
- [ ] Clear browser cache
- [ ] Clear all site data (Application → Clear storage)
- [ ] Unregister service workers
- [ ] Close all other tabs
- [ ] Take baseline memory snapshot

---

## 🔴 CRITICAL BUG TESTS (Fixed Bugs Validation)

### TEST 1: Quiz Resume Double-Shuffle Bug
**Bug Fixed**: Questions re-shuffle on resume causing wrong answers

**Steps**:
1. Navigate to any lecture with 10+ questions
2. Start quiz
3. Note the options for Question 1 (take screenshot)
4. Answer Questions 1-3
5. **Close browser completely**
6. Reopen app
7. Click "Resume Quiz" prompt
8. **VERIFY**: Question 4 appears (not Question 1)
9. Go back to Question 1
10. **VERIFY**: Options are in EXACT same order as screenshot
11. **VERIFY**: Selecting correct answer shows green ✓
12. Complete quiz
13. **VERIFY**: Score is accurate

**Expected**: No shuffle on resume, score correct  
**Pass Criteria**: ✅ Same option order, ✅ Correct validation, ✅ Accurate score

---

### TEST 2: Memory Leak - Keyboard Listeners
**Bug Fixed**: Global keyboard listener never removed

**Steps**:
1. Open DevTools → Memory tab
2. Take heap snapshot #1
3. Start quiz → Exit (10 times)
4. Force garbage collection
5. Take heap snapshot #2
6. Compare snapshots → Search "keydown"

**Expected**: No accumulated listeners  
**Pass Criteria**: ✅ Listener count same as baseline

---

### TEST 3: Memory Leak - AbortController
**Bug Fixed**: AbortController references not nulled

**Steps**:
1. Open DevTools → Memory tab
2. Take heap snapshot #1
3. Navigate: Years → Modules → Subjects → Lectures → Back (20 times rapidly)
4. Force garbage collection
5. Take heap snapshot #2
6. Search for "AbortController"

**Expected**: Max 1-2 instances  
**Pass Criteria**: ✅ Not 20+ instances

---

### TEST 4: Database Transaction Integrity
**Bug Fixed**: Cascade delete without transactions

**Setup**: Create test data via admin API
```bash
# Create: Year → 2 Modules → 3 Subjects → 10 Lectures = 60 lectures
```

**Test 4A - Success Path**:
1. DELETE `/api/admin/years/:yearId`
2. Check database: `db.lectures.count()`
3. **VERIFY**: All 60 lectures deleted
4. **VERIFY**: All subjects deleted
5. **VERIFY**: All modules deleted

**Test 4B - Failure Rollback**:
1. Modify server code to throw error after first delete
2. Try DELETE year
3. **VERIFY**: Operation fails
4. **VERIFY**: NO data was deleted (rollback)
5. **VERIFY**: Database unchanged

**Pass Criteria**: ✅ All-or-nothing deletion

---

### TEST 5: IndexedDB Race Condition
**Bug Fixed**: Multiple init() calls causing failures

**Test 5A - Concurrent Init**:
```javascript
// Run in console
Promise.all([
  harviDB.init(),
  harviDB.init(),
  harviDB.init()
]).then(() => console.log('✓ Race handled'))
```
**Expected**: No errors, single initialization

**Test 5B - Private Browsing**:
1. Open incognito/private window
2. Load app
3. **VERIFY**: Shows warning "Offline features disabled"
4. **VERIFY**: App still loads and works
5. **VERIFY**: No infinite retry loop

**Pass Criteria**: ✅ Graceful degradation

---

### TEST 6: Service Worker Update Detection
**Bug Fixed**: Updates not detected on mobile

**Steps**:
1. Load app → Open DevTools Console
2. Note current SW version
3. Change `APP_VERSION` to "2.1.1" in sw.js
4. **Test 6A - On Load**: Reload page
   - **VERIFY**: Console shows "Checking for updates"
   - **VERIFY**: New SW detected within 5 seconds
5. **Test 6B - Visibility**: 
   - Background tab for 30 seconds
   - Return to tab
   - **VERIFY**: Console shows update check
6. **Test 6C - Focus**:
   - Switch to another window
   - Return to browser
   - **VERIFY**: Console shows update check

**Pass Criteria**: ✅ Update detected via 3 methods

---

### TEST 7: Cache Version Conflicts
**Bug Fixed**: Mixed cache versions

**Steps**:
1. Application → Cache Storage → Note current caches
2. Change `APP_VERSION` to "2.1.1"
3. Reload and wait for activation
4. Check Cache Storage
5. **VERIFY**: Old caches deleted (harvi-*-v2.1.0)
6. **VERIFY**: New caches created (harvi-*-v2.1.1)
7. **VERIFY**: No mixed versions

**Pass Criteria**: ✅ Clean version upgrade

---

### TEST 8: DOM Node Cloning Leak
**Bug Fixed**: Orphaned card nodes

**Steps**:
1. DevTools → Memory → Take snapshot #1
2. Navigate to Lectures page (50+ lectures)
3. Go back → Return (10 times)
4. Force GC → Take snapshot #2
5. Search for "Detached"
6. **VERIFY**: < 10 detached DOM nodes

**Pass Criteria**: ✅ No accumulating nodes

---

### TEST 9: Push Notification Crash
**Bug Fixed**: Malformed push data crashes SW

**Test using DevTools Application → Service Workers**:
```javascript
// Test 1: Valid JSON
self.registration.showNotification('Test', {body: 'Valid'})

// Test 2: Malformed (should not crash)
// Simulate in SW context - should handle gracefully
```

**Pass Criteria**: ✅ SW stays alive on bad data

---

### TEST 10: Unhandled Promise Rejections
**Bug Fixed**: SafeFetch throws on network failure

**Steps**:
1. DevTools Console → Check for errors
2. DevTools Network → Set to "Offline"
3. Try to load Years page
4. **VERIFY**: No "Unhandled Promise Rejection" in console
5. **VERIFY**: UI shows error message
6. Go online → Reload
7. **VERIFY**: Works normally

**Pass Criteria**: ✅ No unhandled rejections

---

## 🟡 FUNCTIONAL TESTS

### Quiz Flow Tests

**TEST F1: Complete Quiz Flow**
1. Navigate: Years → Module → Subject → Lecture
2. Start quiz
3. Answer all questions (mix correct/wrong)
4. **VERIFY**: Progress bar updates
5. **VERIFY**: Continue button enables after selection
6. **VERIFY**: Feedback shows (green/red)
7. Finish quiz
8. **VERIFY**: Results screen shows
9. **VERIFY**: Score matches answers
10. **VERIFY**: Confetti plays (if high score)

**TEST F2: Quiz Keyboard Navigation**
1. Start quiz
2. Use only keyboard:
   - Arrow keys to navigate options
   - Enter to select
   - Numbers 1-4 to quick-select
   - Escape to exit
3. **VERIFY**: All keyboard shortcuts work
4. **VERIFY**: Focus visible on selected option

**TEST F3: Quiz Retake**
1. Complete quiz
2. Click "Retake Quiz"
3. **VERIFY**: Questions are re-shuffled
4. **VERIFY**: Options are re-shuffled
5. **VERIFY**: Previous answers cleared
6. Complete again
7. **VERIFY**: New score saved separately

---

### Navigation Tests

**TEST N1: Breadcrumb Navigation**
1. Navigate deep: Year → Module → Subject → Lecture
2. Click breadcrumb "Module"
3. **VERIFY**: Returns to module view
4. **VERIFY**: Correct context maintained
5. Navigate to different subject
6. Click "Years" in breadcrumb
7. **VERIFY**: Returns to years view

**TEST N2: Back Button**
1. Navigate through all levels
2. Use browser back button
3. **VERIFY**: Navigates correctly
4. **VERIFY**: State preserved
5. Use forward button
6. **VERIFY**: Returns to previous view

**TEST N3: Direct URL**
```
Test URLs:
- /#quiz?lectureId=L001
- /#navigation
- /#stats
- /#profile
```
**VERIFY**: Each loads correct screen

---

### Offline Tests

**TEST O1: Offline Mode**
1. Visit app while online
2. Load several lectures
3. DevTools Network → Offline
4. Navigate to cached lecture
5. **VERIFY**: Loads from cache
6. Start quiz
7. **VERIFY**: Quiz works offline
8. Complete quiz
9. **VERIFY**: Result saved locally
10. Go online
11. **VERIFY**: Data syncs

**TEST O2: Service Worker Caching**
1. Load app
2. Check Application → Cache Storage
3. **VERIFY**: All assets cached
4. Go offline
5. Hard reload (Ctrl+Shift+R)
6. **VERIFY**: App loads from cache
7. **VERIFY**: UI functional

---

## 🟢 UI/UX TESTS

**TEST U1: Responsive Design**
Device sizes to test:
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Small mobile (320x568)

For each size verify:
- [ ] Layout not broken
- [ ] Text readable
- [ ] Buttons tappable
- [ ] No horizontal scroll

**TEST U2: Dark Mode**
1. Profile → Toggle dark mode ON
2. **VERIFY**: Colors invert
3. Navigate all screens
4. **VERIFY**: Consistent dark theme
5. Reload page
6. **VERIFY**: Preference persisted
7. Toggle OFF
8. **VERIFY**: Returns to light mode

**TEST U3: Animations**
1. Navigate pages
2. **VERIFY**: Smooth transitions
3. Start quiz
4. **VERIFY**: Entrance animations
5. Select answer
6. **VERIFY**: Feedback animations
7. Complete quiz
8. **VERIFY**: Confetti animation (high score)

**TEST U4: Loading States**
1. Slow 3G network
2. Navigate to years
3. **VERIFY**: Loading skeleton shows
4. **VERIFY**: Placeholder content
5. Data loads
6. **VERIFY**: Smooth transition to content

---

## 🔵 PERFORMANCE TESTS

**TEST P1: Memory Leaks**
```
Process:
1. Performance Monitor → JS Heap Size
2. Run flow 20 times:
   - Navigate all pages
   - Start quiz → Exit
   - Repeat
3. Monitor heap size
```
**Pass**: Heap stabilizes, no constant growth

**TEST P2: Load Time**
1. DevTools Performance → Record
2. Reload page
3. Stop recording
4. **VERIFY**: FCP < 1.5s
5. **VERIFY**: LCP < 2.5s
6. **VERIFY**: TTI < 3.5s

**TEST P3: Bundle Size**
1. Network tab → Disable cache
2. Hard reload
3. Check total transfer size
4. **VERIFY**: < 500KB initial load

---

## 🟣 SECURITY TESTS

**TEST S1: XSS Prevention**
```javascript
// Try in question text (admin):
<script>alert('XSS')</script>
```
**VERIFY**: Rendered as text, not executed

**TEST S2: SQL Injection** (if applicable)
```
Test input: '; DROP TABLE lectures; --
```
**VERIFY**: Handled safely

**TEST S3: CORS**
```javascript
// From different origin
fetch('http://localhost:3000/api/years')
```
**VERIFY**: Properly configured CORS

---

## 🟠 EDGE CASES

**TEST E1: Empty States**
- [ ] Year with no modules
- [ ] Module with no subjects  
- [ ] Subject with no lectures
- [ ] Lecture with no questions
**VERIFY**: Proper empty state UI

**TEST E2: Large Data**
- [ ] Quiz with 100+ questions
- [ ] Subject with 50+ lectures
**VERIFY**: Performance acceptable

**TEST E3: Special Characters**
```
Test names with:
- Arabic: محاضرة رقم ١
- Emoji: 📚 Lecture 🎓
- HTML: <div>Test</div>
```
**VERIFY**: Displays correctly

**TEST E4: Network Interruption**
1. Start loading lecture
2. Disconnect network mid-load
3. **VERIFY**: Error message
4. Reconnect
5. **VERIFY**: Can retry

**TEST E5: Rapid Clicks**
1. Click start quiz 10 times rapidly
2. **VERIFY**: Only one quiz starts
3. Click navigation items rapidly
4. **VERIFY**: No race conditions

---

## 📊 TEST RESULTS TEMPLATE

```markdown
## Test Run: [DATE]
**Tester**: [NAME]
**Browser**: [BROWSER + VERSION]
**OS**: [OS]

### Critical Bugs (10 tests)
- [ ] TEST 1: Quiz Resume ..................... PASS/FAIL
- [ ] TEST 2: Keyboard Leak ................... PASS/FAIL
- [ ] TEST 3: AbortController ................. PASS/FAIL
- [ ] TEST 4: DB Transactions ................. PASS/FAIL
- [ ] TEST 5: IndexedDB Race .................. PASS/FAIL
- [ ] TEST 6: SW Updates ...................... PASS/FAIL
- [ ] TEST 7: Cache Versions .................. PASS/FAIL
- [ ] TEST 8: DOM Leak ........................ PASS/FAIL
- [ ] TEST 9: Push Notifications .............. PASS/FAIL
- [ ] TEST 10: SafeFetch ...................... PASS/FAIL

### Functional Tests (6 tests)
- [ ] TEST F1-F3: Quiz Flow ................... PASS/FAIL
- [ ] TEST N1-N3: Navigation .................. PASS/FAIL
- [ ] TEST O1-O2: Offline ..................... PASS/FAIL

### UI/UX Tests (4 tests)
- [ ] TEST U1: Responsive ..................... PASS/FAIL
- [ ] TEST U2: Dark Mode ...................... PASS/FAIL
- [ ] TEST U3: Animations ..................... PASS/FAIL
- [ ] TEST U4: Loading States ................. PASS/FAIL

### Performance (3 tests)
- [ ] TEST P1: Memory ......................... PASS/FAIL
- [ ] TEST P2: Load Time ...................... PASS/FAIL
- [ ] TEST P3: Bundle Size .................... PASS/FAIL

### Security (3 tests)
- [ ] TEST S1-S3: Security .................... PASS/FAIL

### Edge Cases (5 tests)
- [ ] TEST E1-E5: Edge Cases .................. PASS/FAIL

**Total**: __/31 PASSED
**Blockers**: [List any critical failures]
**Notes**: [Any observations]
```

---

## 🚨 FAILURE PROTOCOLS

### If Critical Test Fails:
1. ❌ **STOP** further testing
2. 📝 Document exact failure steps
3. 🐛 Create bug report with:
   - Test number
   - Browser/OS
   - Screenshot/video
   - Console errors
   - Network logs
4. 🔧 Fix before continuing

### If Functional Test Fails:
1. ⚠️ Mark as known issue
2. Continue testing
3. Assess impact
4. Prioritize fix

---

## ✅ SIGN-OFF CRITERIA

**Ready for Production**:
- ✅ ALL 10 critical bug tests PASS
- ✅ ALL functional tests PASS
- ✅ Performance meets targets
- ✅ No security vulnerabilities
- ✅ Works on 3+ browsers
- ✅ Mobile responsive

**Deploy with Caution**:
- ⚠️ 1-2 minor UI issues
- ⚠️ Edge case failures
- ⚠️ Performance slightly below target

**DO NOT DEPLOY**:
- ❌ Any critical test fails
- ❌ Data integrity issues
- ❌ Security vulnerabilities
- ❌ App crashes

---

## 🔧 AUTOMATED TESTING SCRIPT

Create `test-runner.js`:
```javascript
// Run critical tests automatically
const tests = {
  'Quiz Resume': testQuizResume,
  'Memory Leaks': testMemoryLeaks,
  // ... etc
};

Object.entries(tests).forEach(([name, fn]) => {
  try {
    fn();
    console.log(`✅ ${name} PASSED`);
  } catch (e) {
    console.error(`❌ ${name} FAILED:`, e);
  }
});
```

---

**End of Test Suite**

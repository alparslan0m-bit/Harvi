# Quiz Screen Zen Mode (Complete Removal)

**Request Pivot**:
User requested to completely remove the header from the quiz screen AND reclaim the empty space.

**Changes Implemented**:

1. **JS Logic (`js/quiz.js`)**:
   - Updated `start()` method to call `window.HeaderController.hide()`.
   - Also ensures `hideBreadcrumb()` is called.
   - Using `document.body.classList.remove('breadcrumb-visible')`.

2. **JS Logic (`js/header.js`)**:
   - Added `hide()` and `show()` methods.
   - Updated `configure()` to always call `show()` (auto-recovery).

3. **CSS Styling (`css/components/quiz-container.css`)**:
   - **Restored** `.back-btn`: Essential for navigation since main header is gone.
   - **Reverted** `.quiz-header` loop: Sticky Top 0, background/blur restored.

4. **CSS Layout (`css/components/header.css`)**:
   - **Override**: Added `#quiz-screen { padding-top: 0 !important; }` to reclaim the space usually reserved for the floating header.

**Result**:
- **Full Zen Mode**: No external header, no breadcrumb, no wasted space at the top.
- **Concentration**: Maximum screen real estate for the quiz content.
- **Navigation Safety**: Internal back button allows exit.

**Verification**:
- Start a quiz.
- Observe: No "Harvi" header, no gap at the top.
- Quiz header (progress/back) sits right at the top of the screen (or below safe-area).
- Exiting quiz restores the main header and correct spacing.

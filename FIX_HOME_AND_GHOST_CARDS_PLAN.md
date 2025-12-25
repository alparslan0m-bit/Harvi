# Plan to Fix Home Screen & Breadcrumb Issues

## 1. Issue Analysis
The user reports two distinct issues:
1.  **Empty Cards Flashing**: On app open, "empty cards appear and disappear so fast."
    -   *Cause*: The `showLoadingState` function in `navigation.js` (lines 169-214) checks for `window.SkeletonLoader`. If not found, it falls back to a spinner. However, there might be a race condition or an old `createCard` method being called somewhere that generates "empty" looking cards before the real data arrives.
    -   *Investigation*: `Navigation.createCard` (lines 604-613) creates the old-style `.card` elements. `Navigation.showYears` calls `renderYears`, which now creates `.grouped-list` items. The flashing likely comes from `showLoadingState` rendering something temporary that looks like the old cards, or `renderYears` being called with empty data initially.
    -   *Fix*: Ensure the loading state uses the **new** `skeleton-loader` style that matches the `.list-item` (iOS style), NOT the old `.card` grid style.

2.  **Breadcrumb Placement & Style**:
    -   User wants the breadcrumb ON the home screen (not hidden).
    -   User feels it is "elevated" (floating) too much.
    -   User notes the "place of Glass Box of the years is not the same of modules...". This suggests a layout inconsistency between the root view (`showYears`) and nested views (`showModules`).
    -   *Cause*: In `showYears`, we render a customized header. In `showModules`, we render a different one. The structure of the container might be slightly different, or the `padding/margin` of the `.breadcrumb` container shifts depending on the view.

## 2. Solution Strategy

### 2.1 Fix "Flashing Cards" (Ghost Elements)
-   Modify `Navigation.showLoadingState` in `js/navigation.js`.
-   Instead of using the old `SkeletonLoader` (which generates grid cards), we will manually generate a **list of skeleton items** that matches the new iOS list look (`.list-item`).
-   This ensures that while loading, the user sees "gray bars" (skeletons) that look exactly like the rows they are about to see, preventing the layout jump/flash.

### 2.2 Fix Breadcrumb & Layout Consistency
-   **Step 1: Revert "Flat" Home Breadcrumb**: The user didn't like the "no box" look because it felt inconsistent or just "elevated" in a wrong way. We will revert the `is-root` changes.
-   **Step 2: Unified Container**: Ensure `showYears` and `showModules` use the EXACT same HTML structure for the content area.
-   **Step 3: Vertical Rhythm**: The "elevation" feeling might be due to excessive `margin-bottom` on the breadcrumb or `padding-top` on the list. We will adjust `css/components/breadcrumb.css` to reduce the gap between the breadcrumb and the first list item, making them feel like one cohesive unit.

## 3. Implementation Steps

### Update `js/navigation.js`
1.  **Refactor `showLoadingState`**: Replace the logic that calls `SkeletonLoader.renderGrid` (which makes boxy cards). Instead, generate 5-6 dummy `.list-item` elements with a `.skeleton` class.
2.  **Check `showYears`**: Ensure it clears the container completely before rendering, so no old "cards" remains exist.

### Update `css/components/breadcrumb.css`
1.  **Reduce Margin**: Change `margin-bottom: 1.5rem` to `margin-bottom: 0.5rem` or `1rem`. This brings the breadcrumb closer to the content, reducing the "floating/elevated" disconnection.
2.  **Consistent Padding**: Ensure `.breadcrumb` has consistent padding regardless of the screen.

### Cleanup `css/components/cards.css`
1.  Remove unused `.card` styles if they are truly obsolete, to prevent accidental usage. (Optional, better to just ensure JS doesn't use them).

## 4. Expected Outcome
-   **Loading**: Smooth transition. No "flash" of big square cards. Just a subtle pulse of list rows that fade into real text.
-   **Home Screen**: Breadcrumb is present, enclosed in its glass box (as user implies they want it "in the home screen"), but sits tighter to the content, feeling grounded rather than floating high above.

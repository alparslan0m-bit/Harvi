# Plan to Restore Apple-Native Scrolling (Without the Home Screen Bug)

## 1. Issue Analysis
The user wants to restore the "beautiful" rubber-band/elastic scrolling on iOS but prevent the "pull-down-to-refresh" action that reloads the page and sends them back to the Home screen.
Previously, we killed the rubber-banding entirely with `overscroll-behavior-y: none;`. This fixed the reload but ruined the feel.

## 2. Solution Strategy
We will implement a **"Fixed Body, Scrollable Wrapper"** architecture.

1.  **Body**: Set to `fixed` position with `overflow: hidden`. This prevents the *browser window* from scrolling, which is what triggers the native reload.
2.  **App Container (`#app`)**: Set to `fixed` with `width: 100%` and `height: 100%`.
3.  **Screen/Content**: Set to `overflow-y: auto` with `-webkit-overflow-scrolling: touch`. This allows the *content* inside the app to scroll and bounce (rubber-band) against the app edges, but because the *body* isn't scrolling, the browser never triggers a reload.

## 3. Implementation Steps

### Step 1: Modify `css/base/reset.css`
-   **Action**: Remove `overscroll-behavior-y: none;` from the `html, body` rule.
-   **Action**: Add `position: fixed;`, `width: 100%;`, `height: 100%;`, `overflow: hidden;` to `html, body`.

### Step 2: Modify `css/main.css` (or `css/layout/grid.css`)
-   **Target**: `#app` (The main wrapper)
-   **Action**: Set it to fill the screen explicitly.
    ```css
    #app {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        overflow: hidden; /* App itself doesn't scroll, screens do */
    }
    ```

### Step 3: Modify `css/layout/grid.css`
-   **Target**: `.screen`
-   **Action**: Allow the individual screens to scroll and bounce.
    ```css
    .screen {
        height: 100%; /* Fill the fixed app container */
        overflow-y: auto; /* Allow scrolling within the screen */
        -webkit-overflow-scrolling: touch; /* Enable momentum/bounce */
        display: none; /* (Existing) */
    }
    .screen.active {
        display: block; /* (Existing) */
    }
    ```

## 4. Expected Outcome
-   **Scrolling**: Users can scroll lists and bounce at the top/bottom (elastic feel).
-   **Refresh**: Pulling down hard at the top will bounce the content, but *will not* reload the page or navigate to Home, because the browser sees the *body* as stationary.

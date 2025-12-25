# Plan to Fix Missing "Bounce" on Home & Stats Screens

## 1. The Bug
The "Apple Native" rubber-band bounce only works when there is **scrollable content**.
-   **Profile Page**: Likely has enough content/padding to be taller than the screen, so the browser enables scrolling (and bouncing).
-   **Home/Stats Pages**: Their content is currently shorter than the screen height. The browser sees no need to scroll, so it disables the scroll engine, causing the "stuck" static feeling.

## 2. The Solution
We must **force** the content container to always be at least 1 pixel taller than the screen. This tricks the browser into thinking "this page needs scrolling," enabling the rubber-band physics even for short lists.

## 3. Implementation Plan
Modify `css/layout/grid.css` to add a specific rule for the main content containers.

### Step 1: Update `css/layout/grid.css`
Add the following rule at the end of the file or inside the `.screen` section:

```css
/* FORCE BOUNCE: Ensure these containers are always taller than the viewport */
.screen > .container,
.screen > .quiz-container,
.screen > .results-container {
    min-height: calc(100% + 1px);
    display: flex;
    flex-direction: column; /* Keeps layour intact */
}
```

**Why this works:**
-   `min-height: calc(100% + 1px)`: Makes the content 1 pixel taller than the view.
-   `overflow-y: auto` (which is already on `.screen`): Handles the scrolling.
-   The browser detects overflow -> Enables Bounce.

## 4. Verification
After applying this, open the Home screen. Even with only 2 items, you should be able to pull down and see it bounce, just like the Profile page.

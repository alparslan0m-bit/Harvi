# Plan to Revamp Home Screen Header & Breadcrumb

## 1. Issue Analysis
The user has two main aesthetic complaints about the Home Screen ("Years" view):
1.  **Logo Prominence**: The main "Harvi" logo is too small or weak (`app-title`).
2.  **Breadcrumb Elevation**: The breadcrumb bar on the home screen looks "elevated" (floating/boxed) which clashes with the desired clean look. On inner pages (Modules/Subjects), the user likes it, but on Home (where it likely just says "Home"), the boxy style is distracting.

## 2. Solution Strategy

### 2.1 Enhance Logo (Header)
-   **Typography**: Significantly increase the `font-size` of `.app-title` from `2.75rem` to `3.5rem` (or larger) to make it a bold statement piece.
-   **Weight**: Ensure `font-weight: 800` or `900`.
-   **Spacing**: Adjust margins to let it breathe.

### 2.2 Flatten Home Breadcrumb
-   **Logic**: The "Glass Bar" aesthetic works well for a *path* (Home > Years > Module), but for a single "Home" indicator, it looks like a lonely button in a big box.
-   **Visuals**: On the Home screen ONLY, we will make the breadcrumb **transparent** and **flat** (no shadow, no background). This keeps it "in the place" (layout consistency) but removes the "elevation" (visual weight).
-   **Implementation**: We need to programmatically toggle a class (`.is-root`) on the breadcrumb container when the user is at the root level.

## 3. Implementation Steps

### Step 1: Update `js/navigation.js`
Modify `updateBreadcrumb()` logic to detect if we are on the home screen (`currentPath.length === 0`).
-   If Home: Add `is-root` class to `#breadcrumb`.
-   If Not Home: Remove `is-root` class.

### Step 2: Update `css/components/breadcrumb.css`
Add styles for `.breadcrumb.is-root`:
-   `background: transparent`
-   `box-shadow: none`
-   `border: none`
-   `backdrop-filter: none`
-   Adjust padding/margin to ensure the text still aligns nicely with the grid below.

### Step 3: Update `css/components/header.css`
-   Increase `.app-title` font size.
-   Refine `.brand-description` to balance the larger logo.

## 4. Expected Outcome
-   **Home Screen**: Huge, beautiful "Harvi" logo. Below it, a clean, simple "Home" text indicator (flat), followed by the card grid.
-   **Inner Pages**: Standard large title header + the "Glass Bar" breadcrumb the user loves.

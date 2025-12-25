# Girl Mode Revamp Plan: "Apple Native" Aesthetic

## 1. Executive Summary
The current "Girl Mode" suffers from three main issues:
1.  **Over-styling**: It applies heavy gradients and aggressive customizations that deviate from the clean, clinical structure of the default "Boy Mode".
2.  **Inconsistent Shadows**: It defines pink shadows for *some* components but fails to override the global shadow variables, leaving many elements (like buttons, standard containers) with clashing black/gray shadows.
3.  **Unwanted Darkness**: It triggers dark-mode logic (via system preference) or feels "dark" due to saturated background gradients, whereas the user desires a bright, pink-native app feel.

This plan aims to refactor Girl Mode to be structurally identical to Boy Mode (clean, white backgrounds, crisp layouts) but with a **Pink (Rose)** color palette replacing the **Blue (Sky)** palette, and—crucially—replacing all black/gray shadows with subtle pink-tinted "glows" for that premium Apple feel.

---

## 2. Design Strategy: "Similar but Pink"
We will strip away the bespoke component overrides in `girl-mode.css` and strictly use variable overrides. This ensures the layout and "bones" of the app remain exactly like the Boy Mode the user loves.

| Feature | Boy Mode (Current Default) | Girl Mode (Target) |
| :--- | :--- | :--- |
| **Primary Color** | Sky Blue (`#0EA5E9`) | Rose Pink (`#EC4899`) |
| **Background** | White / Slate-50 | White / Rose-50 (Subtle tint) |
| **Shadows** | Black/Gray (Standard) | Pink-tinted Glows (No Black) |
| **Aesthetics** | Clinical, Clean, Contrast | Soft, Warm, Premium, "Apple-like" |
| **Structure** | Flat + clean shadows | Flat + colored shadows |

---

## 3. Implementation Plan

### Step 1: Clean Slate for `girl-mode.css`
- **Action**: Remove the extensive component-specific rules (e.g., `.card`, `.breadcrumb` customized blocks) from `css/themes/girl-mode.css`.
- **Rationale**: These specific styles are what make Girl Mode look different/darker/heavier than Boy Mode. We want parity.

### Step 2: Global Variable Overrides (The Core Fix)
- **Action**: In `body.girl-mode`, override the **Root Variables** defined in `variables.css` and `color-palette.css`.
- **Scope**:
    - **Colors**: Map `primary`, `success`, `text` variables to the Rose/Pink palette.
    - **Backgrounds**: Ensure `--bg-primary` is `#FFFFFF` and `--bg-secondary` is `#FFF1F2` (Rose-50). **Remove the body background gradient**.
    - **Gradients**: Update `--gradient-primary` to be Pink-to-Rose.
    - **Shadows (CRITICAL)**: Override `--shadow-sm`, `--shadow-md`, `--shadow-lg`, etc. to use `rgba(236, 72, 153, X)` instead of black. This ensures *every* element in the app automatically gets pink shadows without touching their HTML/CSS classes.

### Step 3: Enforce Light Mode
- **Action**: Inside `girl-mode.css`, explicitly override/ignore dark mode preferences or ensure the dark mode variables for Girl Mode are still "bright" (unlikely to be what the user wants if they hate the "dark one" look).
- **Strategy**: We will treat Girl Mode as a "Bright Theme". If the user is in system Dark Mode, Girl Mode should probably remain light (or a very specific "Light Pink" theme) to satisfy the user's request of not being "dark".

### Step 4: Apple Aesthetic Polish
- **Action**: Fine-tune the pink shadow values.
    - *Example*: Instead of a hard shadow `0 4px 6px rgba(0,0,0,0.1)`, use `0 8px 20px rgba(236, 72, 153, 0.25)`. This creates a diffuse "glow" typical of high-end iOS apps.

---

## 4. Technical Specifications (Code Preview)

**File: `css/themes/girl-mode.css`**

```css
/* Girl Mode - Variable Override System only */
body.girl-mode {
    /* 1. Color Palette Swaps (Blue -> Pink) */
    --primary-color: #EC4899;       /* Rose 500 */
    --primary-hover: #DB2777;       /* Rose 600 */
    --primary-light: #FFE4E6;       /* Rose 100 */
    
    /* 2. Backgrounds (Clean & Bright, No "Dark" Gradients) */
    --bg-primary: #FFFFFF;
    --bg-secondary: #FFF1F2;        /* Rose 50 */
    --bg-tertiary: #FFE4E6;         /* Rose 100 */
    --border-color: #FBCFE8;        /* Rose 200 */
    
    /* 3. Text (Keep high contrast mostly, but soften muted text) */
    --text-primary: #1F2937;        /* Gray 800 (Sharp) */
    --text-muted: #9CA3AF;          
    
    /* 4. SHADOWS - The "No Black Shadows" Fix */
    /* We replace black shadows with Diffuse Pink Glows */
    --shadow-color: 236, 72, 153; /* r,g,b of Pink */
    
    --shadow-sm: 0 1px 2px 0 rgba(var(--shadow-color), 0.15);
    --shadow-md: 0 4px 6px -1px rgba(var(--shadow-color), 0.2), 0 2px 4px -1px rgba(var(--shadow-color), 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(var(--shadow-color), 0.2), 0 4px 6px -2px rgba(var(--shadow-color), 0.1);
    --shadow-xl: 0 20px 25px -5px rgba(var(--shadow-color), 0.25), 0 10px 10px -5px rgba(var(--shadow-color), 0.1);
    
    /* 5. Gradients */
    --gradient-primary: linear-gradient(135deg, #EC4899 0%, #BE185D 100%);
    --gradient-bg: linear-gradient(135deg, #EC4899 0%, #BE185D 100%); /* For specific elements that need gradient */
}

/* Force Light Theme consistency even if OS is Dark */
@media (prefers-color-scheme: dark) {
    body.girl-mode {
        /* Re-enforce light backgrounds to avoid "Dark One" look */
        --bg-primary: #FFFFFF;
        --bg-secondary: #FFF1F2;
        --text-primary: #1F2937;
        /* ...etc */
    }
}
```

## 5. Components to Audit
No heavy CSS rewriting needed for components. By changing the variables above, these components will visually update automatically:
- **Cards**: Will have white bg + pink glow (instead of black shadow).
- **Buttons**: Will be Pink (Primary) or White/Pink-Border (Secondary).
- **Navigation**: Will pick up the new Pink primary color.

## 6. Verification Steps
1. Switch to Girl Mode.
2. Verify Background is White/Light Pink (Not dark/gradient).
3. Verify **all** shadows (cards, buttons, headers) are Pink-tinted.
4. Verify no "Black/Gray" shadows exist.
5. Toggle System Dark Mode -> Verify Girl Mode stays Light/Pink.

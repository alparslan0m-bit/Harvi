# Girl Mode Quiz Fix Plan

## 1. Diagnosis
The "Boy Mode" persists in the quiz screen because the **Quiz CSS components define hardcoded Blue/Teal colors** instead of using the dynamic CSS variables we set up.

Because `quiz-container.css` and `quiz-options.css` use fixed Hex codes (e.g., `#EEF2FF`, `#0EA5E9`, `#6366F1`), the Girl Mode's pink variables are being ignored entirely.

## 2. Strategy
We will **refactor the Quiz CSS to use CSS Variables**. This is the "Apple Native" way to handle theming—it ensures that `girl-mode.css` (which redefines these variables) will instantly propagate to the quiz without us needing to write "ugly" override rules.

## 3. Implementation Steps

### Step 1: Refactor `quiz-container.css`
We need to replace the hardcoded "Boy" backgrounds with our dynamic Theme variables.

| Selector | Current (Hardcoded Boy) | New (Dynamic Variable) |
| :--- | :--- | :--- |
| **.quiz-header** | `linear-gradient(135deg, #0EA5E9...` | `var(--gradient-primary)` |
| **.question-text** | `background: ... #EEF2FF ...` | `background: var(--bg-secondary)` |
| **.options-container** | `background: ... #EEF2FF ...` | `background: var(--bg-secondary)` |
| **Borders** | `1.5px solid #C7D2FE` | `1.5px solid var(--border-color)` |

### Step 2: Refactor `quiz-options.css`
The options buttons have hardcoded interaction states (Hover, Selected, Active) that force Blue/Indigo.

| Selector | Current (Hardcoded Boy) | New (Dynamic Variable) |
| :--- | :--- | :--- |
| **.option** | `border: 2px solid #E5E7EB` | `border: 2px solid var(--border-color)` |
| **.option:hover** | `border-color: #6366F1 !important` | `border-color: var(--primary-color) !important` |
| **.option.selected** | `background: #EEF2FF` | `background: var(--primary-light)` |
| **.option-letter** | `color: #3730A3` | `color: var(--primary-dark)` |

### Step 3: Verify the "Pink Glow"
Once these variables are hooked up, the **Girl Mode** (which we already fixed) will automatically inject:
*   **Pink Gradients** into the Header.
*   **Rose Backgrounds** into the Question Card.
*   **Pink Borders & Glows** into the Options.

## 4. Expected Result
*   **Zero new CSS in `girl-mode.css`** (keeping it clean).
*   **Full consistency**: The Quiz will look exactly like the rest of the app (Glassmorphism + Pink Theme).
*   **Future Proof**: If you ever add a "Dark Mode" or "Green Mode", the quiz will update automatically.

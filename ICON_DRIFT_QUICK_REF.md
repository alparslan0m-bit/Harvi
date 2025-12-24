# ⚡ QUICK FIX REFERENCE
## Mobile Mode Toggle Icon Drift

---

## THE BUG
Icons drift away from button on mobile touch

---

## THE CAUSE
1. No `position: relative` on `.mode-toggle` → icons calculate center from header
2. Conflicting `translate()` and `scale()` transforms → math errors on mobile
3. `:hover` sticks to touch events → scale(1.1) causes position shift
4. No GPU acceleration → sub-pixel jitter during touch

---

## THE FIX (4 Steps)

### Step 1: Anchor
```css
.mode-toggle {
    position: relative;  /* ← Lock icons inside button */
}
```

### Step 2: Consolidate
```css
.mode-toggle svg {
    transform: translate3d(-50%, -50%, 0);  /* ← GPU acceleration */
}
```

### Step 3: Protect Mobile
```css
@media (hover: hover) {
    .mode-toggle:hover {
        transform: translateY(-2px);  /* ← No scale here */
    }
}

.mode-toggle:active {
    transform: translateY(-1px);  /* ← Touch feedback */
}
```

### Step 4: Accelerate
```css
.mode-toggle {
    will-change: transform;  /* ← GPU hint */
}
.mode-toggle svg {
    will-change: transform;  /* ← GPU hint */
}
```

---

## WHAT CHANGED

| Part | Before | After |
|------|--------|-------|
| Position | ❌ None | ✅ `position: relative` |
| Transform | ❌ `translate()` | ✅ `translate3d()` |
| Hover | ❌ All devices | ✅ `@media (hover: hover)` |
| Acceleration | ❌ None | ✅ `will-change` |

---

## RESULT

✅ Icons locked to button  
✅ No drift on mobile  
✅ Smooth GPU rendering  
✅ No hover conflicts  

---

## FILE
`css/components/header.css` (Lines 108-189)

---

**Status: ✅ FIXED**

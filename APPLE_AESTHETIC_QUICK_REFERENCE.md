# HARVI PWA - Apple Aesthetic Quick Reference Guide

## 🎯 Using the New Systems

### 1️⃣ Typography System

#### Semantic Heading Classes
```html
<h1 class="text-large-title">Page Title</h1>      <!-- 34px @ desktop, scales down -->
<h2 class="text-title-1">Section Title</h2>      <!-- 28px @ desktop -->
<h3 class="text-title-2">Subsection</h3>         <!-- 22px @ desktop -->
<h4 class="text-headline">Emphasis Text</h4>   <!-- 17px bold -->
<p class="text-body">Regular content</p>           <!-- 17px, proper line-height -->
<p class="text-subheadline">Secondary text</p>   <!-- 15px, muted color -->
<p class="text-footnote">Minor text</p>          <!-- 13px, very muted -->
<p class="text-caption">Tiny text</p>            <!-- 12px, secondary color -->
```

#### Font Weight Classes
```html
<span class="font-light">Light text</span>        <!-- 300 weight -->
<span class="font-regular">Regular text</span>    <!-- 400 weight -->
<span class="font-medium">Medium text</span>      <!-- 500 weight -->
<span class="font-semibold">Semibold text</span> <!-- 600 weight -->
<span class="font-bold">Bold text</span>          <!-- 700 weight -->
<span class="font-extrabold">Very bold</span>     <!-- 800 weight -->
```

#### Line Height Classes
```html
<p class="leading-tight">Titles & headlines</p>     <!-- 1.1 line-height -->
<p class="leading-snug">Emphasized text</p>         <!-- 1.2 line-height -->
<p class="leading-normal">Standard content</p>      <!-- 1.4 line-height -->
<p class="leading-relaxed">Long-form text</p>       <!-- 1.6 line-height -->
```

---

### 2️⃣ Motion & Animation System

#### Pre-built Animation Classes
```html
<!-- Entrance animations -->
<div class="animate-entrance-fade-scale">Fades in with scale</div>
<div class="animate-entrance-slide-up">Slides up with fade</div>
<div class="animate-entrance-slide-down">Slides down with fade</div>

<!-- Navigation animations -->
<div class="animate-nav-push-enter">New screen enters from right</div>
<div class="animate-nav-pop-exit">Screen exits to right</div>

<!-- Modal animations -->
<div class="animate-modal-sheet-enter">Bottom sheet enters</div>
<div class="animate-modal-scrim-enter">Scrim (backdrop) appears</div>

<!-- Interactive animations -->
<div class="animate-scale-in">Scales from 0 to 1</div>
<div class="animate-rubber-band">Bouncy overscroll effect</div>
<div class="animate-particle-burst">Celebration particles</div>
```

#### Stagger List Animation
```html
<div class="quiz-options-container">
  <div class="stagger-item">Option 1</div>
  <div class="stagger-item">Option 2</div>
  <div class="stagger-item">Option 3</div>
  <div class="stagger-item">Option 4</div>
</div>
<!-- Each item enters with 30ms delay between them -->
```

#### JavaScript Motion Coordinator
```javascript
// Stagger elements programmatically
const items = document.querySelectorAll('.card');
motionCoordinator.staggerElements(items, 'animate-entrance-slide-up', {
  stagger: 30,
  offset: 100
});

// Orchestrate complex animation sequence
motionCoordinator.orchestrateSequence({
  steps: [
    {
      elements: document.querySelectorAll('.hero'),
      animationClass: 'animate-entrance-fade-scale',
      duration: 400,
      stagger: 50
    },
    {
      elements: document.querySelectorAll('.content'),
      animationClass: 'animate-entrance-slide-up',
      duration: 350,
      stagger: 30
    }
  ]
});

// FLIP animation (element position/size change)
const card = document.querySelector('.card');
motionCoordinator.flipAnimation(card, () => {
  card.style.width = '200px';
  card.style.transform = 'translateX(100px)';
});

// Particle celebration
motionCoordinator.particleBurst(element, {
  count: 12,
  duration: 800,
  color: '#10B981'
});

// Haptic feedback
motionCoordinator.triggerHaptic('success');  // light, medium, heavy, success, warning, error
```

---

### 3️⃣ Material & Glass System

#### Glass Material Classes
```html
<div class="material-ultraThin">Most subtle glass</div>
<div class="material-thin-enhanced">Thin glass effect</div>
<div class="material-regular-enhanced">Standard glass</div>
<div class="material-chrome">Metallic glass look</div>
<div class="material-thick-enhanced">High blur, opaque</div>
```

#### Shadow System
```html
<div class="shadow-card">Card-level depth</div>
<div class="shadow-sheet">Sheet elevation</div>
<div class="shadow-floating">Floating button shadow</div>
<div class="shadow-elevated">Popup/dropdown shadow</div>
<div class="shadow-divider">Subtle separator</div>

<!-- Color-tinted shadows -->
<div class="shadow-card-primary">Card with blue tint</div>
<div class="shadow-sheet-primary">Sheet with blue tint</div>
<div class="shadow-floating-success">Green tinted floating</div>
<div class="shadow-floating-error">Red tinted floating</div>
```

#### Vibrancy Overlays
```html
<div class="vibrancy-light">Light background enhancement</div>
<div class="vibrancy-dark">Dark background enhancement</div>
<div class="vibrancy-primary">Primary color vibrancy</div>
<nav class="nav-bar-vibrancy">Navigation bar effect</nav>
<div class="bottom-sheet-vibrancy">Bottom sheet effect</div>
```

---

### 4️⃣ Touch & Interactive States

#### Pressable Components
```html
<button class="btn-primary">Primary Action</button>
<div class="list-item">Tappable list item</div>
<div class="card-pressable">Pressable card</div>
<div class="icon-btn">Icon button</div>
<input type="range" class="slider-input">
```

#### Micro-interaction Classes
```html
<!-- Selection feedback -->
<div class="quiz-option selected">
  <svg class="checkmark-circle" ...>
    <path class="checkmark-path" .../>
  </svg>
</div>

<!-- Error feedback -->
<div class="quiz-option incorrect">Wrong answer</div>

<!-- Toggle/switch -->
<button class="toggle active">Enabled</button>

<!-- Stepper buttons -->
<button class="stepper-btn">+</button>

<!-- Long-press preview -->
<div class="long-pressable">Hold to see preview</div>
```

#### JavaScript Touch System
```javascript
// Add custom ripple
touchHighlightSystem.addCustomRipple(element, {
  color: 'rgba(14, 165, 233, 0.3)',
  duration: 800
});

// Show highlight flash (iOS Settings style)
touchHighlightSystem.showHighlightFlash(element, {
  duration: 300,
  color: 'rgba(0, 0, 0, 0.08)'
});

// Enable long-press detection
touchHighlightSystem.enableLongPress(element, () => {
  console.log('Long pressed!');
  showContextMenu();
}, 500);

// Show 3D press effect
touchHighlightSystem.show3DPressEffect(element);
```

---

### 5️⃣ Icon System (SF Symbols)

#### Icon Classes
```html
<i class="icon sf-symbol">star.fill</i>

<!-- Size variants -->
<i class="icon icon-xs">xs icon</i>     <!-- 16px -->
<i class="icon icon-sm">sm icon</i>     <!-- 20px -->
<i class="icon icon-md">md icon</i>     <!-- 24px -->
<i class="icon icon-lg">lg icon</i>     <!-- 32px -->
<i class="icon icon-xl">xl icon</i>     <!-- 48px -->

<!-- Weight variants -->
<i class="icon icon-light">Light icon</i>        <!-- 300 weight -->
<i class="icon icon-regular">Regular icon</i>    <!-- 400 weight -->
<i class="icon icon-semibold">Bold icon</i>      <!-- 600 weight -->
<i class="icon icon-bold">Very bold icon</i>     <!-- 700 weight -->

<!-- Color variants -->
<i class="icon icon-primary">Primary color</i>
<i class="icon icon-success">Success green</i>
<i class="icon icon-error">Error red</i>
<i class="icon icon-warning">Warning amber</i>
<i class="icon icon-muted">Muted gray</i>
```

#### Navigation Icons
```html
<div class="nav-icon active">
  home.fill
</div>
<!-- Active state: weight becomes 700, color becomes primary -->

<!-- Tab bar icons -->
<button class="tab-icon active">
  heart.fill
</button>
<!-- Active: weight 700, primary color, pop animation -->
```

#### Icon Animations
```html
<i class="icon icon-animate-rotate">Loading spinner</i>
<i class="icon icon-animate-pulse">Pulsing icon</i>
<i class="icon icon-animate-bounce">Bouncing icon</i>
<i class="icon icon-animate-float">Floating icon</i>

<!-- Icon with badge -->
<div class="icon-with-badge">
  <i class="icon">notifications</i>
  <span class="icon-badge">3</span>
</div>

<!-- Icon button -->
<button class="icon-btn emphasis">
  <i class="icon icon-md">plus</i>
</button>
```

---

### 6️⃣ Color System

#### Color Utility Classes
```html
<!-- Background colors -->
<div class="bg-primary">Primary background</div>
<div class="bg-primary-light">Light primary</div>
<div class="bg-secondary">Secondary background</div>
<div class="bg-success">Success green</div>
<div class="bg-error">Error red</div>
<div class="bg-warning">Warning amber</div>
<div class="bg-surface">Surface color</div>

<!-- Text colors -->
<p class="text-primary">Primary text</p>
<p class="text-secondary">Secondary text</p>
<p class="text-success">Success message</p>
<p class="text-error">Error message</p>
<p class="text-disabled">Disabled text</p>

<!-- Border colors -->
<div class="border-primary">Blue border</div>
<div class="border-success">Green border</div>
<div class="border-error">Red border</div>
<div class="border-neutral">Gray border</div>

<!-- Gradients -->
<div class="gradient-primary">Primary gradient</div>
<div class="gradient-success">Success gradient</div>
<div class="gradient-error">Error gradient</div>
<div class="gradient-warning">Warning gradient</div>
```

#### Theme Switching
```javascript
// Activate Girl Mode (Rose theme)
document.body.classList.add('girl-mode');

// Smooth theme transition
document.body.classList.add('theme-transitioning');
document.body.classList.toggle('girl-mode');

// Force light mode
document.documentElement.classList.add('force-light');

// Remove forced light
document.documentElement.classList.remove('force-light');
```

#### Color Palette Variables
```css
/* Sky Blue (Boy Mode) */
--sky-500: #0ea5e9;  /* Primary */

/* Rose Pink (Girl Mode) */
--rose-500: #ec4899;  /* Primary in girl mode */

/* Status colors */
--green-500: #22c55e;  /* Success */
--red-500: #ef4444;    /* Error */
--amber-500: #f59e0b;  /* Warning */

/* Semantic variables */
--color-primary         /* Switches with theme */
--color-secondary
--color-success
--color-error
--color-text
--color-bg
```

---

### 7️⃣ Quick Wins Applied

#### Visual Enhancements
```html
<!-- Increased border radius (24px) -->
<div class="card">Modern rounded card</div>

<!-- Hover glow effect -->
<button class="btn-primary">Glowing button</button>

<!-- Progress bar with glow -->
<progress class="progress-bar" value="75" max="100"></progress>

<!-- Floating label input -->
<div class="floating-label-input">
  <input type="text" placeholder="Your name">
  <label class="floating-label">Name</label>
</div>

<!-- Grid line separators -->
<div class="quiz-options-container">
  <div class="quiz-option">Option 1</div>
  <div class="quiz-option">Option 2</div>
  <div class="quiz-option">Option 3</div>
</div>

<!-- Chevron animation -->
<div class="list-item">
  List item
  <i class="chevron">chevron_right</i>
</div>

<!-- Badge with pulse -->
<span class="badge">3</span>
```

---

## 🧪 Testing the Implementation

### Quick Test Checklist
```
Typography:
  ☐ Large titles scale responsively
  ☐ Body text is readable (17px @ desktop)
  ☐ Font weight changes apply
  ☐ Line height is appropriate

Motion:
  ☐ Buttons have spring animation on press
  ☐ Navigation transitions are smooth
  ☐ Stagger animations cascade properly
  ☐ Haptic feedback triggers on tap

Materials:
  ☐ Glass effects are visible
  ☐ Shadows have proper depth
  ☐ Vibrancy overlays enhance backgrounds
  ☐ Dark mode looks correct

Interactions:
  ☐ Ripple appears at touch point
  ☐ Selected options have checkmark animation
  ☐ Error states shake
  ☐ List items highlight on tap

Colors:
  ☐ Boy mode (blue) is default
  ☐ Girl mode (pink) toggles correctly
  ☐ Dark mode is supported
  ☐ Color transitions are smooth

Accessibility:
  ☐ prefers-reduced-motion disables animations
  ☐ High contrast mode is visible
  ☐ Keyboard navigation has focus ring
  ☐ Text selection is visible
```

---

## 🔍 Browser Support

| Feature | Chrome | Firefox | Safari | Mobile |
|---------|--------|---------|--------|--------|
| CSS Variables | ✅ | ✅ | ✅ | ✅ |
| Backdrop-filter | ✅ | ✅ | ✅ | ✅ |
| CSS Grid | ✅ | ✅ | ✅ | ✅ |
| Animations | ✅ | ✅ | ✅ | ✅ |
| Transitions | ✅ | ✅ | ✅ | ✅ |
| Font-variation | ✅ | ✅ | ✅ | ✅ |
| Vibration API | ✅ | ✅ | ⚠️ | ✅ |
| matchMedia | ✅ | ✅ | ✅ | ✅ |

---

## 📞 Troubleshooting

### Animations Not Playing
```javascript
// Check if reduced-motion is enabled
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
console.log('Animations reduced?', prefersReduced);
```

### Haptic Feedback Not Working
```javascript
// Check vibration API support
if ('vibrate' in navigator) {
  navigator.vibrate([10, 50, 10]);  // [delay, vibrate, delay]
} else {
  console.log('Vibration API not supported');
}
```

### Theme Not Switching
```javascript
// Verify theme switching
document.body.classList.add('girl-mode');
console.log('Girl mode active?', document.body.classList.contains('girl-mode'));

// Check computed styles
const color = getComputedStyle(document.documentElement).getPropertyValue('--color-primary');
console.log('Primary color:', color);
```

### Fonts Not Loading
```javascript
// Check font loading
document.fonts.ready.then(() => {
  console.log('Fonts loaded');
  document.body.style.opacity = '1';
});
```

---

## 🚀 Performance Tips

1. **Use `will-change` sparingly**: Only on animated elements
2. **GPU acceleration**: `transform: translateZ(0)` for smooth animations
3. **Debounce events**: Scroll, resize listeners with debounce
4. **Lazy load images**: Use `loading="lazy"` attribute
5. **Minify CSS/JS**: Production builds should be minified
6. **Preload fonts**: `rel="preload"` in `<head>`
7. **Reduce animations on mobile**: Lower motion intensity on slower devices

---

## 📚 Full Documentation

For detailed implementation information, see: [APPLE_AESTHETIC_IMPLEMENTATION.md](APPLE_AESTHETIC_IMPLEMENTATION.md)

---

**Last Updated**: December 25, 2025

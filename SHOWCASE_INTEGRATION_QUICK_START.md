# Quick Integration Guide - Showcase Features

This document provides quick copy-paste snippets to integrate showcase features into your existing Harvi app code.

---

## 1. Quiz.js - Add Sensory Feedback

### In `selectOption()` method:

```javascript
selectOption(optionIndex) {
    // ... existing code ...
    
    // OPTIMISTIC UI UPDATE
    const optionElement = this.optionsContainer.children[optionIndex];
    OptimisticUI.updateOptionSelection(optionElement);
    
    // Immediately show selection visually
    optionElement.classList.add('selected');
    
    // Continue with normal logic...
    this.selectedOptionIndex = optionIndex;
}
```

### In `revealAnswer()` method:

```javascript
revealAnswer() {
    const correctIndex = this.getCurrentQuestion().correctAnswerIndex;
    const isCorrect = this.selectedOptionIndex === correctIndex;
    
    if (isCorrect) {
        // SENSORY FEEDBACK: Haptics + Audio + Confetti
        HapticsEngine.success();
        audioToolkit.play('ding');
        
        const correctElement = this.optionsContainer.children[correctIndex];
        ConfettiEngine.burstFromElement(correctElement);
        SpringPhysics.bounce(correctElement);
        
        this.score++;
    } else {
        // Failure feedback
        HapticsEngine.failure();
        audioToolkit.play('thud');
        SpringPhysics.bounce(this.optionsContainer.children[this.selectedOptionIndex]);
    }
    
    // ... existing code ...
}
```

### In `nextQuestion()` method:

```javascript
nextQuestion() {
    if (this.currentIndex === this.questions.length - 1) {
        // QUIZ COMPLETE - Track streak & show celebration
        const streakTracker = new StreakTracker();
        const streak = streakTracker.recordQuizCompletion();
        
        HapticsEngine.strongPulse();
        audioToolkit.play('celebration');
        ConfettiEngine.celebrationBurst();
        
        // Update badge with remaining incomplete quizzes
        // (This should call your quiz service to count remaining)
        BadgeManager.updateFromQuizProgress(completedCount, totalCount);
    }
    
    this.currentIndex++;
    this.hasAnswered = false;
    this.displayQuestion();
}
```

---

## 2. Navigation.js - Bottom Nav Integration

### Add to constructor:

```javascript
constructor(app) {
    // ... existing code ...
    
    this.initBottomNav();
    this.setupPullToRefresh();
}
```

### Add new methods:

```javascript
initBottomNav() {
    const bottomNav = document.getElementById('bottom-nav-container');
    const navItems = document.querySelectorAll('.bottom-nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const screen = item.getAttribute('data-screen');
            
            // Update active state
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Navigate to screen
            this.navigateToScreen(screen);
            HapticsEngine.selection();
        });
    });
}

setupPullToRefresh() {
    const container = document.getElementById('cards-container');
    if (container) {
        new PullToRefresh(container);
    }
}

navigateToScreen(screenId) {
    // Update the UI based on screen ID
    if (screenId === 'navigation-screen') {
        this.showYears();
    } else if (screenId === 'stats-screen') {
        this.showStats();
    } else if (screenId === 'profile-screen') {
        this.showProfile();
    }
}

showStats() {
    // Create stats screen with heatmap and badges
    const container = document.getElementById('cards-container');
    
    const stats = await StatisticsAggregator.aggregateStats();
    
    // Show heatmap
    const heatmapContainer = document.createElement('div');
    heatmapContainer.id = 'heatmap';
    heatmapContainer.className = 'heatmap-container';
    heatmapContainer.innerHTML = '<h3 class="heatmap-title">Study Activity</h3>';
    
    container.appendChild(heatmapContainer);
    
    const heatmap = new HeatmapGenerator('#heatmap');
    heatmap.render();
    
    // Show badges
    const badgeContainer = document.createElement('div');
    badgeContainer.id = 'badges';
    container.appendChild(badgeContainer);
    
    BadgeSystem.renderBadges('#badges', stats);
}

showProfile() {
    // Create profile screen with streak, progress circle, badges
    const container = document.getElementById('cards-container');
    
    const stats = await StatisticsAggregator.aggregateStats();
    const streak = new StreakTracker().getStreak();
    
    container.innerHTML = `
        <div class="streak-container">
            <div class="streak-icon">🔥</div>
            <div class="streak-info">
                <h3>${streak.current} Day Streak</h3>
                <p>Longest: ${streak.longest} days</p>
            </div>
        </div>
        
        <div class="progress-circle-container">
            <div class="progress-circle" id="progress-circle"></div>
            <div class="progress-info">
                <div class="progress-stat">
                    <span class="progress-stat-value">${stats.averageScore.toFixed(0)}</span>
                    <span class="progress-stat-label">Average %</span>
                </div>
                <div class="progress-stat">
                    <span class="progress-stat-value">${stats.totalQuizzes}</span>
                    <span class="progress-stat-label">Quizzes</span>
                </div>
            </div>
        </div>
        
        <div id="badges"></div>
    `;
    
    // Animate progress circle
    ProgressCircleAnimator.create(stats.averageScore, 
        document.getElementById('progress-circle'));
    
    // Render badges
    BadgeSystem.renderBadges('#badges', stats);
}
```

---

## 3. Results.js - Shareable Result Cards

### Add to `displayResults()` method:

```javascript
displayResults() {
    // ... existing code ...
    
    // ADD SHARE BUTTON
    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn-primary';
    shareBtn.textContent = '📸 Share Result';
    shareBtn.addEventListener('click', async () => {
        shareBtn.disabled = true;
        shareBtn.textContent = 'Creating...';
        
        const imageUrl = await ResultCardGenerator.generateImage(
            this.score,
            this.questions.length,
            this.metadata.name
        );
        
        if (imageUrl) {
            ResultCardGenerator.shareViaURL(imageUrl);
            HapticsEngine.success();
            audioToolkit.play('ding');
        }
        
        shareBtn.disabled = false;
        shareBtn.textContent = '📸 Share Result';
    });
    
    resultsContainer.appendChild(shareBtn);
}
```

---

## 4. App.js - Global Initialization

### Update `init()` method:

```javascript
async init() {
    // ... existing code ...
    
    // INITIALIZE SHOWCASE FEATURES
    // PWA Features
    new CustomA2HSPrompt();
    AdaptiveThemeColor.init();
    
    // Gestures
    const cardsContainer = document.getElementById('cards-container');
    if (cardsContainer) {
        new PullToRefresh(cardsContainer);
    }
    
    // Prefetching
    PrefetchingStrategy.prefetchResources();
    
    // Audio/Haptics enabled by default
    audioToolkit.loadEnabled();
    
    console.log('✓ Showcase features initialized');
}
```

### Update `initDarkMode()` method:

```javascript
initDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('girl-mode');
    }
    
    // SYNC THEME COLOR
    AdaptiveThemeColor.updateTheme();
    
    const modeToggle = document.getElementById('mode-toggle');
    if (modeToggle) {
        modeToggle.addEventListener('change', () => {
            const isNowDark = document.body.classList.toggle('girl-mode');
            localStorage.setItem('darkMode', isNowDark);
            
            // THEME COLOR SYNC
            AdaptiveThemeColor.updateTheme();
        });
    }
}
```

---

## 5. HTML Sections - What's Already Added

### Mesh Background
```html
<!-- Already in body, no changes needed -->
<div class="mesh-background">
    <div class="mesh-gradient"></div>
</div>
```

### Pull-to-Refresh Indicator
```html
<!-- Already added -->
<div id="pull-refresh-indicator">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
        <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
</div>
```

### Bottom Navigation
```html
<!-- Already added before closing </body> tag -->
<div class="bottom-nav-container" id="bottom-nav-container">
    <nav class="bottom-nav">
        <a href="#" class="bottom-nav-item active" id="nav-home" data-screen="navigation-screen">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h6v-5h2v5h6a1 1 0 001-1v-10"/>
            </svg>
            <span class="bottom-nav-item-label">Home</span>
        </a>
        <!-- Stats and Profile items already added -->
    </nav>
</div>
```

---

## 6. Service Worker - Prefetching Integration

### In your data loading methods, add prefetching:

```javascript
// When user navigates to Year level
async loadYearLectures(yearId) {
    const lectures = await fetchLectures(yearId);
    
    // Prefetch quiz data for first 3 lectures
    const lectureIds = lectures.slice(0, 3).map(l => l.id);
    PrefetchingStrategy.prefetchNextLectures(lectureIds);
    
    return lectures;
}
```

---

## 7. Settings/Preferences Screen

### Add audio and haptics toggle:

```javascript
// Create preferences UI
const audioToggle = document.createElement('div');
audioToggle.className = 'settings-item';
audioToggle.innerHTML = `
    <label>
        <input type="checkbox" id="audio-toggle" ${audioToolkit.isEnabled ? 'checked' : ''}>
        Sound Effects
    </label>
`;

document.getElementById('audio-toggle').addEventListener('change', () => {
    const enabled = audioToolkit.toggle();
    console.log('Audio:', enabled ? 'Enabled' : 'Disabled');
});

// Haptics are device-dependent, no toggle needed
// But you can still show a status indicator
const hapticsStatus = document.createElement('p');
hapticsStatus.textContent = HapticsEngine.isSupported ? '✓ Haptics Available' : '✗ Haptics Not Available';
```

---

## 8. Testing the Integration

### Console Commands:

```javascript
// Test haptics
HapticsEngine.success();
HapticsEngine.failure();
HapticsEngine.selection();

// Test audio
audioToolkit.play('pop');
audioToolkit.play('ding');
audioToolkit.play('celebration');

// Test confetti
ConfettiEngine.celebrationBurst();

// Test spring physics
const element = document.querySelector('.card');
SpringPhysics.bounce(element);

// Test gamification
const tracker = new StreakTracker();
console.log(tracker.getStreak());

// Test heatmap
const heatmap = new HeatmapGenerator('#heatmap');
heatmap.recordActivity();
heatmap.render();

// Test badges
const stats = { totalQuizzes: 5, perfectScores: 1, streak: 3, averageScore: 85 };
BadgeSystem.renderBadges('#badges', stats);
```

---

## 9. Common Customizations

### Change Primary Color:
```css
:root {
    --primary-color: #your-color; /* Boy mode */
}

body.girl-mode {
    --primary-color: #your-color; /* Girl mode */
}
```

### Adjust Spring Physics:
```javascript
SpringPhysics.animate(element, 1, 1.1, {
    damping: 0.7,      // Higher = less bouncy
    stiffness: 0.12,   // Higher = stiffer
    duration: 400      // Milliseconds
});
```

### Customize Heatmap Intensity:
```javascript
// In HeatmapGenerator.getIntensity()
// Adjust thresholds to your preference
```

### Change Haptic Patterns:
```javascript
HapticsEngine.success = function() {
    this.vibrate([15, 25, 15]); // Your custom pattern
};
```

---

## 10. Troubleshooting Checklist

### Feature Not Working?

```javascript
// Check if showcase is loaded
console.log('HapticsEngine:', typeof HapticsEngine);
console.log('AudioToolkit:', typeof audioToolkit);
console.log('ConfettiEngine:', typeof ConfettiEngine);

// Check if classes are defined
console.log('Quiz instance methods:', Object.getOwnPropertyNames(Quiz.prototype));

// Check localStorage
console.log('Stored settings:', {
    audioEnabled: localStorage.getItem('audioEnabled'),
    darkMode: localStorage.getItem('darkMode'),
    streakData: localStorage.getItem('harvi_streak_data')
});

// Check service worker
navigator.serviceWorker.ready.then(() => {
    console.log('✓ Service worker active');
});
```

---

**Last Updated**: December 23, 2025
**Version**: 1.0
**Status**: Ready for Integration

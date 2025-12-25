/**
 * PHASE 3: HAPTICS ENGINE
 * Centralized vibration management following iOS Tactile Feedback patterns
 * Ensures consistent, professional-feeling haptic feedback across the app
 */

class HapticsEngine {
    /**
     * Subtle tick (light selection feedback) - 5ms
     * Used for: Option selection, form interactions
     */
    static tap() {
        if (navigator.vibrate) {
            navigator.vibrate(5);
        }
    }

    /**
     * Selection feedback (option/card selection) - 3ms
     * Used for: Card taps, option highlighting
     */
    static selection() {
        if (navigator.vibrate) {
            navigator.vibrate(3);
        }
    }

    /**
     * Quick feedback (confirming action) - [5, 10, 5]
     * Used for: Quiz submissions, sharing, button presses
     */
    static feedback() {
        if (navigator.vibrate) {
            navigator.vibrate([5, 10, 5]);
        }
    }

    /**
     * Single pulse for celebration/notification - [20]
     * Used for: Badge unlock, milestone
     */
    static pulse() {
        if (navigator.vibrate) {
            navigator.vibrate(20);
        }
    }

    /**
     * Strong pulse (heavy notification) - [50, 30, 50]
     * Used for: Important notifications, badge unlock
     */
    static strongPulse() {
        if (navigator.vibrate) {
            navigator.vibrate([50, 30, 50]);
        }
    }

    /**
     * Warning pattern (alert-like) - [10, 20, 10]
     * Used for: Errors, important notifications, long-press menus
     */
    static warning() {
        if (navigator.vibrate) {
            navigator.vibrate([10, 20, 10]);
        }
    }

    /**
     * Success pattern (celebration) - [20, 30, 20, 30, 20]
     * Used for: Perfect score, correct answer, major milestones
     */
    static success() {
        if (navigator.vibrate) {
            navigator.vibrate([20, 30, 20, 30, 20]);
        }
    }

    /**
     * Failure pattern (wrong answer) - [50, 100, 50]
     * Used for: Incorrect answer, failed action
     */
    static failure() {
        if (navigator.vibrate) {
            navigator.vibrate([50, 100, 50]);
        }
    }

    /**
     * Error pattern (failed action) - [50, 50, 50]
     * Used for: Network errors, critical failures
     */
    static error() {
        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
        }
    }

    /**
     * Swipe gesture feedback (subtle progress) - [2, 3, 2]
     * Used for: Gesture progress, scroll feedback
     */
    static swipe() {
        if (navigator.vibrate) {
            navigator.vibrate([2, 3, 2]);
        }
    }

    /**
     * Disable all haptics (for users with Haptics disabled in accessibility)
     */
    static disable() {
        HapticsEngine.tap = () => {};
        HapticsEngine.selection = () => {};
        HapticsEngine.feedback = () => {};
        HapticsEngine.pulse = () => {};
        HapticsEngine.strongPulse = () => {};
        HapticsEngine.warning = () => {};
        HapticsEngine.success = () => {};
        HapticsEngine.failure = () => {};
        HapticsEngine.error = () => {};
        HapticsEngine.swipe = () => {};
    }

    /**
     * Check if haptics are available
     */
    static isAvailable() {
        return 'vibrate' in navigator || 'mozVibrate' in navigator || 'webkitVibrate' in navigator;
    }
}

// Expose to window for cross-script access
window.HapticsEngine = HapticsEngine;

// Fallback for older browsers
if (!HapticsEngine.isAvailable()) {
    console.warn('⚠️ Haptics (vibration) not available on this device');
}

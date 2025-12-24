/**
 * PHASE 4: DYNAMIC ISLAND NOTIFICATIONS
 * iOS 16+ style expandable pill notifications with spring physics
 */

class DynamicIsland {
    constructor() {
        this.notifications = [];
        this.activeNotification = null;
        this.expandedState = false;
        this.init();
    }

    init() {
        // Create island container if not exists
        if (!document.querySelector('.dynamic-island-container')) {
            const container = document.createElement('div');
            container.className = 'dynamic-island-container safe-area-top';
            document.body.appendChild(container);
        }
    }

    /**
     * Show notification in Dynamic Island style
     * @param {Object} options - { title, subtitle, icon, type, duration, action }
     */
    show(options = {}) {
        const {
            title = 'Notification',
            subtitle = '',
            icon = '📬',
            type = 'default', // 'success', 'error', 'warning', 'info'
            duration = 3000,
            action = null
        } = options;

        const notification = {
            id: Date.now(),
            title,
            subtitle,
            icon,
            type,
            duration,
            action
        };

        this.notifications.push(notification);

        if (!this.activeNotification) {
            this.display(notification);
        }
    }

    display(notification) {
        this.activeNotification = notification;
        const container = document.querySelector('.dynamic-island-container');

        // Remove existing island
        const existing = container.querySelector('.dynamic-island');
        if (existing) existing.remove();

        // Create island element
        const island = document.createElement('div');
        island.className = `dynamic-island dynamic-island-${notification.type}`;
        island.innerHTML = `
            <div class="dynamic-island-content">
                <span class="dynamic-island-icon">${notification.icon}</span>
                <div class="dynamic-island-text">
                    <div class="dynamic-island-title">${notification.title}</div>
                    ${notification.subtitle ? `<div class="dynamic-island-subtitle">${notification.subtitle}</div>` : ''}
                </div>
            </div>
        `;

        container.appendChild(island);

        // Haptic feedback
        if (navigator.vibrate) {
            const patterns = {
                success: [10, 30, 10],
                error: [50],
                warning: [30, 20, 30],
                info: [10]
            };
            navigator.vibrate(patterns[notification.type] || patterns.info);
        }

        // Click handler
        island.addEventListener('click', () => {
            if (notification.action) {
                notification.action();
            }
            this.expand();
        });

        // Auto-dismiss
        if (notification.duration > 0) {
            setTimeout(() => this.dismiss(notification.id), notification.duration);
        }

        // Spring animation
        if (window.SpringPhysics) {
            SpringPhysics.animate(island, 0, 1, {
                duration: 400,
                damping: 0.8,
                stiffness: 0.1
            });
        }
    }

    expand() {
        const island = document.querySelector('.dynamic-island');
        if (!island) return;

        this.expandedState = true;
        island.classList.add('expanded');

        // Create expanded content
        const expandedContent = document.createElement('div');
        expandedContent.className = 'dynamic-island-expanded';
        expandedContent.innerHTML = `
            <div class="dynamic-island-expanded-header">
                <span class="dynamic-island-icon">${this.activeNotification.icon}</span>
                <span class="dynamic-island-title">${this.activeNotification.title}</span>
                <button class="dynamic-island-close-btn">✕</button>
            </div>
            ${this.activeNotification.subtitle ? `
                <div class="dynamic-island-expanded-subtitle">${this.activeNotification.subtitle}</div>
            ` : ''}
        `;

        island.appendChild(expandedContent);

        // Close button
        expandedContent.querySelector('.dynamic-island-close-btn').addEventListener('click', () => {
            this.collapse();
        });
    }

    collapse() {
        const island = document.querySelector('.dynamic-island');
        if (!island) return;

        this.expandedState = false;
        island.classList.remove('expanded');

        const expandedContent = island.querySelector('.dynamic-island-expanded');
        if (expandedContent) {
            expandedContent.remove();
        }
    }

    /**
     * Hide/dismiss the current notification
     * Alias for dismiss() with current notification ID
     */
    hide() {
        if (this.activeNotification) {
            this.dismiss(this.activeNotification.id);
        }
    }

    dismiss(notificationId) {
        const island = document.querySelector('.dynamic-island');
        if (island && this.activeNotification?.id === notificationId) {
            island.classList.add('dismissing');

            setTimeout(() => {
                island.remove();
                
                // Remove the dismissed notification from queue
                const dismissedIndex = this.notifications.findIndex(n => n.id === notificationId);
                if (dismissedIndex !== -1) {
                    this.notifications.splice(dismissedIndex, 1);
                }
                
                this.activeNotification = null;

                // Show next notification if queued
                if (this.notifications.length > 0) {
                    this.display(this.notifications[0]);
                }
            }, 300);
        }
    }
}

// Global instance
window.dynamicIsland = new DynamicIsland();

// Helper function for easy access
window.showNotification = (title, subtitle, options = {}) => {
    window.dynamicIsland.show({
        title,
        subtitle,
        ...options
    });
};

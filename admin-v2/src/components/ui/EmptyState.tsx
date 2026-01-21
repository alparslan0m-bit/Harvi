/**
 * EmptyState Component
 * 
 * Displays friendly empty states for various scenarios.
 */

import './EmptyState.css';

interface EmptyStateProps {
    /** Icon to display (optional) */
    icon?: 'search' | 'inbox' | 'filter' | 'info';
    /** Primary message */
    title: string;
    /** Secondary message (optional) */
    description?: string;
    /** Action button (optional) */
    action?: {
        label: string;
        onClick: () => void;
    };
}

export default function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
    const renderIcon = () => {
        switch (icon) {
            case 'search':
                return (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor">
                        <path
                            d="M21 38c9.389 0 17-7.611 17-17S30.389 4 21 4 4 11.611 4 21s7.611 17 17 17zM44 44l-10.5-10.5"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                );
            case 'filter':
                return (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor">
                        <path
                            d="M6 12h36M12 24h24M18 36h12"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                );
            case 'info':
                return (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
                        <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4zm2 30h-4v-4h4v4zm0-8h-4V14h4v12z" />
                    </svg>
                );
            case 'inbox':
            default:
                return (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor">
                        <path
                            d="M40 20H32L28 12H20L16 20H8L4 40H44L40 20Z"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                );
        }
    };

    return (
        <div className="empty-state">
            <div className="empty-state__icon">{renderIcon()}</div>
            <h3 className="empty-state__title">{title}</h3>
            {description && <p className="empty-state__description">{description}</p>}
            {action && (
                <button className="empty-state__action" onClick={action.onClick}>
                    {action.label}
                </button>
            )}
        </div>
    );
}

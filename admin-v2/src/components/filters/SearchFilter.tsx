/**
 * SearchFilter Component
 * 
 * Reusable search and filter bar for Admin Dashboard content areas.
 * Features:
 * - Real-time search as you type
 * - Context-aware filtering
 * - Keyboard accessible
 * - Clear empty states
 */

import { useState, useCallback, useId } from 'react';
import type { FilterState } from '../../types/filters';
import './SearchFilter.css';

interface SearchFilterProps {
    /** Current filter state */
    filterState: FilterState;
    /** Callback when filter state changes */
    onFilterChange: (state: FilterState) => void;
    /** Placeholder text for search input */
    placeholder?: string;
    /** Whether to show status filter */
    showStatusFilter?: boolean;
    /** Whether to show content count filter */
    showContentCountFilter?: boolean;
    /** Label for content count filter (e.g., "Questions", "Lectures") */
    contentCountLabel?: string;
    /** Whether filters are disabled (e.g., no parent selected) */
    disabled?: boolean;
    /** Guidance message when disabled */
    disabledMessage?: string;
    /** Total results count */
    totalCount?: number;
    /** Filtered results count */
    matchedCount?: number;
    /** Additional custom filters to render (e.g. Parent Selector) */
    children?: React.ReactNode;
}

export default function SearchFilter({
    filterState,
    onFilterChange,
    placeholder = 'Search by name, ID, or UUID...',
    showStatusFilter = false,
    showContentCountFilter = false,
    contentCountLabel = 'items',
    disabled = false,
    disabledMessage = 'Select a parent context to enable filtering',
    totalCount,
    matchedCount,
    children,
}: SearchFilterProps) {
    const searchInputId = useId();
    const statusSelectId = useId();
    const countInputId = useId();

    const [localSearchQuery, setLocalSearchQuery] = useState(filterState.searchQuery);

    // Handle search input change (instant update)
    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const query = e.target.value;
            setLocalSearchQuery(query);
            onFilterChange({ ...filterState, searchQuery: query });
        },
        [filterState, onFilterChange]
    );

    // Handle status filter change
    const handleStatusChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            onFilterChange({
                ...filterState,
                status: e.target.value as FilterState['status'],
            });
        },
        [filterState, onFilterChange]
    );

    // Handle content count filter change
    const handleContentCountChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const count = e.target.value ? parseInt(e.target.value, 10) : undefined;
            onFilterChange({
                ...filterState,
                minContentCount: count,
            });
        },
        [filterState, onFilterChange]
    );

    // Reset all filters
    const handleReset = useCallback(() => {
        setLocalSearchQuery('');
        onFilterChange({
            searchQuery: '',
            status: 'all',
            minContentCount: undefined,
        });
    }, [onFilterChange]);

    // Check if any filters are active
    const hasActiveFilters =
        filterState.searchQuery.trim() !== '' ||
        (filterState.status && filterState.status !== 'all') ||
        filterState.minContentCount !== undefined;

    return (
        <div className={`search-filter ${disabled ? 'search-filter--disabled' : ''}`}>
            {disabled && disabledMessage && (
                <div className="search-filter__disabled-message">
                    <svg
                        className="search-filter__info-icon"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                    >
                        <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 12H7V7h2v5zm0-6H7V4h2v2z" />
                    </svg>
                    {disabledMessage}
                </div>
            )}

            <div className="search-filter__content">
                {/* Search Input */}
                <div className="search-filter__search-group">
                    <label htmlFor={searchInputId} className="search-filter__label">
                        <svg
                            className="search-filter__search-icon"
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                        >
                            <path
                                d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <span className="sr-only">Search</span>
                    </label>
                    <input
                        id={searchInputId}
                        type="text"
                        className="search-filter__input"
                        placeholder={placeholder}
                        value={localSearchQuery}
                        onChange={handleSearchChange}
                        disabled={disabled}
                        autoComplete="off"
                        spellCheck="false"
                    />
                    {localSearchQuery && !disabled && (
                        <button
                            type="button"
                            className="search-filter__clear-btn"
                            onClick={() => {
                                setLocalSearchQuery('');
                                onFilterChange({ ...filterState, searchQuery: '' });
                            }}
                            aria-label="Clear search"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Additional Filters */}
                <div className="search-filter__filters">
                    {/* Custom Filters (Parent Selectors etc) */}
                    {children}

                    {showStatusFilter && (
                        <div className="search-filter__filter-item">
                            <label htmlFor={statusSelectId} className="search-filter__filter-label">
                                Status
                            </label>
                            <select
                                id={statusSelectId}
                                className="search-filter__select"
                                value={filterState.status || 'all'}
                                onChange={handleStatusChange}
                                disabled={disabled}
                            >
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    )}

                    {showContentCountFilter && (
                        <div className="search-filter__filter-item">
                            <label htmlFor={countInputId} className="search-filter__filter-label">
                                Min. {contentCountLabel}
                            </label>
                            <input
                                id={countInputId}
                                type="number"
                                className="search-filter__number-input"
                                min="0"
                                value={filterState.minContentCount ?? ''}
                                onChange={handleContentCountChange}
                                placeholder="0"
                                disabled={disabled}
                            />
                        </div>
                    )}

                    {/* Reset Button */}
                    {hasActiveFilters && !disabled && (
                        <button
                            type="button"
                            className="search-filter__reset-btn"
                            onClick={handleReset}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
                                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
                            </svg>
                            Reset
                        </button>
                    )}
                </div>

                {/* Results Count - Moved inside Content for Single Row Layout */}
                {totalCount !== undefined && matchedCount !== undefined && !disabled && (
                    <div className="search-filter__results">
                        <span className="search-filter__results-text">
                            {hasActiveFilters ? (
                                <>
                                    <strong>{matchedCount}</strong> / {totalCount} items
                                </>
                            ) : (
                                <>
                                    <strong>{totalCount}</strong> items
                                </>
                            )}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

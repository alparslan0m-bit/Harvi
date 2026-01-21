/**
 * useFilteredData Hook
 * 
 * Custom hook for managing filtered data with memoization.
 * Provides real-time filtering without unnecessary re-renders.
 */

import { useState, useMemo } from 'react';
import type { FilterState, FilterConfig, FilterResult } from '../types/filters';
import { filterItems } from '../lib/filterUtils';

/**
 * Hook for managing filtered data
 * @param data Source data array
 * @param config Filter configuration
 * @returns Filter state, handlers, and filtered results
 */
export function useFilteredData<T extends Record<string, any>>(
    data: T[] | undefined,
    config: FilterConfig<T>
) {
    const [filterState, setFilterState] = useState<FilterState>({
        searchQuery: '',
        status: 'all',
        minContentCount: undefined,
    });

    // Memoized filtered results - only recomputes when data or filterState changes
    const filteredResult: FilterResult<T> = useMemo(() => {
        if (!data) {
            return {
                items: [],
                totalCount: 0,
                matchedCount: 0,
            };
        }

        return filterItems(data, filterState, config);
    }, [data, filterState, config]);

    return {
        filterState,
        setFilterState,
        filteredData: filteredResult.items,
        totalCount: filteredResult.totalCount,
        matchedCount: filteredResult.matchedCount,
        matchedFields: filteredResult.matchedFields,
    };
}

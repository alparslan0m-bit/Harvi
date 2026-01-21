/**
 * Filter Types for Admin Dashboard
 * 
 * Defines types for the search and filter system across all content areas.
 */

/**
 * Base filter configuration
 */
export interface FilterConfig<T> {
    /** Fields to search in (e.g., 'name', 'external_id', 'id') */
    searchFields: (keyof T)[];
    /** Enable fuzzy/typo-tolerant search */
    fuzzySearch?: boolean;
    /** Minimum search term length to trigger filtering */
    minSearchLength?: number;
}

/**
 * Active filter state
 */
export interface FilterState {
    /** Text search query */
    searchQuery: string;
    /** Status filter (if applicable) */
    status?: 'all' | 'active' | 'inactive';
    /** Minimum content count filter */
    minContentCount?: number;
}

/**
 * Filter result with metadata
 */
export interface FilterResult<T> {
    /** Filtered items */
    items: T[];
    /** Total count before filtering */
    totalCount: number;
    /** Matched count after filtering */
    matchedCount: number;
    /** Fields that matched for each item (for highlighting) */
    matchedFields?: Map<string, string[]>;
}

/**
 * Fuzzy match result
 */
export interface FuzzyMatchResult {
    /** Whether the query matches */
    matches: boolean;
    /** Confidence score (0-1) */
    score: number;
    /** Matched positions for highlighting */
    matchedIndices?: number[];
}

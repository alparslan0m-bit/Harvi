/**
 * Filter Utilities for Admin Dashboard
 * 
 * Provides client-side filtering with fuzzy search and performance optimization.
 */

import type { FilterConfig, FilterState, FilterResult, FuzzyMatchResult } from '../types/filters';

/**
 * Calculate Levenshtein distance for fuzzy matching
 * @param str1 First string
 * @param str2 Second string
 * @returns Distance between strings (lower is better)
 */
function levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return matrix[len1][len2];
}

/**
 * Fuzzy match two strings
 * @param query Search query
 * @param target Target string to match against
 * @param threshold Similarity threshold (0-1, default 0.6)
 * @returns Match result with score
 */
export function fuzzyMatch(query: string, target: string, threshold = 0.6): FuzzyMatchResult {
    const normalizedQuery = query.toLowerCase().trim();
    const normalizedTarget = target.toLowerCase();

    // Exact match
    if (normalizedTarget.includes(normalizedQuery)) {
        return { matches: true, score: 1.0 };
    }

    // Calculate similarity for fuzzy match
    const distance = levenshteinDistance(normalizedQuery, normalizedTarget);
    const maxLength = Math.max(normalizedQuery.length, normalizedTarget.length);
    const similarity = 1 - distance / maxLength;

    return {
        matches: similarity >= threshold,
        score: similarity,
    };
}

/**
 * Simple substring match (non-fuzzy)
 * @param query Search query
 * @param target Target string
 * @returns Whether query is found in target (case-insensitive)
 */
export function simpleMatch(query: string, target: string): boolean {
    if (!query || !target) return false;
    return target.toLowerCase().includes(query.toLowerCase().trim());
}

/**
 * Check if a value matches the search query
 * @param query Search query
 * @param value Value to check
 * @param fuzzy Whether to use fuzzy matching
 * @returns Whether the value matches
 */
function matchesQuery(query: string, value: any, fuzzy: boolean): boolean {
    if (!query) return true;
    if (value == null) return false;

    const stringValue = String(value);

    if (fuzzy) {
        return fuzzyMatch(query, stringValue).matches;
    } else {
        return simpleMatch(query, stringValue);
    }
}

/**
 * Filter items based on search query and config
 * @param items Items to filter
 * @param filterState Current filter state
 * @param config Filter configuration
 * @returns Filtered result
 */
export function filterItems<T extends Record<string, any>>(
    items: T[],
    filterState: FilterState,
    config: FilterConfig<T>
): FilterResult<T> {
    const { searchQuery } = filterState;
    const { searchFields, fuzzySearch = false, minSearchLength = 1 } = config;

    // If search query is too short, return all items
    if (!searchQuery || searchQuery.trim().length < minSearchLength) {
        return {
            items,
            totalCount: items.length,
            matchedCount: items.length,
        };
    }

    const query = searchQuery.trim();
    const matchedFields = new Map<string, string[]>();

    // Filter items
    const filteredItems = items.filter((item) => {
        const fieldsMatched: string[] = [];

        // Check if any search field matches
        for (const field of searchFields) {
            const value = item[field];
            if (matchesQuery(query, value, fuzzySearch)) {
                fieldsMatched.push(String(field));
            }
        }

        // Item matches if at least one field matched
        if (fieldsMatched.length > 0) {
            // Store which fields matched (using id or external_id as key)
            const itemKey = item.id || item.external_id || JSON.stringify(item);
            matchedFields.set(itemKey, fieldsMatched);
            return true;
        }

        return false;
    });

    return {
        items: filteredItems,
        totalCount: items.length,
        matchedCount: filteredItems.length,
        matchedFields,
    };
}

/**
 * Debounce function for search input
 * @param func Function to debounce
 * @param wait Wait time in ms
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Highlight matched text in a string
 * @param text Original text
 * @param query Search query
 * @returns Array of text segments with highlight flags
 */
export function highlightMatch(text: string, query: string): Array<{ text: string; highlight: boolean }> {
    if (!query || !text) {
        return [{ text, highlight: false }];
    }

    const normalizedText = text;
    const normalizedQuery = query.trim();
    const lowerText = normalizedText.toLowerCase();
    const lowerQuery = normalizedQuery.toLowerCase();

    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
        return [{ text, highlight: false }];
    }

    const segments: Array<{ text: string; highlight: boolean }> = [];

    if (index > 0) {
        segments.push({ text: text.substring(0, index), highlight: false });
    }

    segments.push({
        text: text.substring(index, index + normalizedQuery.length),
        highlight: true,
    });

    if (index + normalizedQuery.length < text.length) {
        segments.push({
            text: text.substring(index + normalizedQuery.length),
            highlight: false,
        });
    }

    return segments;
}

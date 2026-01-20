/**
 * React Query Hooks for Years
 * Handles caching, mutations, and cache invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as yearsService from '../services/years.service';
import type { Year, YearInsert, YearUpdate } from '../types/database';

// ============================================================================
// Query Hooks
// ============================================================================

export function useYears() {
    return useQuery({
        queryKey: ['years'],
        queryFn: yearsService.getAllYears,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useYear(id: string) {
    return useQuery({
        queryKey: ['years', id],
        queryFn: () => yearsService.getYearById(id),
        enabled: !!id,
    });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useCreateYear() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: YearInsert) => yearsService.createYear(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['years'] });
        },
    });
}

export function useUpdateYear() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: YearUpdate }) =>
            yearsService.updateYear(id, updates),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['years'] });
            queryClient.invalidateQueries({ queryKey: ['years', data.id] });
        },
    });
}

export function useDeleteYear() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => yearsService.deleteYear(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['years'] });
            queryClient.invalidateQueries({ queryKey: ['modules'] });
        },
    });
}

export function useYearChildCounts(id: string) {
    return useQuery({
        queryKey: ['years', id, 'child-counts'],
        queryFn: () => yearsService.getYearChildCounts(id),
        enabled: !!id,
    });
}

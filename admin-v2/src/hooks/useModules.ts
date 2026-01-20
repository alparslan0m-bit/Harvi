/**
 * React Query Hooks for Modules
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as modulesService from '../services/modules.service';
import type { ModuleInsert, ModuleUpdate } from '../types/database';

export function useModules() {
    return useQuery({
        queryKey: ['modules'],
        queryFn: modulesService.getAllModules,
        staleTime: 5 * 60 * 1000,
    });
}

export function useModulesByYear(yearId: string) {
    return useQuery({
        queryKey: ['modules', 'by-year', yearId],
        queryFn: () => modulesService.getModulesByYearId(yearId),
        enabled: !!yearId,
    });
}

export function useCreateModule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ModuleInsert) => modulesService.createModule(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['modules'] });
        },
    });
}

export function useUpdateModule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: ModuleUpdate }) =>
            modulesService.updateModule(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['modules'] });
        },
    });
}

export function useDeleteModule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => modulesService.deleteModule(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['modules'] });
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
        },
    });
}

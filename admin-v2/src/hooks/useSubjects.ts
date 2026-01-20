/**
 * React Query Hooks for Subjects
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as subjectsService from '../services/subjects.service';
import type { SubjectInsert, SubjectUpdate } from '../types/database';

export function useSubjects() {
    return useQuery({
        queryKey: ['subjects'],
        queryFn: subjectsService.getAllSubjects,
        staleTime: 5 * 60 * 1000,
    });
}

export function useSubjectsByModule(moduleId: string) {
    return useQuery({
        queryKey: ['subjects', 'by-module', moduleId],
        queryFn: () => subjectsService.getSubjectsByModuleId(moduleId),
        enabled: !!moduleId,
    });
}

export function useCreateSubject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SubjectInsert) => subjectsService.createSubject(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
        },
    });
}

export function useUpdateSubject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: SubjectUpdate }) =>
            subjectsService.updateSubject(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
        },
    });
}

export function useDeleteSubject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => subjectsService.deleteSubject(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            queryClient.invalidateQueries({ queryKey: ['lectures'] });
        },
    });
}

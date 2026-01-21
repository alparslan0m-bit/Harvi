/**
 * React Query Hooks for Lectures
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as lecturesService from '../services/lectures.service';
import type { LectureInsert, LectureUpdate } from '../types/database';

export function useLectures() {
    return useQuery({
        queryKey: ['lectures'],
        queryFn: lecturesService.getAllLectures,
        staleTime: 5 * 60 * 1000,
    });
}

export function useLecturesBySubject(subjectId: string) {
    return useQuery({
        queryKey: ['lectures', 'by-subject', subjectId],
        queryFn: () => lecturesService.getLecturesBySubjectId(subjectId),
        enabled: !!subjectId,
    });
}

export function useCreateLecture() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: LectureInsert) => lecturesService.createLecture(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lectures'] });
        },
    });
}

export function useUpdateLecture() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: LectureUpdate }) =>
            lecturesService.updateLecture(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lectures'] });
        },
    });
}

export function useDeleteLecture() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => lecturesService.deleteLecture(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lectures'] });
            queryClient.invalidateQueries({ queryKey: ['questions'] });
        },
    });
}

export function useDeleteLectures() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (ids: string[]) => lecturesService.deleteLectures(ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lectures'] });
            queryClient.invalidateQueries({ queryKey: ['questions'] });
        },
    });
}

export function useLectureChildCounts(id: string) {
    return useQuery({
        queryKey: ['lectures', id, 'child-counts'],
        queryFn: () => lecturesService.getLectureChildCounts(id),
        enabled: !!id,
    });
}

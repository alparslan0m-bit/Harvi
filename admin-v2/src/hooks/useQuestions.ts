/**
 * React Query Hooks for Questions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as questionsService from '../services/questions.service';
import type { QuestionInsert, QuestionUpdate } from '../types/database';

export function useQuestions() {
    return useQuery({
        queryKey: ['questions'],
        queryFn: questionsService.getAllQuestions,
        staleTime: 5 * 60 * 1000,
    });
}

export function useQuestionsByLecture(lectureId: string) {
    return useQuery({
        queryKey: ['questions', 'by-lecture', lectureId],
        queryFn: () => questionsService.getQuestionsByLectureId(lectureId),
        enabled: !!lectureId,
    });
}

export function useCreateQuestion() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: QuestionInsert) => questionsService.createQuestion(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questions'] });
        },
    });
}

export function useUpdateQuestion() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: QuestionUpdate }) =>
            questionsService.updateQuestion(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questions'] });
        },
    });
}

export function useDeleteQuestion() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => questionsService.deleteQuestion(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questions'] });
        },
    });
}

export function useBulkCreateQuestions() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ lectureId, questions }: { lectureId: string; questions: Omit<QuestionInsert, 'lecture_id'>[] }) =>
            questionsService.bulkCreateQuestions(lectureId, questions),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questions'] });
        },
    });
}

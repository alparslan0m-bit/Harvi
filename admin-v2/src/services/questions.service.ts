/**
 * Questions Service - Data Access Layer
 * 
 * ⚠️ CRITICAL SECURITY:
 * - Handles JSONB options format (NOT string arrays)
 * - Includes correct_answer_index (ADMIN ONLY)
 * - NEVER expose this service to student-facing APIs
 */

import { supabase, logQuery, logError } from '../lib/supabase';
import type { Question, QuestionInsert, QuestionUpdate, QuestionOption } from '../types/database';
import { validateQuestionOptions, validateCorrectAnswerIndex } from '../types/database';

// ============================================================================
// READ Operations
// ============================================================================

export async function getAllQuestions(): Promise<Question[]> {
    logQuery('SELECT', 'questions');

    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('external_id', { ascending: true });

    if (error) {
        logError('getAllQuestions', error);
        throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    return data || [];
}

export async function getQuestionsByLectureId(lectureId: string): Promise<Question[]> {
    logQuery('SELECT by lecture_id', 'questions', { lectureId });

    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('lecture_id', lectureId)
        .order('question_order', { ascending: true });

    if (error) {
        logError('getQuestionsByLectureId', error);
        throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    return data || [];
}

// ============================================================================
// CREATE Operations
// ============================================================================

export async function createQuestion(questionData: QuestionInsert): Promise<Question> {
    logQuery('INSERT', 'questions', { ...questionData, correct_answer_index: '[REDACTED]' });

    // Validate options format
    const optionsError = validateQuestionOptions(questionData.options);
    if (optionsError) {
        throw new Error(`Invalid options: ${optionsError}`);
    }

    // Validate correct_answer_index
    const indexError = validateCorrectAnswerIndex(
        questionData.correct_answer_index,
        questionData.options.length
    );
    if (indexError) {
        throw new Error(`Invalid correct answer: ${indexError}`);
    }

    const { data, error } = await supabase
        .from('questions')
        .insert({
            external_id: questionData.external_id,
            lecture_id: questionData.lecture_id,
            text: questionData.text,
            options: questionData.options as unknown as string, // Supabase expects JSONB as string
            correct_answer_index: questionData.correct_answer_index,
            explanation: questionData.explanation || null,
            question_order: questionData.question_order ?? 0,
            difficulty_level: questionData.difficulty_level ?? 1,
        })
        .select()
        .single();

    if (error) {
        logError('createQuestion', error);

        if (error.code === '23505') {
            throw new Error(`Question with external_id "${questionData.external_id}" already exists`);
        }

        if (error.code === '23503') {
            throw new Error(`Lecture with ID "${questionData.lecture_id}" does not exist`);
        }

        throw new Error(`Failed to create question: ${error.message}`);
    }

    return data;
}

// ============================================================================
// UPDATE Operations
// ============================================================================

export async function updateQuestion(id: string, updates: QuestionUpdate): Promise<Question> {
    logQuery('UPDATE', 'questions', { id, ...updates, correct_answer_index: '[REDACTED]' });

    // Validate options if being updated
    if (updates.options) {
        const optionsError = validateQuestionOptions(updates.options);
        if (optionsError) {
            throw new Error(`Invalid options: ${optionsError}`);
        }
    }

    // Validate correct_answer_index if being updated
    if (updates.correct_answer_index !== undefined && updates.options) {
        const indexError = validateCorrectAnswerIndex(
            updates.correct_answer_index,
            updates.options.length
        );
        if (indexError) {
            throw new Error(`Invalid correct answer: ${indexError}`);
        }
    }

    const { data, error } = await supabase
        .from('questions')
        .update({
            ...updates,
            options: updates.options ? (updates.options as unknown as string) : undefined,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        logError('updateQuestion', error);
        throw new Error(`Failed to update question: ${error.message}`);
    }

    return data;
}

// ============================================================================
// DELETE Operations
// ============================================================================

export async function deleteQuestion(id: string): Promise<void> {
    logQuery('DELETE', 'questions', { id });

    const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

    if (error) {
        logError('deleteQuestion', error);
        throw new Error(`Failed to delete question: ${error.message}`);
    }
}

// ============================================================================
// BULK Operations
// ============================================================================

export async function bulkCreateQuestions(
    lectureId: string,
    questions: Omit<QuestionInsert, 'lecture_id'>[]
): Promise<Question[]> {
    logQuery('BULK INSERT', 'questions', { lectureId, count: questions.length });

    const questionsWithLectureId = questions.map(q => ({
        ...q,
        lecture_id: lectureId,
        options: q.options as unknown as string,
    }));

    const { data, error } = await supabase
        .from('questions')
        .insert(questionsWithLectureId)
        .select();

    if (error) {
        logError('bulkCreateQuestions', error);
        throw new Error(`Failed to bulk create questions: ${error.message}`);
    }

    return data || [];
}

// ============================================================================
// Helper: Convert simple options to JSONB format
// ============================================================================

export function convertOptionsToJSONB(simpleOptions: string[]): QuestionOption[] {
    return simpleOptions.map((text, index) => ({
        id: index + 1,
        text,
        image_url: null,
        alt_text: null,
    }));
}

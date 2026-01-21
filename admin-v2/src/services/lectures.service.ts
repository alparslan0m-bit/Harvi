/**
 * Lectures Service - Data Access Layer
 * UUID-native, FK to subjects table (nullable)
 */

import { supabase, logQuery, logError } from '../lib/supabase';
import type { Lecture, LectureInsert, LectureUpdate } from '../types/database';

export async function getAllLectures(): Promise<Lecture[]> {
    logQuery('SELECT', 'lectures');

    const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .order('external_id', { ascending: true });

    if (error) {
        logError('getAllLectures', error);
        throw new Error(`Failed to fetch lectures: ${error.message}`);
    }

    return data || [];
}

export async function getLecturesBySubjectId(subjectId: string): Promise<Lecture[]> {
    logQuery('SELECT by subject_id', 'lectures', { subjectId });

    const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('subject_id', subjectId)
        .order('order_index', { ascending: true });

    if (error) {
        logError('getLecturesBySubjectId', error);
        throw new Error(`Failed to fetch lectures: ${error.message}`);
    }

    return data || [];
}

export async function createLecture(lectureData: LectureInsert): Promise<Lecture> {
    logQuery('INSERT', 'lectures', lectureData);

    const { data, error } = await supabase
        .from('lectures')
        .insert({
            ...lectureData,
            order_index: lectureData.order_index ?? 0,
        })
        .select()
        .single();

    if (error) {
        logError('createLecture', error);
        if (error.code === '23505') {
            throw new Error(`Lecture with external_id "${lectureData.external_id}" already exists`);
        }
        throw new Error(`Failed to create lecture: ${error.message}`);
    }

    return data;
}

export async function updateLecture(id: string, updates: LectureUpdate): Promise<Lecture> {
    logQuery('UPDATE', 'lectures', { id, updates });

    const { data, error } = await supabase
        .from('lectures')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        logError('updateLecture', error);
        throw new Error(`Failed to update lecture: ${error.message}`);
    }

    return data;
}

export async function deleteLecture(id: string): Promise<void> {
    logQuery('DELETE', 'lectures', { id });

    const { error } = await supabase
        .from('lectures')
        .delete()
        .eq('id', id);

    if (error) {
        logError('deleteLecture', error);
        throw new Error(`Failed to delete lecture: ${error.message}`);
    }
}

export async function deleteLectures(ids: string[]): Promise<void> {
    logQuery('DELETE MANY', 'lectures', { count: ids.length });

    const { error } = await supabase
        .from('lectures')
        .delete()
        .in('id', ids);

    if (error) {
        logError('deleteLectures', error);
        throw new Error(`Failed to delete lectures: ${error.message}`);
    }
}

export async function getLectureChildCounts(id: string): Promise<{ questions: number }> {
    const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('lecture_id', id);

    return { questions: count || 0 };
}

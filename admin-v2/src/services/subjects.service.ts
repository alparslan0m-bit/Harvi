/**
 * Subjects Service - Data Access Layer
 * UUID-native, FK to modules table
 */

import { supabase, logQuery, logError } from '../lib/supabase';
import type { Subject, SubjectInsert, SubjectUpdate } from '../types/database';

export async function getAllSubjects(): Promise<Subject[]> {
    logQuery('SELECT', 'subjects');

    const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('external_id', { ascending: true });

    if (error) {
        logError('getAllSubjects', error);
        throw new Error(`Failed to fetch subjects: ${error.message}`);
    }

    return data || [];
}

export async function getSubjectsByModuleId(moduleId: string): Promise<Subject[]> {
    logQuery('SELECT by module_id', 'subjects', { moduleId });

    const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('module_id', moduleId)
        .order('external_id', { ascending: true });

    if (error) {
        logError('getSubjectsByModuleId', error);
        throw new Error(`Failed to fetch subjects: ${error.message}`);
    }

    return data || [];
}

export async function createSubject(subjectData: SubjectInsert): Promise<Subject> {
    logQuery('INSERT', 'subjects', subjectData);

    const { data, error } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

    if (error) {
        logError('createSubject', error);
        if (error.code === '23505') {
            throw new Error(`Subject with external_id "${subjectData.external_id}" already exists`);
        }
        throw new Error(`Failed to create subject: ${error.message}`);
    }

    return data;
}

export async function updateSubject(id: string, updates: SubjectUpdate): Promise<Subject> {
    logQuery('UPDATE', 'subjects', { id, updates });

    const { data, error } = await supabase
        .from('subjects')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        logError('updateSubject', error);
        throw new Error(`Failed to update subject: ${error.message}`);
    }

    return data;
}

export async function deleteSubject(id: string): Promise<void> {
    logQuery('DELETE', 'subjects', { id });

    const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

    if (error) {
        logError('deleteSubject', error);
        throw new Error(`Failed to delete subject: ${error.message}`);
    }
}

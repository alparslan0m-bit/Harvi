/**
 * Years Service - Data Access Layer
 * UUID-native, no MongoDB assumptions
 */

import { supabase, logQuery, logError } from '../lib/supabase';
import type { Year, YearInsert, YearUpdate } from '../types/database';

// ============================================================================
// READ Operations
// ============================================================================

export async function getAllYears(): Promise<Year[]> {
    logQuery('SELECT', 'years');

    const { data, error } = await supabase
        .from('years')
        .select('*')
        .order('external_id', { ascending: true });

    if (error) {
        logError('getAllYears', error);
        throw new Error(`Failed to fetch years: ${error.message}`);
    }

    return data || [];
}

export async function getYearById(id: string): Promise<Year | null> {
    logQuery('SELECT by ID', 'years', { id });

    const { data, error } = await supabase
        .from('years')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        logError('getYearById', error);
        throw new Error(`Failed to fetch year: ${error.message}`);
    }

    return data;
}

// ============================================================================
// CREATE Operations
// ============================================================================

export async function createYear(yearData: YearInsert): Promise<Year> {
    logQuery('INSERT', 'years', yearData);

    const { data, error } = await supabase
        .from('years')
        .insert(yearData)
        .select()
        .single();

    if (error) {
        logError('createYear', error);
        if (error.code === '23505') {
            throw new Error(`Year with external_id "${yearData.external_id}" already exists`);
        }
        throw new Error(`Failed to create year: ${error.message}`);
    }

    return data;
}

// ============================================================================
// UPDATE Operations
// ============================================================================

export async function updateYear(id: string, updates: YearUpdate): Promise<Year> {
    logQuery('UPDATE', 'years', { id, updates });

    const { data, error } = await supabase
        .from('years')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        logError('updateYear', error);
        throw new Error(`Failed to update year: ${error.message}`);
    }

    return data;
}

// ============================================================================
// DELETE Operations
// ============================================================================

export async function deleteYear(id: string): Promise<void> {
    logQuery('DELETE', 'years', { id });

    const { error } = await supabase
        .from('years')
        .delete()
        .eq('id', id);

    if (error) {
        logError('deleteYear', error);
        throw new Error(`Failed to delete year: ${error.message}`);
    }
}

export async function getYearChildCounts(id: string): Promise<{
    modules: number;
    subjects: number;
    lectures: number;
    questions: number;
}> {
    const { count: modulesCount } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true })
        .eq('year_id', id);

    return {
        modules: modulesCount || 0,
        subjects: 0,
        lectures: 0,
        questions: 0,
    };
}

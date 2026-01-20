/**
 * Modules Service - Data Access Layer
 * UUID-native, FK to years table
 */

import { supabase, logQuery, logError } from '../lib/supabase';
import type { Module, ModuleInsert, ModuleUpdate } from '../types/database';

export async function getAllModules(): Promise<Module[]> {
    logQuery('SELECT', 'modules');

    const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('external_id', { ascending: true });

    if (error) {
        logError('getAllModules', error);
        throw new Error(`Failed to fetch modules: ${error.message}`);
    }

    return data || [];
}

export async function getModulesByYearId(yearId: string): Promise<Module[]> {
    logQuery('SELECT by year_id', 'modules', { yearId });

    const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('year_id', yearId)
        .order('external_id', { ascending: true });

    if (error) {
        logError('getModulesByYearId', error);
        throw new Error(`Failed to fetch modules: ${error.message}`);
    }

    return data || [];
}

export async function createModule(moduleData: ModuleInsert): Promise<Module> {
    logQuery('INSERT', 'modules', moduleData);

    const { data, error } = await supabase
        .from('modules')
        .insert(moduleData)
        .select()
        .single();

    if (error) {
        logError('createModule', error);
        if (error.code === '23505') {
            throw new Error(`Module with external_id "${moduleData.external_id}" already exists`);
        }
        throw new Error(`Failed to create module: ${error.message}`);
    }

    return data;
}

export async function updateModule(id: string, updates: ModuleUpdate): Promise<Module> {
    logQuery('UPDATE', 'modules', { id, updates });

    const { data, error } = await supabase
        .from('modules')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        logError('updateModule', error);
        throw new Error(`Failed to update module: ${error.message}`);
    }

    return data;
}

export async function deleteModule(id: string): Promise<void> {
    logQuery('DELETE', 'modules', { id });

    const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', id);

    if (error) {
        logError('deleteModule', error);
        throw new Error(`Failed to delete module: ${error.message}`);
    }
}

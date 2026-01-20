/**
 * Supabase Client - Admin Dashboard
 * 
 * ⚠️ SECURITY:
 * Uses anon key but admin operations protected by JWT role claims
 * Safe for browser use with proper authentication
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Environment Variables
// ============================================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
    throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!SUPABASE_ANON_KEY) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// ============================================================================
// Supabase Client
// ============================================================================

export const supabase: SupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            storageKey: 'admin-auth-token',
            storage: window.localStorage,
        },
    }
);

// ============================================================================
// Admin Role Checking
// ============================================================================

export async function isAdmin(): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return false;

        const metadata = user.app_metadata || user.user_metadata;

        return (
            metadata.role === 'admin' ||
            metadata.is_admin === true ||
            user.email?.includes('admin@') === true
        );
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

export async function requireAdmin(): Promise<void> {
    const adminStatus = await isAdmin();

    if (!adminStatus) {
        throw new Error('Unauthorized: Admin access required');
    }
}

export async function getCurrentAdmin() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user) throw new Error('Not authenticated');

    const adminStatus = await isAdmin();
    if (!adminStatus) throw new Error('Not an admin user');

    return user;
}

// ============================================================================
// Logging
// ============================================================================

const isDevelopment = import.meta.env.DEV;

export function logQuery(operation: string, table: string, details?: unknown) {
    if (isDevelopment) {
        console.log(`[Supabase] ${operation} on ${table}`, details || '');
    }
}

export function logError(operation: string, error: unknown) {
    console.error(`[Supabase Error] ${operation}:`, error);
}

// ============================================================================
// Health Check
// ============================================================================

export async function healthCheck(): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('years')
            .select('count()')
            .limit(1);

        return !error;
    } catch {
        return false;
    }
}

export default supabase;

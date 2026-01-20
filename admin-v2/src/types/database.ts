/**
 * Database Types - Supabase Schema
 * Generated from SCHEMA_MAPPING.md
 * 
 * ⚠️ CRITICAL: These types match the actual Postgres schema
 * DO NOT modify without updating the database schema first
 */

// ============================================================================
// Database Row Types (what Supabase returns)
// ============================================================================

export interface Year {
    id: string; // UUID
    external_id: string; // e.g., "year1"
    name: string;
    icon: string | null;
    created_at: string; // ISO timestamp
    updated_at: string;
}

export interface Module {
    id: string; // UUID
    external_id: string; // e.g., "year1_mod1"
    year_id: string; // UUID FK
    name: string;
    created_at: string;
    updated_at: string;
}

export interface Subject {
    id: string; // UUID
    external_id: string; // e.g., "year1_mod1_sub1"
    module_id: string; // UUID FK
    name: string;
    created_at: string;
    updated_at: string;
}

export interface Lecture {
    id: string; // UUID
    external_id: string; // e.g., "year1_mod1_sub1_lec1"
    subject_id: string | null; // UUID FK (nullable - orphaned lectures)
    name: string;
    order_index: number;
    created_at: string;
    updated_at: string;
}

/**
 * Question Option Structure (JSONB)
 * ⚠️ This is NOT a simple string array!
 */
export interface QuestionOption {
    id: number; // 1-indexed
    text: string;
    image_url?: string | null;
    alt_text?: string | null;
}

/**
 * Question (Admin View - includes correct answer)
 * ⚠️ SECURITY: This type MUST ONLY be used in admin context
 */
export interface Question {
    id: string; // UUID
    external_id: string;
    lecture_id: string; // UUID FK
    text: string;
    options: QuestionOption[]; // JSONB array
    correct_answer_index: number; // 🔐 ADMIN ONLY
    explanation: string | null;
    question_order: number;
    difficulty_level: 1 | 2 | 3;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// Insert Types (for CREATE operations)
// ============================================================================

export interface YearInsert {
    external_id: string;
    name: string;
    icon?: string | null;
}

export interface ModuleInsert {
    external_id: string;
    year_id: string; // UUID
    name: string;
}

export interface SubjectInsert {
    external_id: string;
    module_id: string; // UUID
    name: string;
}

export interface LectureInsert {
    external_id: string;
    subject_id: string | null;
    name: string;
    order_index?: number;
}

export interface QuestionInsert {
    external_id: string;
    lecture_id: string; // UUID
    text: string;
    options: QuestionOption[]; // JSONB
    correct_answer_index: number;
    explanation?: string | null;
    question_order?: number;
    difficulty_level?: 1 | 2 | 3;
}

// ============================================================================
// Update Types (partial updates)
// ============================================================================

export type YearUpdate = Partial<Omit<YearInsert, 'external_id'>>;
export type ModuleUpdate = Partial<Omit<ModuleInsert, 'external_id'>>;
export type SubjectUpdate = Partial<Omit<SubjectInsert, 'external_id'>>;
export type LectureUpdate = Partial<Omit<LectureInsert, 'external_id'>>;
export type QuestionUpdate = Partial<Omit<QuestionInsert, 'external_id' | 'lecture_id'>>;

// ============================================================================
// Hierarchical Types (with nested relations)
// ============================================================================

export interface YearWithModules extends Year {
    modules?: Module[];
}

export interface ModuleWithSubjects extends Module {
    year?: Year;
    subjects?: Subject[];
}

export interface SubjectWithLectures extends Subject {
    module?: Module;
    lectures?: Lecture[];
}

export interface LectureWithQuestions extends Lecture {
    subject?: Subject;
    questions?: Question[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function isValidUUID(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function validateQuestionOptions(options: QuestionOption[]): string | null {
    if (options.length < 2) {
        return 'At least 2 options required';
    }

    if (options.some(opt => !opt.text || opt.text.trim() === '')) {
        return 'All options must have text';
    }

    const ids = options.map(opt => opt.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
        return 'Option IDs must be unique';
    }

    return null;
}

export function validateCorrectAnswerIndex(index: number, optionsLength: number): string | null {
    if (index < 0) {
        return 'Correct answer index cannot be negative';
    }

    if (index >= optionsLength) {
        return `Correct answer index (${index}) exceeds options length (${optionsLength})`;
    }

    return null;
}

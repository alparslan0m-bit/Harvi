/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║        MEDICAL MCQ QUESTION SEEDING - COMPLETE TECHNICAL REFERENCE        ║
 * ║                   Production-Grade Validation & Diagnostics               ║
 * ║                                                                            ║
 * ║ Date: January 19, 2026                                                    ║
 * ║ Platform: Medical MCQ - Supabase PostgreSQL                              ║
 * ║ Status: Production Ready                                                  ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// PART 1: SEEDING APPROACH & ARCHITECTURE
// =============================================================================

/*
SEEDING STRATEGY: UPSERT with Deterministic ID Mapping

┌─────────────────────────────────────────────────────────────────────────────┐
│ CORE PRINCIPLES                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 1. IDEMPOTENCY                                                             │
│    - Use UPSERT (INSERT ... ON CONFLICT DO UPDATE)                         │
│    - Re-running script produces same end state                             │
│    - No duplicates or data corruption on re-runs                           │
│                                                                             │
│ 2. DETERMINISTIC ID MAPPING                                                │
│    - MongoDB IDs → external_id (string, human-readable)                    │
│    - external_id → Supabase UUID (via UPSERT logic)                        │
│    - Example: 'q_anatomy_001_bone' always → same UUID                      │
│    - Enables safe re-seeding and data auditing                             │
│                                                                             │
│ 3. DATA INTEGRITY VALIDATION                                               │
│    - All validation at application layer (before DB insert)                │
│    - All validation at database layer (CHECK constraints)                  │
│    - No invalid data can be inserted even with manual SQL                  │
│                                                                             │
│ 4. RLS & SECURITY COMPLIANCE                                               │
│    - Service Role key used (elevated privileges)                           │
│    - RLS policies NOT bypassed (still active)                              │
│    - Triggers NOT disabled (auto-grading active)                           │
│    - User responses secured by RLS and triggers                            │
│                                                                             │
│ 5. TRANSACTION SAFETY                                                      │
│    - All-or-nothing semantics                                              │
│    - FK constraints checked before commit                                  │
│    - Rollback on any constraint violation                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

PROCESS FLOW:
═════════════

Frontend/Import
    ↓
[Question JSON Array]
    ↓
Validation Layer (Node.js)
    ├─ Check: external_id exists
    ├─ Check: lecture_external_id resolves to UUID
    ├─ Check: correct_answer_index in bounds
    ├─ Check: options array has ≥2 items
    ├─ Check: options JSONB structure valid
    └─ Check: no duplicate external_ids
    ↓
UPSERT to Supabase
    ├─ If external_id exists: UPDATE
    ├─ If new: INSERT
    └─ Atomic transaction
    ↓
Database Triggers
    ├─ CHECK constraint: correct_answer_index < array_length(options)
    ├─ CHECK constraint: options has ≥2 items
    ├─ FK constraint: lecture_id references valid lecture
    └─ Auto-generated timestamps
    ↓
[Questions Table Updated]
    ↓
Validation Queries
    ├─ Detect orphaned questions
    ├─ Detect invalid answer indexes
    ├─ Verify JSONB structure
    ├─ Count by difficulty level
    └─ Statistics report
    ↓
✅ Ready for Production
*/

// =============================================================================
// PART 2: EXAMPLE QUESTION SEED OBJECT
// =============================================================================

const EXAMPLE_QUESTION_OBJECT = {
    // REQUIRED: Unique identifier for idempotency
    // Format: q_<subject>_<number>_<slug>
    // Used as external_id to handle re-runs safely
    external_id: "q_anatomy_001_bone",

    // REQUIRED: Reference to lecture containing this question
    // Must match lecture.external_id (e.g., 'year1_mod1_sub1_lec1')
    // Resolved to UUID at seeding time
    lecture_external_id: "year1_mod1_sub1_lec1",

    // REQUIRED: Question text (displayed to student)
    text: "What is the largest bone in the human body?",

    // REQUIRED: JSONB array of answer options
    // Each object MUST have "text" and optional "meta" properties
    // Meta can contain images, explanations, references, etc.
    options: [
        { 
            text: "Femur", 
            meta: null  // Can be: { image_url: "...", source: "..." }
        },
        { 
            text: "Tibia", 
            meta: null 
        },
        { 
            text: "Humerus", 
            meta: null 
        },
        { 
            text: "Fibula", 
            meta: null 
        }
    ],

    // REQUIRED: 0-based index of correct answer
    // MUST match an index in options array
    // Example: correct_answer_index=0 means options[0]="Femur" is correct
    // DATABASE ENFORCES: 0 <= index < options.length
    correct_answer_index: 0,

    // OPTIONAL: Explanation why this answer is correct
    // Medical best practice: students learn from explanations
    explanation: "The femur (thighbone) is the longest and strongest bone in the human body, comprising approximately 25% of adult height.",

    // OPTIONAL: Order within lecture
    // Used for sorting questions within a lecture
    // Default: 0
    question_order: 1,

    // OPTIONAL: Difficulty level (1=easy, 2=medium, 3=hard)
    // Used for adaptive learning and analytics
    // Default: 1
    difficulty_level: 1

    // AUTO-GENERATED at database level:
    // - id: UUID (generated by gen_random_uuid())
    // - created_at: Current timestamp
    // - updated_at: Current timestamp
};

// VALID OPTIONS VARIATIONS:
const VARIATIONS = {
    // Minimal (text only)
    simple: [
        { text: "Option A", meta: null },
        { text: "Option B", meta: null }
    ],

    // With images
    withImages: [
        { 
            text: "Bone A", 
            meta: { 
                image_url: "https://example.com/bone-a.jpg",
                alt_text: "Diagram of bone A"
            }
        },
        { 
            text: "Bone B", 
            meta: { 
                image_url: "https://example.com/bone-b.jpg",
                alt_text: "Diagram of bone B"
            }
        }
    ],

    // With rich metadata
    withMetadata: [
        { 
            text: "Femur", 
            meta: { 
                scientific_name: "Os femoris",
                length_cm: 40,
                location: "thigh",
                references: ["Gray's Anatomy p. 234"]
            }
        }
    ]
};

// =============================================================================
// PART 3: VALIDATION RULES (DATABASE CHECK CONSTRAINTS)
// =============================================================================

/*
┌─────────────────────────────────────────────────────────────────────────────┐
│ DATABASE-LEVEL VALIDATION (Cannot be bypassed)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 1. FOREIGN KEY: lecture_id must reference lectures.id                      │
│    └─ Error: "violates foreign key constraint..."                          │
│    └─ Fix: Ensure lecture_external_id resolves before seeding              │
│                                                                             │
│ 2. CHECK: correct_answer_index >= 0                                        │
│    └─ Error: "new row for relation... violates check constraint..."        │
│    └─ Fix: Set correct_answer_index = 0 to N-1 (not negative)              │
│                                                                             │
│ 3. CHECK: correct_answer_index < jsonb_array_length(options)               │
│    └─ Error: "violates check constraint..."                                │
│    └─ Fix: If 4 options, use index 0-3 (not 4 or higher)                   │
│                                                                             │
│ 4. CHECK: jsonb_array_length(options) >= 2                                 │
│    └─ Error: "violates check constraint..."                                │
│    └─ Fix: Provide at least 2 options in array                             │
│                                                                             │
│ 5. UNIQUE: external_id must be unique (enables UPSERT)                     │
│    └─ Error: "violates unique constraint..."                               │
│    └─ Fix: Use different external_ids or use UPSERT                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
*/

// =============================================================================
// PART 4: COMMAND-LINE USAGE GUIDE
// =============================================================================

/*
USAGE: node seed-questions.js [OPTIONS]

OPTIONS:
────────

  --test              Seed only 5 test questions (for validation)
  --validate          Run validation queries after seeding
  --clear             Clear all existing questions (DANGEROUS - use cautiously)
  --dry-run           Preview changes without inserting

EXAMPLES:
─────────

  # Seed test data only
  node seed-questions.js --test

  # Seed production data with validation
  node seed-questions.js --validate

  # Clear and re-seed from scratch
  node seed-questions.js --clear --validate

  # Preview what would be seeded (dry run)
  node seed-questions.js --dry-run

  # Full production seeding
  node seed-questions.js

ENVIRONMENT VARIABLES:
──────────────────────

  SUPABASE_URL             → Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY → Service Role key (admin access)

  ⚠️  CRITICAL: Use .env file (never commit to git)
  
  .env format:
  ───────────
  SUPABASE_URL=https://xxxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
*/

// =============================================================================
// PART 5: COMMON FAILURE MODES & FIXES
// =============================================================================

const FAILURE_MODES = {
    
    "error_lecture_not_found": {
        message: "Lecture not found: year1_mod1_sub1_lec1",
        cause: "lecture_external_id doesn't match any existing lecture",
        fix: "Ensure lectures are seeded first (run seed.js), then seed questions",
        check: "SELECT external_id FROM lectures WHERE external_id = 'year1_mod1_sub1_lec1';"
    },

    "error_invalid_index": {
        message: "new row for relation... violates check constraint check_correct_answer",
        cause: "correct_answer_index >= options.length or < 0",
        example: "3 options (indices 0-2) but correct_answer_index=5",
        fix: "Set correct_answer_index to valid range: [0, options.length-1]",
        code: "if (correctAnswerIndex < 0 || correctAnswerIndex >= options.length) throw Error()"
    },

    "error_min_options": {
        message: "violates check constraint check_options_not_empty",
        cause: "Provided fewer than 2 options",
        fix: "Ensure options array has at least 2 items: options.length >= 2",
        check: "SELECT COUNT(*) FROM questions WHERE jsonb_array_length(options) < 2;"
    },

    "error_duplicate_external_id": {
        message: "violates unique constraint questions_external_id_key",
        cause: "Same external_id already exists in database",
        fix: "Either (1) change external_id to be unique, or (2) use UPSERT",
        code: "supabase.from('questions').upsert(data, { onConflict: 'external_id' })"
    },

    "error_jsonb_structure": {
        message: "Invalid JSONB format or missing text property",
        cause: "Option object doesn't have required 'text' property",
        fix: "Validate each option has structure: { text: '...', meta: null }",
        check: "SELECT q.external_id FROM questions q, jsonb_array_elements(q.options) opt WHERE NOT opt?'text';"
    },

    "error_rls_violation": {
        message: "new row violates row-level security policy",
        cause: "Using regular API key instead of Service Role key",
        fix: "Use SUPABASE_SERVICE_ROLE_KEY (not SUPABASE_ANON_KEY) for seeding",
        code: "const supabase = createClient(URL, SERVICE_ROLE_KEY);"
    },

    "error_connection": {
        message: "Failed to connect to Supabase",
        cause: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing/invalid",
        fix: "Check .env file: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
        test: "echo $SUPABASE_URL"
    },

    "error_missing_lecture": {
        message: "Question has invalid lecture_id (orphaned)",
        cause: "Lecture was deleted after question was created",
        fix: "Either recreate lecture or delete orphaned question",
        cleanup: "DELETE FROM questions WHERE lecture_id NOT IN (SELECT id FROM lectures);"
    }
};

// =============================================================================
// PART 6: VALIDATION QUERIES (Copy-Paste into Supabase SQL Editor)
// =============================================================================

const VALIDATION_QUERIES = {

    // Check 1: Detect orphaned questions
    orphaned_questions: `
        SELECT 
            q.id,
            q.external_id,
            q.lecture_id,
            'ORPHANED' as issue
        FROM public.questions q
        LEFT JOIN public.lectures l ON q.lecture_id = l.id
        WHERE l.id IS NULL;
    `,

    // Check 2: Detect invalid correct_answer_index
    invalid_answer_index: `
        SELECT 
            external_id,
            correct_answer_index,
            jsonb_array_length(options) as option_count,
            'OUT OF RANGE' as issue
        FROM public.questions
        WHERE correct_answer_index < 0 
           OR correct_answer_index >= jsonb_array_length(options);
    `,

    // Check 3: Detect missing text in options
    invalid_option_structure: `
        SELECT DISTINCT
            q.external_id,
            'MISSING TEXT PROPERTY' as issue,
            opt as invalid_option
        FROM public.questions q,
        jsonb_array_elements(q.options) opt
        WHERE NOT (jsonb_typeof(opt) = 'object' AND opt ? 'text');
    `,

    // Check 4: Verify minimum options count
    insufficient_options: `
        SELECT 
            external_id,
            jsonb_array_length(options) as option_count,
            'LESS THAN 2 OPTIONS' as issue
        FROM public.questions
        WHERE jsonb_array_length(options) < 2;
    `,

    // Check 5: Count by difficulty
    count_by_difficulty: `
        SELECT 
            difficulty_level,
            COUNT(*) as question_count
        FROM public.questions
        GROUP BY difficulty_level
        ORDER BY difficulty_level;
    `,

    // Check 6: Count by lecture
    count_by_lecture: `
        SELECT 
            l.external_id,
            l.name,
            COUNT(q.id) as question_count
        FROM public.lectures l
        LEFT JOIN public.questions q ON l.id = q.lecture_id
        GROUP BY l.id, l.external_id, l.name
        ORDER BY l.external_id;
    `,

    // Check 7: Sample questions
    sample_questions: `
        SELECT 
            id,
            external_id,
            text,
            jsonb_array_length(options) as option_count,
            correct_answer_index,
            difficulty_level
        FROM public.questions
        LIMIT 10;
    `,

    // Check 8: Overall statistics
    statistics: `
        SELECT 
            COUNT(*) as total_questions,
            COUNT(DISTINCT lecture_id) as lectures_with_questions,
            AVG(difficulty_level) as avg_difficulty,
            MAX(jsonb_array_length(options)) as max_options,
            MIN(jsonb_array_length(options)) as min_options
        FROM public.questions;
    `,

    // Check 9: Verify JSONB is valid JSON
    verify_jsonb_validity: `
        SELECT 
            external_id,
            'INVALID JSON' as issue
        FROM public.questions
        WHERE jsonb_typeof(options) IS NULL
           OR jsonb_typeof(options) != 'array';
    `,

    // Check 10: Find questions with no explanation
    missing_explanations: `
        SELECT 
            external_id,
            text,
            'NO EXPLANATION' as note
        FROM public.questions
        WHERE explanation IS NULL OR explanation = ''
        ORDER BY external_id;
    `
};

// =============================================================================
// PART 7: PERFORMANCE CONSIDERATIONS
// =============================================================================

/*
SEEDING PERFORMANCE:
════════════════════

For 1000+ questions:

1. BATCH OPERATIONS
   - Use: supabase.from('questions').upsert(batchOf100)
   - Split into batches of 100-500 questions
   - Reduces network latency, improves throughput

2. INDEXES
   - Questions table has composite index: (lecture_id, question_order)
   - Questions table has index on: difficulty_level
   - No full-table scans needed for most queries

3. TRIGGERS
   - FK constraints checked per row (100ms per question typical)
   - CHECK constraints are fast (in-process)
   - No performance bottleneck

4. TYPICAL THROUGHPUT
   - Single question: ~50ms (validation + DB roundtrip)
   - Batch of 100: ~2-3 seconds (20-30ms per question)
   - 1000 questions: ~30-50 seconds total

5. OPTIMIZATION
   - Use --test flag to validate first (5 questions)
   - Use --dry-run to test logic without inserting
   - Run validation queries AFTER seeding (not during)
*/

// =============================================================================
// PART 8: ROLLBACK & RECOVERY
// =============================================================================

/*
EMERGENCY ROLLBACK:
═══════════════════

If seeding fails or corrupts data, use these commands:

1. ROLLBACK ENTIRE SEEDING RUN (if transaction not yet committed)
   - Automatic: All changes discarded
   - Manual: ROLLBACK; (in SQL transaction)

2. DELETE BY EXTERNAL_ID PATTERN
   DELETE FROM public.questions
   WHERE external_id LIKE 'q_anatomy_%'
   AND created_at > NOW() - INTERVAL '1 hour';

3. DELETE EVERYTHING (⚠️  CAREFUL!)
   DELETE FROM public.questions;
   -- This triggers FK cascade to user_responses

4. RESTORE FROM BACKUP
   - Contact Supabase support for point-in-time recovery
   - Provide timestamp of backup needed

5. VERIFY RECOVERY
   SELECT COUNT(*) FROM public.questions;
   SELECT COUNT(*) FROM public.user_responses;
*/

// =============================================================================
// PART 9: PRODUCTION DEPLOYMENT CHECKLIST
// =============================================================================

const DEPLOYMENT_CHECKLIST = [
    "✅ Environment variables configured (.env file)",
    "✅ SUPABASE_URL is correct",
    "✅ SUPABASE_SERVICE_ROLE_KEY is present (not ANON_KEY)",
    "✅ Lectures are seeded (before questions)",
    "✅ Test run successful (--test flag)",
    "✅ Validation queries show no errors",
    "✅ Question data reviewed for accuracy",
    "✅ difficult levels assigned appropriately",
    "✅ Explanations provided for medical compliance",
    "✅ External IDs are unique and meaningful",
    "✅ Backup taken before production seed",
    "✅ RLS policies verified (not disabled)",
    "✅ Triggers verified (auto-grading active)",
    "✅ CHECK constraints verified in schema",
    "✅ FK constraints verified in schema",
    "✅ Sample questions tested in app",
    "✅ Analytics queries tested",
    "✅ Student responses recorded correctly",
    "✅ Auto-grading works (correct answers scored)",
    "✅ RLS enforces student can only see own responses"
];

// =============================================================================
// PART 10: MONITORING & LOGS
// =============================================================================

/*
EXPECTED LOG OUTPUT (Successful Seeding):
═════════════════════════════════════════

╔════════════════════════════════════════════════════════════════════════════╗
║             MEDICAL MCQ QUESTION SEEDER - PRODUCTION GRADE               ║
╚════════════════════════════════════════════════════════════════════════════╝

⚙️  Configuration:
   Supabase URL: xxxxx
   Service Role: eyJhbGc...
   Test Only: false
   Dry Run: false
   Validation: true
   Clear First: false

📊 Seeding 5 questions...
   ✅ Seeded: q_anatomy_001_bone
   ✅ Seeded: q_anatomy_002_circulatory
   ✅ Seeded: q_anatomy_003_vertebrae
   ✅ Seeded: q_anatomy_004_heart_chambers
   ✅ Seeded: q_anatomy_005_skeletal_joints

════════════════════════════════════════════════════════════════════════════
📈 SEEDING RESULTS
════════════════════════════════════════════════════════════════════════════
Total Questions: 5
✅ Inserted/Updated: 5
❌ Errors: 0

🔍 VALIDATION QUERIES
─────────────────────────────────────────────────────────────────────────────

1️⃣  Checking for orphaned questions...
   ✅ Found 0 orphaned questions

2️⃣  Checking for invalid correct_answer_index...
   ✅ Found 0 questions with invalid correct_answer_index

3️⃣  Checking options JSONB structure...
   ✅ Found 0 options with invalid structure

4️⃣  Question count by difficulty...
   ✅ Easy (L1): 2
   ✅ Medium (L2): 3
   ✅ Hard (L3): 0
   ✅ Total: 5

✅ Seeding completed successfully
*/

// =============================================================================
// PART 11: FREQUENTLY ASKED QUESTIONS
// =============================================================================

const FAQ = {

    "Q: Can I seed questions without seeding lectures first?": 
    "A: No. FK constraint requires lecture_id to reference valid lecture. Seed years/modules/subjects/lectures first using existing seed.js",

    "Q: What happens if I run the seeder twice with same external_id?": 
    "A: UPSERT logic updates existing question instead of duplicating. Safe to re-run.",

    "Q: Can students see that questions were updated?": 
    "A: Only if they reload the page. Updated_at timestamp changes, but frontend may cache old data.",

    "Q: How do I add images to options?": 
    "A: Put image URLs in the 'meta' object: { text: \"Bone A\", meta: { image_url: \"...\" } }",

    "Q: Does seeding affect existing student responses?": 
    "A: No. Questions and user_responses are separate tables. Updating questions doesn't modify previous responses.",

    "Q: What if correct_answer_index doesn't match my data?": 
    "A: Database CHECK constraint will reject it. Validate before seeding. The constraint prevents impossible questions.",

    "Q: Can I use ANON_KEY instead of SERVICE_ROLE_KEY?": 
    "A: No. ANON_KEY has RLS restrictions. SERVICE_ROLE_KEY has admin access needed for seeding.",

    "Q: How do I seed from CSV/Excel data?": 
    "A: Parse CSV → convert to JSON objects → pass to seeding script. See examples in PART 2.",

    "Q: What's the maximum question text length?": 
    "A: TEXT type has no practical limit (up to 1GB in PostgreSQL). But keep it under 1000 chars for UX.",

    "Q: Can difficulty_level be custom values like 4 or 5?": 
    "A: Yes. The database only has a SMALLINT, no CHECK constraint on values. 1-3 is recommended convention."
};

module.exports = {
    EXAMPLE_QUESTION_OBJECT,
    VARIATIONS,
    FAILURE_MODES,
    VALIDATION_QUERIES,
    DEPLOYMENT_CHECKLIST,
    FAQ
};

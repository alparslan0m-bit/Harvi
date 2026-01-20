/*
╔════════════════════════════════════════════════════════════════════════════╗
║              QUESTION SEEDING - VALIDATION QUERIES ONLY                   ║
║                                                                            ║
║ Copy-paste these queries into Supabase SQL Editor AFTER seeding to       ║
║ verify that questions were inserted correctly and safely.                ║
║                                                                            ║
║ All queries should return EMPTY results (no issues found)                ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- VALIDATION #1: Check for Orphaned Questions
-- ═══════════════════════════════════════════════════════════════════════════
-- SHOULD RETURN: Empty (no rows)
-- MEANS: All questions reference valid lectures

SELECT 
    q.id,
    q.external_id,
    q.lecture_id,
    'ORPHANED_QUESTION' as issue,
    q.created_at
FROM public.questions q
LEFT JOIN public.lectures l ON q.lecture_id = l.id
WHERE l.id IS NULL
ORDER BY q.external_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- VALIDATION #2: Check for Invalid correct_answer_index
-- ═══════════════════════════════════════════════════════════════════════════
-- SHOULD RETURN: Empty (no rows)
-- MEANS: All correct_answer_index values are within bounds

SELECT 
    q.id,
    q.external_id,
    q.correct_answer_index,
    jsonb_array_length(q.options) as option_count,
    'ANSWER_INDEX_OUT_OF_BOUNDS' as issue,
    CONCAT('Index ', q.correct_answer_index, ' out of range [0, ', 
           (jsonb_array_length(q.options) - 1)::text, ']') as details
FROM public.questions q
WHERE q.correct_answer_index < 0 
   OR q.correct_answer_index >= jsonb_array_length(q.options)
ORDER BY q.external_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- VALIDATION #3: Check for Options Missing 'text' Property
-- ═══════════════════════════════════════════════════════════════════════════
-- SHOULD RETURN: Empty (no rows)
-- MEANS: All options have proper JSONB structure

SELECT DISTINCT
    q.id,
    q.external_id,
    'INVALID_OPTION_STRUCTURE' as issue,
    'One or more options missing "text" property' as details,
    opt as problematic_option
FROM public.questions q,
jsonb_array_elements(q.options) opt
WHERE NOT (
    jsonb_typeof(opt) = 'object' 
    AND opt ? 'text'
)
ORDER BY q.external_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- VALIDATION #4: Check for Questions with Insufficient Options
-- ═══════════════════════════════════════════════════════════════════════════
-- SHOULD RETURN: Empty (no rows)
-- MEANS: All questions have at least 2 options (valid MCQ)

SELECT 
    q.id,
    q.external_id,
    jsonb_array_length(q.options) as option_count,
    'INSUFFICIENT_OPTIONS' as issue,
    'Must have at least 2 options' as details
FROM public.questions q
WHERE jsonb_array_length(q.options) < 2
ORDER BY q.external_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- VALIDATION #5: Check JSONB Type Validity
-- ═══════════════════════════════════════════════════════════════════════════
-- SHOULD RETURN: Empty (no rows)
-- MEANS: All options fields contain valid JSON arrays

SELECT 
    q.id,
    q.external_id,
    jsonb_typeof(q.options) as json_type,
    'INVALID_JSON_TYPE' as issue,
    CONCAT('Options field has type: ', jsonb_typeof(q.options), 
           ', expected: array') as details
FROM public.questions q
WHERE jsonb_typeof(q.options) IS NULL
   OR jsonb_typeof(q.options) != 'array'
ORDER BY q.external_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- VALIDATION #6: Check for Duplicate external_id
-- ═══════════════════════════════════════════════════════════════════════════
-- SHOULD RETURN: Empty (no rows with count > 1)
-- MEANS: All external_ids are unique

SELECT 
    external_id,
    COUNT(*) as occurrence_count,
    'DUPLICATE_EXTERNAL_ID' as issue,
    STRING_AGG(id::text, ', ') as affected_ids
FROM public.questions
GROUP BY external_id
HAVING COUNT(*) > 1
ORDER BY external_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- INFORMATIONAL QUERY #1: Total Count by Status
-- ═══════════════════════════════════════════════════════════════════════════
-- SHOWS: Overall question statistics

SELECT 
    COUNT(*) as total_questions,
    COUNT(DISTINCT lecture_id) as lectures_with_questions,
    COUNT(DISTINCT l.subject_id) as subjects_with_questions,
    COUNT(DISTINCT s.module_id) as modules_with_questions
FROM public.questions q
LEFT JOIN public.lectures l ON q.lecture_id = l.id
LEFT JOIN public.subjects s ON l.subject_id = s.id;

-- ═══════════════════════════════════════════════════════════════════════════
-- INFORMATIONAL QUERY #2: Questions by Difficulty Level
-- ═══════════════════════════════════════════════════════════════════════════
-- SHOWS: Distribution of difficulty levels

SELECT 
    difficulty_level,
    COUNT(*) as question_count,
    CASE 
        WHEN difficulty_level = 1 THEN 'Easy'
        WHEN difficulty_level = 2 THEN 'Medium'
        WHEN difficulty_level = 3 THEN 'Hard'
        ELSE 'Unknown'
    END as difficulty_name,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM public.questions), 2) as percentage
FROM public.questions
GROUP BY difficulty_level
ORDER BY difficulty_level;

-- ═══════════════════════════════════════════════════════════════════════════
-- INFORMATIONAL QUERY #3: Questions per Lecture
-- ═══════════════════════════════════════════════════════════════════════════
-- SHOWS: How many questions in each lecture

SELECT 
    l.id,
    l.external_id,
    l.name,
    COUNT(q.id) as question_count,
    MIN(q.created_at) as first_question_added,
    MAX(q.created_at) as last_question_added
FROM public.lectures l
LEFT JOIN public.questions q ON l.id = q.lecture_id
GROUP BY l.id, l.external_id, l.name
ORDER BY l.external_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- INFORMATIONAL QUERY #4: Option Count Distribution
-- ═══════════════════════════════════════════════════════════════════════════
-- SHOWS: How many questions have 2, 3, 4, 5+ options

SELECT 
    jsonb_array_length(options) as option_count,
    COUNT(*) as question_count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM public.questions), 2) as percentage
FROM public.questions
GROUP BY option_count
ORDER BY option_count;

-- ═══════════════════════════════════════════════════════════════════════════
-- INFORMATIONAL QUERY #5: Questions with/without Explanations
-- ═══════════════════════════════════════════════════════════════════════════
-- SHOWS: How many questions have explanations (recommended for medical)

SELECT 
    CASE 
        WHEN explanation IS NULL OR explanation = '' THEN 'No Explanation'
        ELSE 'Has Explanation'
    END as explanation_status,
    COUNT(*) as question_count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM public.questions), 2) as percentage
FROM public.questions
GROUP BY explanation_status
ORDER BY question_count DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- SAMPLE QUERY: Show 10 Random Questions
-- ═══════════════════════════════════════════════════════════════════════════
-- SHOWS: Examples of seeded questions

SELECT 
    q.id,
    q.external_id,
    q.text,
    jsonb_array_length(q.options) as option_count,
    q.correct_answer_index,
    q.difficulty_level,
    l.external_id as lecture_external_id,
    q.created_at
FROM public.questions q
LEFT JOIN public.lectures l ON q.lecture_id = l.id
ORDER BY RANDOM()
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPREHENSIVE VALIDATION REPORT
-- ═══════════════════════════════════════════════════════════════════════════
-- SHOWS: All validation issues in one report (if any)

WITH validation_results AS (
    -- Orphaned questions
    SELECT 
        q.external_id,
        'ORPHANED' as issue_type,
        'References non-existent lecture' as issue_detail
    FROM public.questions q
    LEFT JOIN public.lectures l ON q.lecture_id = l.id
    WHERE l.id IS NULL
    
    UNION ALL
    
    -- Invalid answer index
    SELECT 
        q.external_id,
        'INVALID_INDEX' as issue_type,
        CONCAT('Answer index ', q.correct_answer_index, 
               ' out of bounds [0, ', (jsonb_array_length(q.options) - 1)::text, ']')
    FROM public.questions q
    WHERE q.correct_answer_index < 0 
       OR q.correct_answer_index >= jsonb_array_length(q.options)
    
    UNION ALL
    
    -- Insufficient options
    SELECT 
        q.external_id,
        'INSUFFICIENT_OPTIONS' as issue_type,
        CONCAT('Only ', jsonb_array_length(q.options)::text, ' options, need ≥2')
    FROM public.questions q
    WHERE jsonb_array_length(q.options) < 2
)
SELECT 
    COUNT(DISTINCT issue_type) as issue_categories,
    COUNT(*) as total_issues,
    STRING_AGG(DISTINCT issue_type, ', ') as issue_types,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL VALIDATION CHECKS PASSED'
        ELSE '❌ VALIDATION FAILURES DETECTED'
    END as validation_status
FROM validation_results

UNION ALL

SELECT 
    0 as issue_categories,
    0 as total_issues,
    '' as issue_types,
    '✅ ALL VALIDATION CHECKS PASSED' as validation_status
WHERE NOT EXISTS (
    SELECT 1 FROM public.questions q
    LEFT JOIN public.lectures l ON q.lecture_id = l.id
    WHERE l.id IS NULL
)
AND NOT EXISTS (
    SELECT 1 FROM public.questions
    WHERE correct_answer_index < 0 
       OR correct_answer_index >= jsonb_array_length(options)
)
AND NOT EXISTS (
    SELECT 1 FROM public.questions
    WHERE jsonb_array_length(options) < 2
);

-- ═══════════════════════════════════════════════════════════════════════════
-- EXECUTION GUIDE
-- ═══════════════════════════════════════════════════════════════════════════

/*
HOW TO USE THESE VALIDATION QUERIES:
─────────────────────────────────────

1. Open Supabase SQL Editor (https://app.supabase.com → SQL Editor)

2. Copy-paste each VALIDATION query (1-6) and run individually:
   - All should return EMPTY results (no rows)
   - If you see results, those are issues to fix

3. Run INFORMATIONAL queries (1-5) to review distribution:
   - Shows statistics about seeded questions
   - Helps identify patterns or gaps

4. Run SAMPLE query to spot-check actual questions

5. Run COMPREHENSIVE VALIDATION REPORT for summary:
   - Shows ✅ or ❌ status
   - Lists all issues in one report

EXPECTED RESULTS:
─────────────────

✅ Validation #1: Empty (no orphaned questions)
✅ Validation #2: Empty (no invalid indexes)
✅ Validation #3: Empty (no missing text properties)
✅ Validation #4: Empty (all have ≥2 options)
✅ Validation #5: Empty (all JSON is valid)
✅ Validation #6: Empty (all external_ids unique)

📊 Informational: Shows statistics
✅ Comprehensive: "ALL VALIDATION CHECKS PASSED"

IF YOU SEE ISSUES:
──────────────────

1. Note the question external_id
2. Review the issue_detail
3. Check SEEDING_COMPLETE_REFERENCE.js for solution
4. Rollback if needed: DELETE FROM questions WHERE ...
5. Reseed after fixing data

PERFORMANCE NOTE:
─────────────────

These queries scan the entire questions table.
- Small datasets (< 10K rows): < 100ms
- Large datasets (100K+ rows): 500ms - 2s
- No blocking, safe to run anytime
*/

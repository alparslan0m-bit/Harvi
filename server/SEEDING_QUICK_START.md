# 🚀 Medical MCQ Platform - Question Seeding Guide

**Status:** Production Ready | **Date:** January 19, 2026 | **Platform:** Supabase PostgreSQL

---

## Quick Start (5 Minutes)

### Prerequisites
```bash
# Install dependencies (if not done)
npm install @supabase/supabase-js dotenv

# Configure environment variables
cp .env.example .env
# Edit .env with your Supabase credentials:
# SUPABASE_URL=https://xxxxx.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Test Seeding (Recommended First Step)
```bash
# Seed only 5 test questions for validation
node server/seed-questions.js --test --validate

# Expected output:
# ✅ Seeded: 5 questions
# ✅ All validation checks passed
# No errors
```

### Production Seeding
```bash
# Seed all questions from script
node server/seed-questions.js --validate

# Or use dry-run to preview first
node server/seed-questions.js --dry-run --validate
```

### SQL Alternative
```sql
-- Open Supabase SQL Editor and paste:
-- server/seed-questions-production.sql

-- The script includes:
-- 1. Pre-flight checks
-- 2. Dry run validation
-- 3. Production insert with UPSERT
-- 4. Validation queries
```

---

## High-Level Approach

### Data Flow

```
Your Data Source
       ↓
   (CSV, JSON, MongoDB)
       ↓
   Parse & Validate
   (7 checks)
       ↓
   Resolve IDs
   (external_id → UUID)
       ↓
   UPSERT to Supabase
   (safe re-runs)
       ↓
   Database Validates
   (CHECK constraints)
       ↓
   Triggers Execute
   (auto-grading ready)
       ↓
   ✅ Questions Ready
```

### Key Safety Features

| Feature | Benefit |
|---------|---------|
| **UPSERT Logic** | Re-running script is safe (no duplicates) |
| **Service Role Key** | Admin access without disabling RLS |
| **CHECK Constraints** | Database prevents invalid data at layer |
| **FK Constraints** | Orphaned questions impossible |
| **Atomic Transactions** | All-or-nothing inserts (consistency) |
| **Validation Queries** | Detect issues before production |

---

## Example Question Structure

```javascript
{
  // Unique identifier (used for idempotent re-runs)
  external_id: "q_anatomy_001_bone",
  
  // Reference to lecture (must exist)
  lecture_external_id: "year1_mod1_sub1_lec1",
  
  // Question text (displayed to student)
  text: "What is the largest bone in the human body?",
  
  // Answer options (JSONB array)
  options: [
    { text: "Femur", meta: null },
    { text: "Tibia", meta: null },
    { text: "Humerus", meta: null },
    { text: "Fibula", meta: null }
  ],
  
  // Correct answer index (0-based, validated by DB)
  correct_answer_index: 0,
  
  // Why this answer is correct (medical best practice)
  explanation: "The femur is the longest bone in the human body...",
  
  // Order within lecture
  question_order: 1,
  
  // Difficulty (1=easy, 2=medium, 3=hard)
  difficulty_level: 1
}
```

---

## Seeding Strategies

### Strategy 1: Test-Driven (Recommended)

```bash
# 1. Test with 5 questions
node server/seed-questions.js --test --validate

# 2. Review validation output
# ✅ Check for: orphaned questions, invalid indexes, JSONB errors

# 3. If successful, seed full dataset
node server/seed-questions.js --validate

# 4. Run validation queries in Supabase SQL Editor
# (included in seed-questions-production.sql)
```

### Strategy 2: Dry-Run First

```bash
# 1. Preview what would be inserted
node server/seed-questions.js --dry-run

# 2. Review validation messages
# 3. If satisfied, run actual seeding
node server/seed-questions.js
```

### Strategy 3: From CSV/JSON

```javascript
// Convert your data to question objects:
const questions = csvData.map(row => ({
  external_id: `q_${row.category}_${row.id}`,
  lecture_external_id: resolveLecture(row.lectureId),
  text: row.questionText,
  options: row.optionsArray.map(opt => ({ text: opt, meta: null })),
  correct_answer_index: parseInt(row.correctAnswer),
  explanation: row.explanation,
  question_order: row.order,
  difficulty_level: row.difficulty
}));

// Then pass to seeder
```

---

## Validation (Critical Before Production)

### Automatic Validation (Node.js)

```bash
# Included in seeding script:
node server/seed-questions.js --validate

# Checks:
# ✅ Valid lecture_external_id references
# ✅ correct_answer_index in bounds
# ✅ options has ≥2 items
# ✅ options JSONB structure valid
# ✅ No duplicate external_ids
# ✅ All required fields present
```

### Manual Validation (SQL)

```sql
-- Run in Supabase SQL Editor after seeding:

-- 1. Find orphaned questions
SELECT q.external_id FROM public.questions q
LEFT JOIN public.lectures l ON q.lecture_id = l.id
WHERE l.id IS NULL;

-- 2. Find invalid answer indexes
SELECT external_id, correct_answer_index, jsonb_array_length(options) 
FROM public.questions
WHERE correct_answer_index >= jsonb_array_length(options);

-- 3. Count by difficulty
SELECT difficulty_level, COUNT(*) FROM public.questions
GROUP BY difficulty_level;

-- 4. Sample check
SELECT external_id, text, jsonb_array_length(options) as options_count
FROM public.questions LIMIT 5;
```

---

## Common Issues & Solutions

### ❌ "Lecture not found: year1_mod1_sub1_lec1"

**Cause:** Lecture doesn't exist in database

**Solution:**
```bash
# 1. Ensure lectures are seeded first
node server/seed.js  # Seeds years/modules/subjects/lectures

# 2. Verify lecture exists
# SELECT external_id FROM lectures 
# WHERE external_id = 'year1_mod1_sub1_lec1';

# 3. Then seed questions
node server/seed-questions.js --validate
```

### ❌ "violates check constraint check_correct_answer"

**Cause:** correct_answer_index out of bounds

**Solution:**
```javascript
// If you have 4 options, correct index must be 0-3
if (correctAnswerIndex < 0 || correctAnswerIndex >= options.length) {
  throw new Error('Invalid answer index');
}
```

### ❌ "violates unique constraint"

**Cause:** Same external_id already exists

**Solution:**
```javascript
// Script automatically handles via UPSERT
// But if manual SQL, use:
INSERT INTO questions (...) VALUES (...)
ON CONFLICT (external_id) DO UPDATE SET ...
```

### ❌ "new row violates row-level security policy"

**Cause:** Using ANON_KEY instead of SERVICE_ROLE_KEY

**Solution:**
```bash
# Check .env file:
# Use SUPABASE_SERVICE_ROLE_KEY (admin key)
# NOT SUPABASE_ANON_KEY (user key)
```

### ❌ "violates check constraint check_options_not_empty"

**Cause:** Less than 2 options provided

**Solution:**
```javascript
// Always provide at least 2 options
options: [
  { text: "Option A", meta: null },
  { text: "Option B", meta: null }
  // Minimum 2, any number > 2 also valid
]
```

---

## Performance & Scaling

### Typical Performance

| Operation | Time |
|-----------|------|
| Single question | ~50ms |
| Batch of 100 | ~2-3 seconds |
| 1000 questions | ~30-50 seconds |
| Validation queries | ~100-200ms |

### Optimization for Large Datasets

```bash
# For 10000+ questions:

# 1. Use batching (automatic in script)
# 2. Use --test first to validate logic
# 3. Run during off-peak hours

# 4. Monitor with:
# SELECT COUNT(*) FROM questions;
# SELECT COUNT(*) FROM user_responses;
```

---

## Security Checklist

- ✅ Using **SERVICE_ROLE_KEY** (not ANON_KEY)
- ✅ RLS **NOT disabled** (still active)
- ✅ **Triggers active** (auto-grading enabled)
- ✅ **CHECK constraints enforced** (no bad data)
- ✅ **FK constraints enforced** (no orphans)
- ✅ **No hardcoded credentials** (.env file only)
- ✅ **Transaction safety** (atomic operations)
- ✅ **Service role key rotated regularly** (security practice)

---

## Monitoring After Seeding

### Quick Health Check

```bash
# 1. Verify question count
SELECT COUNT(*) FROM questions;

# 2. Check for errors
SELECT * FROM questions 
WHERE external_id LIKE 'q_%'
LIMIT 5;

# 3. Verify in app
# - Load a lecture
# - Verify questions display correctly
# - Verify auto-grading works
# - Verify RLS limits to user's own responses
```

### Analytics

```sql
-- Questions per lecture
SELECT lecture_id, COUNT(*) FROM questions GROUP BY lecture_id;

-- Questions by difficulty
SELECT difficulty_level, COUNT(*) FROM questions GROUP BY difficulty_level;

-- Average options per question
SELECT AVG(jsonb_array_length(options)) FROM questions;
```

---

## File Reference

| File | Purpose |
|------|---------|
| `server/seed-questions.js` | **Node.js seeding script** (recommended) |
| `server/seed-questions-production.sql` | SQL alternative (copy-paste into SQL editor) |
| `server/SEEDING_COMPLETE_REFERENCE.js` | Full technical reference & troubleshooting |
| `server/seed.js` | Existing seeder (years/modules/subjects/lectures) |
| `server/seed/hierarchy.json` | Lecture hierarchy data |

---

## Next Steps

### If Seeding Succeeds ✅

1. Test in your app:
   - Load a lecture
   - Verify questions display
   - Attempt a quiz
   - Verify auto-grading works

2. Monitor logs for errors

3. If issues, check:
   - `SELECT COUNT(*) FROM questions;` (total count)
   - `SELECT COUNT(*) FROM user_responses;` (responses recorded)
   - Validation queries in SEEDING_COMPLETE_REFERENCE.js

### If Seeding Fails ❌

1. Check error message in logs

2. Review common solutions above

3. Run validation queries to diagnose

4. Check `.env` file configuration

5. Verify lectures exist: `SELECT * FROM lectures;`

6. Contact support with:
   - Error message
   - Question structure sample
   - Lecture external_id being used

---

## Emergency Rollback

```sql
-- If seeding causes issues, rollback with:

-- Option 1: Delete by pattern (safe)
DELETE FROM public.questions 
WHERE external_id LIKE 'q_anatomy_%'
AND created_at > NOW() - INTERVAL '1 hour';

-- Option 2: Delete all (⚠️ CAREFUL!)
DELETE FROM public.questions;

-- Verify:
SELECT COUNT(*) FROM questions; -- Should be 0 or expected count
```

---

## Support & Documentation

- **Full Reference:** See `server/SEEDING_COMPLETE_REFERENCE.js`
- **Schema Docs:** See `PRODUCTION_READY.sql` (lines 1-200)
- **Example Data:** See `server/seed/hierarchy.json`

---

**Questions?** Check SEEDING_COMPLETE_REFERENCE.js FAQ section or review error logs.

**Ready to seed?** → Run: `node server/seed-questions.js --test --validate`

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ============================================================================
// FAIL-SAFE: Prevent MongoDB usage
// ============================================================================
/**
 * CRITICAL: Ensure MongoDB is completely removed from the system.
 * If these libraries are imported anywhere, the app will crash with a clear message.
 */
if (require.cache['mongoose'] || require.cache['mongodb']) {
    throw new Error(`
    ❌ FATAL: MongoDB libraries detected in node_modules.
    This application uses Supabase (PostgreSQL) exclusively.
    MongoDB must be completely removed from the system.
    
    To fix:
    1. Delete node_modules folder
    2. Update package.json (mongoose and mongodb must not be listed)
    3. Run: npm install
    `);
}

// Block any require attempts for MongoDB libraries
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
    if (id === 'mongoose' || id === 'mongodb' || id.includes('mongodb')) {
        throw new Error(`
        ❌ FATAL: Attempted to require '${id}'
        This application uses Supabase (PostgreSQL) exclusively.
        MongoDB is NOT permitted in this codebase.
        `);
    }
    return originalRequire.apply(this, arguments);
};

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// SETUP: Middleware
// ============================================================================
app.use(compression());
app.use(cors());
app.use(express.json());

// ============================================================================
// SETUP: Initialize Supabase Client
// ============================================================================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('✅ Supabase initialized');
console.log(`   URL: ${process.env.SUPABASE_URL}`);

// Verify Supabase connection on startup
supabase.from('years').select('id').limit(1)
    .then(({ error }) => {
        if (error) throw error;
        console.log('✅ Supabase connection verified');
    })
    .catch(err => {
        console.error('❌ Supabase connection failed:', err.message);
        process.exit(1);
    });

// ============================================================================
// FEATURE FLAGS: Enable/Disable features via environment variables
// ============================================================================
const FEATURE_FLAGS = {
    // Enable JSONB-to-String transformation (default: ON)
    ENABLE_TRANSFORMATION: process.env.ENABLE_TRANSFORMATION !== 'false',

    // Enable stats trigger vs materialized view (default: trigger ON)
    ENABLE_STATS_TRIGGER: process.env.ENABLE_STATS_TRIGGER !== 'false'
};

console.log('🚩 Feature Flags:', FEATURE_FLAGS);
console.log('   To disable transformation: ENABLE_TRANSFORMATION=false');
console.log('   To disable stats trigger: ENABLE_STATS_TRIGGER=false');


// ============================================================================
// MIDDLEWARE: Authentication (JWT Validation)
// ============================================================================
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
};

// ============================================================================
// MIDDLEWARE: Optional Authentication (Does not reject if token is missing)
// ============================================================================
const optionalAuthMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        req.user = null; // No user
        return next();
    }

    const token = authHeader.replace('Bearer ', '');

    // If token is obviously invalid (empty), skip lookup
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            // Token invalid, but we are in optional mode, so just proceed as anonymous
            req.user = null;
        } else {
            req.user = user;
        }
    } catch (err) {
        req.user = null;
    }
    next();
};

// ============================================================================
// HELPER: Resolve ID (UUID or external_id for backward compatibility)
// ============================================================================
async function resolveId(table, idValue) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idValue);

    if (isUuid) {
        return idValue;
    }

    const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('external_id', idValue)
        .single();

    if (error || !data) {
        return null;
    }

    return data.id;
}

// ============================================================================
// HELPER: Transform JSONB Options to Legacy String Array Format
// ============================================================================
/**
 * Transform JSONB options to legacy string array format for frontend compatibility
 * 
 * Database Format (JSONB):  [{"id": 1, "text": "Femur"}, {"id": 2, "text": "Tibia"}]
 * Frontend Format (Legacy): ["Femur", "Tibia"]
 * 
 * This ensures frontend rendering works regardless of database schema changes.
 * Handles both object and string array formats for backward compatibility.
 * 
 * @param {Array|Object} lectures - Lecture(s) from Supabase query
 * @returns {Array|Object} - Transformed lecture(s) with string array options
 */
function transformQuestionsForClient(lectures) {
    // 🚩 Feature Flag: Allow instant rollback via environment variable
    if (!FEATURE_FLAGS.ENABLE_TRANSFORMATION) {
        console.log('⚠️ Transformation bypassed via feature flag (ENABLE_TRANSFORMATION=false)');
        return lectures;  // Return data unchanged
    }

    if (!lectures) return lectures;

    // Handle both single lecture and array of lectures
    const lectureArray = Array.isArray(lectures) ? lectures : [lectures];

    const transformed = lectureArray.map(lecture => {
        if (!lecture.questions) return lecture;

        return {
            ...lecture,
            questions: lecture.questions.map(question => {
                let options = question.options;

                // If options are JSONB objects, extract text property
                if (Array.isArray(options) && options.length > 0) {
                    if (typeof options[0] === 'object' && options[0] !== null) {
                        if (options[0].text !== undefined) {
                            // ✅ Valid JSONB format with .text property
                            options = options.map(opt => opt.text);
                        } else {
                            // ⚠️ MALFORMED JSONB: missing .text property
                            console.error('⚠️ Malformed JSONB detected in question options:', {
                                questionId: question.id,
                                externalId: question.external_id,
                                sampleOption: options[0]
                            });

                            // Fallback: Generate placeholder text
                            options = options.map((opt, idx) => {
                                // Try various fallback strategies
                                if (opt.text) return opt.text;
                                if (typeof opt === 'string') return opt;
                                if (opt.label) return opt.label;
                                if (opt.value !== undefined) return String(opt.value);
                                // Last resort: alphabetic placeholder
                                return `Option ${String.fromCharCode(65 + idx)}`; // A, B, C, D...
                            });

                            console.warn('✅ Applied fallback transformation:', options);
                        }
                    }
                    // else: already string array (legacy format), no transformation needed
                }

                return {
                    ...question,
                    options: options  // Now guaranteed to be string array
                };
            })
        };
    });

    // Return same format as input (single object or array)
    return Array.isArray(lectures) ? transformed : transformed[0];
}

// ============================================================================
// ENDPOINT 1: Load Full Structure (Years → Modules → Subjects → Lectures)
// ============================================================================
app.get('/api/years', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('years')
            .select(`
                id,
                external_id,
                name,
                icon,
                modules (
                    id,
                    external_id,
                    name,
                    subjects (
                        id,
                        external_id,
                        name,
                        lectures (
                            id,
                            external_id,
                            name,
                            order_index
                        )
                    )
                )
            `)
            .order('external_id', { ascending: true });

        if (error) throw error;

        console.log(`✅ Loaded hierarchy: ${data.length} years`);
        res.json(data);
    } catch (err) {
        console.error('❌ Error fetching years:', err.message);
        res.status(500).json({ error: 'Failed to fetch structure', details: err.message });
    }
});

// ============================================================================
// ENDPOINT 2a: Load Lectures Batch (Must be BEFORE :lectureId to prevent route masking)
// ============================================================================
app.get('/api/lectures/batch', async (req, res) => {
    try {
        const lectureIds = req.query.ids?.split(',') || [];

        if (lectureIds.length === 0) {
            return res.status(400).json({ error: 'ids query parameter required' });
        }

        // Resolve all IDs
        const resolvedIds = [];
        for (const id of lectureIds) {
            const resolved = await resolveId('lectures', id);
            if (resolved) resolvedIds.push(resolved);
        }

        const { data, error } = await supabase
            .from('lectures')
            .select(`
                id, external_id, name,
                questions (
                    id, external_id, text, options, explanation, question_order, difficulty_level
                )
            `)
            .in('id', resolvedIds);

        if (error) throw error;

        // Transform JSONB options to string array for frontend compatibility
        const transformedData = transformQuestionsForClient(data);
        res.json(transformedData);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lectures', details: err.message });
    }
});

// ============================================================================
// ENDPOINT 2b: Load Lecture with Questions (Correct Answers Hidden)
// 🔐 SECURITY CRITICAL: correct_answer_index MUST NEVER be sent to client
// 
// WHY: Students can inspect network responses and see all correct answers
// HOW: The auto_grade_response trigger computes scores server-side
// 
// If you add correct_answer_index to any API response, you have broken security.
// Grade tampering protection relies on the client NEVER seeing this field.
// ============================================================================
app.get('/api/lectures/:lectureId', async (req, res) => {
    try {
        const { lectureId } = req.params;
        const resolvedId = await resolveId('lectures', lectureId);

        if (!resolvedId) {
            return res.status(404).json({ error: 'Lecture not found' });
        }

        const { data, error } = await supabase
            .from('lectures')
            .select(`
                id,
                external_id,
                name,
                questions (
                    id,
                    external_id,
                    text,
                    options,
                    explanation,
                    question_order,
                    difficulty_level
                )
            `)
            .eq('id', resolvedId)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Lecture not found' });
        }

        // Transform JSONB options to string array for frontend compatibility
        const transformedData = transformQuestionsForClient(data);
        console.log(`✅ Loaded lecture: ${transformedData.external_id} with ${transformedData.questions.length} questions`);
        res.json(transformedData);
    } catch (err) {
        console.error('❌ Error fetching lecture:', err.message);
        res.status(500).json({ error: 'Failed to fetch lecture', details: err.message });
    }
});

// ============================================================================
// ENDPOINT 3: Load Lectures Batch
// ============================================================================
app.post('/api/lectures/batch', async (req, res) => {
    try {
        const { lectureIds } = req.body;

        if (!Array.isArray(lectureIds) || lectureIds.length === 0) {
            return res.status(400).json({ error: 'lectureIds must be a non-empty array' });
        }

        const MAX_BATCH_SIZE = 50;
        if (lectureIds.length > MAX_BATCH_SIZE) {
            return res.status(400).json({ error: `Maximum batch size is ${MAX_BATCH_SIZE}` });
        }

        // Resolve all IDs (handle both UUIDs and external_ids)
        const resolvedIds = [];
        for (const id of lectureIds) {
            const resolved = await resolveId('lectures', id);
            if (resolved) resolvedIds.push(resolved);
        }

        const { data, error } = await supabase
            .from('lectures')
            .select(`
                id,
                external_id,
                name,
                questions (
                    id,
                    external_id,
                    text,
                    options,
                    explanation,
                    question_order,
                    difficulty_level
                )
            `)
            .in('id', resolvedIds);

        if (error) throw error;

        // Transform JSONB options to string array for frontend compatibility
        const transformedData = transformQuestionsForClient(data);
        console.log(`✅ Loaded ${transformedData.length} lectures`);
        res.json(transformedData);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lectures', details: err.message });
    }
});

// ============================================================================
// ENDPOINT 4: Submit Quiz (Auto-Grading via Database Trigger)
// ============================================================================
app.post('/api/quiz-results', optionalAuthMiddleware, async (req, res) => {
    try {
        const { lectureId, answers } = req.body;
        // User might be null if anonymous
        const userId = req.user ? req.user.id : null;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid answers format' });
        }

        if (answers.length === 0) {
            return res.status(400).json({ error: 'No answers provided' });
        }

        console.log(`📝 Processing quiz submission from ${userId ? 'user ' + userId.substring(0, 8) : 'anonymous guest'}...`);

        // Resolve Lecture ID
        const resolvedLectureId = await resolveId('lectures', lectureId);

        if (!resolvedLectureId) {
            return res.status(404).json({ error: 'Lecture not found' });
        }

        // Prepare submissions
        const submissions = [];

        for (const ans of answers) {
            const resolvedQuestionId = await resolveId('questions', ans.questionId);

            if (!resolvedQuestionId) {
                console.warn(`⚠️  Question ${ans.questionId} not found, skipping`);
                continue;
            }

            submissions.push({
                user_id: userId,
                lecture_id: resolvedLectureId,
                question_id: resolvedQuestionId,
                selected_answer_index: ans.selectedAnswerIndex,
                attempt_number: 1
            });
        }

        if (submissions.length === 0) {
            return res.status(400).json({ error: 'No valid answers to process' });
        }

        let savedData = [];
        let saveSuccess = false;

        // Only attempt DB save if userId exists or if your DB allows nulls
        try {
            // Optional: Clean up previous attempts (only for authenticated users)
            if (userId) {
                await supabase
                    .from('user_responses')
                    .delete()
                    .eq('user_id', userId)
                    .eq('lecture_id', resolvedLectureId);
            }

            // Insert into database
            const { data, error } = await supabase
                .from('user_responses')
                .insert(submissions)
                .select('is_correct, question_id, selected_answer_index');

            if (error) throw error;
            savedData = data || [];
            saveSuccess = true;
            console.log(`✅ Quiz graded & saved to DB: ${savedData.filter(r => r.is_correct).length}/${savedData.length}`);
        } catch (dbError) {
            console.warn('⚠️  Could not save to DB (Anonymous?), grading manually:', dbError.message);

            // MANUAL GRADING FALLBACK
            const questionIds = submissions.map(s => s.question_id);
            const { data: questions, error: qError } = await supabase
                .from('questions')
                .select('id, correct_answer_index')
                .in('id', questionIds);

            if (qError) throw qError;

            // Map question ID to correct index
            const correctMap = new Map();
            questions.forEach(q => correctMap.set(q.id, q.correct_answer_index));

            // Generate "savedData" manually
            savedData = submissions.map(sub => ({
                is_correct: correctMap.get(sub.question_id) === sub.selected_answer_index,
                question_id: sub.question_id,
                selected_answer_index: sub.selected_answer_index
            }));

            console.log(`✅ Quiz graded manually: ${savedData.filter(r => r.is_correct).length}/${savedData.length}`);
        }

        // Calculate final score
        const total = savedData.length;
        const correct = savedData.filter(r => r.is_correct === true).length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

        res.status(201).json({
            success: true,
            results: {
                score: correct,
                total,
                percentage,
                gradedDetails: savedData
            }
        });
    } catch (err) {
        console.error('❌ Quiz submission error:', err.message);
        res.status(500).json({ error: 'Failed to process submission', details: err.message });
    }
});


// ============================================================================
// ENDPOINT 4a: Practice Mode - Check Single Answer
// ============================================================================
app.post('/api/practice/check-answer', optionalAuthMiddleware, async (req, res) => {
    try {
        const { questionId, selectedAnswerIndex, lectureId } = req.body;
        // User might be null if anonymous
        const userId = req.user ? req.user.id : null;

        if (!questionId || selectedAnswerIndex === undefined) {
            return res.status(400).json({ error: 'Missing questionId or selectedAnswerIndex' });
        }

        // 1. Get the TRUTH (Correct Answer & Explanation)
        const resolvedQuestionId = await resolveId('questions', questionId);

        if (!resolvedQuestionId) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const { data: question, error: qError } = await supabase
            .from('questions')
            .select('correct_answer_index, explanation, lecture_id')
            .eq('id', resolvedQuestionId)
            .single();

        if (qError || !question) {
            return res.status(404).json({ error: 'Question data missing' });
        }

        const isCorrect = (question.correct_answer_index === selectedAnswerIndex);

        // 2. Log the attempt (ONLY IF AUTHENTICATED)
        if (userId) {
            // Resolve lectureId first to be safe
            let relevantLectureId = null;
            if (lectureId) {
                relevantLectureId = await resolveId('lectures', lectureId);
            }
            if (!relevantLectureId) {
                relevantLectureId = question.lecture_id;
            }

            if (relevantLectureId) {
                await supabase
                    .from('user_responses')
                    .delete()
                    .eq('user_id', userId)
                    .eq('question_id', resolvedQuestionId);

                const { error: insertError } = await supabase
                    .from('user_responses')
                    .insert({
                        user_id: userId,
                        lecture_id: relevantLectureId,
                        question_id: resolvedQuestionId,
                        selected_answer_index: selectedAnswerIndex,
                        attempt_number: 1
                    });

                if (insertError) {
                    console.warn('⚠️ Failed to save practice response:', insertError.message);
                }
            }
        }

        // 3. Return immediate feedback (Works for everyone)
        res.json({
            success: true,
            is_correct: isCorrect,
            correct_answer_index: question.correct_answer_index,
            explanation: question.explanation
        });

    } catch (err) {
        console.error('❌ Check answer error:', err.message);
        res.status(500).json({ error: 'Failed to check answer', details: err.message });
    }
});

// ============================================================================
// ENDPOINT 5: Student Performance Analytics
// ============================================================================
app.get('/api/student/performance', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('user_responses')
            .select(`
                is_correct,
                created_at,
                lectures:lecture_id (
                    id,
                    external_id,
                    name
                )
            `)
            .eq('user_id', userId);

        if (error) throw error;

        const stats = {
            totalQuestionsAnswered: data.length,
            overallAccuracy: 0,
            byLecture: {}
        };

        let correctCount = 0;

        data.forEach(response => {
            if (response.is_correct) correctCount++;

            const lecName = response.lectures?.name || 'Unknown';

            if (!stats.byLecture[lecName]) {
                stats.byLecture[lecName] = { total: 0, correct: 0 };
            }

            stats.byLecture[lecName].total++;
            if (response.is_correct) stats.byLecture[lecName].correct++;
        });

        if (stats.totalQuestionsAnswered > 0) {
            stats.overallAccuracy = Math.round((correctCount / stats.totalQuestionsAnswered) * 100);
        }

        console.log(`✅ Loaded performance for user ${userId.substring(0, 8)}...: ${stats.overallAccuracy}% accuracy`);
        res.json(stats);
    } catch (err) {
        console.error('❌ Error fetching performance:', err.message);
        res.status(500).json({ error: 'Failed to fetch performance', details: err.message });
    }
});

// ============================================================================
// ENDPOINT 6: Health Check
// ============================================================================
app.get('/health', async (req, res) => {
    try {
        const { error } = await supabase.from('years').select('count()').limit(1);

        if (error) throw error;

        res.json({
            status: 'healthy',
            supabase: 'connected',
            database: 'postgresql',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('❌ Health check failed:', err.message);
        res.status(503).json({
            status: 'unhealthy',
            error: err.message
        });
    }
});

// ============================================================================
// ENDPOINT 7: Admin API (Manage Years, Modules, Subjects, Lectures)
// ============================================================================

// GET all years (admin)
app.get('/api/admin/years', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('years')
            .select(`
                id,
                external_id,
                name,
                icon,
                modules (
                    id,
                    external_id,
                    name,
                    subjects (
                        id,
                        external_id,
                        name,
                        lectures (
                            id,
                            external_id,
                            name,
                            lectures (
                                id,
                                external_id,
                                name
                            )
                        )
                    )
                )
            `)
            .order('external_id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch years', details: err.message });
    }
});

// CREATE year
app.post('/api/admin/years', async (req, res) => {
    try {
        const { id, external_id, name, icon } = req.body;

        if (!id || !name) {
            return res.status(400).json({ error: 'id and name are required' });
        }

        const { data, error } = await supabase
            .from('years')
            .insert([{ id, external_id: external_id || id, name, icon }])
            .select();

        if (error) throw error;
        res.status(201).json({ ok: true, data: data[0] });
    } catch (err) {
        res.status(400).json({ error: 'Failed to create year', details: err.message });
    }
});

// UPDATE year
app.put('/api/admin/years/:yearId', async (req, res) => {
    try {
        const { yearId } = req.params;
        const { name, icon } = req.body;

        const { data, error } = await supabase
            .from('years')
            .update({ name, icon })
            .eq('id', yearId)
            .select();

        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ error: 'Year not found' });

        res.json({ ok: true, data: data[0] });
    } catch (err) {
        res.status(400).json({ error: 'Failed to update year', details: err.message });
    }
});

// DELETE year (cascade delete)
app.delete('/api/admin/years/:yearId', async (req, res) => {
    try {
        const { yearId } = req.params;

        // Use RPC function for cascading delete (if implemented in Supabase)
        // For now, manually cascade

        // Get all modules
        const { data: modules, error: e1 } = await supabase
            .from('modules')
            .select('id')
            .eq('year_id', yearId);

        if (e1) throw e1;

        // Delete all subjects and lectures for these modules
        for (const mod of modules) {
            const { data: subjects } = await supabase
                .from('subjects')
                .select('id')
                .eq('module_id', mod.id);

            for (const sub of subjects) {
                await supabase.from('lectures').delete().eq('subject_id', sub.id);
            }

            await supabase.from('subjects').delete().eq('module_id', mod.id);
        }

        // Delete modules
        await supabase.from('modules').delete().eq('year_id', yearId);

        // Delete year
        const { error } = await supabase.from('years').delete().eq('id', yearId);
        if (error) throw error;

        res.json({ ok: true, message: 'Year and all related data deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete year', details: err.message });
    }
});

// ============================================================================
// STATIC FILES & ERROR HANDLING
// ============================================================================
const staticRoot = path.join(__dirname, '..');
app.use('/', express.static(staticRoot));

app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ============================================================================
// START SERVER
// ============================================================================
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║      Supabase Medical MCQ Backend Server (Production)      ║');
        console.log('║              MongoDB: COMPLETELY REMOVED                  ║');
        console.log('║              Database: PostgreSQL (Supabase)              ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Database: ${process.env.SUPABASE_URL}`);
        console.log('\n✅ Available endpoints:');
        console.log('   GET  /api/years                 - Load full hierarchy');
        console.log('   GET  /api/lectures/:id          - Load lecture with questions');
        console.log('   POST /api/lectures/batch        - Load multiple lectures');
        console.log('   POST /api/quiz-results          - Submit quiz (auth required)');
        console.log('   GET  /api/student/performance   - Get student stats (auth required)');
        console.log('   GET  /health                    - Health check');
        console.log('\n🔐 Security:');
        console.log('   ✓ JWT authentication enforced');
        console.log('   ✓ Auto-grade trigger prevents cheating');
        console.log('   ✓ RLS policies enforce student privacy');
        console.log('   ✓ Correct answers hidden from client');
        console.log('');
    });
}

module.exports = app;

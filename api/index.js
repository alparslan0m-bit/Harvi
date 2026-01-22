const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ============================================================================
// FAIL-SAFE: Prevent MongoDB usage
// ============================================================================
if (require.cache['mongoose'] || require.cache['mongodb']) {
    throw new Error(`
    ❌ FATAL: MongoDB libraries detected in node_modules.
    This application uses Supabase (PostgreSQL) exclusively.
    MongoDB must be completely removed from the system.
    `);
}

// Block any require attempts for MongoDB libraries
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
    if (id === 'mongoose' || id === 'mongodb' || id.includes('mongodb')) {
        throw new Error(`❌ FATAL: Attempted to require '${id}'. MongoDB is NOT permitted in this codebase.`);
    }
    return originalRequire.apply(this, arguments);
};

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================================
// SETUP: Initialize Supabase Client
// ============================================================================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
// HELPER: Resolve ID (UUID or external_id)
// ============================================================================
async function resolveId(table, idValue) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idValue);

    if (isUuid) return idValue;

    const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('external_id', idValue)
        .single();

    if (error || !data) return null;
    return data.id;
}

// ============================================================================
// FEATURE FLAGS: Enable/Disable features via environment variables
// ============================================================================
const FEATURE_FLAGS = {
    ENABLE_TRANSFORMATION: process.env.ENABLE_TRANSFORMATION !== 'false'
};
console.log('🚩 API Feature Flags:', FEATURE_FLAGS);


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
        return lectures;
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
                                if (opt.text) return opt.text;
                                if (typeof opt === 'string') return opt;
                                if (opt.label) return opt.label;
                                if (opt.value !== undefined) return String(opt.value);
                                return `Option ${String.fromCharCode(65 + idx)}`;
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

// GET /api/years
app.get('/api/years', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('years')
            .select(`
                id, external_id, name, icon,
                modules (
                    id, external_id, name,
                    subjects (
                        id, external_id, name,
                        lectures (id, external_id, name, order_index)
                    )
                )
            `)
            .order('external_id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch structure', details: err.message });
    }
});

// POST /api/lectures/batch
// 🔐 SECURITY: correct_answer_index is EXCLUDED to prevent cheating
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

        const resolvedIds = [];
        for (const id of lectureIds) {
            const resolved = await resolveId('lectures', id);
            if (resolved) resolvedIds.push(resolved);
        }

        const { data, error } = await supabase
            .from('lectures')
            .select(`
                id, external_id, name, order_index,
                questions (id, external_id, text, options, explanation, question_order, difficulty_level)
            `)
            .in('id', resolvedIds);

        if (error) throw error;
        const transformedData = transformQuestionsForClient(data);
        res.json(transformedData);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lectures', details: err.message });
    }
});

// GET /api/lectures/batch
app.get('/api/lectures/batch', async (req, res) => {
    try {
        const lectureIds = req.query.ids?.split(',') || [];
        if (lectureIds.length === 0) {
            return res.status(400).json({ error: 'ids query parameter required' });
        }

        const MAX_BATCH_SIZE = 50;
        if (lectureIds.length > MAX_BATCH_SIZE) {
            return res.status(400).json({ error: `Maximum batch size is ${MAX_BATCH_SIZE}` });
        }

        const resolvedIds = [];
        for (const id of lectureIds) {
            const resolved = await resolveId('lectures', id);
            if (resolved) resolvedIds.push(resolved);
        }

        const { data, error } = await supabase
            .from('lectures')
            .select(`
                id, external_id, name, order_index,
                questions (id, external_id, text, options, explanation, question_order, difficulty_level)
            `)
            .in('id', resolvedIds);

        if (error) throw error;
        const transformedData = transformQuestionsForClient(data);
        res.json(transformedData);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lectures', details: err.message });
    }
});

// GET /api/lectures/:lectureId
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
                id, external_id, name, order_index,
                questions (id, external_id, text, options, explanation, question_order, difficulty_level)
            `)
            .eq('id', resolvedId)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Lecture not found' });
        }

        const transformedData = transformQuestionsForClient(data);
        res.json(transformedData);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lecture', details: err.message });
    }
});

// GET /api/admin/years
app.get('/api/admin/years', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('years')
            .select(`
                id, external_id, name, icon,
                modules (
                    id, external_id, name,
                    subjects (
                        id, external_id, name,
                        lectures (id, external_id, name)
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

// GET /api/admin/modules
app.get('/api/admin/modules', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('modules')
            .select('id, external_id, name, year_id')
            .order('year_id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch modules', details: err.message });
    }
});

// GET /api/admin/subjects
app.get('/api/admin/subjects', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('subjects')
            .select('id, external_id, name, module_id')
            .order('module_id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch subjects', details: err.message });
    }
});

// GET /api/admin/lectures
app.get('/api/admin/lectures', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('lectures')
            .select('id, external_id, name, subject_id, questions(count)')
            .order('subject_id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lectures', details: err.message });
    }
});

// ============================================================================
// ENDPOINT: Practice Mode - Check Single Answer
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
// POST /api/quiz-results
app.post('/api/quiz-results', authMiddleware, async (req, res) => {
    try {
        const { lectureId, answers } = req.body;
        const userId = req.user.id;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid answers format' });
        }

        if (answers.length === 0) {
            return res.status(400).json({ error: 'No answers provided' });
        }

        const resolvedLectureId = await resolveId('lectures', lectureId);

        if (!resolvedLectureId) {
            return res.status(404).json({ error: 'Lecture not found' });
        }

        const submissions = [];

        for (const ans of answers) {
            const resolvedQuestionId = await resolveId('questions', ans.questionId);

            if (!resolvedQuestionId) {
                console.warn(`⚠️  Question ${ans.questionId} not found`);
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

        const { data, error } = await supabase
            .from('user_responses')
            .insert(submissions)
            .select('is_correct');

        if (error) throw error;

        const total = data.length;
        const correct = data.filter(r => r.is_correct).length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

        res.status(201).json({
            success: true,
            results: {
                score: correct,
                total,
                percentage,
                gradedDetails: data
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to process submission', details: err.message });
    }
});

// Export for Vercel
module.exports = app;
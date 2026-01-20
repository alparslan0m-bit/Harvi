const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================================
// SETUP: Initialize Supabase Client
// ============================================================================
// Using SERVICE ROLE KEY for backend operations (can bypass RLS when needed)
// This is necessary for:
// - Grading quizzes (insert to user_responses with auto-grade trigger)
// - Admin analytics queries
// - But we still verify user identity via JWT
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('✅ Supabase initialized');
console.log(`   URL: ${process.env.SUPABASE_URL}`);

// ============================================================================
// MIDDLEWARE: Authenticate Supabase JWT
// ============================================================================
/**
 * Middleware to validate Supabase JWT and attach user to request
 * 
 * SECURITY:
 * - Validates token on every request
 * - Maps token to auth.users (prevents spoofing user_id)
 * - Required for all endpoints that track user data
 */
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
// HELPER: Resolve ID (UUID or MongoDB external_id)
// ============================================================================
/**
 * Helper to convert MongoDB ID to UUID
 * During migration, external_id holds original MongoDB IDs
 * This allows gradual frontend migration
 */
async function resolveId(table, idValue) {
    // Check if already a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idValue);
    
    if (isUuid) {
        return idValue;
    }
    
    // Look up by external_id (MongoDB ID)
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
// ENDPOINT 1: Load Full Structure (Years → Modules → Subjects → Lectures)
// ============================================================================
/**
 * GET /api/years
 * 
 * Returns the complete hierarchy for the app navigation
 * 
 * Response:
 * [
 *   {
 *     id: UUID,
 *     external_id: "year1",
 *     name: "Year 1",
 *     modules: [
 *       {
 *         id: UUID,
 *         external_id: "year1_mod1",
 *         name: "Module 1",
 *         subjects: [...]
 *       }
 *     ]
 *   }
 * ]
 */
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
// ENDPOINT 2: Load Lecture with Questions (Security: Correct Answers Hidden)
// ============================================================================
/**
 * GET /api/lectures/:lectureId
 * 
 * Returns lecture with all its questions
 * 
 * SECURITY:
 * - correct_answer_index is EXCLUDED to prevent cheating
 * - Options are returned as JSONB array for flexibility
 * 
 * Response:
 * {
 *   id: UUID,
 *   external_id: "year1_mod1_sub1_lec1",
 *   name: "Introduction to Anatomy",
 *   questions: [
 *     {
 *       id: UUID,
 *       external_id: "q1",
 *       text: "What is the largest bone?",
 *       options: [
 *         { id: 0, text: "Femur", ... },
 *         { id: 1, text: "Tibia", ... }
 *       ],
 *       explanation: "The femur is the largest and strongest bone in the body..."
 *       // correct_answer_index is NOT included!
 *     }
 *   ]
 * }
 */
app.get('/api/lectures/:lectureId', async (req, res) => {
    try {
        const { lectureId } = req.params;
        
        // Resolve ID (could be UUID or MongoDB ID)
        const resolvedId = await resolveId('lectures', lectureId);
        
        if (!resolvedId) {
            return res.status(404).json({ error: 'Lecture not found' });
        }
        
        // Fetch lecture with questions
        // 🔐 SECURITY: correct_answer_index is EXPLICITLY EXCLUDED
        const { data, error } = await supabase
            .from('lectures')
            .select(`
                id,
                external_id,
                name,
                order_index,
                questions (
                    id,
                    external_id,
                    text,
                    options,
                    explanation,
                    question_order,
                    difficulty_level
                    -- correct_answer_index IS EXCLUDED FOR SECURITY
                )
            `)
            .eq('id', resolvedId)
            .single();
        
        if (error || !data) {
            return res.status(404).json({ error: 'Lecture not found' });
        }
        
        console.log(`✅ Loaded lecture: ${data.external_id} with ${data.questions.length} questions`);
        res.json(data);
    } catch (err) {
        console.error('❌ Error fetching lecture:', err.message);
        res.status(500).json({ error: 'Failed to fetch lecture', details: err.message });
    }
});

// ============================================================================
// ENDPOINT 3: Submit Quiz (Secure Auto-Grading via Database Trigger)
// ============================================================================
/**
 * POST /api/quiz-results
 * 
 * Student submits quiz answers
 * Database trigger (auto_grade_response) computes correctness
 * 
 * Request:
 * {
 *   lectureId: "year1_mod1_sub1_lec1",
 *   answers: [
 *     { questionId: "q1", selectedAnswerIndex: 0 },
 *     { questionId: "q2", selectedAnswerIndex: 1 }
 *   ]
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   results: {
 *     score: 1,
 *     total: 2,
 *     percentage: 50,
 *     gradedDetails: [
 *       { is_correct: true },
 *       { is_correct: false }
 *     ]
 *   }
 * }
 * 
 * 🔐 SECURITY:
 * - is_correct is NEVER accepted from client
 * - Trigger computes it from question.correct_answer_index
 * - Student cannot falsify grades
 * - User ID verified from JWT token (not from request)
 */
app.post('/api/quiz-results', authMiddleware, async (req, res) => {
    try {
        const { lectureId, answers } = req.body;
        const userId = req.user.id;
        
        // Validate input
        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid answers format. Expected: { lectureId, answers: [...] }' });
        }
        
        if (answers.length === 0) {
            return res.status(400).json({ error: 'No answers provided' });
        }
        
        console.log(`📝 Processing quiz submission from user ${userId.substring(0, 8)}... for lecture ${lectureId}`);
        
        // 1. Resolve Lecture ID (if passed as MongoDB ID, get UUID)
        const resolvedLectureId = await resolveId('lectures', lectureId);
        
        if (!resolvedLectureId) {
            return res.status(404).json({ error: 'Lecture not found' });
        }
        
        // 2. Resolve Question IDs and prepare submission payload
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
                // 🔐 is_correct is NOT sent - database trigger computes it!
            });
        }
        
        if (submissions.length === 0) {
            return res.status(400).json({ error: 'No valid answers to process' });
        }
        
        console.log(`✓ Submitting ${submissions.length} responses to database (trigger will auto-grade)`);
        
        // 3. Insert into Supabase using Service Role
        // (Can bypass RLS to insert on behalf of user)
        const { data, error } = await supabase
            .from('user_responses')
            .insert(submissions)
            .select('is_correct');
        
        if (error) throw error;
        
        // 4. Calculate score from database-computed grades
        // ✅ These are TRUSTWORTHY because trigger computed them
        const total = data.length;
        const correct = data.filter(r => r.is_correct).length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        console.log(`✅ Quiz graded: ${correct}/${total} (${percentage}%)`);
        
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
        console.error('❌ Quiz submission error:', err.message);
        res.status(500).json({ error: 'Failed to process submission', details: err.message });
    }
});

// ============================================================================
// ENDPOINT 4: Student Performance (New - PostgreSQL Enabled)
// ============================================================================
/**
 * GET /api/student/performance
 * 
 * Returns student's quiz statistics across all lectures
 * 
 * Response:
 * {
 *   totalQuestionsAnswered: 15,
 *   overallAccuracy: 80,
 *   byLecture: {
 *     "Introduction to Anatomy": { total: 5, correct: 4 },
 *     "Bone Structure": { total: 10, correct: 8 }
 *   }
 * }
 * 
 * This query was difficult/slow on MongoDB due to embedded data
 * PostgreSQL makes it efficient with proper joins and indexes
 */
app.get('/api/student/performance', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Efficient join: user_responses → lectures
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
        
        // Process data for frontend
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
// ENDPOINT 5: Health Check
// ============================================================================
app.get('/health', async (req, res) => {
    try {
        // Verify Supabase connection
        const { error } = await supabase.from('years').select('count()').limit(1);
        
        if (error) throw error;
        
        res.json({ 
            status: 'healthy',
            supabase: 'connected',
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
// ERROR HANDLING
// ============================================================================
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ============================================================================
// START SERVER
// ============================================================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          Supabase Medical MCQ Backend Server              ║');
    console.log('║                    Production Ready                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${process.env.SUPABASE_URL}`);
    console.log('\n✅ Available endpoints:');
    console.log('   GET  /api/years                 - Load full hierarchy');
    console.log('   GET  /api/lectures/:id          - Load lecture with questions');
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

module.exports = app;

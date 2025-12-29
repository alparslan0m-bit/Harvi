const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const crypto = require('crypto');
require('dotenv').config();

const { Year } = require('./models/Year');
const { Module } = require('./models/Module');
const { Subject } = require('./models/Subject');
const { Lecture } = require('./models/Lecture');

const app = express();

app.use(compression()); // Enable gzip/brotli compression
app.use(cors());
app.use(express.json());

// Add Cache-Control headers for API responses
app.use('/api', (req, res, next) => {
    // Cache /api/years for 5 minutes
    if (req.path === '/years') {
        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    }
    // Cache lecture data for 1 hour (including batch endpoint)
    if (req.path.match(/^\/lectures\/.+/) || req.path === '/lectures/batch') {
        res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
    }
    // Admin endpoints should not be cached
    if (req.path.startsWith('/admin')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
    // Set Vary header for proper cache key handling with compression
    res.set('Vary', 'Accept-Encoding');
    next();
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mcq_app';

mongoose.connect(MONGODB_URI).then(() => {
    console.log('Connected to MongoDB');
    
    // ADD: Verify transactions are supported
    mongoose.connection.db.admin().serverInfo().then(info => {
        console.log('MongoDB version:', info.version);
        if (parseInt(info.version.split('.')[0]) < 4) {
            console.warn('⚠️  WARNING: MongoDB version < 4.0, transactions not supported');
        } else {
            console.log('✓ MongoDB transactions supported');
        }
    });
}).catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

app.get('/api/years', async (req, res) => {
    try {
        // 1. Fetch ALL data in parallel (only 4 database calls total!)
        const [years, allModules, allSubjects, allLectures] = await Promise.all([
            Year.find({}).sort({ id: 1 }).lean(),
            Module.find({}).lean(),
            Subject.find({}).lean(),
            Lecture.find({}, 'id name subjectId').lean()
        ]);

        if (!years || years.length === 0) {
            return res.status(404).json({ 
                error: 'No years found',
                message: 'The database appears to be empty. You may need to run the seed script.'
            });
        }

        // 2. Map everything together in memory (blazing fast)
        const response = years.map(year => {
            const modules = allModules.filter(m => m.yearId === year.id).map(module => {
                const subjects = allSubjects.filter(s => s.moduleId === module.id).map(subject => {
                    const lectures = allLectures.filter(l => l.subjectId === subject.id);
                    return { ...subject, lectures };
                });
                return { ...module, subjects };
            });
            return { ...year, modules };
        });

        // Generate ETag for efficient revalidation
        const responseData = JSON.stringify(response);
        const etag = `"${crypto.createHash('md5').update(responseData).digest('hex')}"`;

        // Check If-None-Match header for conditional requests
        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end(); // Not Modified
        }

        res.set('ETag', etag);
        res.json(response);
    } catch (err) {
        console.error('Error fetching years:', err);
        res.status(500).json({ 
            error: 'Failed to fetch years',
            message: 'Database query failed. Check server logs for details.'
        });
    }
});

app.post('/api/lectures/batch', async (req, res) => {
    try {
        const { lectureIds } = req.body;
        if (!Array.isArray(lectureIds) || lectureIds.length === 0) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'lectureIds must be a non-empty array'
            });
        }

        // Rate limiting: max 50 lectures per batch
        const MAX_BATCH_SIZE = 50;
        if (lectureIds.length > MAX_BATCH_SIZE) {
            return res.status(400).json({
                error: 'Too many lectures requested',
                message: `Maximum batch size is ${MAX_BATCH_SIZE}`
            });
        }

        const lectures = await Lecture.find({ id: { $in: lectureIds } }).lean();
        res.json(lectures);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lectures', details: err.message });
    }
});

// Alternative GET endpoint for better caching (browsers cache GET requests)
app.get('/api/lectures/batch', async (req, res) => {
    try {
        const lectureIds = req.query.ids?.split(',') || [];
        if (lectureIds.length === 0) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'ids query parameter must contain comma-separated lecture IDs'
            });
        }

        // Rate limiting: max 50 lectures per batch
        const MAX_BATCH_SIZE = 50;
        if (lectureIds.length > MAX_BATCH_SIZE) {
            return res.status(400).json({
                error: 'Too many lectures requested',
                message: `Maximum batch size is ${MAX_BATCH_SIZE}`
            });
        }

        const lectures = await Lecture.find({ id: { $in: lectureIds } }).lean();
        res.json(lectures);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lectures', details: err.message });
    }
});

app.get('/api/lectures/:lectureId', async (req, res) => {
    try {
        const lecture = await Lecture.findOne({ id: req.params.lectureId }).lean();
        if (!lecture) {
            return res.status(404).json({ 
                error: 'Lecture not found',
                message: 'The requested lecture does not exist in the database'
            });
        }
        res.json(lecture);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lecture', details: err.message });
    }
});

app.get('/api/admin/years', async (req, res) => {
    try {
        // 1. Fetch ALL data in parallel (only 4 database calls total!)
        const [years, allModules, allSubjects, allLectures] = await Promise.all([
            Year.find({}).sort({ id: 1 }).lean(),
            Module.find({}).lean(),
            Subject.find({}).lean(),
            Lecture.find({}).lean()
        ]);

        // 2. Map everything together in memory (blazing fast)
        const response = years.map(year => {
            const modules = allModules.filter(m => m.yearId === year.id).map(module => {
                const subjects = allSubjects.filter(s => s.moduleId === module.id).map(subject => {
                    const lectures = allLectures.filter(l => l.subjectId === subject.id);
                    return { ...subject, lectures };
                });
                return { ...module, subjects };
            });
            return { ...year, modules };
        });

        res.json(response);
    } catch (err) {
        console.error('Error fetching years:', err);
        res.status(500).json({ error: 'Failed to fetch years' });
    }
});

app.post('/api/admin/years', async (req, res) => {
    try {
        const { id, name, icon } = req.body;
        if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
        const year = await Year.createWithValidation({ id, name, icon });
        res.status(201).json({ ok: true, year });
    } catch (err) {
        res.status(400).json({ error: 'Failed to create year', details: err.message });
    }
});

app.put('/api/admin/years/:yearId', async (req, res) => {
    try {
        const { yearId } = req.params;
        const { id, name, icon } = req.body;
        const year = await Year.updateWithValidation(yearId, { id, name, icon });
        if (!year) return res.status(404).json({ error: 'Year not found' });
        res.json({ ok: true, year });
    } catch (err) {
        res.status(400).json({ error: 'Failed to update year', details: err.message });
    }
});

app.delete('/api/admin/years/:yearId', async (req, res) => {
    // Start a session for the transaction
    const session = await mongoose.startSession();
    
    try {
        // Start transaction
        session.startTransaction();
        console.log(`🗑️  Starting transactional delete for year: ${req.params.yearId}`);
        
        const { yearId } = req.params;
        
        // All operations use the session
        const year = await Year.findOne({ id: yearId }).session(session);
        if (!year) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Year not found' });
        }
        
        // Collect statistics for logging
        let deletedCounts = {
            lectures: 0,
            subjects: 0,
            modules: 0
        };
        
        // Cascade delete - ALL within the same transaction
        const modules = await Module.find({ yearId: yearId }).session(session);
        console.log(`  Found ${modules.length} modules to delete`);
        
        for (let module of modules) {
            const subjects = await Subject.find({ moduleId: module.id }).session(session);
            console.log(`  Found ${subjects.length} subjects in module ${module.id}`);
            
            for (let subject of subjects) {
                const result = await Lecture.deleteMany({ subjectId: subject.id }).session(session);
                deletedCounts.lectures += result.deletedCount;
            }
            
            const subjectResult = await Subject.deleteMany({ moduleId: module.id }).session(session);
            deletedCounts.subjects += subjectResult.deletedCount;
        }
        
        const moduleResult = await Module.deleteMany({ yearId: yearId }).session(session);
        deletedCounts.modules += moduleResult.deletedCount;
        
        await Year.deleteOne({ id: yearId }).session(session);
        
        // If we got here, everything succeeded - commit the transaction
        await session.commitTransaction();
        console.log(`✓ Transaction committed. Deleted: ${deletedCounts.modules} modules, ${deletedCounts.subjects} subjects, ${deletedCounts.lectures} lectures`);
        
        res.json({ 
            ok: true, 
            message: 'Year and all related data deleted successfully',
            deleted: deletedCounts
        });
        
    } catch (err) {
        // Something failed - rollback ALL changes
        await session.abortTransaction();
        console.error('❌ Transaction aborted due to error:', err);
        
        res.status(500).json({ 
            error: 'Failed to delete year', 
            details: err.message,
            hint: 'All changes have been rolled back'
        });
    } finally {
        // Always end the session
        session.endSession();
    }
});

// MODULES CRUD
app.get('/api/admin/modules', async (req, res) => {
    try {
        const modules = await Module.find({}).sort({ yearId: 1, id: 1 }).lean();
        res.json(modules);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch modules' });
    }
});

app.post('/api/admin/modules', async (req, res) => {
    try {
        const { id, name, yearId } = req.body;
        if (!id || !name || !yearId) return res.status(400).json({ error: 'id, name, and yearId are required' });
        const module = await Module.createWithValidation({ id, name, yearId });
        res.status(201).json({ ok: true, module });
    } catch (err) {
        res.status(400).json({ error: 'Failed to create module', details: err.message });
    }
});

app.put('/api/admin/modules/:moduleId', async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { id, name, yearId } = req.body;
        const module = await Module.updateWithValidation(moduleId, { id, name, yearId });
        if (!module) return res.status(404).json({ error: 'Module not found' });
        res.json({ ok: true, module });
    } catch (err) {
        res.status(400).json({ error: 'Failed to update module', details: err.message });
    }
});

app.delete('/api/admin/modules/:moduleId', async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        console.log(`🗑️  Starting transactional delete for module: ${req.params.moduleId}`);
        
        const { moduleId } = req.params;
        const module = await Module.findOne({ id: moduleId }).session(session);
        
        if (!module) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Module not found' });
        }
        
        let deletedCounts = { lectures: 0, subjects: 0 };
        
        // Cascade delete within transaction
        const subjects = await Subject.find({ moduleId: moduleId }).session(session);
        console.log(`  Found ${subjects.length} subjects to delete`);
        
        for (let subject of subjects) {
            const result = await Lecture.deleteMany({ subjectId: subject.id }).session(session);
            deletedCounts.lectures += result.deletedCount;
        }
        
        const subjectResult = await Subject.deleteMany({ moduleId: moduleId }).session(session);
        deletedCounts.subjects += subjectResult.deletedCount;
        
        await Module.deleteOne({ id: moduleId }).session(session);
        
        await session.commitTransaction();
        console.log(`✓ Module deletion committed. Deleted: ${deletedCounts.subjects} subjects, ${deletedCounts.lectures} lectures`);
        
        res.json({ 
            ok: true, 
            message: 'Module and all related data deleted successfully',
            deleted: deletedCounts
        });
        
    } catch (err) {
        await session.abortTransaction();
        console.error('❌ Module deletion transaction aborted:', err);
        
        res.status(500).json({ 
            error: 'Failed to delete module', 
            details: err.message,
            hint: 'All changes have been rolled back'
        });
    } finally {
        session.endSession();
    }
});

// SUBJECTS CRUD
app.get('/api/admin/subjects', async (req, res) => {
    try {
        const subjects = await Subject.find({}).sort({ moduleId: 1, id: 1 }).lean();
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});

app.post('/api/admin/subjects', async (req, res) => {
    try {
        const { id, name, moduleId } = req.body;
        if (!id || !name || !moduleId) return res.status(400).json({ error: 'id, name, and moduleId are required' });
        const subject = await Subject.createWithValidation({ id, name, moduleId });
        res.status(201).json({ ok: true, subject });
    } catch (err) {
        res.status(400).json({ error: 'Failed to create subject', details: err.message });
    }
});

app.put('/api/admin/subjects/:subjectId', async (req, res) => {
    try {
        const { subjectId } = req.params;
        const { id, name, moduleId } = req.body;
        const subject = await Subject.updateWithValidation(subjectId, { id, name, moduleId });
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        res.json({ ok: true, subject });
    } catch (err) {
        res.status(400).json({ error: 'Failed to update subject', details: err.message });
    }
});

app.delete('/api/admin/subjects/:subjectId', async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        console.log(`🗑️  Starting transactional delete for subject: ${req.params.subjectId}`);
        
        const { subjectId } = req.params;
        const subject = await Subject.findOne({ id: subjectId }).session(session);
        
        if (!subject) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Subject not found' });
        }
        
        // Delete all lectures within transaction
        const result = await Lecture.deleteMany({ subjectId: subjectId }).session(session);
        console.log(`  Deleted ${result.deletedCount} lectures`);
        
        await Subject.deleteOne({ id: subjectId }).session(session);
        
        await session.commitTransaction();
        console.log(`✓ Subject deletion committed`);
        
        res.json({ 
            ok: true, 
            message: 'Subject and all related data deleted successfully',
            deleted: { lectures: result.deletedCount }
        });
        
    } catch (err) {
        await session.abortTransaction();
        console.error('❌ Subject deletion transaction aborted:', err);
        
        res.status(500).json({ 
            error: 'Failed to delete subject', 
            details: err.message,
            hint: 'All changes have been rolled back'
        });
    } finally {
        session.endSession();
    }
});

// LECTURES CRUD
app.get('/api/admin/lectures', async (req, res) => {
    try {
        const lectures = await Lecture.find({}).sort({ subjectId: 1, id: 1 }).lean();
        res.json(lectures);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lectures' });
    }
});

app.post('/api/admin/lectures', async (req, res) => {
    try {
        const { id, name, subjectId, questions } = req.body;
        const lecture = await Lecture.createWithValidation({ id, name, subjectId, questions: questions || [] });
        res.status(201).json({ ok: true, lecture });
    } catch (err) {
        res.status(400).json({ 
            error: 'Failed to create lecture', 
            details: err.message
        });
    }
});

app.put('/api/admin/lectures/:lectureId', async (req, res) => {
    try {
        const { lectureId } = req.params;
        const { id, name, subjectId, questions } = req.body;
        const lecture = await Lecture.updateWithValidation(lectureId, { id, name, subjectId, questions });
        if (!lecture) return res.status(404).json({ error: 'Lecture not found' });
        res.json({ ok: true, lecture });
    } catch (err) {
        res.status(400).json({ error: 'Failed to update lecture', details: err.message });
    }
});

app.delete('/api/admin/lectures/:lectureId', async (req, res) => {
    try {
        const { lectureId } = req.params;
        const lecture = await Lecture.findOne({ id: lectureId });
        if (!lecture) return res.status(404).json({ error: 'Lecture not found' });
        
        await Lecture.deleteOne({ id: lectureId });
        res.json({ ok: true, message: 'Lecture deleted successfully' });
    } catch (err) {
        res.status(400).json({ error: 'Failed to delete lecture', details: err.message });
    }
});

// Add a question to a lecture
app.post('/api/admin/lectures/:lectureId/questions', async (req, res) => {
    try {
        const { lectureId } = req.params;
        const { text, options, correctAnswer } = req.body;
        
        // Validation
        if (!text || !options || correctAnswer === undefined) {
            return res.status(400).json({
                error: 'Missing required fields',
                details: 'text, options, and correctAnswer are required'
            });
        }
        
        if (!Array.isArray(options) || options.length < 2) {
            return res.status(400).json({
                error: 'Invalid options',
                details: 'At least 2 options required'
            });
        }
        
        if (typeof correctAnswer !== 'number' || correctAnswer < 0 || correctAnswer >= options.length) {
            return res.status(400).json({
                error: 'Invalid correctAnswer',
                details: 'correctAnswer must be a valid index within options array'
            });
        }
        
        // Find the lecture
        const lecture = await Lecture.findOne({ id: lectureId });
        if (!lecture) {
            return res.status(404).json({ error: 'Lecture not found' });
        }
        
        // Create question with unique ID
        const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const questionData = {
            id: questionId,
            text: text,
            options: options,
            correctAnswer: correctAnswer
        };
        
        // Add question to lecture using the model's method
        await lecture.addQuestion(questionData);
        
        res.status(201).json({
            success: true,
            message: 'Question added successfully',
            question: questionData
        });
        
    } catch (err) {
        console.error('Error adding question:', err);
        res.status(400).json({
            error: 'Failed to add question',
            details: err.message
        });
    }
});

/**
 * POST /api/quiz-results
 * Save quiz results from offline sync or direct submission
 */
app.post('/api/quiz-results', async (req, res) => {
    try {
        const { lectureId, score, total, metadata, timestamp } = req.body;
        
        // Validate required fields
        if (!lectureId || typeof score !== 'number' || typeof total !== 'number') {
            return res.status(400).json({
                error: 'Missing or invalid required fields',
                required: ['lectureId', 'score', 'total']
            });
        }
        
        // Validate score is within range
        if (score < 0 || score > total) {
            return res.status(400).json({
                error: 'Invalid score: must be between 0 and total'
            });
        }
        
        // Create result object
        const quizResult = {
            lectureId,
            score,
            total,
            percentage: Math.round((score / total) * 100),
            metadata: metadata || {},
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            syncedAt: new Date()
        };
        
        // TODO: Save to database if you have a QuizResult model
        // const result = await QuizResult.create(quizResult);
        
        console.log('Quiz result received:', quizResult);
        
        res.status(201).json({
            success: true,
            message: 'Quiz result saved successfully',
            data: quizResult
        });
        
    } catch (err) {
        console.error('Error saving quiz result:', err);
        res.status(500).json({
            error: 'Failed to save quiz result',
            details: err.message
        });
    }
});

const staticRoot = path.join(__dirname, '..');
app.use('/', express.static(staticRoot));

// Only start server when running locally (not in Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export for Vercel serverless functions
module.exports = app;



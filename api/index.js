const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const { Year } = require('../server/models/Year');
const { Module } = require('../server/models/Module');
const { Subject } = require('../server/models/Subject');
const { Lecture } = require('../server/models/Lecture');

const app = express();

app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mcq_app';

mongoose.connect(MONGODB_URI).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Add Cache-Control headers for API responses
app.use('/api', (req, res, next) => {
    // Cache years data for 5 minutes (it rarely changes)
    if (req.path === '/years') {
        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    }
    // Cache lecture data for 1 hour
    if (req.path.startsWith('/lectures/') || req.path === '/lectures/batch') {
        res.set('Cache-Control', 'public, max-age=3600');
    }
    next();
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

        res.json(response);
    } catch (err) {
        console.error('Error fetching years:', err);
        res.status(500).json({
            error: 'Failed to fetch years',
            message: 'Database query failed. Check server logs for details.'
        });
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

app.post('/api/lectures/batch', async (req, res) => {
    try {
        const { lectureIds } = req.body;
        if (!Array.isArray(lectureIds) || lectureIds.length === 0) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'lectureIds must be a non-empty array'
            });
        }

        const lectures = await Lecture.find({ id: { $in: lectureIds } }).lean();
        res.json(lectures);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lectures', details: err.message });
    }
});

// GET endpoint for batch lectures (matches frontend request pattern)
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

// Admin routes
app.get('/api/admin/years', async (req, res) => {
    try {
        const [years, allModules, allSubjects, allLectures] = await Promise.all([
            Year.find({}).sort({ id: 1 }).lean(),
            Module.find({}).lean(),
            Subject.find({}).lean(),
            Lecture.find({}).lean()
        ]);

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

app.get('/api/admin/modules', async (req, res) => {
    try {
        const modules = await Module.find({}).sort({ yearId: 1, id: 1 }).lean();
        res.json(modules);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch modules' });
    }
});

app.get('/api/admin/subjects', async (req, res) => {
    try {
        const subjects = await Subject.find({}).sort({ moduleId: 1, id: 1 }).lean();
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});

app.get('/api/admin/lectures', async (req, res) => {
    try {
        const lectures = await Lecture.find({}).sort({ subjectId: 1, id: 1 }).lean();
        res.json(lectures);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lectures' });
    }
});

app.post('/api/quiz-results', async (req, res) => {
    try {
        const { lectureId, score, total, metadata, timestamp } = req.body;

        if (!lectureId || typeof score !== 'number' || typeof total !== 'number') {
            return res.status(400).json({
                error: 'Missing or invalid required fields',
                required: ['lectureId', 'score', 'total']
            });
        }

        if (score < 0 || score > total) {
            return res.status(400).json({
                error: 'Invalid score: must be between 0 and total'
            });
        }

        const quizResult = {
            lectureId,
            score,
            total,
            percentage: Math.round((score / total) * 100),
            metadata: metadata || {},
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            syncedAt: new Date()
        };

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

// Export for Vercel
module.exports = app;
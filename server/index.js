const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const { Year } = require('./models/Year');
const { Module } = require('./models/Module');
const { Subject } = require('./models/Subject');
const { Lecture } = require('./models/Lecture');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mcq_app';

mongoose.connect(MONGODB_URI).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

app.get('/api/years', async (req, res) => {
    try {
        const years = await Year.find({}).sort({ id: 1 }).lean();
        if (!years || years.length === 0) {
            return res.status(404).json({ 
                error: 'No years found',
                message: 'The database appears to be empty. You may need to run the seed script.'
            });
        }

        for (let year of years) {
            const modules = await Module.find({ yearId: year.id }).lean();
            year.modules = await Promise.all(modules.map(async module => {
                const subjects = await Subject.find({ moduleId: module.id }).lean();
                const subjectsWithLectures = await Promise.all(subjects.map(async (s) => {
                    const lectures = await Lecture.find({ subjectId: s.id }, 'id name').lean();
                    return { ...s, lectures };
                }));
                return {
                    ...module,
                    subjects: subjectsWithLectures
                };
            }));
        }

        res.json(years);
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

app.get('/api/admin/years', async (req, res) => {
    try {
        const years = await Year.find({}).sort({ id: 1 }).lean();
        
        for (let year of years) {
            const modules = await Module.find({ yearId: year.id }).lean();
            year.modules = await Promise.all(modules.map(async module => {
                const subjects = await Subject.find({ moduleId: module.id }).lean();
                const subjectsWithLectures = await Promise.all(subjects.map(async (s) => {
                    const lectures = await Lecture.find({ subjectId: s.id }, 'id name').lean();
                    return { ...s, lectures };
                }));
                return {
                    ...module,
                    subjects: subjectsWithLectures
                };
            }));
        }
        
        res.json(years);
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
    try {
        const { yearId } = req.params;
        const year = await Year.findOne({ id: yearId });
        if (!year) {
            return res.status(404).json({ error: 'Year not found' });
        }
        
        // Cascade delete all related data
        const modules = await Module.find({ yearId: yearId });
        for (let module of modules) {
            const subjects = await Subject.find({ moduleId: module.id });
            for (let subject of subjects) {
                await Lecture.deleteMany({ subjectId: subject.id });
            }
            await Subject.deleteMany({ moduleId: module.id });
        }
        await Module.deleteMany({ yearId: yearId });
        await Year.deleteOne({ id: yearId });
        
        res.json({ ok: true, message: 'Year and all related data deleted successfully' });
    } catch (err) {
        console.error('Year deletion error:', err);
        res.status(500).json({ 
            error: 'Failed to delete year', 
            details: err.message
        });
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
    try {
        const { moduleId } = req.params;
        const module = await Module.findOne({ id: moduleId });
        if (!module) {
            return res.status(404).json({ error: 'Module not found' });
        }
        
        // Cascade delete all related data
        const subjects = await Subject.find({ moduleId: moduleId });
        for (let subject of subjects) {
            await Lecture.deleteMany({ subjectId: subject.id });
        }
        await Subject.deleteMany({ moduleId: moduleId });
        await Module.deleteOne({ id: moduleId });
        
        res.json({ ok: true, message: 'Module and all related data deleted successfully' });
    } catch (err) {
        console.error('Module deletion error:', err);
        res.status(500).json({ 
            error: 'Failed to delete module', 
            details: err.message
        });
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
    try {
        const { subjectId } = req.params;
        const subject = await Subject.findOne({ id: subjectId });
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        
        // Cascade delete all related lectures
        await Lecture.deleteMany({ subjectId: subjectId });
        await Subject.deleteOne({ id: subjectId });
        
        res.json({ ok: true, message: 'Subject and all related data deleted successfully' });
    } catch (err) {
        console.error('Subject deletion error:', err);
        res.status(500).json({ 
            error: 'Failed to delete subject', 
            details: err.message
        });
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

const staticRoot = path.join(__dirname, '..');
app.use('/', express.static(staticRoot));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});



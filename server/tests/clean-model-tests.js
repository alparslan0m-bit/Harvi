const mongoose = require('mongoose');
const { Year } = require('../models/Year');
const { Module } = require('../models/Module');
const { Subject } = require('../models/Subject');
const { Lecture } = require('../models/Lecture');
const assert = require('node:assert');

describe('Clean Database Structure Tests', () => {
    before(async () => {
        await mongoose.connect('mongodb://localhost:27017/mcq_test_clean', {
            serverSelectionTimeoutMS: 5000
        });
    });

    beforeEach(async () => {
        // Clear all collections before each test
        await Year.deleteMany({});
        await Module.deleteMany({});
        await Subject.deleteMany({});
        await Lecture.deleteMany({});
    });

    after(async () => {
        await mongoose.connection.close();
    });

    describe('CRUD Operations', () => {
        it('should create, read, update, delete all entities', async () => {
            // Create Year
            const year = await Year.createWithValidation({
                id: 'y1',
                name: 'Year 1',
                icon: '1️⃣'
            });
            assert.strictEqual(year.name, 'Year 1');

            // Create Module
            const module = await Module.createWithValidation({
                id: 'm1',
                name: 'Module 1',
                yearId: year.id
            });
            assert.strictEqual(module.name, 'Module 1');

            // Create Subject
            const subject = await Subject.createWithValidation({
                id: 's1',
                name: 'Subject 1',
                moduleId: module.id
            });
            assert.strictEqual(subject.name, 'Subject 1');

            // Create Lecture
            const lecture = await Lecture.createWithValidation({
                id: 'l1',
                name: 'Lecture 1',
                subjectId: subject.id,
                questions: [{
                    id: 'q1',
                    text: 'Test Question',
                    options: ['A', 'B', 'C', 'D'],
                    correctAnswer: 1
                }]
            });
            assert.strictEqual(lecture.name, 'Lecture 1');
            assert.strictEqual(lecture.questions.length, 1);

            // Test Updates
            await Year.updateWithValidation('y1', { name: 'Updated Year 1' });
            await Module.updateWithValidation('m1', { name: 'Updated Module 1' });
            await Subject.updateWithValidation('s1', { name: 'Updated Subject 1' });
            await Lecture.updateWithValidation('l1', { name: 'Updated Lecture 1' });

            const updatedYear = await Year.findOne({ id: 'y1' });
            assert.strictEqual(updatedYear.name, 'Updated Year 1');

            // Test Counts
            const yearCount = await Year.countDocuments();
            const moduleCount = await Module.countDocuments();
            const subjectCount = await Subject.countDocuments();
            const lectureCount = await Lecture.countDocuments();

            assert.strictEqual(yearCount, 1);
            assert.strictEqual(moduleCount, 1);
            assert.strictEqual(subjectCount, 1);
            assert.strictEqual(lectureCount, 1);
        });
    });

    describe('Cascade Deletion', () => {
        it('should cascade delete from Year to all child entities', async () => {
            // Create hierarchy
            const year = await Year.createWithValidation({
                id: 'y1',
                name: 'Year 1',
                icon: '1️⃣'
            });

            const module = await Module.createWithValidation({
                id: 'm1',
                name: 'Module 1',
                yearId: year.id
            });

            const subject = await Subject.createWithValidation({
                id: 's1',
                name: 'Subject 1',
                moduleId: module.id
            });

            const lecture = await Lecture.createWithValidation({
                id: 'l1',
                name: 'Lecture 1',
                subjectId: subject.id,
                questions: [{
                    id: 'q1',
                    text: 'Test Question',
                    options: ['A', 'B'],
                    correctAnswer: 0
                }]
            });

            // Delete the year (should cascade)
            await Year.deleteOne({ id: year.id });

            // Verify cascade deletion
            const moduleCount = await Module.countDocuments({ yearId: year.id });
            const subjectCount = await Subject.countDocuments({ moduleId: module.id });
            const lectureCount = await Lecture.countDocuments({ subjectId: subject.id });

            assert.strictEqual(moduleCount, 0);
            assert.strictEqual(subjectCount, 0);
            assert.strictEqual(lectureCount, 0);
        });
    });

    describe('Validation', () => {
        it('should prevent duplicate IDs and validate references', async () => {
            const year = await Year.createWithValidation({
                id: 'y1',
                name: 'Year 1'
            });

            // Test duplicate year ID
            try {
                await Year.createWithValidation({
                    id: 'y1',
                    name: 'Duplicate Year'
                });
                assert.fail('Should have thrown an error for duplicate ID');
            } catch (error) {
                assert(error.message.includes('already exists'));
            }

            // Test invalid year reference
            try {
                await Module.createWithValidation({
                    id: 'm1',
                    name: 'Module 1',
                    yearId: 'nonexistent'
                });
                assert.fail('Should have thrown an error for invalid reference');
            } catch (error) {
                assert(error.message.includes('does not exist'));
            }
        });

        it('should validate question structure', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const module = await Module.createWithValidation({ id: 'm1', name: 'Module 1', yearId: 'y1' });
            const subject = await Subject.createWithValidation({ id: 's1', name: 'Subject 1', moduleId: 'm1' });

            // Test invalid question (only one option)
            try {
                await Lecture.createWithValidation({
                    id: 'l1',
                    name: 'Lecture 1',
                    subjectId: 's1',
                    questions: [{
                        id: 'q1',
                        text: 'Test Question',
                        options: ['A'], // Only one option
                        correctAnswer: 0
                    }]
                });
                assert.fail('Should have thrown an error for insufficient options');
            } catch (error) {
                assert(error.message.includes('at least 2 options'));
            }

            // Test invalid correct answer index
            try {
                await Lecture.createWithValidation({
                    id: 'l1',
                    name: 'Lecture 1',
                    subjectId: 's1',
                    questions: [{
                        id: 'q1',
                        text: 'Test Question',
                        options: ['A', 'B'],
                        correctAnswer: 5 // Invalid index
                    }]
                });
                assert.fail('Should have thrown an error for invalid answer index');
            } catch (error) {
                assert(error.message.includes('Invalid correct answer index'));
            }
        });
    });
});
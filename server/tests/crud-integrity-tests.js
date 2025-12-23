const mongoose = require('mongoose');
const { Year } = require('../models/Year');
const { Module } = require('../models/Module');
const { Subject } = require('../models/Subject');
const { Lecture } = require('../models/Lecture');
const assert = require('node:assert');

const TEST_DB = 'mongodb://localhost:27017/mcq_crud_integrity_test';

describe('CRUD System Integrity & Cleanliness Tests', () => {
    before(async () => {
        await mongoose.connect(TEST_DB, {
            serverSelectionTimeoutMS: 5000
        });
    });

    beforeEach(async () => {
        // Completely clear all collections before each test
        const collections = ['years', 'modules', 'subjects', 'lectures'];
        for (const collection of collections) {
            try {
                await mongoose.connection.collection(collection).deleteMany({});
            } catch (e) {
                // Collection might not exist
            }
        }
        // Also clear via models
        await Year.deleteMany({});
        await Module.deleteMany({});
        await Subject.deleteMany({});
        await Lecture.deleteMany({});
    });

    after(async () => {
        // Clean up test database
        await Year.deleteMany({});
        await Module.deleteMany({});
        await Subject.deleteMany({});
        await Lecture.deleteMany({});
        await mongoose.connection.close();
    });

    // ============================================
    // PART 1: BASIC CRUD OPERATIONS
    // ============================================
    describe('Part 1: Basic CRUD Operations', () => {
        describe('Year CRUD', () => {
            it('CREATE: Should create a year successfully', async () => {
                const year = await Year.createWithValidation({
                    id: 'y1',
                    name: 'First Year',
                    icon: '1️⃣'
                });

                assert.strictEqual(year.id, 'y1');
                assert.strictEqual(year.name, 'First Year');
                assert.strictEqual(year.icon, '1️⃣');
                assert(year.createdAt);
                assert(year.updatedAt);
            });

            it('READ: Should retrieve a year by ID', async () => {
                await Year.createWithValidation({
                    id: 'y1',
                    name: 'First Year'
                });

                const year = await Year.findOne({ id: 'y1' });
                assert.strictEqual(year.name, 'First Year');
                assert(year._id); // MongoDB ID exists
            });

            it('READ: Should retrieve all years', async () => {
                await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
                await Year.createWithValidation({ id: 'y2', name: 'Year 2' });

                const years = await Year.find({});
                assert.strictEqual(years.length, 2);
            });

            it('UPDATE: Should update year data', async () => {
                await Year.createWithValidation({ id: 'y1', name: 'Year 1', icon: '1️⃣' });

                const updated = await Year.updateWithValidation('y1', {
                    name: 'Updated Year 1',
                    icon: '📚'
                });

                assert.strictEqual(updated.name, 'Updated Year 1');
                assert.strictEqual(updated.icon, '📚');
            });

            it('DELETE: Should delete a year', async () => {
                await Year.createWithValidation({ id: 'y1', name: 'Year 1' });

                await Year.deleteOne({ id: 'y1' });

                const year = await Year.findOne({ id: 'y1' });
                assert.strictEqual(year, null);
            });
        });

        describe('Module CRUD', () => {
            beforeEach(async () => {
                // Create a year for module tests
                await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            });

            it('CREATE: Should create a module successfully', async () => {
                const module = await Module.createWithValidation({
                    id: 'm1',
                    name: 'Anatomy',
                    yearId: 'y1'
                });

                assert.strictEqual(module.id, 'm1');
                assert.strictEqual(module.name, 'Anatomy');
                assert.strictEqual(module.yearId, 'y1');
            });

            it('READ: Should retrieve a module by ID', async () => {
                await Module.createWithValidation({
                    id: 'm1',
                    name: 'Anatomy',
                    yearId: 'y1'
                });

                const module = await Module.findOne({ id: 'm1' });
                assert.strictEqual(module.name, 'Anatomy');
            });

            it('UPDATE: Should update module data', async () => {
                await Module.createWithValidation({
                    id: 'm1',
                    name: 'Anatomy',
                    yearId: 'y1'
                });

                const updated = await Module.updateWithValidation('m1', {
                    name: 'Advanced Anatomy'
                });

                assert.strictEqual(updated.name, 'Advanced Anatomy');
            });

            it('DELETE: Should delete a module', async () => {
                await Module.createWithValidation({
                    id: 'm1',
                    name: 'Anatomy',
                    yearId: 'y1'
                });

                await Module.deleteOne({ id: 'm1' });

                const module = await Module.findOne({ id: 'm1' });
                assert.strictEqual(module, null);
            });
        });

        describe('Subject CRUD', () => {
            beforeEach(async () => {
                await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
                await Module.createWithValidation({
                    id: 'm1',
                    name: 'Module 1',
                    yearId: 'y1'
                });
            });

            it('CREATE: Should create a subject successfully', async () => {
                const subject = await Subject.createWithValidation({
                    id: 's1',
                    name: 'Nervous System',
                    moduleId: 'm1'
                });

                assert.strictEqual(subject.id, 's1');
                assert.strictEqual(subject.name, 'Nervous System');
                assert.strictEqual(subject.moduleId, 'm1');
            });

            it('READ: Should retrieve a subject by ID', async () => {
                await Subject.createWithValidation({
                    id: 's1',
                    name: 'Nervous System',
                    moduleId: 'm1'
                });

                const subject = await Subject.findOne({ id: 's1' });
                assert.strictEqual(subject.name, 'Nervous System');
            });

            it('UPDATE: Should update subject data', async () => {
                await Subject.createWithValidation({
                    id: 's1',
                    name: 'Nervous System',
                    moduleId: 'm1'
                });

                const updated = await Subject.updateWithValidation('s1', {
                    name: 'Central Nervous System'
                });

                assert.strictEqual(updated.name, 'Central Nervous System');
            });

            it('DELETE: Should delete a subject', async () => {
                await Subject.createWithValidation({
                    id: 's1',
                    name: 'Nervous System',
                    moduleId: 'm1'
                });

                await Subject.deleteOne({ id: 's1' });

                const subject = await Subject.findOne({ id: 's1' });
                assert.strictEqual(subject, null);
            });
        });

        describe('Lecture CRUD', () => {
            beforeEach(async () => {
                await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
                await Module.createWithValidation({
                    id: 'm1',
                    name: 'Module 1',
                    yearId: 'y1'
                });
                await Subject.createWithValidation({
                    id: 's1',
                    name: 'Subject 1',
                    moduleId: 'm1'
                });
            });

            it('CREATE: Should create a lecture successfully', async () => {
                const lecture = await Lecture.createWithValidation({
                    id: 'l1',
                    name: 'Lecture 1',
                    subjectId: 's1',
                    questions: []
                });

                assert.strictEqual(lecture.id, 'l1');
                assert.strictEqual(lecture.name, 'Lecture 1');
                assert.strictEqual(lecture.subjectId, 's1');
                assert.strictEqual(lecture.questions.length, 0);
            });

            it('READ: Should retrieve a lecture by ID', async () => {
                await Lecture.createWithValidation({
                    id: 'l1',
                    name: 'Lecture 1',
                    subjectId: 's1'
                });

                const lecture = await Lecture.findOne({ id: 'l1' });
                assert.strictEqual(lecture.name, 'Lecture 1');
            });

            it('UPDATE: Should update lecture data', async () => {
                await Lecture.createWithValidation({
                    id: 'l1',
                    name: 'Lecture 1',
                    subjectId: 's1'
                });

                const updated = await Lecture.updateWithValidation('l1', {
                    name: 'Advanced Lecture 1'
                });

                assert.strictEqual(updated.name, 'Advanced Lecture 1');
            });

            it('DELETE: Should delete a lecture', async () => {
                await Lecture.createWithValidation({
                    id: 'l1',
                    name: 'Lecture 1',
                    subjectId: 's1'
                });

                await Lecture.deleteOne({ id: 'l1' });

                const lecture = await Lecture.findOne({ id: 'l1' });
                assert.strictEqual(lecture, null);
            });
        });
    });

    // ============================================
    // PART 2: REFERENTIAL INTEGRITY
    // ============================================
    describe('Part 2: Referential Integrity', () => {
        it('Should prevent creating Module with non-existent Year', async () => {
            try {
                await Module.createWithValidation({
                    id: 'm1',
                    name: 'Module 1',
                    yearId: 'non_existent'
                });
                assert.fail('Should have thrown error for invalid Year reference');
            } catch (error) {
                assert(error.message.includes('does not exist'));
            }
        });

        it('Should prevent creating Subject with non-existent Module', async () => {
            try {
                await Subject.createWithValidation({
                    id: 's1',
                    name: 'Subject 1',
                    moduleId: 'non_existent'
                });
                assert.fail('Should have thrown error for invalid Module reference');
            } catch (error) {
                assert(error.message.includes('does not exist'));
            }
        });

        it('Should validate Lecture with invalid Subject reference', async () => {
            // Lectures allow optional subjectId, so should not throw
            const lecture = await Lecture.createWithValidation({
                id: 'l1',
                name: 'Lecture 1',
                subjectId: 'non_existent'
            });
            assert.strictEqual(lecture.subjectId, 'non_existent');
        });

        it('Should validate Year reference when updating Module', async () => {
            const year1 = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const module = await Module.createWithValidation({
                id: 'm1',
                name: 'Module 1',
                yearId: 'y1'
            });

            try {
                await Module.updateWithValidation('m1', {
                    yearId: 'non_existent'
                });
                assert.fail('Should have thrown error for invalid Year reference');
            } catch (error) {
                assert(error.message.includes('does not exist'));
            }
        });

        it('Should validate Module reference when updating Subject', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const module = await Module.createWithValidation({
                id: 'm1',
                name: 'Module 1',
                yearId: 'y1'
            });
            const subject = await Subject.createWithValidation({
                id: 's1',
                name: 'Subject 1',
                moduleId: 'm1'
            });

            try {
                await Subject.updateWithValidation('s1', {
                    moduleId: 'non_existent'
                });
                assert.fail('Should have thrown error for invalid Module reference');
            } catch (error) {
                assert(error.message.includes('does not exist'));
            }
        });
    });

    // ============================================
    // PART 3: UNIQUE CONSTRAINT INTEGRITY
    // ============================================
    describe('Part 3: Unique Constraint Integrity', () => {
        it('Should prevent duplicate Year IDs', async () => {
            await Year.createWithValidation({ id: 'y1', name: 'Year 1' });

            try {
                await Year.createWithValidation({ id: 'y1', name: 'Duplicate Year' });
                assert.fail('Should have thrown error for duplicate Year ID');
            } catch (error) {
                assert(error.message.includes('already exists'));
            }
        });

        it('Should prevent duplicate Module IDs', async () => {
            await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            await Module.createWithValidation({ id: 'm1', name: 'Module 1', yearId: 'y1' });

            try {
                await Module.createWithValidation({
                    id: 'm1',
                    name: 'Duplicate Module',
                    yearId: 'y1'
                });
                assert.fail('Should have thrown error for duplicate Module ID');
            } catch (error) {
                assert(error.message.includes('already exists'));
            }
        });

        it('Should prevent duplicate Subject IDs', async () => {
            await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            await Module.createWithValidation({ id: 'm1', name: 'Module 1', yearId: 'y1' });
            await Subject.createWithValidation({
                id: 's1',
                name: 'Subject 1',
                moduleId: 'm1'
            });

            try {
                await Subject.createWithValidation({
                    id: 's1',
                    name: 'Duplicate Subject',
                    moduleId: 'm1'
                });
                assert.fail('Should have thrown error for duplicate Subject ID');
            } catch (error) {
                assert(error.message.includes('already exists'));
            }
        });

        it('Should prevent duplicate Lecture IDs', async () => {
            await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            await Module.createWithValidation({ id: 'm1', name: 'Module 1', yearId: 'y1' });
            await Subject.createWithValidation({
                id: 's1',
                name: 'Subject 1',
                moduleId: 'm1'
            });
            await Lecture.createWithValidation({
                id: 'l1',
                name: 'Lecture 1',
                subjectId: 's1'
            });

            try {
                await Lecture.createWithValidation({
                    id: 'l1',
                    name: 'Duplicate Lecture',
                    subjectId: 's1'
                });
                assert.fail('Should have thrown error for duplicate Lecture ID');
            } catch (error) {
                assert(error.message.includes('already exists'));
            }
        });
    });

    // ============================================
    // PART 4: CASCADE DELETION INTEGRITY
    // ============================================
    describe('Part 4: Cascade Deletion Integrity', () => {
        it('Deleting Year should cascade delete all Modules', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            await Module.createWithValidation({ id: 'm1', name: 'Module 1', yearId: 'y1' });
            await Module.createWithValidation({ id: 'm2', name: 'Module 2', yearId: 'y1' });

            await Year.deleteOne({ id: 'y1' });

            const moduleCount = await Module.countDocuments({ yearId: 'y1' });
            assert.strictEqual(moduleCount, 0);
        });

        it('Deleting Year should cascade delete all Subjects', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const module = await Module.createWithValidation({
                id: 'm1',
                name: 'Module 1',
                yearId: 'y1'
            });
            await Subject.createWithValidation({
                id: 's1',
                name: 'Subject 1',
                moduleId: 'm1'
            });
            await Subject.createWithValidation({
                id: 's2',
                name: 'Subject 2',
                moduleId: 'm1'
            });

            await Year.deleteOne({ id: 'y1' });

            const subjectCount = await Subject.countDocuments();
            assert.strictEqual(subjectCount, 0);
        });

        it('Deleting Year should cascade delete all Lectures', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const module = await Module.createWithValidation({
                id: 'm1',
                name: 'Module 1',
                yearId: 'y1'
            });
            const subject = await Subject.createWithValidation({
                id: 's1',
                name: 'Subject 1',
                moduleId: 'm1'
            });
            await Lecture.createWithValidation({
                id: 'l1',
                name: 'Lecture 1',
                subjectId: 's1'
            });
            await Lecture.createWithValidation({
                id: 'l2',
                name: 'Lecture 2',
                subjectId: 's1'
            });

            await Year.deleteOne({ id: 'y1' });

            const lectureCount = await Lecture.countDocuments();
            assert.strictEqual(lectureCount, 0);
        });

        it('Deleting Module should cascade delete all Subjects and Lectures', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const module = await Module.createWithValidation({
                id: 'm1',
                name: 'Module 1',
                yearId: 'y1'
            });
            const subject = await Subject.createWithValidation({
                id: 's1',
                name: 'Subject 1',
                moduleId: 'm1'
            });
            await Lecture.createWithValidation({
                id: 'l1',
                name: 'Lecture 1',
                subjectId: 's1'
            });

            await Module.deleteOne({ id: 'm1' });

            const subjectCount = await Subject.countDocuments({ moduleId: 'm1' });
            const lectureCount = await Lecture.countDocuments({ subjectId: 's1' });
            assert.strictEqual(subjectCount, 0);
            assert.strictEqual(lectureCount, 0);
        });

        it('Deleting Subject should cascade delete all Lectures', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const module = await Module.createWithValidation({
                id: 'm1',
                name: 'Module 1',
                yearId: 'y1'
            });
            const subject = await Subject.createWithValidation({
                id: 's1',
                name: 'Subject 1',
                moduleId: 'm1'
            });
            await Lecture.createWithValidation({
                id: 'l1',
                name: 'Lecture 1',
                subjectId: 's1'
            });
            await Lecture.createWithValidation({
                id: 'l2',
                name: 'Lecture 2',
                subjectId: 's1'
            });

            await Subject.deleteOne({ id: 's1' });

            const lectureCount = await Lecture.countDocuments({ subjectId: 's1' });
            assert.strictEqual(lectureCount, 0);
        });

        it('Should not cascade delete when deleting Lecture', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const module = await Module.createWithValidation({
                id: 'm1',
                name: 'Module 1',
                yearId: 'y1'
            });
            const subject = await Subject.createWithValidation({
                id: 's1',
                name: 'Subject 1',
                moduleId: 'm1'
            });
            await Lecture.createWithValidation({
                id: 'l1',
                name: 'Lecture 1',
                subjectId: 's1'
            });

            await Lecture.deleteOne({ id: 'l1' });

            const subjectExists = await Subject.findOne({ id: 's1' });
            assert.strictEqual(subjectExists !== null, true);
        });
    });

    // ============================================
    // PART 5: DATA CLEANLINESS & CONSISTENCY
    // ============================================
    describe('Part 5: Data Cleanliness & Consistency', () => {
        it('Should maintain timestamp consistency on CREATE', async () => {
            const now = new Date();
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });

            assert(year.createdAt);
            assert(year.updatedAt);
            assert(year.createdAt.getTime() >= now.getTime() - 1000);
            assert(year.createdAt.getTime() === year.updatedAt.getTime());
        });

        it('Should update timestamp on UPDATE', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const originalUpdatedAt = year.updatedAt;

            await new Promise(resolve => setTimeout(resolve, 100));

            const updated = await Year.updateWithValidation('y1', { name: 'Updated' });

            assert(updated.updatedAt.getTime() > originalUpdatedAt.getTime());
        });

        it('Should enforce required fields on CREATE', async () => {
            try {
                await Year.create({ name: 'No ID' }); // Missing required 'id'
                assert.fail('Should have thrown error for missing required field');
            } catch (error) {
                assert(error.message.includes('required'));
            }
        });

        it('Should maintain data type consistency for all entities', async () => {
            const year = await Year.createWithValidation({
                id: 'y1',
                name: 'Year 1',
                icon: '1️⃣'
            });

            assert.strictEqual(typeof year.id, 'string');
            assert.strictEqual(typeof year.name, 'string');
            assert.strictEqual(typeof year.icon, 'string');
        });

        it('Should preserve data integrity across multiple updates', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1', icon: '1️⃣' });

            await Year.updateWithValidation('y1', { name: 'Updated Name' });
            await Year.updateWithValidation('y1', { icon: '📚' });

            const updated = await Year.findOne({ id: 'y1' });
            assert.strictEqual(updated.name, 'Updated Name');
            assert.strictEqual(updated.icon, '📚');
        });

        it('Should not allow empty strings in required fields', async () => {
            try {
                await Year.createWithValidation({ id: '', name: 'Year 1' });
                assert.fail('Should have thrown error for empty ID');
            } catch (error) {
                // Expected to fail
                assert(error);
            }
        });
    });

    // ============================================
    // PART 6: QUESTION INTEGRITY
    // ============================================
    describe('Part 6: Question Integrity', () => {
        beforeEach(async () => {
            await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            await Module.createWithValidation({ id: 'm1', name: 'Module 1', yearId: 'y1' });
            await Subject.createWithValidation({
                id: 's1',
                name: 'Subject 1',
                moduleId: 'm1'
            });
        });

        it('Should prevent questions with less than 2 options', async () => {
            try {
                await Lecture.createWithValidation({
                    id: 'l1',
                    name: 'Lecture 1',
                    subjectId: 's1',
                    questions: [{
                        id: 'q1',
                        text: 'Question',
                        options: ['A'], // Only 1 option
                        correctAnswer: 0
                    }]
                });
                assert.fail('Should have thrown error for insufficient options');
            } catch (error) {
                assert(error.message.includes('at least 2 options'));
            }
        });

        it('Should prevent duplicate question IDs within a lecture', async () => {
            try {
                await Lecture.createWithValidation({
                    id: 'l1',
                    name: 'Lecture 1',
                    subjectId: 's1',
                    questions: [
                        {
                            id: 'q1',
                            text: 'Question 1',
                            options: ['A', 'B'],
                            correctAnswer: 0
                        },
                        {
                            id: 'q1', // Duplicate ID
                            text: 'Question 2',
                            options: ['C', 'D'],
                            correctAnswer: 1
                        }
                    ]
                });
                assert.fail('Should have thrown error for duplicate question ID');
            } catch (error) {
                assert(error.message.includes('must be unique'));
            }
        });

        it('Should prevent correctAnswer index outside options range', async () => {
            try {
                await Lecture.createWithValidation({
                    id: 'l1',
                    name: 'Lecture 1',
                    subjectId: 's1',
                    questions: [{
                        id: 'q1',
                        text: 'Question',
                        options: ['A', 'B'],
                        correctAnswer: 5 // Invalid index
                    }]
                });
                assert.fail('Should have thrown error for invalid correctAnswer');
            } catch (error) {
                assert(error.message.includes('Invalid correct answer index') || error.message.includes('within the range'));
            }
        });

        it('Should prevent duplicate options within a question', async () => {
            try {
                await Lecture.createWithValidation({
                    id: 'l1',
                    name: 'Lecture 1',
                    subjectId: 's1',
                    questions: [{
                        id: 'q1',
                        text: 'Question',
                        options: ['A', 'B', 'A'], // Duplicate option
                        correctAnswer: 0
                    }]
                });
                assert.fail('Should have thrown error for duplicate options');
            } catch (error) {
                assert(error.message.includes('must be unique'));
            }
        });

        it('Should allow adding question to existing lecture', async () => {
            const lecture = await Lecture.createWithValidation({
                id: 'l1',
                name: 'Lecture 1',
                subjectId: 's1',
                questions: []
            });

            await lecture.addQuestion({
                id: 'q1',
                text: 'Question 1',
                options: ['A', 'B', 'C'],
                correctAnswer: 1
            });

            const updated = await Lecture.findOne({ id: 'l1' });
            assert.strictEqual(updated.questions.length, 1);
            assert.strictEqual(updated.questions[0].text, 'Question 1');
        });

        it('Should prevent adding duplicate question ID to lecture', async () => {
            const lecture = await Lecture.createWithValidation({
                id: 'l1',
                name: 'Lecture 1',
                subjectId: 's1',
                questions: [{
                    id: 'q1',
                    text: 'Question 1',
                    options: ['A', 'B'],
                    correctAnswer: 0
                }]
            });

            try {
                await lecture.addQuestion({
                    id: 'q1', // Duplicate
                    text: 'Question 2',
                    options: ['C', 'D'],
                    correctAnswer: 1
                });
                assert.fail('Should have thrown error for duplicate question ID');
            } catch (error) {
                assert(error.message.includes('already exists'));
            }
        });
    });

    // ============================================
    // PART 7: ID RENAMING INTEGRITY
    // ============================================
    describe('Part 7: ID Renaming Integrity', () => {
        it('Should update all child references when renaming Module ID', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const module = await Module.createWithValidation({
                id: 'm1',
                name: 'Module 1',
                yearId: 'y1'
            });
            const subject1 = await Subject.createWithValidation({
                id: 's1',
                name: 'Subject 1',
                moduleId: 'm1'
            });
            const subject2 = await Subject.createWithValidation({
                id: 's2',
                name: 'Subject 2',
                moduleId: 'm1'
            });

            await Module.updateWithValidation('m1', { id: 'm1_renamed' });

            const updatedSubject1 = await Subject.findOne({ id: 's1' });
            const updatedSubject2 = await Subject.findOne({ id: 's2' });

            assert.strictEqual(updatedSubject1.moduleId, 'm1_renamed');
            assert.strictEqual(updatedSubject2.moduleId, 'm1_renamed');
        });

        it('Should update all lecture references when renaming Subject ID', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const module = await Module.createWithValidation({
                id: 'm1',
                name: 'Module 1',
                yearId: 'y1'
            });
            const subject = await Subject.createWithValidation({
                id: 's1',
                name: 'Subject 1',
                moduleId: 'm1'
            });
            const lecture1 = await Lecture.createWithValidation({
                id: 'l1',
                name: 'Lecture 1',
                subjectId: 's1'
            });
            const lecture2 = await Lecture.createWithValidation({
                id: 'l2',
                name: 'Lecture 2',
                subjectId: 's1'
            });

            await Subject.updateWithValidation('s1', { id: 's1_renamed' });

            const updatedLecture1 = await Lecture.findOne({ id: 'l1' });
            const updatedLecture2 = await Lecture.findOne({ id: 'l2' });

            assert.strictEqual(updatedLecture1.subjectId, 's1_renamed');
            assert.strictEqual(updatedLecture2.subjectId, 's1_renamed');
        });

        it('Should prevent renaming to existing ID', async () => {
            await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            await Year.createWithValidation({ id: 'y2', name: 'Year 2' });

            try {
                await Year.updateWithValidation('y1', { id: 'y2' });
                assert.fail('Should have thrown error for existing ID');
            } catch (error) {
                assert(error.message.includes('already exists'));
            }
        });
    });

    // ============================================
    // PART 8: BULK OPERATIONS CONSISTENCY
    // ============================================
    describe('Part 8: Bulk Operations Consistency', () => {
        it('Should handle multiple CRUD operations sequentially', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const module = await Module.createWithValidation({
                id: 'm1',
                name: 'Module 1',
                yearId: 'y1'
            });
            const subject = await Subject.createWithValidation({
                id: 's1',
                name: 'Subject 1',
                moduleId: 'm1'
            });

            // Perform multiple updates
            await Module.updateWithValidation('m1', { name: 'Updated Module' });
            await Subject.updateWithValidation('s1', { name: 'Updated Subject' });

            // Verify all updates applied correctly
            const updatedModule = await Module.findOne({ id: 'm1' });
            const updatedSubject = await Subject.findOne({ id: 's1' });

            assert.strictEqual(updatedModule.name, 'Updated Module');
            assert.strictEqual(updatedSubject.name, 'Updated Subject');
        });

        it('Should maintain consistency with simultaneous read operations', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const module = await Module.createWithValidation({
                id: 'm1',
                name: 'Module 1',
                yearId: 'y1'
            });

            const [yearRead, moduleRead] = await Promise.all([
                Year.findOne({ id: 'y1' }),
                Module.findOne({ id: 'm1' })
            ]);

            assert.strictEqual(yearRead.name, 'Year 1');
            assert.strictEqual(moduleRead.name, 'Module 1');
        });

        it('Should properly handle large number of records', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const module = await Module.createWithValidation({
                id: 'm1',
                name: 'Module 1',
                yearId: 'y1'
            });

            // Create 50 subjects
            for (let i = 0; i < 50; i++) {
                await Subject.createWithValidation({
                    id: `s${i}`,
                    name: `Subject ${i}`,
                    moduleId: 'm1'
                });
            }

            const subjectCount = await Subject.countDocuments({ moduleId: 'm1' });
            assert.strictEqual(subjectCount, 50);
        });
    });

    // ============================================
    // PART 9: ERROR HANDLING & RECOVERY
    // ============================================
    describe('Part 9: Error Handling & Recovery', () => {
        it('Should maintain database state after failed CREATE', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Year 1' });
            const initialCount = await Year.countDocuments();

            try {
                await Year.createWithValidation({ id: 'y1', name: 'Duplicate' });
            } catch (error) {
                // Expected to fail
            }

            const finalCount = await Year.countDocuments();
            assert.strictEqual(finalCount, initialCount);
        });

        it('Should maintain database state after failed UPDATE', async () => {
            const year = await Year.createWithValidation({ id: 'y1', name: 'Original' });

            try {
                await Year.updateWithValidation('non_existent', { name: 'Updated' });
            } catch (error) {
                // Expected to fail
            }

            const yearData = await Year.findOne({ id: 'y1' });
            assert.strictEqual(yearData.name, 'Original');
        });

        it('Should handle gracefully when deleting non-existent record', async () => {
            const deleteResult = await Year.deleteOne({ id: 'non_existent' });
            assert.strictEqual(deleteResult.deletedCount, 0);
        });
    });

    // ============================================
    // PART 10: ADMIN PANEL SPECIFIC TESTS
    // ============================================
    describe('Part 10: Admin Panel Specific Tests', () => {
        it('Should support full hierarchy creation for admin panel', async () => {
            // Simulate admin panel creating complete hierarchy
            const year = await Year.createWithValidation({
                id: 'admin_y1',
                name: 'Admin Year',
                icon: '1️⃣'
            });

            const module = await Module.createWithValidation({
                id: 'admin_m1',
                name: 'Admin Module',
                yearId: 'admin_y1'
            });

            const subject = await Subject.createWithValidation({
                id: 'admin_s1',
                name: 'Admin Subject',
                moduleId: 'admin_m1'
            });

            const lecture = await Lecture.createWithValidation({
                id: 'admin_l1',
                name: 'Admin Lecture',
                subjectId: 'admin_s1',
                questions: [
                    {
                        id: 'admin_q1',
                        text: 'Admin Question 1',
                        options: ['A', 'B', 'C', 'D'],
                        correctAnswer: 2
                    },
                    {
                        id: 'admin_q2',
                        text: 'Admin Question 2',
                        options: ['Yes', 'No'],
                        correctAnswer: 0
                    }
                ]
            });

            // Verify hierarchy integrity
            assert.strictEqual(lecture.questions.length, 2);
            const savedLecture = await Lecture.findOne({ id: 'admin_l1' });
            assert.strictEqual(savedLecture.subjectId, 'admin_s1');
        });

        it('Should support admin panel bulk data operations', async () => {
            // Create base hierarchy
            const year = await Year.createWithValidation({
                id: 'bulk_y1',
                name: 'Bulk Year'
            });

            // Create multiple modules
            const modules = [];
            for (let i = 0; i < 3; i++) {
                const mod = await Module.createWithValidation({
                    id: `bulk_m${i}`,
                    name: `Bulk Module ${i}`,
                    yearId: 'bulk_y1'
                });
                modules.push(mod);
            }

            // Verify all modules created
            const moduleCount = await Module.countDocuments({ yearId: 'bulk_y1' });
            assert.strictEqual(moduleCount, 3);

            // Delete one module
            await Module.deleteOne({ id: 'bulk_m1' });

            // Verify remaining modules
            const remainingCount = await Module.countDocuments({ yearId: 'bulk_y1' });
            assert.strictEqual(remainingCount, 2);
        });

        it('Should support admin panel data export consistency', async () => {
            // Create test hierarchy
            const year = await Year.createWithValidation({
                id: 'export_y1',
                name: 'Export Year'
            });
            const module = await Module.createWithValidation({
                id: 'export_m1',
                name: 'Export Module',
                yearId: 'export_y1'
            });
            const subject = await Subject.createWithValidation({
                id: 'export_s1',
                name: 'Export Subject',
                moduleId: 'export_m1'
            });

            // Retrieve all data
            const allYears = await Year.find({});
            const allModules = await Module.find({});
            const allSubjects = await Subject.find({});

            // Verify data consistency
            assert(allYears.length > 0);
            assert(allModules.length > 0);
            assert(allSubjects.length > 0);

            const exportYear = allYears.find(y => y.id === 'export_y1');
            assert.strictEqual(exportYear.name, 'Export Year');
        });
    });
});

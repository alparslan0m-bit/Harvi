const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');
require('dotenv').config();

const { Year } = require('./models/Year');
const { Module } = require('./models/Module');
const { Subject } = require('./models/Subject');
const { Lecture } = require('./models/Lecture');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mcq_app';

async function seed() {
    try {
        console.log('Attempting to connect to MongoDB...');
        
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // 5 second timeout
            socketTimeoutMS: 45000, // 45 second timeout
        });
        
        console.log('Successfully connected to MongoDB');

        console.log('Clearing existing collections...');
        await Year.deleteMany({});
        await Module.deleteMany({});
        await Subject.deleteMany({});
        await Lecture.deleteMany({});

        const appDataPath = path.join(__dirname, 'seed', 'hierarchy.json');
        const appData = JSON.parse(await fs.readFile(appDataPath, 'utf8'));

        console.log('Seeding database...');

        for (const yearData of appData.years) {
            console.log(`Creating year: ${yearData.name}`);
            
            await Year.create({
                id: yearData.id,
                name: yearData.name,
                icon: yearData.icon
            });

            for (const moduleData of (yearData.modules || [])) {
                console.log(`Creating module: ${moduleData.name}`);
                
                await Module.create({
                    id: moduleData.id,
                    name: moduleData.name,
                    yearId: yearData.id
                });

                for (const subjectData of (moduleData.subjects || [])) {
                    console.log(`Creating subject: ${subjectData.name}`);
                    
                    await Subject.create({
                        id: subjectData.id,
                        name: subjectData.name,
                        moduleId: moduleData.id
                    });

                    for (const lecture of (subjectData.lectures || [])) {
                        await Lecture.create({
                            id: lecture.id,
                            name: lecture.name,
                            subjectId: subjectData.id,
                            questions: []
                        });
                    }
                }
            }
        }
        console.log('Seeding completed');
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

seed().then(() => {
    console.log('Seeding process complete');
}).catch(err => {
    console.error('Fatal error:', err);
    process.exitCode = 1;
});



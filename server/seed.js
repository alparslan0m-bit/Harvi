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
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log('Successfully connected to MongoDB');
        console.log('Clearing existing collections...');
        await Year.deleteMany({});
        await Module.deleteMany({});
        await Subject.deleteMany({});
        await Lecture.deleteMany({});
        const appDataPath = path.join(__dirname, 'seed', 'hierarchy.json');
        const appData = JSON.parse(await fs.readFile(appDataPath, 'utf8'));
        console.log('Seeding database with new ID format...');
        for (const yearData of appData.years) {
            const yearId = yearData.id; // e.g., "year1"
            console.log(`Creating year: ${yearData.name} (${yearId})`);
            
            await Year.create({
                id: yearId,
                name: yearData.name,
                icon: yearData.icon
            });
            let moduleCounter = 1;
            for (const moduleData of (yearData.modules || [])) {
                // Auto-generate module ID: year1_mod1, year1_mod2, etc.
                const moduleId = moduleData.id || `${yearId}_mod${moduleCounter}`;
                console.log(`  Creating module: ${moduleData.name} (${moduleId})`);
                
                await Module.create({
                    id: moduleId,
                    name: moduleData.name,
                    yearId: yearId
                });
                let subjectCounter = 1;
                for (const subjectData of (moduleData.subjects || [])) {
                    // Auto-generate subject ID: year1_mod1_sub1, etc.
                    const subjectId = subjectData.id || `${moduleId}_sub${subjectCounter}`;
                    console.log(`    Creating subject: ${subjectData.name} (${subjectId})`);
                    
                    await Subject.create({
                        id: subjectId,
                        name: subjectData.name,
                        moduleId: moduleId
                    });
                    let lectureCounter = 1;
                    for (const lectureData of (subjectData.lectures || [])) {
                        // Auto-generate lecture ID: year1_mod1_sub1_lec1, etc.
                        const lectureId = lectureData.id || `${subjectId}_lec${lectureCounter}`;
                        console.log(`      Creating lecture: ${lectureData.name} (${lectureId})`);
                        
                        await Lecture.create({
                            id: lectureId,
                            name: lectureData.name,
                            subjectId: subjectId,
                            questions: lectureData.questions || []
                        });
                        lectureCounter++;
                    }
                    subjectCounter++;
                }
                moduleCounter++;
            }
        }
        console.log('✅ Seeding completed with new ID format!');
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



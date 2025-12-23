#!/usr/bin/env node

/**
 * CRUD Test Verification Script
 * Checks if the environment is ready to run the comprehensive test suite
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     CRUD TEST SUITE - Environment Verification             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let allGood = true;

// Check 1: Test file exists
console.log('📋 Checking test file...');
const testFile = path.join(__dirname, 'server', 'tests', 'crud-integrity-tests.js');
if (fs.existsSync(testFile)) {
    const stats = fs.statSync(testFile);
    console.log(`   ✅ crud-integrity-tests.js found (${stats.size} bytes)\n`);
} else {
    console.log(`   ❌ crud-integrity-tests.js NOT found at ${testFile}\n`);
    allGood = false;
}

// Check 2: Documentation exists
console.log('📚 Checking documentation...');
const docFile = path.join(__dirname, 'CRUD_TEST_DOCUMENTATION.md');
if (fs.existsSync(docFile)) {
    console.log(`   ✅ CRUD_TEST_DOCUMENTATION.md found\n`);
} else {
    console.log(`   ❌ CRUD_TEST_DOCUMENTATION.md NOT found\n`);
    allGood = false;
}

// Check 3: Quick start guide exists
console.log('🚀 Checking quick start guide...');
const quickStart = path.join(__dirname, 'CRUD_TEST_QUICK_START.md');
if (fs.existsSync(quickStart)) {
    console.log(`   ✅ CRUD_TEST_QUICK_START.md found\n`);
} else {
    console.log(`   ❌ CRUD_TEST_QUICK_START.md NOT found\n`);
    allGood = false;
}

// Check 4: Models exist
console.log('🗂️  Checking data models...');
const models = ['Year.js', 'Module.js', 'Subject.js', 'Lecture.js'];
let modelsOk = true;
for (const model of models) {
    const modelPath = path.join(__dirname, 'server', 'models', model);
    if (fs.existsSync(modelPath)) {
        console.log(`   ✅ ${model}`);
    } else {
        console.log(`   ❌ ${model} NOT found`);
        modelsOk = false;
        allGood = false;
    }
}
console.log();

// Check 5: Package.json scripts
console.log('📦 Checking npm scripts...');
const packageJson = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJson)) {
    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    const requiredScripts = ['test:crud', 'test:all'];
    let scriptsOk = true;
    for (const script of requiredScripts) {
        if (pkg.scripts && pkg.scripts[script]) {
            console.log(`   ✅ npm run ${script}`);
        } else {
            console.log(`   ❌ npm run ${script} NOT found`);
            scriptsOk = false;
            allGood = false;
        }
    }
    console.log();
} else {
    console.log(`   ❌ package.json NOT found\n`);
    allGood = false;
}

// Check 6: Dependencies
console.log('🔧 Checking dependencies...');
const requiredDeps = ['mocha', 'mongoose'];
if (fs.existsSync(packageJson)) {
    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    for (const dep of requiredDeps) {
        if (pkg.devDependencies && pkg.devDependencies[dep]) {
            console.log(`   ✅ ${dep} ${pkg.devDependencies[dep]}`);
        } else if (pkg.dependencies && pkg.dependencies[dep]) {
            console.log(`   ✅ ${dep} ${pkg.dependencies[dep]}`);
        } else {
            console.log(`   ❌ ${dep} NOT found in dependencies`);
            allGood = false;
        }
    }
    console.log();
}

// Check 7: Server exists
console.log('🖥️  Checking server setup...');
const serverFile = path.join(__dirname, 'server', 'index.js');
if (fs.existsSync(serverFile)) {
    console.log(`   ✅ server/index.js found\n`);
} else {
    console.log(`   ❌ server/index.js NOT found\n`);
    allGood = false;
}

// Summary
console.log('╔════════════════════════════════════════════════════════════╗');
if (allGood) {
    console.log('║                   ✅ ALL CHECKS PASSED!                     ║');
    console.log('║                                                            ║');
    console.log('║  Your environment is ready to run CRUD tests.             ║');
    console.log('║                                                            ║');
    console.log('║  To get started:                                           ║');
    console.log('║    1. Start MongoDB: mongod                                ║');
    console.log('║    2. Run tests: npm run test:crud                         ║');
    console.log('║    3. Read docs: CRUD_TEST_QUICK_START.md                  ║');
} else {
    console.log('║                 ⚠️  SOME CHECKS FAILED                      ║');
    console.log('║                                                            ║');
    console.log('║  Please fix the issues above before running tests.         ║');
}
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Print helpful info
console.log('📌 NEXT STEPS:\n');
console.log('1️⃣  Ensure MongoDB is running:');
console.log('   mongod\n');

console.log('2️⃣  Install dependencies (if needed):');
console.log('   npm install\n');

console.log('3️⃣  Run the CRUD test suite:');
console.log('   npm run test:crud\n');

console.log('4️⃣  View test documentation:');
console.log('   cat CRUD_TEST_QUICK_START.md\n');

console.log('📖 Available commands:');
console.log('   npm run test:crud     - Run CRUD integrity tests only');
console.log('   npm run test:all      - Run all tests');
console.log('   npm run test:crud -- --grep "pattern" - Run specific tests\n');

process.exit(allGood ? 0 : 1);

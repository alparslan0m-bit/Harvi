# CRUD Test Suite - Quick Start Guide

## 🚀 Quick Commands

### Run CRUD Integrity Tests
```bash
npm run test:crud
```

### Run All Tests (including existing tests)
```bash
npm run test:all
```

### Run Specific Test Section
```bash
npm run test:crud -- --grep "Part 1"
npm run test:crud -- --grep "Referential Integrity"
```

## 📋 Test Overview

**Total Tests:** 59 comprehensive CRUD tests
**Test File:** `server/tests/crud-integrity-tests.js`
**Database:** `mcq_crud_integrity_test` (isolated, auto-cleaned)

## 🧪 What Gets Tested?

### ✅ Create Operations
- All entities (Year, Module, Subject, Lecture)
- With and without optional fields
- Timestamp generation

### ✅ Read Operations  
- Single record retrieval by ID
- Multiple records retrieval
- Sorting and filtering

### ✅ Update Operations
- Field modifications
- ID renaming with cascading
- Timestamp updates

### ✅ Delete Operations
- Single record deletion
- Cascade deletion through hierarchy
- Orphan prevention

### ✅ Integrity Checks
- Referential integrity (valid parent IDs)
- Unique constraints (no duplicate IDs)
- Data type consistency
- Required field validation

### ✅ Data Quality
- No orphaned records
- Cascading deletions work correctly
- Timestamps accurate
- Questions validated properly

### ✅ Admin Features
- Bulk operations
- Hierarchy creation
- Data export

## 📊 Test Categories

| Category | Tests | Focus |
|----------|-------|-------|
| Basic CRUD | 20 | Create, Read, Update, Delete per entity |
| References | 5 | Parent-child relationships valid |
| Uniqueness | 4 | No duplicate IDs |
| Cascading | 6 | Hierarchical deletion |
| Data Quality | 6 | Field validation & types |
| Questions | 6 | Question validation rules |
| Renaming | 3 | ID changes propagate correctly |
| Bulk Ops | 3 | Multiple operations |
| Error Handling | 3 | Graceful failures |
| Admin Panel | 3 | Workflow simulations |

## ✨ Key Features Tested

### Hierarchy Structure
```
Year (icon, timestamps)
  └─ Module (yearId reference)
     └─ Subject (moduleId reference)
        └─ Lecture (subjectId optional)
           └─ Questions (id, text, options, correctAnswer)
```

### Validation Rules
- ✅ Minimum 2 options per question
- ✅ No duplicate options in question
- ✅ correctAnswer is valid index
- ✅ All IDs must be unique
- ✅ All references must point to existing entities

### Cascade Behavior
```
DELETE Year → DELETE all Modules
            → DELETE all Subjects  
            → DELETE all Lectures

DELETE Module → DELETE all Subjects
             → DELETE all Lectures

DELETE Subject → DELETE all Lectures

DELETE Lecture → (no cascade)
```

## 🔍 Expected Output

### Successful Run
```
CRUD System Integrity & Cleanliness Tests
  Part 1: Basic CRUD Operations
    Year CRUD
      ✓ CREATE: Should create a year successfully
      ✓ READ: Should retrieve a year by ID
      ✓ UPDATE: Should update year data
      ✓ DELETE: Should delete a year
    Module CRUD
      ✓ CREATE: Should create a module successfully
      ...
  
  Part 2: Referential Integrity
    ✓ Should prevent creating Module with non-existent Year
    ...

  ...total tests...
  59 passing (12345ms)
```

### Failed Test Example
```
1) CRUD System Integrity & Cleanliness Tests
     Part 2: Referential Integrity
       Should prevent creating Module with non-existent Year:
   
   Error: Expected error but got: [actual error message]
```

## 🛠️ Troubleshooting

### MongoDB Not Running
```bash
# Start MongoDB
mongod
# or with Docker
docker run -d -p 27017:27017 mongo
```

### Clear Test Database
```bash
mongosh
use mcq_crud_integrity_test
db.dropDatabase()
exit
```

### Run Single Test
```bash
npm run test:crud -- --grep "CREATE: Should create a year"
```

### See Detailed Errors
```bash
npm run test:crud -- --reporter tap
```

## 📈 Testing Best Practices

1. **Before Deployment**
   - Run `npm run test:all` 
   - Verify all 59 tests pass
   - Check for any deprecation warnings

2. **After Model Changes**
   - Run `npm run test:crud`
   - Update tests if new validations added
   - Ensure backward compatibility

3. **During Development**
   - Run specific test: `npm run test:crud -- --grep "specific test"`
   - Focus on affected area
   - Verify fixes don't break other tests

## 📝 Common Test Patterns

### Testing Create
```javascript
const entity = await Model.createWithValidation({ /* data */ });
assert.strictEqual(entity.id, expectedId);
```

### Testing Cascade
```javascript
await Parent.deleteOne({ id: parentId });
const childCount = await Child.countDocuments({ parentId: parentId });
assert.strictEqual(childCount, 0);
```

### Testing Validation
```javascript
try {
  await Model.createWithValidation({ /* invalid */ });
  assert.fail('Should have thrown error');
} catch (error) {
  assert(error.message.includes('expected message'));
}
```

## 🎯 Test Goals

✅ **Prevent Data Corruption** - All CRUD operations safe
✅ **Maintain Consistency** - References always valid
✅ **Ensure Cleanliness** - No orphaned records
✅ **Support Admin Panel** - All management operations work
✅ **Validate User Data** - Question structure enforced

## 📞 Support

For issues or questions about tests:
1. Check `CRUD_TEST_DOCUMENTATION.md` for detailed info
2. Review specific failing test in `crud-integrity-tests.js`
3. Check model validation in `server/models/`
4. Verify MongoDB connection is active

## 🎓 Learn More

- Full documentation: See `CRUD_TEST_DOCUMENTATION.md`
- Models: `server/models/Year.js`, `Module.js`, `Subject.js`, `Lecture.js`
- API: `server/index.js` (routes at `/api/admin/*`)

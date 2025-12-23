# CRUD Test Suite - Visual Reference & Test Map

## 📊 Test Suite Architecture

```
CRUD System Integrity & Cleanliness Tests (59 tests total)
│
├─ Part 1: Basic CRUD Operations (20 tests)
│  ├─ Year CRUD
│  │  ├─ CREATE: Should create a year successfully ✓
│  │  ├─ READ: Should retrieve a year by ID ✓
│  │  ├─ READ: Should retrieve all years ✓
│  │  ├─ UPDATE: Should update year data ✓
│  │  └─ DELETE: Should delete a year ✓
│  ├─ Module CRUD (5 tests)
│  ├─ Subject CRUD (5 tests)
│  └─ Lecture CRUD (5 tests)
│
├─ Part 2: Referential Integrity (5 tests)
│  ├─ Prevent Module with non-existent Year ✓
│  ├─ Prevent Subject with non-existent Module ✓
│  ├─ Validate Lecture references ✓
│  ├─ Validate Year ref on Module UPDATE ✓
│  └─ Validate Module ref on Subject UPDATE ✓
│
├─ Part 3: Unique Constraint Integrity (4 tests)
│  ├─ Prevent duplicate Year IDs ✓
│  ├─ Prevent duplicate Module IDs ✓
│  ├─ Prevent duplicate Subject IDs ✓
│  └─ Prevent duplicate Lecture IDs ✓
│
├─ Part 4: Cascade Deletion Integrity (6 tests)
│  ├─ Year DELETE cascades to Modules ✓
│  ├─ Year DELETE cascades to Subjects ✓
│  ├─ Year DELETE cascades to Lectures ✓
│  ├─ Module DELETE cascades to Subjects & Lectures ✓
│  ├─ Subject DELETE cascades to Lectures ✓
│  └─ Lecture DELETE doesn't cascade ✓
│
├─ Part 5: Data Cleanliness & Consistency (6 tests)
│  ├─ Timestamp consistency on CREATE ✓
│  ├─ Timestamp updates on UPDATE ✓
│  ├─ Required field enforcement ✓
│  ├─ Data type consistency ✓
│  ├─ Multi-update consistency ✓
│  └─ Empty string prevention ✓
│
├─ Part 6: Question Integrity (6 tests)
│  ├─ Prevent < 2 options ✓
│  ├─ Prevent duplicate question IDs ✓
│  ├─ Validate correctAnswer index ✓
│  ├─ Prevent duplicate options ✓
│  ├─ Allow question addition ✓
│  └─ Prevent duplicate question addition ✓
│
├─ Part 7: ID Renaming Integrity (3 tests)
│  ├─ Module ID rename cascades to Subjects ✓
│  ├─ Subject ID rename cascades to Lectures ✓
│  └─ Prevent rename to existing ID ✓
│
├─ Part 8: Bulk Operations Consistency (3 tests)
│  ├─ Sequential CRUD consistency ✓
│  ├─ Concurrent read consistency ✓
│  └─ Large dataset handling (50+ records) ✓
│
├─ Part 9: Error Handling & Recovery (3 tests)
│  ├─ Database state after failed CREATE ✓
│  ├─ Database state after failed UPDATE ✓
│  └─ Non-existent record deletion ✓
│
└─ Part 10: Admin Panel Specific Tests (3 tests)
   ├─ Complete hierarchy creation ✓
   ├─ Bulk data operations ✓
   └─ Data export consistency ✓
```

---

## 🔗 Data Hierarchy & Relationships

```
┌─────────────────────────────────────────────┐
│              YEAR (✓ Icon Support)          │
│  - id (unique)                              │
│  - name                                     │
│  - icon (optional)                          │
│  - timestamps                               │
└──────────────────────┬──────────────────────┘
                       │ yearId (1:N)
                       ↓
           ┌───────────────────────┐
           │      MODULE           │
           │ - id (unique)         │
           │ - name                │
           │ - yearId (required)   │
           │ - timestamps          │
           └───────────┬───────────┘
                       │ moduleId (1:N)
                       ↓
           ┌───────────────────────┐
           │      SUBJECT          │
           │ - id (unique)         │
           │ - name                │
           │ - moduleId (required) │
           │ - timestamps          │
           └───────────┬───────────┘
                       │ subjectId (1:N)
                       ↓
      ┌────────────────────────────┐
      │        LECTURE             │
      │ - id (unique)              │
      │ - name                     │
      │ - subjectId (optional)     │
      │ - questions (array)        │
      │ - timestamps               │
      └────────────┬───────────────┘
                   │ (embedded)
                   ↓
    ┌──────────────────────────────┐
    │       QUESTION (embedded)    │
    │ - id (unique per lecture)    │
    │ - text (required)            │
    │ - options (min 2, unique)    │
    │ - correctAnswer (valid idx)  │
    └──────────────────────────────┘
```

---

## 📋 Test Execution Flow

```
START
  │
  ├─→ Connect to MongoDB (mcq_crud_integrity_test)
  │
  ├─→ BEFORE: Clear all collections
  │
  ├─→ Part 1: Basic CRUD (20 tests)
  │   ├─→ Create entities ✓
  │   ├─→ Read entities ✓
  │   ├─→ Update entities ✓
  │   └─→ Delete entities ✓
  │
  ├─→ AFTER EACH TEST: Clear collections
  │
  ├─→ Part 2-5: Validation Tests (21 tests)
  │   ├─→ Referential integrity ✓
  │   ├─→ Unique constraints ✓
  │   ├─→ Cascade deletion ✓
  │   └─→ Data cleanliness ✓
  │
  ├─→ Part 6-7: Advanced Tests (9 tests)
  │   ├─→ Question integrity ✓
  │   └─→ ID renaming ✓
  │
  ├─→ Part 8-10: Integration Tests (9 tests)
  │   ├─→ Bulk operations ✓
  │   ├─→ Error handling ✓
  │   └─→ Admin workflows ✓
  │
  ├─→ AFTER ALL: Close MongoDB connection
  │
  └─→ OUTPUT RESULTS
     ├─ 59 tests passed ✓ → DEPLOYMENT READY
     ├─ N tests failed ✗ → NEEDS FIXES
     └─ Summary stats
```

---

## 🎯 Test Dependencies & Order

```
Independent Test Groups (can run parallel):
├─ Group A: Year Operations
├─ Group B: Module Operations (requires Year)
├─ Group C: Subject Operations (requires Module)
├─ Group D: Lecture Operations (requires Subject)
└─ Group E: Question Operations (requires Lecture)

Sequential Dependencies:
Year → Module → Subject → Lecture → Question
(Parent must exist before child)

Cascade Tests:
Depend on full hierarchy creation
Run only after Part 1 completes
```

---

## ✅ Validation Checklist

Each test verifies multiple aspects:

### Create Operation Checklist
```
CREATE Test Includes:
□ Entity created with correct ID
□ All fields populated correctly
□ createdAt timestamp set
□ updatedAt timestamp set
□ No duplicate IDs allowed
□ Required fields validated
□ Reference validation (if applicable)
□ MongoDB ObjectId generated
```

### Update Operation Checklist
```
UPDATE Test Includes:
□ Entity found by ID
□ Fields updated correctly
□ updatedAt timestamp changes
□ createdAt unchanged
□ Reference validation on change
□ ID rename cascades (if applicable)
□ No data lost
□ Atomicity maintained
```

### Delete Operation Checklist
```
DELETE Test Includes:
□ Record removed from database
□ Cascade children deleted (if applicable)
□ No orphaned records
□ Leaf nodes don't cascade
□ Parent references clean up
□ Count decrements correctly
□ Foreign keys respected
```

### Validation Checklist
```
VALIDATION Test Includes:
□ Required fields enforced
□ Unique constraints checked
□ Reference existence verified
□ Data types validated
□ Range/length validated
□ Format validated (if applicable)
□ Error message descriptive
□ Consistent error handling
```

---

## 📈 Test Coverage Matrix

```
                   Create  Read  Update  Delete  Validate
Year                 ✓      ✓      ✓       ✓        ✓
Module               ✓      ✓      ✓       ✓        ✓
Subject              ✓      ✓      ✓       ✓        ✓
Lecture              ✓      ✓      ✓       ✓        ✓
Questions            ✓      -      ✓       -        ✓
Cascade              -      -      -       ✓        -
References           -      -      -       -        ✓
ID Rename            -      -      ✓       -        -
Timestamps           ✓      ✓      ✓       -        -
Bulk Ops             ✓      ✓      ✓       ✓        -
```

---

## 🚨 Failure Indicators

If tests fail, check:

```
Part 1 Failures → CRUD operations broken
├─ Check: Model methods (createWithValidation, etc.)
├─ Check: MongoDB connection
└─ Check: Required fields in schema

Part 2 Failures → Referential integrity broken
├─ Check: Model methods validate references
├─ Check: Pre-save hooks active
└─ Check: Foreign key existence checked

Part 3 Failures → Unique constraints not enforced
├─ Check: Schema unique: true set
├─ Check: createWithValidation checks duplicates
└─ Check: MongoDB indexes applied

Part 4 Failures → Cascade not working
├─ Check: Pre-delete hooks configured
├─ Check: Cascade deletes child records
└─ Check: No orphaned records remain

Part 5 Failures → Data cleanliness issues
├─ Check: Timestamps generated/updated
├─ Check: Required fields enforced
└─ Check: Data types validated

Part 6 Failures → Question validation broken
├─ Check: Question schema validation
├─ Check: Options array validation
└─ Check: correctAnswer index check

Part 7 Failures → ID rename not cascading
├─ Check: updateWithValidation updates children
├─ Check: References updated in related entities
└─ Check: No duplicates on rename

Part 8 Failures → Bulk operations unsafe
├─ Check: Multiple operations atomic
├─ Check: No race conditions
└─ Check: Large datasets handled

Part 9 Failures → Error recovery failing
├─ Check: Database state preserved on error
├─ Check: No partial records created
└─ Check: Transactions properly handled

Part 10 Failures → Admin workflows broken
├─ Check: Hierarchy creation works
├─ Check: Bulk updates safe
└─ Check: Data export complete
```

---

## 🔄 Common Test Patterns

### Pattern 1: Create & Verify
```javascript
it('CREATE: Should create...', async () => {
    const entity = await Model.createWithValidation(data);
    
    // Assertions
    assert.strictEqual(entity.id, expectedId);
    assert(entity.createdAt);
    assert(entity.updatedAt);
    
    // Verify in DB
    const saved = await Model.findOne({ id: expectedId });
    assert.strictEqual(saved.name, data.name);
});
```

### Pattern 2: Prevent Invalid
```javascript
it('Should prevent...', async () => {
    try {
        await Model.createWithValidation(invalidData);
        assert.fail('Should have thrown error');
    } catch (error) {
        assert(error.message.includes('expected message'));
    }
});
```

### Pattern 3: Cascade Delete
```javascript
it('DELETE should cascade...', async () => {
    // Create hierarchy
    const parent = await Parent.create(data);
    const child = await Child.create({ parentId: parent.id });
    
    // Delete parent
    await Parent.deleteOne({ id: parent.id });
    
    // Verify child deleted
    const childCount = await Child.countDocuments();
    assert.strictEqual(childCount, 0);
});
```

---

## 📊 Success Metrics

✅ **All 59 Tests Pass**
- 0 failures
- 0 skipped
- 10/10 categories pass
- < 15 seconds execution time

✅ **Data Integrity**
- 0 orphaned records
- 100% referential consistency
- 100% unique constraint coverage

✅ **Admin Panel**
- Bulk operations safe
- Hierarchy creation works
- Data export complete

---

## 🎓 Quick Reference

| Task | Command |
|------|---------|
| Check setup | `node check-tests.js` |
| Run tests | `npm run test:crud` |
| Run all | `npm run test:all` |
| Specific test | `npm run test:crud -- --grep "Pattern"` |
| View docs | `cat CRUD_TEST_DOCUMENTATION.md` |
| See results | `cat TEST_RESULTS_[DATE].md` |

---

## 📌 Remember

- ✅ Always run tests before deployment
- ✅ Ensure MongoDB is running
- ✅ Check environment with `check-tests.js`
- ✅ Read quick start guide first
- ✅ Document results for audit trail
- ✅ Address any failures before deployment

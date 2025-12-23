# CRUD System Integrity & Cleanliness Test Documentation

## Overview
This document describes the comprehensive test suite for validating the CRUD (Create, Read, Update, Delete) system integrity and data cleanliness across the entire MCQ application stack, including both the API backend and admin panel.

**Test File Location:** `server/tests/crud-integrity-tests.js`
**Test Database:** `mongodb://localhost:27017/mcq_crud_integrity_test`

## Running the Tests

### Run CRUD Integrity Tests Only
```bash
npm run test:crud
```

### Run All Tests
```bash
npm run test:all
```

### Run with Verbose Output
```bash
npm run test:crud -- --reporter spec
```

## Test Sections Overview

### Part 1: Basic CRUD Operations
Tests fundamental Create, Read, Update, Delete operations for each entity type.

**Entities Tested:**
- Year
- Module  
- Subject
- Lecture

**Coverage:**
- ✅ CREATE: Entity is created with all fields intact
- ✅ READ: Single and multiple record retrieval works correctly
- ✅ UPDATE: Data modifications are persisted correctly
- ✅ DELETE: Records are removed from database

**Key Assertions:**
- IDs match expected values
- Timestamps (`createdAt`, `updatedAt`) are present
- Retrieved data matches created data

---

### Part 2: Referential Integrity
Validates that the hierarchical relationships between entities are maintained properly.

**Hierarchy Structure:**
```
Year
 ├── Module (must reference existing Year)
 │   ├── Subject (must reference existing Module)
 │   │   └── Lecture (optionally references Subject)
 │   │       └── Questions
```

**Tests:**
- ✅ Prevents Module creation with non-existent Year
- ✅ Prevents Subject creation with non-existent Module
- ✅ Validates references during UPDATE operations
- ✅ Allows Lecture without Subject reference (optional)

**Expected Behavior:**
- All reference validations throw descriptive errors
- Error messages include the missing reference

---

### Part 3: Unique Constraint Integrity
Ensures that ID uniqueness constraints are enforced across the system.

**Tests:**
- ✅ Prevents duplicate Year IDs
- ✅ Prevents duplicate Module IDs
- ✅ Prevents duplicate Subject IDs
- ✅ Prevents duplicate Lecture IDs

**Constraint Type:** Global uniqueness per entity type

---

### Part 4: Cascade Deletion Integrity
Validates that deleting a parent entity properly cascades down to all children.

**Cascade Rules:**
```
Year deletion   → Deletes all Modules → Deletes all Subjects → Deletes all Lectures
Module deletion → Deletes all Subjects → Deletes all Lectures
Subject deletion → Deletes all Lectures
Lecture deletion → No cascade (leaf node)
```

**Tests:**
- ✅ Year deletion cascades to all children
- ✅ Module deletion cascades to Subjects and Lectures
- ✅ Subject deletion cascades to Lectures
- ✅ Lecture deletion does NOT cascade
- ✅ Intermediate entities are properly cleaned

**Verification:**
- Count documents before and after deletion
- Confirm zero orphaned records

---

### Part 5: Data Cleanliness & Consistency
Ensures data integrity and proper field validation across all operations.

**Tests:**
- ✅ Timestamp consistency (`createdAt`, `updatedAt`)
- ✅ Timestamp updates on record modification
- ✅ Required fields enforcement
- ✅ Data type consistency
- ✅ Prevention of empty strings in required fields
- ✅ Data preservation across multiple updates

**Validation Rules:**
- All timestamps use ISO-8601 format
- `createdAt` equals `updatedAt` on creation
- `updatedAt` > `createdAt` after modification
- Required fields cannot be null or undefined

---

### Part 6: Question Integrity
Comprehensive validation of question structure and constraints.

**Question Structure:**
```javascript
{
  id: String (unique within lecture),
  text: String (required),
  options: Array<String> (min: 2, all unique),
  correctAnswer: Number (0-indexed, valid range)
}
```

**Tests:**
- ✅ Prevents questions with < 2 options
- ✅ Prevents duplicate question IDs within a lecture
- ✅ Validates correctAnswer index is within options range
- ✅ Prevents duplicate options within a question
- ✅ Allows adding questions to existing lectures
- ✅ Prevents duplicate questions via `.addQuestion()` method

**Validation Rules:**
- Minimum 2 options per question
- All options must be unique
- correctAnswer is valid zero-based index
- Maximum 1 question with same ID per lecture

---

### Part 7: ID Renaming Integrity
Tests that updating entity IDs properly cascades through all child references.

**Renaming Scenarios:**
1. **Module ID rename** → Updates all child Subject references
2. **Subject ID rename** → Updates all child Lecture references

**Tests:**
- ✅ Renaming Module ID updates all Subjects
- ✅ Renaming Subject ID updates all Lectures
- ✅ Prevents renaming to already-existing ID
- ✅ All child references remain valid

**Critical Behavior:**
- No orphaned records after ID rename
- All references in child entities updated atomically
- Prevents conflicts with existing IDs

---

### Part 8: Bulk Operations Consistency
Tests system behavior under multiple sequential and concurrent operations.

**Tests:**
- ✅ Sequential CRUD operations maintain consistency
- ✅ Simultaneous read operations return consistent data
- ✅ System handles large datasets (50+ records)

**Verification:**
- Multiple operations complete without race conditions
- Concurrent reads see consistent data
- Performance acceptable with large datasets

---

### Part 9: Error Handling & Recovery
Validates graceful error handling and database recovery.

**Tests:**
- ✅ Failed CREATE doesn't corrupt database state
- ✅ Failed UPDATE preserves original data
- ✅ Graceful handling of non-existent record deletion
- ✅ Original data unchanged after error conditions

**Behavior:**
- All errors throw descriptive messages
- Database returns to clean state after errors
- No partial/incomplete records created

---

### Part 10: Admin Panel Specific Tests
Tests admin panel workflows and bulk operations.

**Scenarios:**
1. **Complete Hierarchy Creation**: Full Year→Module→Subject→Lecture chain
2. **Bulk Operations**: Creating/deleting multiple records
3. **Data Export Consistency**: Retrieving complete data structures

**Tests:**
- ✅ Admin can create complete hierarchy
- ✅ Bulk operations maintain integrity
- ✅ Data export returns consistent structure
- ✅ Icon fields preserved for Years

---

## Test Statistics

| Category | Test Count | Entities Covered |
|----------|-----------|------------------|
| Basic CRUD | 4×5 = 20 | 4 (Year, Module, Subject, Lecture) |
| Referential Integrity | 5 | All 4 |
| Unique Constraints | 4 | All 4 |
| Cascade Deletion | 6 | All 4 |
| Data Cleanliness | 6 | All 4 |
| Question Integrity | 6 | Lecture |
| ID Renaming | 3 | Module, Subject |
| Bulk Operations | 3 | All 4 |
| Error Handling | 3 | All 4 |
| Admin Panel | 3 | All 4 |
| **TOTAL** | **59 tests** | **Comprehensive** |

## Expected Test Results

All tests should **PASS** when:
1. MongoDB is running locally on port 27017
2. Mongoose models are correctly implemented
3. All validation middleware is active
4. Cascade deletion middleware is properly configured

## Database Cleanup

Tests automatically:
- Create isolated test database: `mcq_crud_integrity_test`
- Clear all collections before each test
- Remove test database after all tests complete

**Note:** This is separate from production database (`mcq_app`)

## Performance Benchmarks

Expected test execution times:
- **Part 1-5:** ~2-3 seconds
- **Part 6-7:** ~1-2 seconds
- **Part 8:** ~2-3 seconds
- **Part 9-10:** ~1-2 seconds
- **Total:** ~10-15 seconds

## Integration with CI/CD

Add to your CI/CD pipeline:
```yaml
- name: Run CRUD Integrity Tests
  run: npm run test:crud
  
- name: Run All Tests
  run: npm run test:all
```

## Debugging Failed Tests

### If a test fails:

1. **Check MongoDB Connection**
   ```bash
   mongosh mongodb://localhost:27017
   use mcq_crud_integrity_test
   db.years.find()
   ```

2. **Check Validation Middleware**
   - Review model pre/post hooks in `server/models/*.js`
   - Verify static methods exist and are called

3. **Check Error Messages**
   - Run with `--reporter spec` for detailed output
   - Look for validation error source

4. **Manual Verification**
   ```bash
   npm run test:crud -- --grep "specific test name"
   ```

## API Endpoint Coverage

These tests validate the backend logic that powers:

### Admin Panel Endpoints
- `POST /api/admin/years` - CREATE
- `GET /api/admin/years` - READ
- `PUT /api/admin/years/:yearId` - UPDATE
- `DELETE /api/admin/years/:yearId` - DELETE
- (Similar endpoints for modules, subjects, lectures)

### User App Endpoints
- `GET /api/years` - READ hierarchy
- `GET /api/lectures/:lectureId` - READ with questions

## Data Quality Assurance

✅ **No Orphaned Records** - All deleted parents remove children
✅ **Referential Consistency** - All references point to valid entities
✅ **Unique Identifiers** - No duplicate IDs at any level
✅ **Timestamp Accuracy** - All dates tracked and updated correctly
✅ **Data Type Safety** - Type validation on all fields
✅ **Cascade Integrity** - Multi-level deletions maintain consistency
✅ **Error Recovery** - Failed operations don't corrupt state

## Conclusion

This comprehensive test suite ensures:
1. **Data Integrity** - All hierarchical relationships maintained
2. **System Cleanliness** - No orphaned or corrupted records
3. **User Safety** - Admin panel operations are validated
4. **Production Readiness** - Reliable CRUD operations for MCQ app

Run `npm run test:crud` before each deployment to verify system integrity.

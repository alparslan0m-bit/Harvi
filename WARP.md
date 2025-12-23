# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is an MCQ (Multiple Choice Questions) Medical App designed for medical students. It's a full-stack web application with a Node.js/Express backend serving MongoDB data and a vanilla JavaScript frontend with Progressive Web App capabilities.

## Common Development Commands

### Quick Start
```powershell
# Start the application (installs dependencies if needed, starts server, opens browser)
.\run_app.bat
```

### Development
```bash
# Install dependencies
npm install

# Seed the database with initial hierarchy data
npm run seed

# Start development server with hot reload
npm run dev

# Start production server
npm start

# Run tests
npm test

# Clean node_modules
npm run clean
```

### Database Management
```bash
# Seed database (creates year/module/subject hierarchy)
npm run seed

# Run model tests
npm test
```

### Testing
```bash
# Run clean model tests
npm test
```

## Architecture Overview

### Backend Architecture (Node.js/Express/MongoDB)
- **Entry point**: `server/index.js` - Express server with static file serving and all API routes
- **Database**: MongoDB with Mongoose ODM using a clean normalized structure
- **Models**: `server/models/` - Mongoose schemas with validation and cascade deletion
- **Seeds**: `server/seed/` - Database seeding scripts and hierarchy data

### Data Model Hierarchy
The application uses a nested hierarchy structure:
```
Years -> Modules -> Subjects -> Lectures -> Questions
```

**Key Models:**
- **Year**: Top-level containers (e.g., Year 1, Year 2) with ID, name, and icon
- **Module**: Learning modules within years (e.g., "Anatomy", "Surgery")  
- **Subject**: Specific subjects within modules (e.g., "Human Anatomy")
- **Lecture**: Individual lectures containing questions with full CRUD operations
- **Question**: MCQ questions with text, options array, and correctAnswer index

### Frontend Architecture (Vanilla JavaScript)
- **Entry point**: `index.html` - Progressive Web App with mobile optimization
- **Screens**: Navigation, Quiz, and Results screens with smooth transitions
- **JavaScript modules**:
  - `js/app.js` - Main application controller and initialization
  - `js/navigation.js` - Hierarchical navigation and data fetching
  - `js/quiz.js` - Quiz engine with question display and scoring
  - `js/results.js` - Results display with animations and confetti
  - `js/animations.js` - UI animations and transitions
- **Styling**: `css/main.css` + `css/utils/mobile.css` for responsive design

### API Structure
**Public APIs:**
- `GET /api/years` - Hierarchical list of years/modules/subjects/lecture references
- `GET /api/lectures/:lectureId` - Lecture with questions for quiz

**Admin APIs** (no authentication, local use):
- Full CRUD operations for lectures, modules, subjects
- Cascading delete operations
- Reference management between entities

## Development Patterns

### Database Patterns
- **Mongoose Schemas**: All models use custom validation and cascade deletion middleware
- **Reference Integrity**: Validation methods ensure foreign key relationships exist
- **Hierarchical Storage**: Years contain embedded modules/subjects structure + separate Lectures collection
- **Safe Operations**: Custom static methods (e.g., `createWithValidation`) prevent duplicates

### Frontend Patterns
- **Screen Management**: Single-page application with screen switching via CSS classes
- **State Management**: Global state objects for navigation context and quiz state
- **Progressive Enhancement**: Mobile-first responsive design with iOS Safari optimizations
- **Async Data Loading**: Fetch API with loading states and error handling

### Error Handling
- **Backend**: Comprehensive error responses with helpful debugging info
- **Frontend**: User-friendly error messages with fallback UI states
- **Validation**: Both client-side and server-side validation for data integrity

## File Structure Context

```
├── server/
│   ├── index.js          # Express server & all API routes
│   ├── models/           # Mongoose schemas (Year, Module, Subject, Lecture)
│   ├── seed/             # Database seeding scripts and hierarchy data
│   └── tests/            # Clean model tests
├── js/                   # Frontend JavaScript modules
├── css/                  # Stylesheets with mobile optimization
├── admin.html           # Admin panel for content management
├── index.html           # Main PWA application
├── run_app.bat          # Windows batch script for easy startup
└── package.json         # Node.js dependencies and scripts
```

## Configuration

### Environment Variables (.env)
```
MONGODB_URI=mongodb://localhost:27017/mcq_app
PORT=3000
```

### Required Services
- **MongoDB**: Must be running locally on port 27017
- **Node.js**: Supports ES6+ features, async/await patterns

## Testing Strategy

The application includes clean model tests in `server/tests/clean-model-tests.js`:
- **CRUD Operations**: Tests create, read, update, delete for all entities
- **Cascade Deletion**: Verifies proper cleanup when deleting parent entities
- **Reference Validation**: Ensures foreign key integrity  
- **Question Validation**: Validates MCQ structure (options, correct answers)
- **Duplicate Prevention**: Tests unique constraints and ID validation

## Admin Interface

Access the admin panel at `http://localhost:3000/admin.html` for:
- Creating and managing lectures with questions
- Organizing content within the year/module/subject hierarchy
- Full CRUD operations via REST API
- Real-time content updates without server restart
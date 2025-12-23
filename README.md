# MCQ Medical App

A full-stack quiz application designed for medical students, featuring a hierarchical content structure (Years → Modules → Subjects → Lectures → Questions) with an intuitive admin panel for content management.

## Overview

This application provides a Progressive Web App (PWA) experience for medical students to practice multiple-choice questions organized by academic year, module, and subject. The system includes a comprehensive admin dashboard for managing the entire content hierarchy and quiz questions.

## Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **RESTful API** architecture

### Frontend
- **Vanilla JavaScript** (ES6+)
- **Progressive Web App** (PWA) capabilities
- **Mobile-first responsive design**
- **CSS Grid/Flexbox** for layouts
- **Canvas Confetti** for quiz completion animations

### Development Tools
- **Nodemon** for development hot-reload
- **Mocha** for testing
- **dotenv** for environment configuration

## Architecture

### Backend Architecture

The backend follows a clean separation of concerns:

- **Server Entry**: `server/index.js` - Express server with static file serving and API routes
- **Models**: `server/models/` - Mongoose schemas with validation, cascade deletion, and reference integrity
- **Seeding**: `server/seed.js` - Database initialization script

### Frontend Architecture

The frontend is a single-page application with three main screens:

- **Navigation Screen**: Hierarchical browsing of Years → Modules → Subjects → Lectures
- **Quiz Screen**: Interactive question display with progress tracking
- **Results Screen**: Score display with animations and retake functionality

### Data Model Hierarchy

```
Years
  └── Modules
      └── Subjects
          └── Lectures
              └── Questions
```

**Database Collections:**
- `years` - Academic year containers with ID, name, and optional icon
- `modules` - Learning modules within years (references `yearId`)
- `subjects` - Subjects within modules (references `moduleId`)
- `lectures` - Individual lectures containing questions (references `subjectId`)

**Question Structure:**
- `id` - Unique question identifier
- `text` - Question text
- `options` - Array of answer options (minimum 2, must be unique)
- `correctAnswer` - Index of the correct option (0-based)

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or remote instance)
- npm or yarn package manager

### Installation

1. **Clone or download the project**

2. **Install MongoDB** and ensure it's running:
   ```bash
   # Default MongoDB connection: mongodb://localhost:27017
   ```

3. **Create `.env` file** in the project root:
   ```env
   MONGODB_URI=mongodb://localhost:27017/mcq_app
   PORT=3000
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Seed the database**:
   ```bash
   npm run seed
   ```
   This creates the initial year/module/subject hierarchy structure. Lecture content and questions are managed through the admin panel.

6. **Start the application**:
   
   **Windows:**
   ```bash
   run_app.bat
   ```
   This script automatically installs dependencies if needed, starts the server, and opens the browser.

   **Manual start:**
   ```bash
   npm start
   ```
   Then open `http://localhost:3000` in your browser.

### Development Mode

For development with hot-reload:
```bash
npm run dev
```

## API Documentation

### Public Endpoints

#### Get Hierarchical Structure
```http
GET /api/years
```

Returns the complete hierarchy of years, modules, subjects, and lecture references.

**Response:**
```json
[
  {
    "id": "year1",
    "name": "Year 1",
    "icon": "📚",
    "modules": [
      {
        "id": "module1",
        "name": "Anatomy",
        "subjects": [
          {
            "id": "subject1",
            "name": "Human Anatomy",
            "lectures": [
              { "id": "lecture1", "name": "Introduction" }
            ]
          }
        ]
      }
    ]
  }
]
```

#### Get Lecture with Questions
```http
GET /api/lectures/:lectureId
```

Returns a specific lecture with all its questions.

**Response:**
```json
{
  "id": "lecture1",
  "name": "Introduction",
  "subjectId": "subject1",
  "questions": [
    {
      "id": "q1",
      "text": "What is the largest organ in the human body?",
      "options": ["Liver", "Skin", "Lungs", "Heart"],
      "correctAnswer": 1
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Admin Endpoints

All admin endpoints are prefixed with `/api/admin/`. These endpoints provide full CRUD operations for managing the content hierarchy.

#### Years Management

- `GET /api/admin/years` - List all years with nested structure
- `POST /api/admin/years` - Create a new year
  ```json
  {
    "id": "year2",
    "name": "Year 2",
    "icon": "📖"
  }
  ```
- `PUT /api/admin/years/:yearId` - Update a year
- `DELETE /api/admin/years/:yearId` - Delete a year (cascades to modules, subjects, lectures)

#### Modules Management

- `GET /api/admin/modules` - List all modules
- `POST /api/admin/modules` - Create a new module
  ```json
  {
    "id": "module2",
    "name": "Surgery",
    "yearId": "year1"
  }
  ```
- `PUT /api/admin/modules/:moduleId` - Update a module
- `DELETE /api/admin/modules/:moduleId` - Delete a module (cascades to subjects, lectures)

#### Subjects Management

- `GET /api/admin/subjects` - List all subjects
- `POST /api/admin/subjects` - Create a new subject
  ```json
  {
    "id": "subject2",
    "name": "Cardiac Surgery",
    "moduleId": "module2"
  }
  ```
- `PUT /api/admin/subjects/:subjectId` - Update a subject
- `DELETE /api/admin/subjects/:subjectId` - Delete a subject (cascades to lectures)

#### Lectures Management

- `GET /api/admin/lectures` - List all lectures
- `POST /api/admin/lectures` - Create a new lecture with questions
  ```json
  {
    "id": "lecture2",
    "name": "Cardiac Anatomy",
    "subjectId": "subject2",
    "questions": [
      {
        "id": "q1",
        "text": "Question text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0
      }
    ]
  }
  ```
- `PUT /api/admin/lectures/:lectureId` - Update a lecture (including questions)
- `DELETE /api/admin/lectures/:lectureId` - Delete a lecture

**Note:** All admin endpoints include validation:
- Required field validation
- Unique ID enforcement
- Reference integrity checks (e.g., `yearId` must exist)
- Cascade deletion support
- Question validation (minimum 2 options, unique options, valid correctAnswer index)

## Admin Panel

Access the admin panel at `http://localhost:3000/admin.html`

### Features

- **Dashboard**: Overview statistics and recent activity
- **Years Management**: Create, edit, and delete academic years
- **Modules Management**: Manage modules with year filtering
- **Subjects Management**: Organize subjects with module filtering
- **Lectures Management**: Create and edit lectures with questions
- **Question Search**: Search questions across all lectures by text or options
- **Analytics**: Content distribution charts and statistics
- **Dark Mode**: Theme toggle for comfortable viewing
- **Responsive Design**: Works on desktop and mobile devices

### Creating a Lecture

1. Navigate to the Lectures page
2. Click "Add Lecture"
3. Select Year → Module → Subject from dropdowns
4. Enter lecture ID and name
5. Add questions:
   - Question text
   - Multiple options (minimum 2)
   - Select correct answer
   - Add more questions as needed
6. Click "Save Lecture"

### Question Search

The admin panel includes a powerful question search feature that searches across:
- Question text
- Answer options
- Returns results with breadcrumb navigation (Year → Module → Subject → Lecture)
- Direct link to edit questions

## Frontend Features

### User Interface

- **Hierarchical Navigation**: Intuitive browsing through Years → Modules → Subjects → Lectures
- **Breadcrumb Navigation**: Clear path indication
- **Quiz Interface**: 
  - Progress bar showing completion percentage
  - Question counter (current/total)
  - Answer selection with visual feedback
  - Continue button (disabled until answer selected)
- **Results Screen**:
  - Score display (correct/total)
  - Percentage calculation
  - Motivational messages based on performance
  - Confetti animation on completion
  - Retake quiz option
  - Return to home option

### Progressive Web App

- Mobile-optimized interface
- iOS Safari optimizations
- Touch-friendly interactions
- Responsive design for all screen sizes
- Theme toggle (dark/girl mode)

### State Management

- Navigation state tracking (current path)
- Quiz state (questions, answers, score)
- Local storage for theme preferences
- Loading states and error handling

## Project Structure

```
├── server/
│   ├── index.js              # Express server and API routes
│   ├── models/               # Mongoose schemas
│   │   ├── Year.js          # Year model with cascade deletion
│   │   ├── Module.js        # Module model with validation
│   │   ├── Subject.js       # Subject model with validation
│   │   └── Lecture.js       # Lecture model with question validation
│   ├── seed.js              # Database seeding script
│   ├── seed/
│   │   └── hierarchy.json   # Initial hierarchy data
│   └── tests/               # Test files
│       └── clean-model-tests.js
├── js/                      # Frontend JavaScript
│   ├── app.js              # Main application controller
│   ├── navigation.js       # Navigation and data fetching
│   ├── quiz.js             # Quiz engine
│   ├── results.js          # Results display
│   └── animations.js       # UI animations
├── css/                     # Stylesheets
│   ├── main.css            # Main stylesheet
│   ├── base/               # Base styles (reset, variables)
│   ├── components/         # Component styles
│   ├── layout/             # Layout styles
│   ├── themes/             # Theme styles (dark, girl mode)
│   └── utils/              # Utility styles (responsive, mobile)
├── admin/                   # Admin panel
│   ├── css/
│   │   └── admin.css       # Admin panel styles
│   └── js/
│       └── admin.js        # Admin dashboard controller
├── index.html              # Main application entry point
├── admin.html              # Admin panel entry point
├── package.json            # Dependencies and scripts
├── run_app.bat             # Windows startup script
└── .env                    # Environment variables (create this)
```

## Database Management

### Collections

- `years` - Academic years
- `modules` - Learning modules
- `subjects` - Course subjects
- `lectures` - Lectures with questions

### Viewing/Editing Data

- **MongoDB Compass**: Visual database browser
- **mongosh**: Command-line MongoDB shell
- **Admin Panel**: Web-based CRUD interface

### Reseeding

To reset the database to initial state:
```bash
npm run seed
```

**Warning:** This will delete all existing data and recreate the hierarchy structure. Lecture content and questions will be lost unless backed up.

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon (hot-reload)
- `npm run seed` - Seed/reseed the database
- `npm test` - Run model tests
- `npm run clean` - Remove node_modules directory

### Code Patterns

**Backend:**
- Mongoose schemas with custom validation methods
- Cascade deletion middleware for referential integrity
- Static methods for safe CRUD operations (`createWithValidation`, `updateWithValidation`)
- Comprehensive error handling with descriptive messages

**Frontend:**
- Class-based architecture for modularity
- Screen-based navigation system
- Async/await for API calls
- Event delegation for dynamic content
- Local storage for user preferences

### Testing

Run the test suite:
```bash
npm test
```

Tests cover:
- Model CRUD operations
- Validation logic
- Reference integrity
- Cascade deletion

## Error Handling

### Backend Errors

- **400 Bad Request**: Validation errors, missing required fields
- **404 Not Found**: Resource doesn't exist
- **500 Internal Server Error**: Database or server errors

All errors include descriptive messages for debugging.

### Frontend Errors

- Loading states during API calls
- User-friendly error messages
- Fallback UI states
- Network error handling

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Progressive Web App support
- Touch event handling

## Security Considerations

**Note:** This application is designed for local development and educational use. The admin panel has no authentication. For production deployment, consider:

- Implementing authentication/authorization
- Adding rate limiting
- Input sanitization (currently handled by Mongoose validation)
- HTTPS enforcement
- CORS configuration for production domains

## Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running: `mongod` or check MongoDB service
- Verify connection string in `.env` file
- Check MongoDB logs for connection errors

### Port Already in Use

- Change `PORT` in `.env` file
- Or stop the process using port 3000

### Database Empty

- Run `npm run seed` to initialize the database
- Check MongoDB connection string
- Verify seed script execution completed successfully

### Admin Panel Not Loading

- Ensure server is running (`npm start`)
- Check browser console for JavaScript errors
- Verify admin.html file exists in project root

## License

This project is private and intended for educational use.

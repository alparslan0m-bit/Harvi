# Harvi - Medical MCQ Learning Platform

A comprehensive Progressive Web App (PWA) for medical students to practice multiple-choice questions with offline support, adaptive performance optimization, and admin management tools.

## Project Overview

**Harvi** is an offline-first medical education platform that enables students to:

- Browse hierarchically organized medical content (Years → Modules → Subjects → Lectures)
- Complete interactive quizzes with instant feedback and explanation
- Track progress through statistics and performance analytics
- Learn offline with IndexedDB persistence and service worker caching
- Access content on iOS/Android as a native-like app via PWA installation

**Target Users:** Medical students preparing for exams who need reliable access to curated question banks without constant internet connectivity.

**Core Problem Solved:** Medical students need flexible, offline-capable practice environments with instructor-controlled content management and secure grading systems.

---

## High-Level Architecture

### System Components

The application consists of three major layers:

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT (Frontend)                                      │
│  ├─ index.html (Quiz, Navigation, Results, Stats)      │
│  ├─ admin-v2/ (React TSX - Admin Dashboard)            │
│  ├─ js/ (Vanilla JS - app, quiz, navigation, etc.)    │
│  ├─ css/ (Component-based design system)               │
│  ├─ Service Worker (offline support)                   │
│  └─ IndexedDB (local caching)                          │
├─────────────────────────────────────────────────────────┤
│  BACKEND (Server)                                       │
│  ├─ server/index.js (Node.js + Express)               │
│  ├─ api/index.js (Vercel serverless function)         │
│  ├─ Authentication middleware (JWT)                    │
│  ├─ Data transformation layer                          │
│  └─ Health checks & monitoring                         │
├─────────────────────────────────────────────────────────┤
│  DATABASE (Supabase PostgreSQL)                         │
│  ├─ years, modules, subjects, lectures, questions      │
│  ├─ user_responses (quiz submissions)                  │
│  ├─ Database triggers (auto-grading)                   │
│  └─ RLS policies (security)                            │
└─────────────────────────────────────────────────────────┘
```

### Communication Flow

1. **Frontend → Backend:** RESTful API calls with Bearer token authentication
2. **Backend → Database:** Supabase client with service role key or anon key + JWT claims
3. **Database → Backend:** Query results, triggers execute auto-grading, RLS enforces row-level security
4. **Database → Frontend (indirect):** Backend transforms data and returns to client

### Architectural Decisions

- **Vanilla JS + Service Worker** (frontend): Reduces bundle size, enables offline-first caching, native-like iOS/Android feel
- **React + Vite** (admin-v2): Modern stack for admin panel to manage content hierarchy and questions
- **Supabase PostgreSQL** (database): Enables triggers for auto-grading, row-level security for multi-tenancy
- **Database triggers** (auto-grading): Ensures students cannot tamper with grades by inspecting network responses
- **Feature flags** (server): Enable rollback of transformations without redeployment

---

## Core Functional Flows

### User Quiz Flow

1. Student navigates Years → Modules → Subjects → Lectures (hierarchical)
2. Selects a lecture, which loads questions via `/api/lectures/:lectureId`
3. Answers are collected locally in the Quiz class
4. On submission, POST to `/api/quiz-results` with all answers
5. Backend inserts responses into `user_responses` table
6. Database trigger `auto_grade_response` computes grades server-side
7. Results returned with percentage, mastery message, confetti animation
8. Student can retake quiz (loads fresh copy via `masterCopyQuestions`)

**Security:** Correct answers are NEVER sent to client. Grades are computed server-side via trigger.

### Content Management (Admin)

- Admin Dashboard (React, admin-v2/) allows authenticated admins to manage Years → Modules → Subjects → Lectures → Questions
- All operations via authenticated endpoints (`/api/admin/*`)
- Data syncs with Supabase in real-time
- Frontend transforms JSONB question options to string arrays for display

### Offline Learning

1. First load: Service Worker caches app shell (index.html, CSS, JS)
2. Student navigates and loads lectures (cached in IndexedDB via db.js)
3. Network becomes unavailable → student continues quiz from local data
4. Quiz results stored locally in IndexedDB
5. When network returns: syncs results via `/api/quiz-results` (if authenticated)

---

## Data & State Management

### Database Schema

```
years (id, external_id, name, icon)
├── modules (id, external_id, name, year_id)
├── subjects (id, external_id, name, module_id)
├── lectures (id, external_id, name, order_index, subject_id)
│   └── questions (id, external_id, text, options[JSONB], 
│                   correct_answer_index, explanation, 
│                   difficulty_level, question_order)
└── user_responses (id, user_id, lecture_id, question_id, 
                    selected_answer_index, is_correct[computed], 
                    created_at)
```

### Frontend State Management

- **MCQApp class** (app.js): Master state container holding currentQuiz, navigationStack, resumableQuiz
- **Quiz class** (quiz.js): Tracks questions, currentIndex, score, selectedOptions, answers array
- **Navigation class** (navigation.js): Manages hierarchical path, caching, transitions
- **Results class** (results.js): Displays score, handles retakes and sharing
- **HarviDatabase class** (db.js): IndexedDB wrapper for offline persistence and L1 memory cache

### Data Persistence

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| L1 | JavaScript Map (memory) | Fast lookups, question cache |
| L2 | IndexedDB (browser storage) | Offline lectures, responses, metadata |
| L3 | Service Worker Cache | HTML, CSS, JS app shell |
| L4 | Supabase PostgreSQL | Source of truth, user accounts, grades |

### Data Transformation

Server transforms JSONB question options to string arrays:
- **DB format:** `[{"id": 1, "text": "Femur"}, {"id": 2, "text": "Tibia"}]`
- **API response:** `["Femur", "Tibia"]`
- **Feature flag:** `ENABLE_TRANSFORMATION` (default: true) allows instant rollback

---

## Security & Access Control

### Authentication

- **Supabase Auth:** Email/password for students and admins
- **JWT Tokens:** Issued by Supabase, validated on protected endpoints
- **Bearer Token:** Sent in `Authorization: Bearer <token>` header

### Authorization

- **Student endpoints:** Optional auth (practice mode allowed anonymously)
  - `/api/lectures/*` - Public read
  - `/api/quiz-results` - Requires authentication
- **Admin endpoints:** Requires `is_admin` role claim in JWT
  - `/api/admin/*` - Full CRUD access to content
  - Verified in middleware before operations

### Trust Boundaries

**NOT trusted:**
- Client-side answer selection (students can inspect network)
- Local quiz scores (can be modified in IndexedDB)

**Trusted:**
- Database trigger computation of grades (server-side, immutable)
- JWT role claims (cryptographically signed by Supabase)
- User identity from JWT (issued by Supabase Auth)

### Security Measures

- ✅ Correct answer indices NEVER sent to client
- ✅ Grades computed server-side via trigger
- ✅ MongoDB completely removed (explicit fail-safe in server startup)
- ✅ RLS policies on database tables
- ✅ CORS enabled for known origins
- ✅ Service role key stored server-side only

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| HTML5 | - | Markup, semantic structure |
| CSS3 | - | Component-based design system with animations |
| JavaScript (Vanilla) | ES2020+ | Main app logic, quiz interaction, navigation |
| IndexedDB | Browser API | Offline data persistence |
| Service Worker | Browser API | Offline support, app shell caching |
| Canvas Confetti | ^1.6.0 | Celebration animations (lazy-loaded) |
| html2canvas | ^1.4.1 | Screenshot sharing (lazy-loaded) |

### Admin Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^18.2.0 | Component framework |
| TypeScript | ^5.3.3 | Type safety |
| Vite | ^5.0.11 | Build tool, dev server |
| React Query (TanStack) | ^5.17.19 | Server state management |
| Supabase JS | ^2.39.0 | Database client |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | ^4.22.1 | HTTP framework |
| Supabase JS | ^2.90.1 | PostgreSQL + Auth client |
| dotenv | ^16.6.1 | Environment variables |
| CORS | ^2.8.5 | Cross-origin requests |
| Compression | ^1.7.4 | Response compression |

### Database

| Technology | Purpose |
|------------|---------|
| Supabase | Hosted PostgreSQL with Auth, RLS, Triggers |
| PostgreSQL | Relational database |

### Deployment

| Component | Platform | Trigger |
|-----------|----------|---------|
| Frontend | Vercel | Push to branch |
| Admin | Vercel | Push to branch |
| API Function | Vercel Serverless | HTTP requests |
| Server | Node.js (self-hosted or Heroku) | Manual or git hook |
| Database | Supabase Cloud | Always available |

---

## Setup & Development

### Prerequisites

- Node.js 18+ and npm/yarn
- Git
- Supabase account (free tier sufficient)

### Environment Variables

Create `.env` in root:

```env
# Backend - Server
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3000

# Feature Flags
ENABLE_TRANSFORMATION=true
ENABLE_STATS_TRIGGER=true
```

Create `.env.local` in admin-v2/:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Local Development - Frontend

```bash
# Install dependencies
npm install

# Start with local server (http://localhost:3000)
# Open index.html in browser or serve via:
npx http-server

# Watch changes with live reload
npm install -g live-server
live-server
```

### Local Development - Admin Dashboard

```bash
cd admin-v2

# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build
```

### Local Development - Backend

```bash
# Install dependencies
npm install

# Start server (http://localhost:3000)
npm run dev

# Run tests
npm run test
npm run test:crud
npm run test:all
```

### Database Setup

1. Create Supabase project
2. Run SQL migrations to create tables, triggers, RLS policies
3. Seed initial data via `npm run seed` (if available)

### First Run Checklist

- [ ] Supabase project created with PostgreSQL
- [ ] Service role key stored in `.env`
- [ ] Anon key stored in `admin-v2/.env.local`
- [ ] Database schema migrated
- [ ] Service Worker registered (check DevTools → Application)
- [ ] Quiz loads and caches offline
- [ ] Admin dashboard accessible with test admin account
- [ ] Network tab shows correct API endpoints

---

## Production Considerations

### Deployment Architecture

**Frontend (Vercel):**
- Static files cached with long TTL (immutable assets: 1 year)
- HTML cached with 1 hour TTL + stale-while-revalidate
- Service Worker always checked for updates
- Automatically scales to handle traffic

**API Server (Self-hosted or Heroku):**
- Stateless Node.js process
- Health check endpoint: `GET /health`
- Listens on PORT environment variable
- Automatically restarts on crash

**Admin Dashboard (Vercel):**
- Separate from main app
- Protected by Supabase Auth
- Can be deployed independently

### Configuration Differences

| Setting | Development | Production |
|---------|-------------|-----------|
| Supabase URL | Free tier sandbox | Paid tier or enterprise |
| Database backups | Manual | Automatic daily |
| CORS origins | localhost:* | Specific domains |
| Service Worker updates | Immediate check | 6-hour periodic check |
| Transformation | Toggleable via flag | Usually enabled |
| Logging | Verbose console logs | Syslog or cloud logging |
| Auth | JWT timeout: flexible | JWT timeout: 1 hour |

### Known Non-Obvious Risks

1. **MongoDB Contamination:** If old MongoDB code sneaks into node_modules, server will crash with clear error. This is intentional.

2. **IndexedDB Storage Limits:** Browsers limit to ~50-100MB per app. Large question libraries may exceed limits on old devices. Implement cleanup of old data.

3. **Offline Quiz Submission:** If student submits quiz offline, response stays in IndexedDB until network returns. No automatic sync—app must be reopened.

4. **Service Worker Cache Blocking:** Old service workers may cache outdated HTML. Version number must be bumped on each deployment.

5. **Supabase Auth Token Expiry:** Frontend doesn't automatically refresh expired tokens. Users must reload page to re-authenticate.

6. **Database Trigger Failures:** If auto_grade_response trigger fails silently, student sees "0% correct" even with right answers. Monitor trigger logs.

7. **JSONB Transformation Bugs:** If options come in unexpected format (neither string nor object with .text), transformation applies fallback. May show "Option A, Option B" instead of real text.

---

## Known Limitations

### Intentional Trade-Offs

- **No offline quiz result submission:** Results must be submitted with active network. Cannot batch offline submissions.
- **No collaborative features:** Single-user app by design. No discussion forums, peer review, or instructor comments.
- **No video/media in questions:** Questions are text + options only. Videos, images, diagrams not supported.
- **No timed quizzes:** No timer forcing students to rush. Open-ended, self-paced learning.
- **No spaced repetition:** No algorithm to resurface difficult topics. Manual retake only.

### Incomplete/Experimental Features

- **Girls mode theme:** Pink theme toggle exists but CSS partially incomplete. Navigation colors need refinement.
- **Dynamic Island notifications:** Implemented but may not work on all browsers. Falls back gracefully.
- **Gesture physics:** Native swipe detection code present but quiz uses buttons instead of swipe.
- **Statistics aggregator:** Code present but dashboard may not display all metrics.
- **Predictive loader:** Code for pre-loading next lecture exists but not actively used.

### Areas Requiring Caution

1. **Question data format:** Do not mix JSONB and string array formats. The transformation layer attempts recovery but may fail silently.

2. **Admin panel data deletion:** No soft delete. Deleting a Year cascades to all Modules, Subjects, Lectures, Questions. No recovery.

3. **Quiz answer data:** User responses are immutable once submitted. Cannot be edited through API. Must delete manually if needed.

4. **Service Worker debugging:** Hard to detect corruption. If `sw.js` is buggy, users may see cached broken version for hours. Test thoroughly before deploying.

5. **Supabase RLS policies:** If row-level security policies are misconfigured, admin operations may fail silently. Always test with actual admin account.

---

## Performance Optimizations

The application includes several active performance features:

- **Service Worker App Shell:** Critical resources pre-cached on install
- **IndexedDB L1 Cache:** In-memory Map + IndexedDB for fast lookups
- **Lazy-loaded Libraries:** Confetti and html2canvas loaded only when needed
- **Request debouncing:** Error notifications debounced to prevent spam
- **Cache timeout:** Navigation cache expires every 5 minutes to ensure freshness
- **Batch lecture loading:** POST `/api/lectures/batch` fetches multiple lectures in one request
- **Compression:** Express compression middleware on all responses
- **Static asset versioning:** Cache busting via sw.js version number

---

## Development Workflow

### Code Organization

```
├── index.html                 # Main student app
├── js/                       # Core app logic (vanilla JS)
│   ├── app.js              # MCQApp class - main controller
│   ├── quiz.js             # Quiz class - question presentation
│   ├── navigation.js        # Navigation class - hierarchy browsing
│   ├── results.js          # Results class - score display
│   ├── db.js               # HarviDatabase class - IndexedDB wrapper
│   ├── profile.js          # Profile/settings screen
│   ├── stats.js            # Statistics screen
│   └── [performance modules] # Animations, touch, haptics, etc.
├── css/                      # Component-based CSS
│   ├── main.css            # Imports all components
│   ├── base/               # Reset, typography, colors
│   ├── components/         # Card, button, modal, etc.
│   ├── layout/             # Grid, spacing
│   ├── themes/             # Girl mode (pink variant)
│   └── utils/              # Animations, responsive
├── admin-v2/                 # New React admin dashboard
│   ├── src/
│   │   ├── App.tsx         # Root component
│   │   ├── pages/          # Years, Modules, Subjects, Lectures, Questions
│   │   ├── components/     # Layout, forms
│   │   ├── lib/            # Supabase client
│   │   ├── types/          # TypeScript types
│   │   ├── hooks/          # React hooks
│   │   └── services/       # API calls
│   ├── index.html
│   ├── vite.config.ts
│   └── tsconfig.json
├── server/
│   ├── index.js            # Express server + Supabase endpoints
│   ├── models/             # (Legacy MongoDB - not used)
│   ├── tests/              # Mocha tests
│   └── seed/               # (Legacy seeding - not used)
├── api/
│   └── index.js            # Vercel serverless function (copy of server endpoints)
└── sw.js                     # Service Worker

```

### Adding a New Feature

1. **Frontend UI:** Edit js/*.js or admin-v2/src/pages/*.tsx
2. **API endpoint:** Add route to server/index.js and api/index.js
3. **Database:** Create migration or manual SQL script
4. **Tests:** Add to server/tests/ for backend logic
5. **Cache:** Update ASSETS_TO_CACHE in sw.js if new files
6. **Version:** Bump APP_VERSION in sw.js to clear caches

### Common Tasks

| Task | File(s) |
|------|---------|
| Add new question type | js/quiz.js |
| Change quiz UI | index.html + css/components/quiz-container.css |
| Add admin page | admin-v2/src/pages/*.tsx |
| Add API endpoint | server/index.js + api/index.js |
| Modify navigation flow | js/navigation.js |
| Change color scheme | css/base/variables.css |
| Add offline feature | js/db.js (for caching) |

---

## Troubleshooting

### Common Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| Quiz shows "0% correct" for all right answers | Trigger not computing grades | Check Supabase trigger logs, verify `is_correct` column populated |
| Questions show "Option A, Option B" | JSONB transformation failed | Check question options format, disable ENABLE_TRANSFORMATION to debug |
| Offline mode doesn't work | IndexedDB init failed | Check browser privacy settings, try incognito mode |
| Service worker stuck on old version | Cache not cleared | Hard refresh (Cmd+Shift+R), check sw.js version |
| Admin login fails | JWT role claim missing | Ensure user has `is_admin=true` in Supabase profiles table |
| API returns 401 Unauthorized | Token expired or invalid | Refresh page, re-authenticate with Supabase |

---

## API Endpoints Summary

### Public Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/years` | Load full hierarchy |
| GET | `/api/lectures/:lectureId` | Load single lecture with questions |
| GET | `/api/lectures/batch?ids=id1,id2` | Batch load lectures |
| POST | `/api/lectures/batch` | Batch load (POST variant) |
| POST | `/api/practice/check-answer` | Check single answer (practice mode) |
| GET | `/health` | Health check |

### Protected Endpoints (Require JWT)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/quiz-results` | Submit quiz and get grade |
| GET | `/api/student/performance` | Get user performance stats |

### Admin Endpoints (Require JWT + `is_admin` role)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/years` | List years |
| POST | `/api/admin/years` | Create year |
| PUT | `/api/admin/years/:yearId` | Update year |
| DELETE | `/api/admin/years/:yearId` | Delete year (cascades) |
| GET/POST/PUT/DELETE | `/api/admin/modules` | Module CRUD |
| GET/POST/PUT/DELETE | `/api/admin/subjects` | Subject CRUD |
| GET/POST/PUT/DELETE | `/api/admin/lectures` | Lecture CRUD |

---

## Support & Maintenance

### Monitoring

- Check `/health` endpoint regularly
- Monitor Supabase dashboard for trigger failures
- Review service worker update logs
- Track IndexedDB storage usage

### Updating

- Server: Redeploy Node.js instance
- Frontend: Increment sw.js APP_VERSION and redeploy to Vercel
- Admin: Deploy to Vercel independently
- Database: Apply migrations via Supabase console

### Backing Up

- Supabase handles automated backups
- Export question bank periodically via Supabase
- Test restore procedures quarterly

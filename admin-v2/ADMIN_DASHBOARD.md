# Admin Dashboard v2 Architecture & Database Integration

This document details the architecture, database integration, and feature set of the Admin Dashboard v2, a Supabase-native administrative interface for the Medical MCQ Platform.

## 1. System Overview

The Admin Dashboard is a Single Page Application (SPA) built to manage the educational content hierarchy (Years > Modules > Subjects > Lectures > Questions). It connects directly to a Supabase backend using the Supabase JS SDK, bypassing traditional middleware for improved performance and simpler architecture.

### Technology Stack
- **Frontend Framework:** React 18 + TypeScript + Vite
- **State Management:** TanStack Query (React Query)
- **Database Components:** Supabase (PostgreSQL), Storage, Authentication
- **Styling:** Custom CSS (clean, responsive design)

---

## 2. Database Schema & Data Model

The dashboard is strictly typed against the Supabase schema. The source of truth for these types is `src/types/database.ts`.

### Entity Hierarchy

The data follows a strict hierarchical structure:
`Years` → `Modules` → `Subjects` → `Lectures` → `Questions`

### Table Definitions

#### 1. Years (`years`)
Top-level categorization.
- **id** (UUID): Primary Key
- **external_id** (String): Human-readable ID (e.g., "year1")
- **name** (String): Display name
- **icon** (String|null): UI icon identifier

#### 2. Modules (`modules`)
Academic modules belonging to a year.
- **id** (UUID): Primary Key
- **year_id** (UUID): Foreign Key -> `years.id`
- **name** (String): Module name
- **external_id** (String): e.g., "year1_mod1"

#### 3. Subjects (`subjects`)
Specific subjects within a module.
- **id** (UUID): Primary Key
- **module_id** (UUID): Foreign Key -> `modules.id`
- **name** (String): Subject name
- **external_id** (String): e.g., "year1_mod1_sub1"

#### 4. Lectures (`lectures`)
Individual learning units.
- **id** (UUID): Primary Key
- **subject_id** (UUID): Foreign Key -> `subjects.id` (Nullable to support orphaned rows if needed)
- **name** (String): Lecture title
- **order_index** (Number): For sorting display order

#### 5. Questions (`questions`)
MCQ content.
- **id** (UUID): Primary Key
- **lecture_id** (UUID): Foreign Key -> `lectures.id`
- **text** (String): The question stem
- **options** (JSONB): Structured array of choices.
  - Structure: `{ id: number, text: string, image_url?: string }`
- **correct_answer_index** (Number): 0-based index of the correct option. **Critical Security**: Admin-only field.
- **difficulty_level** (1|2|3): 1=Easy, 2=Medium, 3=Hard

---

## 3. Database Link & Service Layer

The application interacts with the database through a dedicated Service Layer (`src/services/`). This layer abstracts direct Supabase calls and handles validation.

### Data Access Strategy
- **Direct Connection:** No intermediate backend API; the dashboard communicates directly with PostgREST via the Supabase Client.
- **Type Safety:** All DB operations return typed data (`Promise<Year[]>`, `Promise<Question[]>`, etc.), ensuring compile-time safety.
- **Validation:** Critical validation logic (e.g., checking `correct_answer_index` bounds) happens in the service layer before data is sent to Supabase.

### Key Services

- **`modules.service.ts`**:
  - Handles CRUD for modules.
  - Enforces Foreign Key constraints (fetching modules by `year_id`).
  - Logs all queries for debugging.

- **`questions.service.ts`** (Critical):
  - **Security:** Handles sensitive admin data (`correct_answer_index`).
  - **JSONB Handling:** Converts TypeScript objects to JSONB structures for the `options` column.
  - **Validation:**
    - Ensures at least 2 options exist.
    - Validates that `correct_answer_index` points to a valid option.
    - Checks `external_id` uniqueness.

### Security & Access Control
- **Authentication:** Managed via Supabase Auth (JWT).
- **RLS (Row Level Security):** The database enforces policies ensuring only authenticated admins can INSERT/UPDATE/DELETE.
- **Validation Functions:** helper functions in `database.ts` (e.g., `validateQuestionOptions`) prevent malformed data from reaching the DB.

---

## 4. Application Architecture

### Directory Structure
```
src/
├── components/     # UI Components
│   └── layout/     # Structural components (DashboardLayout)
├── hooks/          # React Query hooks (useQuestions, useYears)
├── lib/            # Supabase client instantiation
├── pages/          # Route views (QuestionsPage, YearsPage)
├── services/       # Database interaction logic
└── types/          # TypeScript definitions matching DB schema
```

### Dashboard Layout
- **Sidebar Navigation:** Provides quick access to all CRUD views.
- **Main Content Area:** Renders the active page based on selection.
- **Stats Overview:** The main dashboard view aggregates counts (Total Years, Modules, Questions) to provide a system health snapshot.

---

## 5. Development Guidelines
1. **Schema Changes:** Any change to the database schema in Supabase must be reflected in `src/types/database.ts` immediately.
2. **Service Isolation:** Components should never call `supabase` directly; they must use the hooks (`useQuestions`) which use the services.
3. **Security:** Never log specific answer data in production. The service logs redact `correct_answer_index`.

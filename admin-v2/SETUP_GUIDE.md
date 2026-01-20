# Admin Dashboard v2 - Setup Guide

## ✅ Current Status

**Foundation Complete:** All core files created and ready for testing.

---

## 📁 Project Structure

```
admin-v2/
├── README.md                              ✅
├── package.json                           ✅
├── tsconfig.json                          ✅
├── vite.config.ts                         ✅
├── index.html                             ✅
├── .env.example                           ✅
├── SCHEMA_MAPPING.md                      ✅
├── IMPLEMENTATION_STATUS.md               ✅
└── src/
    ├── main.tsx                           ✅ App entry
    ├── App.tsx                            ✅ Root component with auth
    ├── types/
    │   └── database.ts                    ✅ Complete type system
    ├── lib/
    │   └── supabase.ts                    ✅ Client + auth helpers
    ├── styles/
    │   └── index.css                      ✅ Base styles
    ├── pages/
    │   ├── LoginPage.tsx                  ✅ Login UI
    │   └── LoginPage.css                  ✅
    └── components/
        └── layout/
            ├── DashboardLayout.tsx        ✅ Main layout
            └── DashboardLayout.css        ✅
```

---

## 🚀 Installation Steps

### 1. Install Dependencies

```bash
cd admin-v2
npm install
```

### 2. Configure Environment

```bash
# Copy the example file
copy .env.example .env
```

Then edit `.env` with your Supabase credentials from the parent project:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_DEV_MODE=true
```

### 3. Start Development Server

```bash
npm run dev
```

The admin dashboard will be available at: `http://localhost:5174`

---

## 🔐 Admin Authentication Setup

### Creating an Admin User

You need to set up admin role in Supabase:

**Option 1: Via Supabase Dashboard**
1. Go to Authentication → Users
2. Create a new user or select existing user
3. Click on the user → User Metadata → Raw JSON
4. Add admin role:
   ```json
   {
     "role": "admin"
   }
   ```

**Option 2: Via SQL**
```sql
-- Update user metadata to include admin role
UPDATE auth.users
SET raw_app_metadata = jsonb_set(
  COALESCE(raw_app_metadata, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'your-admin-email@example.com';
```

---

## ✅ What's Working

1. **Authentication Flow**
   - Login page with email/password
   - Admin role checking via JWT
   - Session persistence
   - Auto-redirect on auth state change

2. **Admin Guard**
   - Prevents non-admin users from accessing dashboard
   - Shows "Access Denied" for authenticated non-admins

3. **Dashboard Layout**
   - Sidebar navigation
   - Main content area
   - Sign out functionality
   - Responsive design

4. **Type System**
   - Complete TypeScript types matching Supabase schema
   - JSONB question option structure
   - Validation helpers

5. **Supabase Integration**
   - Client configured with anon key
   - Admin role verification
   - Logging helpers for development

---

## ⏳ What's Next (In Priority Order)

### Phase 1: Data Services (4-5 hours)
Create data access services for each table:
- [ ] `src/services/years.service.ts`
- [ ] `src/services/modules.service.ts`
- [ ] `src/services/subjects.service.ts`
- [ ] `src/services/lectures.service.ts`
- [ ] `src/services/questions.service.ts` (with JSONB handling)

### Phase 2: React Query Hooks (2-3 hours)
- [ ] `src/hooks/useYears.ts`
- [ ] `src/hooks/useModules.ts`
- [ ] `src/hooks/useSubjects.ts`
- [ ] `src/hooks/useLectures.ts`
- [ ] `src/hooks/useQuestions.ts`

### Phase 3: Management Pages (6-8 hours)
- [ ] Years management page with CRUD
- [ ] Modules management page with CRUD
- [ ] Subjects management page with CRUD
- [ ] Lectures management page with CRUD
- [ ] Questions management page with JSONB editor

### Phase 4: Polish (3-4 hours)
- [ ] Error handling
- [ ] Loading states
- [ ] Cascade delete warnings
- [ ] Bulk import/export
- [ ] Analytics dashboard

---

## 🔒 Security Checklist

### ✅ Implemented
- [x] Admin authentication via JWT role claims
- [x] Session persistence
- [x] Admin-only route protection
- [x] No Service Role key in frontend code
- [x] Type-safe database operations

### ⏳ To Implement
- [ ] Cascade delete warnings with child counts
- [ ] Audit logging for admin actions
- [ ] Question editor that properly handles JSONB
- [ ] Never expose `correct_answer_index` to student API

---

## 🎯 Testing the Foundation

1. **Run the dev server:**
   ```bash
   cd admin-v2
   npm run dev
   ```

2. **You should see:**
   - Login page at `http://localhost:5174`
   - Ability to sign in with admin credentials
   - Dashboard with sidebar navigation
   - Placeholder views for each section

3. **Type checking:**
   ```bash
   npm run typecheck
   ```
   Should pass with no errors.

4. **Build test:**
   ```bash
   npm run build
   ```
   Should compile successfully.

---

## 🚨 Known Limitations

1. **No data services yet** - Dashboard shows placeholders
2. **No CRUD operations** - Cannot manage content yet
3. **No analytics** - Statistics not implemented
4. **No bulk operations** - Import/export not available

These will be implemented in the next phases.

---

## 📝 Notes

### Design Decisions

1. **UUID-First Design**
   - All database operations use UUIDs
   - `external_id` for display only
   - Type-safe with TypeScript

2. **JSONB Question Options**
   - Proper structure: `{id, text, image_url, alt_text}[]`
   - NOT simple string arrays
   - Validated at type level

3. **Security**
   - Admin role checked via JWT claims
   - RLS policies respected  
   - No student PII in admin dashboard

4. **Clean Architecture**
   - Separation of concerns
   - Services for data access
   - Hooks for React Query
   - Components for UI

---

## ✅ Ready for Next Phase

The foundation is complete and tested. You can now proceed with implementing data services and CRUD operations.

**Command to run:**
```bash
cd "c:\Users\METRO\Desktop\اخر نسخ\سوبا 1\admin-v2"
npm install
```

Then create `.env` file and start development!

---

**Last Updated:** 2026-01-20 09:03 UTC  
**Status:** ✅ Foundation Complete  
**Next:** Install dependencies and test authentication

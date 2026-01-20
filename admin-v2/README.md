# Admin Dashboard v2

Supabase-native admin dashboard for Medical MCQ Platform.

## Setup

1. Copy `.env.example` to `.env`
2. Fill in Supabase credentials
3. Run `npm install`
4. Run `npm run dev`

## Architecture

- **React 18** + **TypeScript**
- **Vite** for build tool
- **TanStack Query** for server state
- **Supabase JS SDK** for database access

## Security

- Admin-only access via JWT role claims
- No student PII exposure
- Service role operations via backend API
- RLS-aware queries

## Development

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run typecheck # Type checking
```

# Authentication Setup - Complete Guide

This document explains the authentication system we've built and how to use it.

## 🎯 What We Built

A complete authentication system using:
- **Supabase Auth** - For user management, login, signup
- **React Context** - For client-side auth state
- **Next.js Middleware** - For route protection
- **Prisma** - For user settings storage

---

## 📁 File Structure

```
app/
├── login/                          # Login page
│   ├── page.tsx                    # Server Component (checks if already logged in)
│   ├── Login.css                   # Page styles
│   └── components/
│       └── LoginForm/              # Client Component (form handling)
│           ├── LoginForm.component.tsx
│           ├── LoginForm.styles.css
│           └── index.ts
├── signup/                         # Signup page (similar structure)
├── forgot-password/                # Password reset page
└── layout.tsx                      # Root layout (wraps app in AuthProvider)

lib/
├── supabase/
│   ├── server.ts                   # Server-side Supabase client + helpers
│   └── supabaseClient.ts           # Client-side Supabase client
└── contexts/
    └── AuthContext/                # React Context for auth state
        ├── AuthContext.component.tsx
        └── index.ts

components/
├── atoms/
│   └── Button/                     # Reusable button component
└── fields/
    └── Input/                      # Reusable input component

middleware.ts                        # Route protection middleware

prisma/
└── schema.prisma                   # Database schema (includes UserSettings)
```

---

## 🔐 How It Works

### 1. **Authentication Flow**

```
User visits app
     ↓
Middleware checks auth token (from cookies)
     ↓
┌─────────────────────────────────┐
│ Token valid?                    │
├─────────────────────────────────┤
│ YES              │ NO            │
│ ↓                │ ↓             │
│ Show app         │ Redirect      │
│                  │ to /login     │
└─────────────────────────────────┘
```

### 2. **Server vs Client Components**

**Server Components** (default):
- `app/*/page.tsx` files
- Can directly query database
- Can't use hooks (useState, useEffect)
- Can't handle click events

**Client Components** (`'use client'`):
- LoginForm, SignupForm components
- Need interactivity (forms, buttons)
- Can use React hooks
- Can call Supabase auth methods

### 3. **Auth Context Pattern**

```typescript
// Root Layout (Server Component)
export default async function RootLayout({ children }) {
  const initialUser = await getCurrentUser() // Server-side fetch

  return (
    <AuthProvider initialUser={initialUser}>  {/* Pass to client */}
      {children}
    </AuthProvider>
  )
}

// Any Client Component
function MyComponent() {
  const { user, settings, logout } = useAuth() // Access auth state

  return <div>Welcome {user?.email}</div>
}
```

**Why this pattern:**
- ✅ Fast initial render (server fetches user)
- ✅ No loading flash on page load
- ✅ Reactive updates (login/logout)
- ✅ Works with Server Components

---

## 🚀 Usage Examples

### Protecting a Page

```typescript
// app/dashboard/page.tsx
import { getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  // Check auth server-side
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')  // Redirect before rendering
  }

  // User is authenticated, render page
  return <div>Dashboard for {user.email}</div>
}
```

### Using Auth in Client Components

```typescript
'use client'
import { useAuth } from '@/lib/contexts/AuthContext'

export function ProfileCard() {
  const { user, settings, loading, logout } = useAuth()

  if (loading) return <div>Loading...</div>

  if (!user) return <div>Please login</div>

  return (
    <div>
      <p>Email: {user.email}</p>
      <p>Temp Range: {settings?.expected_temp_min}°C - {settings?.expected_temp_max}°C</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### Fetching User Settings

```typescript
// In any Server Component
import { getCurrentUser, getUserSettings } from '@/lib/supabase/server'

export default async function Page() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const settings = await getUserSettings(user.id)

  return <div>Your expected temp: {settings.expected_temp_min}°C</div>
}
```

---

## 📊 Database Schema

### UserSettings Table

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,  -- Links to Supabase Auth user
  expected_temp_min FLOAT DEFAULT 23.0,
  expected_temp_max FLOAT DEFAULT 26.0,
  expected_pressure_min FLOAT DEFAULT 1.5,
  expected_pressure_max FLOAT DEFAULT 2.5,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**Relationship:**
- `user_id` → Supabase Auth user (stored in Supabase's auth.users table)
- Settings automatically created on first access (see `lib/supabase/server.ts`)

---

## 🔧 API Routes

### GET /api/user/settings

Fetch settings for authenticated user.

**Query params:**
- `userId`: User ID to fetch settings for

**Returns:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "expected_temp_min": 23.0,
  "expected_temp_max": 26.0,
  "expected_pressure_min": 1.5,
  "expected_pressure_max": 2.5,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

**Security:**
- Checks user is authenticated
- Verifies user can only access their own settings

### PUT /api/user/settings

Update settings for authenticated user.

**Request body:**
```json
{
  "expected_temp_min": 22.0,
  "expected_temp_max": 27.0,
  "expected_pressure_min": 1.0,
  "expected_pressure_max": 3.0
}
```

**Validation:**
- Min values must be less than max values
- Temp: -50 to 100°C
- Pressure: 0 to 10 (adjust units as needed)

---

## 🛠 Setup Instructions

### 1. Install Dependencies

Already installed:
- `@supabase/supabase-js`
- `@supabase/ssr`
- `@prisma/client`

### 2. Configure Supabase

1. Create a Supabase project at https://app.supabase.com
2. Copy your project URL and anon key
3. Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres
```

### 3. Run Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Create user_settings table in your database
npx prisma db push
```

### 4. Configure Supabase Auth Settings

In Supabase Dashboard:
1. Go to Authentication > URL Configuration
2. Set "Site URL" to `http://localhost:3000` (dev) or your production URL
3. Add redirect URLs:
   - `http://localhost:3000/thermionix`
   - Your production URLs

### 5. Test the System

```bash
npm run dev
```

Visit:
- http://localhost:3000/signup - Create an account
- http://localhost:3000/login - Login
- http://localhost:3000/thermionix - Protected page (requires auth)

---

## 🔐 Security Notes

### What's Secure:
✅ Auth tokens stored in httpOnly cookies (XSS-safe)
✅ Passwords hashed by Supabase (bcrypt)
✅ CSRF protection via Supabase
✅ Server-side auth checks (middleware + pages)
✅ API routes verify authentication
✅ Users can only access their own settings

### What to Add for Production:
⚠️ Enable email verification in Supabase
⚠️ Set up Row Level Security (RLS) policies in Supabase
⚠️ Add rate limiting for login/signup
⚠️ Set up proper CORS policies
⚠️ Use HTTPS only (enforce in production)

---

## 🐛 Troubleshooting

### "Not authenticated" error on protected pages

**Cause:** Middleware can't read auth cookie

**Fix:** Check:
1. `.env.local` has correct Supabase URL/key
2. You're logged in (check Network tab for auth cookies)
3. Cookie domain matches your app domain

### User logged in but settings are null

**Cause:** User settings not created yet

**Fix:** Settings are auto-created on first fetch. Check:
1. Database connection works (`npx prisma studio`)
2. `user_settings` table exists
3. API route logs for errors

### Email confirmation not working

**Cause:** Supabase email settings

**Fix:**
1. Go to Supabase Dashboard > Authentication > Email Templates
2. Check "Confirm signup" template is enabled
3. For dev: Disable email confirmation (Settings > Auth > Email Auth)

---

## 📚 Next Steps

Now that auth is set up, you can:

1. **Add logout button** to GlobalHeader component
2. **Create Settings page** to let users update their expected values
3. **Build Thermionix dashboard** that uses `settings` to show warnings
4. **Add user profile page** to edit email/password

See the main task document for Session 2 (Thermionix page) and Session 3 (Settings page).

---

## 📖 Learning Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Server vs Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [React Context](https://react.dev/reference/react/useContext)

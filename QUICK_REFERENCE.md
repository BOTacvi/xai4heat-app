# Quick Reference Card

Essential code snippets for daily development.

---

## 🔐 Authentication

### Check if user is logged in (Server Component)
```typescript
import { getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Page() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <div>Welcome {user.email}</div>
}
```

### Access auth state (Client Component)
```typescript
'use client'
import { useAuth } from '@/lib/contexts/AuthContext'

export function MyComponent() {
  const { user, settings, loading, logout } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user) return <div>Please login</div>

  return (
    <div>
      <p>{user.email}</p>
      <p>Temp range: {settings?.expected_temp_min} - {settings?.expected_temp_max}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### Get user settings (Server Component)
```typescript
import { getCurrentUser, getUserSettings } from '@/lib/supabase/server'

export default async function Page() {
  const user = await getCurrentUser()
  const settings = await getUserSettings(user.id)

  return <div>Expected temp: {settings.expected_temp_min}°C</div>
}
```

---

## 🗄️ Database Queries

### Fetch measurements with date range
```typescript
import { prisma } from '@/lib/prisma'

const measurements = await prisma.tuya_measurements.findMany({
  where: {
    device_id: 'L8_53_12',
    datetime: {
      gte: new Date('2025-01-01'),
      lte: new Date('2025-01-31')
    }
  },
  orderBy: {
    datetime: 'asc'
  },
  take: 100 // Limit results
})
```

### Update user settings
```typescript
import { prisma } from '@/lib/prisma'

const updated = await prisma.userSettings.update({
  where: { user_id: userId },
  data: {
    expected_temp_min: 23,
    expected_temp_max: 26
  }
})
```

### Upsert (update or create)
```typescript
const settings = await prisma.userSettings.upsert({
  where: { user_id: userId },
  update: { expected_temp_min: 23 },
  create: { user_id: userId, expected_temp_min: 23 }
})
```

---

## 🌐 API Routes

### Basic GET route
```typescript
// app/api/data/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get query params
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')

    // 3. Query database
    const data = await prisma.myTable.findMany()

    // 4. Return response
    return NextResponse.json(data)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
```

### POST route with body
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { field1, field2 } = body

  // Validate
  if (!field1) {
    return NextResponse.json({ error: 'Missing field1' }, { status: 400 })
  }

  // Process...
  const result = await prisma.table.create({ data: { field1, field2 } })

  return NextResponse.json(result)
}
```

---

## 🎨 Components

### Reusable Input
```typescript
import { Input } from '@/components/fields/Input'

<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={error}
  helperText="We'll never share your email"
  required
/>
```

### Reusable Button
```typescript
import { Button } from '@/components/atoms/Button'

<Button
  variant="primary"     // primary | secondary | danger | ghost
  size="medium"         // small | medium | large
  loading={isLoading}
  onClick={handleClick}
  fullWidth
>
  Click me
</Button>
```

---

## 📡 Real-Time Subscriptions (Session 2)

### Subscribe to database changes
```typescript
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function RealtimeComponent({ deviceId }) {
  const [currentTemp, setCurrentTemp] = useState(null)

  useEffect(() => {
    // Subscribe to new measurements
    const channel = supabase
      .channel(`device:${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tuya_measurements',
          filter: `device_id=eq.${deviceId}`
        },
        (payload) => {
          setCurrentTemp(payload.new.temp_current)
        }
      )
      .subscribe()

    // Cleanup on unmount
    return () => {
      channel.unsubscribe()
    }
  }, [deviceId])

  return <div>Current: {currentTemp}°C</div>
}
```

---

## 🎯 Common Patterns

### Loading States
```typescript
'use client'
import { useState, useEffect } from 'react'

export function DataComponent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!data) return <div>No data</div>

  return <div>{/* Render data */}</div>
}
```

### Form Submission
```typescript
'use client'
import { useState, FormEvent } from 'react'

export function MyForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        throw new Error('Request failed')
      }

      const data = await response.json()
      // Handle success

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  )
}
```

### Protected Client Component
```typescript
'use client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function ProtectedComponent() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) return <div>Loading...</div>
  if (!user) return null

  return <div>Protected content</div>
}
```

---

## 🔧 Utility Functions

### Parse device ID
```typescript
// "L8_53_12" → { lamela: 8, building: 53, apartment: 12 }
function parseDeviceId(deviceId: string) {
  const parts = deviceId.split('_')
  return {
    lamela: parseInt(parts[0].substring(1)), // Remove "L"
    building: parseInt(parts[1]),
    apartment: parseInt(parts[2])
  }
}
```

### Check value status
```typescript
type Status = 'normal' | 'warning-low' | 'warning-high'

function getValueStatus(
  current: number,
  min: number,
  max: number
): Status {
  if (current < min) return 'warning-low'
  if (current > max) return 'warning-high'
  return 'normal'
}
```

### Date formatting
```typescript
import { format } from 'date-fns'

// Format for display
format(new Date(), 'MMM dd, yyyy') // "Jan 15, 2025"
format(new Date(), 'HH:mm:ss')     // "14:30:45"

// For API queries
const isoDate = new Date().toISOString() // "2025-01-15T14:30:45.123Z"
```

---

## 📊 TypeScript Types

### Prisma types (auto-generated)
```typescript
import type { User } from '@supabase/supabase-js'
import type { UserSettings } from '@/lib/generated/prisma'

// These are auto-generated from your Prisma schema
```

### API response types
```typescript
type ApiResponse<T> = {
  data?: T
  error?: string
}

// Usage
const response: ApiResponse<UserSettings> = await fetch('/api/settings')
  .then(r => r.json())
```

---

## 🐛 Debugging

### Check auth status
```typescript
// In Server Component
const user = await getCurrentUser()
console.log('User:', user?.email || 'Not logged in')

// In Client Component
const { user } = useAuth()
console.log('User:', user?.email || 'Not logged in')
```

### View database
```bash
npx prisma studio
# Opens browser with database GUI
```

### Check API route
```bash
curl http://localhost:3000/api/user/settings?userId=YOUR_ID
```

### Clear cookies (if auth is stuck)
```
Browser DevTools > Application > Storage > Clear site data
```

---

## 🚨 Common Errors

### "Cannot use import statement outside a module"
- Fix: Check `"use client"` directive at top of file
- Only Client Components can import hooks

### "Cookies can only be modified in Server Actions"
- Fix: Don't try to set cookies in Server Components
- Use API routes or Server Actions for mutations

### "Text content mismatch" (hydration error)
- Fix: Ensure server and client render same initial HTML
- Don't use `Date.now()` or random values in Server Components

### "prisma is not defined"
- Fix: Run `npx prisma generate` to generate client

---

## 💡 Best Practices

### ✅ DO
- Use Server Components by default
- Validate input on server
- Handle errors gracefully
- Clean up subscriptions in useEffect
- Use TypeScript for type safety
- Comment complex logic

### ❌ DON'T
- Import Prisma in Client Components
- Store secrets in client code
- Forget to await async functions
- Trust client input without validation
- Use `any` type (use `unknown` instead)
- Nest too many components deeply

---

## 📚 Useful Commands

```bash
# Development
npm run dev

# Database
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema to database
npx prisma studio        # Open database GUI
npx prisma migrate dev   # Create migration

# Build
npm run build
npm start

# TypeScript
npx tsc --noEmit         # Check types without building
```

---

## 🔗 Quick Links

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Docs](https://react.dev)

---

**Keep this file open while coding for quick copy-paste!** 📋

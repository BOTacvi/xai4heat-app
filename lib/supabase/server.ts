/**
 * Supabase Server Client Utilities
 *
 * LEARNING: Why do we need separate client/server Supabase instances?
 *
 * In Next.js App Router, we have TWO execution environments:
 * 1. CLIENT (browser) - uses cookies accessible via document.cookie
 * 2. SERVER (Node.js) - needs to read cookies from request headers
 *
 * Supabase stores auth tokens in cookies for security (httpOnly prevents XSS attacks).
 * But Next.js Server Components can't access browser cookies directly.
 *
 * SOLUTION: We create a server-side Supabase client that reads cookies from
 * Next.js request context. This allows Server Components to check auth status.
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for use in Server Components and Server Actions
 *
 * HOW IT WORKS:
 * 1. Next.js provides cookies() helper to read request cookies
 * 2. We pass cookie getter/setter to Supabase client
 * 3. Supabase can now read the auth token from cookies
 * 4. Server Components can call supabase.auth.getUser()
 *
 * WHEN TO USE:
 * - Server Components (pages without 'use client' directive)
 * - Server Actions (async functions with 'use server')
 * - API Route Handlers (app/api routes)
 *
 * WHEN NOT TO USE:
 * - Client Components ('use client') - use the client supabase instance instead
 */
export async function createServerClient() {
  // LEARNING: Next.js cookies() returns a Promise in Next.js 15+
  // We need to await it to get the cookie store
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // COMMENT: Supabase needs these methods to read/write auth cookies
        // getAll() - reads all cookies from the request
        getAll() {
          return cookieStore.getAll()
        },
        // setAll() - writes cookies to the response (for login/signup)
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // COMMENT: setAll might be called from a Server Component
            // where we can't modify cookies (read-only context)
            // This is expected and safe to ignore
          }
        },
      },
    }
  )
}

/**
 * Helper to get the current user in Server Components
 *
 * USAGE:
 * ```typescript
 * export default async function Page() {
 *   const user = await getCurrentUser()
 *
 *   if (!user) {
 *     redirect('/login')
 *   }
 *
 *   return <div>Hello {user.email}</div>
 * }
 * ```
 *
 * LEARNING: This pattern is better than checking auth in middleware for every route
 * because it's explicit and co-located with the component that needs it.
 */
export async function getCurrentUser() {
  const supabase = await createServerClient()

  // COMMENT: getUser() validates the token and returns user data
  // Unlike getSession(), this actually verifies the JWT is valid
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Error fetching user:', error.message)
    return null
  }

  return user
}

/**
 * Helper to get user settings from database
 *
 * LEARNING: This demonstrates the flow:
 * 1. Get user from Supabase Auth (user_id)
 * 2. Query Prisma database using that user_id
 * 3. Return settings or create defaults
 *
 * WHY SEPARATE FROM AUTH:
 * - Supabase Auth stores minimal user info (email, metadata)
 * - Application-specific data lives in our Postgres database
 * - Prisma gives us type-safe queries
 */
export async function getUserSettings(userId: string) {
  const { prisma } = await import('@/lib/prisma')

  // COMMENT: Try to find existing settings for this user
  let settings = await prisma.userSettings.findUnique({
    where: { user_id: userId }
  })

  // COMMENT: If no settings exist (new user), create defaults
  // This ensures every user always has settings available
  if (!settings) {
    settings = await prisma.userSettings.create({
      data: {
        user_id: userId,
        // Defaults are defined in Prisma schema
      }
    })
  }

  return settings
}

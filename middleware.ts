/**
 * Next.js Middleware - Authentication Guard
 *
 * LEARNING: What is Next.js Middleware?
 *
 * Middleware runs BEFORE every request to your app:
 * - Executes on the Edge (super fast, globally distributed)
 * - Can modify request/response
 * - Can redirect users
 * - Runs before Server Components, API routes, everything
 *
 * USE CASES:
 * - Authentication (like we're doing)
 * - Redirect logic (www → non-www, old URLs → new URLs)
 * - Geolocation-based routing
 * - A/B testing
 * - Bot detection
 *
 * WHY MIDDLEWARE FOR AUTH:
 * Instead of checking auth in every page:
 * ❌ page1.tsx: check auth → redirect
 * ❌ page2.tsx: check auth → redirect
 * ❌ page3.tsx: check auth → redirect
 *
 * Do it once in middleware:
 * ✅ middleware.ts: check auth → redirect ALL protected pages
 *
 * ARCHITECTURE:
 *                    Request
 *                      ↓
 *              [Middleware runs]
 *                      ↓
 *            Is user authenticated?
 *             ↙               ↘
 *          Yes                 No
 *           ↓                   ↓
 *    Continue to page     Redirect to /login
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware function
 *
 * COMMENT: This runs on every request matching the config below
 */
export async function middleware(request: NextRequest) {
  // STEP 1: Create Supabase client for middleware
  // LEARNING: We need a special client that works with NextRequest/NextResponse
  // It reads cookies from the request and can set cookies in the response

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // COMMENT: Read cookies from incoming request
        getAll() {
          return request.cookies.getAll()
        },
        // COMMENT: Set cookies in outgoing response
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // STEP 2: Check authentication status
  // COMMENT: getUser() validates the JWT token from cookies
  // Returns user object if valid, null if not authenticated
  const { data: { user } } = await supabase.auth.getUser()

  // STEP 3: Get the current path
  const path = request.nextUrl.pathname

  // STEP 4: Define route rules
  // COMMENT: Arrays make it easy to add/remove protected routes
  // All auth routes are under /auth now
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password']
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route))
  const isProtectedRoute = !isPublicRoute && path !== '/'

  // STEP 5: Apply auth logic

  // If user is authenticated and trying to access auth pages, redirect to app
  // EXAMPLE: User is logged in but goes to /auth/login → redirect to /thermionix
  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL('/thermionix', request.url))
  }

  // If user is NOT authenticated and trying to access protected route, redirect to login
  // EXAMPLE: User not logged in tries to access /thermionix → redirect to /auth/login
  if (!user && isProtectedRoute) {
    // LEARNING: Preserve the original URL so we can redirect back after login
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', path)
    return NextResponse.redirect(redirectUrl)
  }

  // STEP 6: Allow request to continue
  // COMMENT: User has correct permissions, let them through
  return response
}

/**
 * Middleware Configuration
 *
 * LEARNING: matcher specifies which routes run middleware
 *
 * WHY USE matcher:
 * - Middleware can be slow if it runs on EVERY request
 * - We don't need auth checks for static files (images, CSS, etc.)
 * - We don't need it for Next.js internal routes (_next/)
 *
 * PATTERN EXPLANATION:
 * - /((?!_next/static|_next/image|favicon.ico).*)
 *   → Match everything EXCEPT Next.js internal routes
 * - Negative lookahead: (?!pattern) means "not followed by pattern"
 * - This is a standard Next.js middleware matcher pattern
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files (*.svg, *.png, *.jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

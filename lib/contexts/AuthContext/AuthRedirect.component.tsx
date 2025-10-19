/**
 * AuthRedirect Component - Client-Side Auth Error Handler
 *
 * LEARNING: Why do we need this component?
 *
 * PROBLEM: When API calls fail due to authentication:
 * - User sees cryptic error messages
 * - App breaks instead of redirecting to login
 * - No clear path back to authentication
 *
 * SOLUTION: This component monitors auth state and redirects when needed
 *
 * HOW IT WORKS:
 * 1. Wraps the app content
 * 2. Monitors auth context for user state
 * 3. If user becomes null unexpectedly, redirect to login
 * 4. Preserves the current URL to return after login
 *
 * ARCHITECTURE:
 *           AuthProvider (maintains user state)
 *                    ↓
 *           AuthRedirect (monitors changes)
 *                    ↓
 *           App Content (your pages)
 */

'use client'

import { useAuth } from './AuthContext.component'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

type AuthRedirectProps = {
  children: React.ReactNode
}

/**
 * AuthRedirect Component
 *
 * LEARNING: Client-side authentication monitoring
 *
 * WHY CLIENT-SIDE:
 * - Middleware handles initial requests (server-side)
 * - This handles auth changes DURING user session (client-side)
 * - Examples: Token expires, user logs out in another tab, API returns 401
 *
 * WHEN IT REDIRECTS:
 * - User was logged in, then becomes null (session expired)
 * - User tries to access protected pages while not authenticated
 * - API returns 401 Unauthorized (handled by interceptor elsewhere)
 *
 * PROTECTED ROUTES:
 * - /thermionix, /scada, /weatherlink, /settings
 *
 * PUBLIC ROUTES:
 * - /, /login, /signup, /forgot-password, /reset-password
 */
export const AuthRedirect: React.FC<AuthRedirectProps> = ({ children }) => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // COMMENT: Don't redirect while still checking auth status
    if (loading) return

    // STEP 1: Define route types
    // LEARNING: New structure with /dashboard/* for authenticated routes
    const isAuthRoute = pathname.startsWith('/auth')
    const isDashboardRoute = pathname.startsWith('/dashboard')
    const isRootRoute = pathname === '/'

    // STEP 2: Redirect logic for protected routes
    // COMMENT: If user is NOT logged in and tries to access dashboard
    if (!user && isDashboardRoute) {
      // LEARNING: Preserve current URL to redirect back after login
      const loginUrl = `/auth/login?redirectTo=${encodeURIComponent(pathname)}`

      console.log(`[AuthRedirect] User not authenticated, redirecting to login`)
      console.log(`[AuthRedirect] Will return to: ${pathname} after login`)

      router.push(loginUrl)
    }

    // STEP 3: Redirect authenticated users away from auth pages
    // COMMENT: If user IS logged in and tries to access login/signup
    // Example: User logged in navigates to /auth/login → Redirect to /dashboard
    if (user && isAuthRoute) {
      console.log(`[AuthRedirect] User already authenticated, redirecting to dashboard`)
      router.push('/dashboard')
    }

    // STEP 4: Handle root route (optional - middleware also handles this)
    // COMMENT: Root route should redirect based on auth state
    if (isRootRoute) {
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/auth/login')
      }
    }
  }, [user, loading, pathname, router])

  // COMMENT: While loading auth state, show nothing (prevents flash of wrong content)
  // This is better UX than showing login page then immediately redirecting
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  // COMMENT: Render children once auth state is determined
  return <>{children}</>
}

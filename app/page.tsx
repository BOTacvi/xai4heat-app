/**
 * Root Page - Redirect Logic Only
 *
 * LEARNING: Why a redirect-only root page?
 *
 * PROBLEM:
 * - Root / is neither auth page nor dashboard page
 * - Showing content here is confusing (is user logged in or not?)
 * - Need clear separation: auth pages vs dashboard pages
 *
 * SOLUTION:
 * - Root page just decides where to send user
 * - If authenticated → /dashboard (homepage with 4 cards)
 * - If not authenticated → /auth/login
 * - No UI needed - just redirect
 *
 * BENEFITS:
 * - Clear separation of concerns
 * - No ambiguous "landing page"
 * - User always lands in correct place for their auth state
 * - Middleware will also catch and redirect (defense in depth)
 */

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { AUTH_ROUTES, DASHBOARD_ROUTES } from '@/lib/constants/routes'

type RootPageProps = {}

const RootPage: React.FC<RootPageProps> = async () => {
  // STEP 1: Check if user is authenticated
  const user = await getCurrentUser()

  // STEP 2: Redirect based on auth state
  // REFACTOR: Use centralized route constants instead of hardcoded paths
  if (user) {
    // COMMENT: User is logged in → send to dashboard homepage
    redirect(DASHBOARD_ROUTES.HOME)
  } else {
    // COMMENT: User is not logged in → send to login page
    redirect(AUTH_ROUTES.LOGIN)
  }

  // COMMENT: This return is never reached (redirect throws)
  // But TypeScript requires it for the function signature
  return null
}

export default RootPage

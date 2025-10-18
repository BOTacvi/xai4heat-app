/**
 * Auth Context - Client-Side Authentication State
 *
 * LEARNING: Why React Context for Auth?
 *
 * PROBLEM: Multiple components need to know:
 * - Is user logged in?
 * - What's the user's email/id?
 * - What are their temperature/pressure settings?
 * - How to logout?
 *
 * SOLUTION: React Context provides this data globally without prop drilling.
 *
 * ARCHITECTURE:
 * 1. Server Component fetches initial user (getCurrentUser)
 * 2. Passes to AuthProvider as initialUser
 * 3. Client components access via useAuth() hook
 * 4. Context subscribes to Supabase auth changes (login/logout)
 *
 * WHY THIS PATTERN:
 * ✅ Server-side initial render (SEO, performance)
 * ✅ Client-side reactivity (logout, realtime updates)
 * ✅ Type-safe with TypeScript
 * ✅ Zero extra dependencies
 */

'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import type { UserSettings } from '@/lib/generated/prisma'

/**
 * AuthContextValue - What data the context provides
 *
 * LEARNING: This is the "public API" of our auth system
 * Any component can call useAuth() to get these values
 */
interface AuthContextValue {
  // Current logged-in user (null if not authenticated)
  user: User | null

  // User's temperature/pressure settings (null while loading)
  settings: UserSettings | null

  // Loading state (true during initial check)
  loading: boolean

  // Logout function - call this to sign out
  logout: () => Promise<void>

  // Refresh settings after user updates them in Settings page
  refreshSettings: () => Promise<void>
}

// Create the context with undefined default
// COMMENT: We use undefined to force usage of AuthProvider wrapper
// If someone forgets the provider, they'll get a helpful error
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * AuthProvider Props
 *
 * LEARNING: initialUser comes from Server Component
 * This allows the first render to show user data immediately (no loading flash)
 */
interface AuthProviderProps {
  children: ReactNode
  initialUser: User | null
}

/**
 * AuthProvider - Wraps the app to provide auth state
 *
 * HOW IT WORKS:
 * 1. Accepts initialUser from server (fast first render)
 * 2. Sets up listener for auth state changes (login/logout)
 * 3. Fetches user settings from API
 * 4. Re-renders children when auth state changes
 *
 * LIFECYCLE:
 * Mount → useEffect runs → subscribe to auth changes
 *      → fetch settings
 * Unmount → cleanup subscription (prevent memory leak)
 */
export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  // COMMENT: Start with server-provided user (null if not logged in)
  const [user, setUser] = useState<User | null>(initialUser)

  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * Fetch user settings from our API
   *
   * LEARNING: Why an API route instead of direct Prisma query?
   * - Client Components can't import Prisma (it's server-side only)
   * - API routes provide a clean boundary between frontend/backend
   * - Allows us to add authentication checks in one place
   *
   * IMPORTANT: No userId parameter needed!
   * - API route reads authenticated user from session cookie
   * - This is more secure - user can't request someone else's settings
   * - API automatically fetches settings for whoever is logged in
   */
  const fetchSettings = async () => {
    try {
      // COMMENT: No userId parameter - API determines user from session
      const response = await fetch('/api/user/settings')

      if (!response.ok) {
        // COMMENT: If 401, user is not authenticated (shouldn't happen here)
        // If 404, user has no settings yet (will be created on first update)
        if (response.status === 404) {
          console.log('No settings found for user - will use defaults')
          setSettings(null)
          return
        }
        throw new Error('Failed to fetch settings')
      }

      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Error fetching settings:', error)
      // COMMENT: Set null on error, components can show defaults
      setSettings(null)
    }
  }

  /**
   * Public method to refresh settings
   * USAGE: After user updates settings, call refreshSettings() to sync state
   */
  const refreshSettings = async () => {
    if (user) {
      await fetchSettings()
    }
  }

  /**
   * Logout function
   *
   * LEARNING: Supabase logout process:
   * 1. supabase.auth.signOut() clears the auth cookie
   * 2. This triggers onAuthStateChange listener below
   * 3. Listener updates state to user=null
   * 4. Components automatically re-render showing logged-out state
   * 5. Middleware (we'll create) can redirect to login
   */
  const logout = async () => {
    try {
      await supabase.auth.signOut()
      // COMMENT: State will be updated by the listener below
      // No need to manually call setUser(null)
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  /**
   * Effect: Subscribe to auth state changes
   *
   * LEARNING: Supabase provides onAuthStateChange listener
   * This fires when:
   * - User logs in
   * - User logs out
   * - Session is refreshed
   * - Tab gains focus (checks if session expired)
   *
   * WHY THIS MATTERS:
   * If user logs out in another tab, this tab will know immediately
   */
  useEffect(() => {
    // COMMENT: Initial setup - fetch settings if user exists
    if (user) {
      fetchSettings()
      setLoading(false)
    } else {
      setLoading(false)
    }

    // COMMENT: Subscribe to future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth event:', event) // Helpful for debugging

        // COMMENT: Extract user from session (null if logged out)
        const currentUser = session?.user ?? null
        setUser(currentUser)

        // COMMENT: Fetch settings for new user, clear for logout
        if (currentUser) {
          await fetchSettings()
        } else {
          setSettings(null)
        }

        setLoading(false)
      }
    )

    // COMMENT: Cleanup function - CRITICAL to prevent memory leaks
    // When component unmounts, unsubscribe from auth changes
    return () => {
      subscription.unsubscribe()
    }
  }, []) // Empty deps = run once on mount

  // COMMENT: Pass values to all children via context
  const value: AuthContextValue = {
    user,
    settings,
    loading,
    logout,
    refreshSettings
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth Hook - Access auth state in any component
 *
 * USAGE:
 * ```typescript
 * function MyComponent() {
 *   const { user, settings, logout } = useAuth()
 *
 *   if (!user) return <div>Please login</div>
 *
 *   return (
 *     <div>
 *       Welcome {user.email}
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   )
 * }
 * ```
 *
 * ERROR HANDLING:
 * If you forget to wrap your component tree with <AuthProvider>,
 * this will throw a helpful error message
 */
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

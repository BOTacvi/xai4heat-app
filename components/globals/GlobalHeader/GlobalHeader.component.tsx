/**
 * GlobalHeader Component - Client Component
 *
 * LEARNING: Why Client Component?
 * - Needs to call logout() from AuthContext
 * - useAuth() hook can only be used in Client Components
 * - Button needs onClick handler (interactivity)
 *
 * Main application header with title, user email, and logout button
 * Following claude.md conventions:
 * - Type: GlobalHeaderProps
 * - Pattern: React.FC<PropsType>
 * - Classes: kebab-case (global-header)
 */

'use client'

import clsx from "clsx"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/contexts/AuthContext"
import { Button } from "@/components/atoms/Button"
import styles from "./GlobalHeader.module.css"

type GlobalHeaderProps = {
  className?: string
}

const GlobalHeader: React.FC<GlobalHeaderProps> = ({ className }) => {
  const router = useRouter()
  const { user, logout } = useAuth()

  /**
   * Handle logout
   *
   * LEARNING: Logout flow
   * 1. Call logout() from AuthContext
   * 2. Supabase clears auth cookie
   * 3. AuthContext listener updates state to user=null
   * 4. Router pushes to /auth/login
   * 5. Middleware ensures user can't access /dashboard/* anymore
   * 6. Layout automatically removes navigation (user is on /auth/* route)
   */
  const handleLogout = async () => {
    await logout()

    // COMMENT: Navigate to login page
    // This triggers the layout change - navigation disappears automatically
    router.push('/auth/login')

    // COMMENT: Refresh to ensure middleware runs
    router.refresh()
  }

  // COMMENT: Compose classes following our pattern
  const headerClasses = clsx(
    styles.globalHeader,
    className
  )

  return (
    <header className={headerClasses}>
      <div className={styles.left}>
        <h1 className={styles.title}>Thermionix</h1>
        {user && (
          <span className={styles.userEmail}>{user.email}</span>
        )}
      </div>
      <Button
        onClick={handleLogout}
        variant="secondary"
        className={styles.logoutButton}
      >
        Logout
      </Button>
    </header>
  )
}

export default GlobalHeader

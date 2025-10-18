/**
 * Login Page - Server Component
 *
 * LEARNING: Page Structure in Next.js App Router
 *
 * WHY SERVER COMPONENT:
 * - Initial render on server (SEO, performance)
 * - Can check if user is already logged in
 * - Can redirect before sending HTML to browser
 *
 * PATTERN:
 * Server Component (page.tsx) → Client Component (LoginForm)
 *                ↓
 *          Check auth status
 *          Redirect if logged in
 *          Otherwise render form
 */

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import LoginForm from './components/LoginForm'
import styles from './Login.module.css'

/**
 * COMMENT: This is an async Server Component
 * We can directly await database queries and auth checks
 * No useEffect, no loading states needed for initial render
 */
export default async function LoginPage() {
  // Check if user is already logged in
  const user = await getCurrentUser()

  // LEARNING: Next.js redirect()
  // - Throws an error internally (don't wrap in try/catch)
  // - Happens on server before HTML is sent
  // - User never sees the login page
  if (user) {
    redirect('/thermionix') // Redirect to main app
  }

  // User not logged in, show the login form
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>
            Sign in to access your Thermionix dashboard
          </p>
        </div>

        {/* LoginForm is a Client Component (needs form state, onClick handlers) */}
        <LoginForm />
      </div>
    </div>
  )
}

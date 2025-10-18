/**
 * User Settings Page - Server Component
 *
 * Allows users to update:
 * - Name
 * - Email
 * - Password
 */

import { getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './UserSettings.module.css'

export default async function UserSettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.subtitle}>User Profile</h2>
      <p className={styles.description}>
        Manage your account information and security settings
      </p>

      {/* TODO: Add UserSettingsForm component here in Session 3 */}
      {/* Form will be a Client Component with: */}
      {/* - Email input (current: {user.email}) */}
      {/* - Current Password input */}
      {/* - New Password input */}
      {/* - Confirm New Password input */}
      {/* - Save button */}
    </div>
  )
}

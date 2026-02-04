/**
 * User Settings Page - Server Component
 *
 * Allows users to update:
 * - View account information
 * - Change password
 */

import { getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserSettingsForm } from './components/UserSettingsForm'
import styles from './UserSettings.module.css'

type UserSettingsPageProps = {}

const UserSettingsPage: React.FC<UserSettingsPageProps> = async () => {
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

      <UserSettingsForm userEmail={user.email || ''} />
    </div>
  )
}

export default UserSettingsPage

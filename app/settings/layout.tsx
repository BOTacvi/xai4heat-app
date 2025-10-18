/**
 * Settings Layout - Wraps all settings pages
 *
 * LEARNING: Nested Layouts in Next.js App Router
 * - Provides navigation between User Settings and App Settings
 * - Layout persists across navigation (doesn't remount)
 * - Perfect for tab-like navigation
 */

import { getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './Settings.module.css'

type SettingsLayoutProps = {
  children: React.ReactNode
}

export default async function SettingsLayout({ children }: SettingsLayoutProps) {
  // COMMENT: Check authentication
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Settings</h1>

      {/* Settings Navigation Tabs */}
      <nav className={styles.nav}>
        <Link href="/settings/user" className={styles.navLink}>
          User Settings
        </Link>
        <Link href="/settings/app" className={styles.navLink}>
          App Settings
        </Link>
      </nav>

      {/* Render the active settings page */}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
}

/**
 * App Settings Page - Server Component
 *
 * LEARNING: Server Component + Client Component Pattern
 *
 * WHY THIS ARCHITECTURE:
 * - Page is Server Component (can fetch data on server)
 * - Form is Client Component (needs interactivity)
 * - Server fetches initial data, passes to Client as props
 * - Client handles mutations (updates) via API
 *
 * BENEFITS:
 * - Fast initial load (server-rendered with data)
 * - SEO-friendly (content available on first render)
 * - Progressive enhancement (works without JS, then adds interactivity)
 *
 * Allows users to configure:
 * - Expected temperature range (min/max)
 * - Expected pressure range (min/max)
 *
 * These values are used across the app to determine warning states
 * (too hot/cold, pressure too high/low)
 */

import { getCurrentUser, getUserSettings } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppSettingsForm } from './components/AppSettingsForm/AppSettingsForm.component'
import styles from './AppSettings.module.css'

type AppSettingsPageProps = {}

const AppSettingsPage: React.FC<AppSettingsPageProps> = async () => {
  // STEP 1: Check authentication
  // COMMENT: Server Component can directly call Supabase server helpers
  const user = await getCurrentUser()

  if (!user) {
    // COMMENT: If not authenticated, redirect to login
    // Middleware should catch this, but good to be defensive
    redirect('/auth/login')
  }

  // STEP 2: Fetch current settings from database
  // COMMENT: getUserSettings creates defaults if none exist
  const settings = await getUserSettings(user.id)

  // STEP 3: Render page with current settings
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Application Settings</h2>
      <p className={styles.description}>
        Configure expected temperature and pressure ranges for monitoring
      </p>

      <div className={styles.currentSettings}>
        <h3 className={styles.sectionTitle}>Current Settings</h3>
        <div className={styles.settingGrid}>
          <div className={styles.settingItem}>
            <span className={styles.label}>Temperature Range:</span>
            <span className={styles.value}>
              {settings.expected_temp_min}°C - {settings.expected_temp_max}°C
            </span>
          </div>
          <div className={styles.settingItem}>
            <span className={styles.label}>Pressure Range:</span>
            <span className={styles.value}>
              {settings.expected_pressure_min} - {settings.expected_pressure_max} bar
            </span>
          </div>
        </div>
      </div>

      {/* STEP 4: Render form as Client Component */}
      {/* COMMENT: Pass settings as props for default values */}
      <AppSettingsForm currentSettings={settings} />
    </div>
  )
}

export default AppSettingsPage

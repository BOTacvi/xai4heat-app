/**
 * App Settings Page - Server Component
 *
 * Allows users to configure alert threshold ranges for:
 * - Temperature (used by Thermionix and SCADA)
 * - Humidity (used by Thermionix)
 * - CO2 (used by Thermionix)
 *
 * Values outside these ranges will trigger alerts.
 */

import { getCurrentUser, getUserSettings } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppSettingsForm } from './components/AppSettingsForm/AppSettingsForm.component'
import styles from './AppSettings.module.css'

const AppSettingsPage: React.FC = async () => {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  const settings = await getUserSettings(user.id)

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Alert Thresholds</h2>
      <p className={styles.description}>
        Configure threshold ranges for alerts. Values outside these ranges will trigger notifications.
      </p>

      <AppSettingsForm currentSettings={settings} />
    </div>
  )
}

export default AppSettingsPage

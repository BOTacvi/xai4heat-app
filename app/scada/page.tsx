/**
 * SCADA Page - Server Component
 *
 * LEARNING: Server Component Pattern
 * - Similar to Thermionix but monitors entire lamelas (buildings)
 * - Fetches initial SCADA measurements data
 * - Aggregates data across multiple apartments in a lamela
 *
 * This page displays:
 * - Lamela selector (L1, L2, L3, etc.)
 * - Aggregated temperature data for all apartments in lamela
 * - Aggregated pressure data
 * - Date range selector for historical data
 * - Real-time updates for the selected lamela
 */

import { getCurrentUser, getUserSettings } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './SCADA.module.css'

export default async function SCADAPage() {
  // COMMENT: Authentication check
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // COMMENT: Fetch user settings for warning thresholds
  const settings = await getUserSettings(user.id)

  // TODO: Fetch list of lamelas
  // Parse device names to extract unique lamelas (L1, L2, L3, etc.)

  // TODO: Fetch initial SCADA measurements
  // const scadaData = await prisma.scada_measurements.findMany(...)

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>SCADA Monitoring</h1>
      <p className={styles.subtitle}>
        Monitor entire building systems (lamelas) in real-time
      </p>

      {/* TODO: Add SCADA components here in Session 3 */}
      {/* - LamelaSelector */}
      {/* - AggregatedTemperatureCard */}
      {/* - AggregatedTemperatureGraph */}
      {/* - AggregatedPressureCard */}
      {/* - AggregatedPressureGraph */}
    </div>
  )
}

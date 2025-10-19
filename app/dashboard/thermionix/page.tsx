/**
 * Thermionix Page - Server Component
 *
 * LEARNING: Server Component Pattern
 * - Fetches initial data on server (measurements, user settings)
 * - Can directly query database via Prisma
 * - Passes data to client components for interactivity and real-time updates
 *
 * This page displays:
 * - Apartment selector
 * - Temperature card + graph (current value + historical data)
 * - Pressure card + graph
 * - Date range selector for graphs
 * - Real-time updates via Supabase Realtime (implemented in client components)
 */

import { getCurrentUser, getUserSettings } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './Thermionix.module.css'

type ThermionixPageProps = {}

const ThermionixPage: React.FC<ThermionixPageProps> = async () => {
  // COMMENT: Authentication check - required for all protected pages
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // COMMENT: Fetch user settings to know expected temperature/pressure ranges
  // These will be used in client components to determine warning states
  const settings = await getUserSettings(user.id)

  // TODO: Fetch initial list of apartments/devices
  // const devices = await prisma.device.findMany()

  // TODO: Fetch initial measurements for default apartment
  // const measurements = await prisma.thermionyx_measurements.findMany(...)

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Thermionix Monitoring</h1>
      <p className={styles.subtitle}>
        Monitor apartment temperature and pressure in real-time
      </p>

      {/* TODO: Add Thermionix components here in Session 2 */}
      {/* - ApartmentSelector */}
      {/* - TemperatureCard (with real-time updates) */}
      {/* - TemperatureGraph (with date range selector) */}
      {/* - PressureCard */}
      {/* - PressureGraph */}
    </div>
  )
}

export default ThermionixPage

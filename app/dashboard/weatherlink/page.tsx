/**
 * WeatherLink Page - Server Component
 *
 * LEARNING: Server Component Pattern
 * - Fetches initial data on server
 * - Can directly query database via Prisma
 * - Passes data to client components for interactivity
 */

import { getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './WeatherLink.module.css'

type WeatherLinkPageProps = {}

const WeatherLinkPage: React.FC<WeatherLinkPageProps> = async () => {
  // COMMENT: Check authentication - redirect if not logged in
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // TODO: Fetch initial WeatherLink data here
  // const weatherData = await prisma.weatherlink_measurements.findMany(...)

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>WeatherLink Monitoring</h1>
      <p className={styles.subtitle}>Outside temperature and weather data</p>

      {/* TODO: Add WeatherLink components here in Session 2 */}
    </div>
  )
}

export default WeatherLinkPage

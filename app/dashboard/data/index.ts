/**
 * Dashboard Cards Data
 *
 * LEARNING: Data-Driven UI Pattern
 * - Extracts hardcoded content into a data structure
 * - Makes it easy to add/remove/reorder cards
 * - Single source of truth for dashboard sections
 */

import { Thermometer, Activity, Cloud, Settings } from 'lucide-react'
import { DASHBOARD_ROUTES } from '@/lib/constants/routes'
import type { LucideIcon } from 'lucide-react'

export type DashboardCard = {
  title: string
  href: string
  icon: LucideIcon
  description?: string
}

export const DASHBOARD_CARDS: DashboardCard[] = [
  {
    title: 'Thermionix',
    href: DASHBOARD_ROUTES.THERMIONIX,
    icon: Thermometer,
    description: 'Monitor temperature and humidity sensors',
  },
  {
    title: 'SCADA',
    href: DASHBOARD_ROUTES.SCADA,
    icon: Activity,
    description: 'View SCADA system measurements',
  },
  {
    title: 'WeatherLink',
    href: DASHBOARD_ROUTES.WEATHERLINK,
    icon: Cloud,
    description: 'Check weather station data',
  },
  {
    title: 'Settings',
    href: DASHBOARD_ROUTES.SETTINGS_APP,
    icon: Settings,
    description: 'Configure alert thresholds',
  },
]

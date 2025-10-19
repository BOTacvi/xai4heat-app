/**
 * Settings Navigation Tabs Data
 *
 * LEARNING: Data-Driven Navigation Pattern
 * - Extracts hardcoded tab links into a data structure
 * - Makes it easy to add/remove/reorder tabs
 * - Single source of truth for settings sections
 */

import { DASHBOARD_ROUTES } from '@/lib/constants/routes'

export type SettingsTab = {
  label: string
  href: string
}

export const SETTINGS_TABS: SettingsTab[] = [
  {
    label: 'User Settings',
    href: DASHBOARD_ROUTES.SETTINGS_USER,
  },
  {
    label: 'App Settings',
    href: DASHBOARD_ROUTES.SETTINGS_APP,
  },
]

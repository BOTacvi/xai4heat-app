/**
 * Navigation Routes Data
 *
 * LEARNING: Navigation with Icons
 *
 * WHY lucide-react?
 * - Modern, clean icon library
 * - Tree-shakeable (only imports icons you use)
 * - Consistent design system
 * - TypeScript support
 * - React components (not SVG strings)
 *
 * ICON CHOICES:
 * - Home: House icon for dashboard homepage
 * - Thermionix: Thermometer for temperature monitoring
 * - SCADA: Activity (line graph) for system monitoring
 * - WeatherLink: Cloud for weather data
 * - Settings: Settings gear icon
 *
 * ROUTES STRUCTURE:
 * All routes under /dashboard/* since navigation only shows for authenticated users
 */

import {
  Home,
  Thermometer,
  Activity,
  Cloud,
  Settings,
} from 'lucide-react'

// COMMENT: Updated to use /dashboard/* paths
// COMMENT: "Dashboard" renamed to "Home" per design guide
export const ROUTES = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Thermionix", href: "/dashboard/thermionix", icon: Thermometer },
  { label: "SCADA", href: "/dashboard/scada", icon: Activity },
  { label: "WeatherLink", href: "/dashboard/weatherlink", icon: Cloud },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

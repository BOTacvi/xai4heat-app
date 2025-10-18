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
 * - Home: House icon for homepage
 * - Thermionix: Thermometer for temperature monitoring
 * - SCADA: Activity (line graph) for system monitoring
 * - WeatherLink: Cloud for weather data
 * - Settings: Settings gear icon
 */

import {
  Home,
  Thermometer,
  Activity,
  Cloud,
  Settings,
} from 'lucide-react'

// COMMENT: We export the icon components, not null
// React will render these as SVG elements
export const ROUTES = [
  { label: "Home", href: "/", icon: Home },
  { label: "Thermionix", href: "/thermionix", icon: Thermometer },
  { label: "SCADA", href: "/scada", icon: Activity },
  { label: "WeatherLink", href: "/weatherlink", icon: Cloud },
  { label: "Settings", href: "/settings", icon: Settings },
];

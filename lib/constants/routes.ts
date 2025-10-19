/**
 * Centralized Route Constants
 *
 * BENEFITS:
 * - Single source of truth for all routes
 * - Easy to update paths across the entire app
 * - Type-safe route references
 * - Prevents hardcoded path inconsistencies
 */

// Auth Routes
export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
} as const

// Dashboard Routes
export const DASHBOARD_ROUTES = {
  HOME: '/dashboard',
  THERMIONIX: '/dashboard/thermionix',
  SCADA: '/dashboard/scada',
  WEATHERLINK: '/dashboard/weatherlink',
  SETTINGS: '/dashboard/settings',
  SETTINGS_USER: '/dashboard/settings/user',
  SETTINGS_APP: '/dashboard/settings/app',
} as const

// All Routes Combined
export const ROUTES = {
  ...AUTH_ROUTES,
  ...DASHBOARD_ROUTES,
} as const

// Type for all route values
export type RouteValue = typeof ROUTES[keyof typeof ROUTES]

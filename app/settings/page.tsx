/**
 * Settings Page - Redirect to /settings/user
 *
 * This page redirects to the User Settings sub-page by default
 */

import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  redirect('/settings/user')
}

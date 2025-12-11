/**
 * Supabase Browser Client
 *
 * This client is used for client-side operations in Client Components
 * including real-time subscriptions via WebSockets.
 *
 * WHEN TO USE:
 * - Client Components ('use client')
 * - Real-time subscriptions
 * - Browser-only operations
 *
 * WHEN NOT TO USE:
 * - Server Components (use createServerClient instead)
 * - API routes (use createServerClient instead)
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

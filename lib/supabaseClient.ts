/**
 * Supabase Client for Browser/Client Components
 *
 * LEARNING: Why a separate client file?
 *
 * This client is used in CLIENT COMPONENTS ('use client' directive).
 * Unlike server clients, this can directly access browser cookies via document.cookie.
 *
 * WHEN TO USE:
 * - Client Components that need auth state (useAuth hook)
 * - Real-time subscriptions (Supabase Realtime)
 * - Client-side mutations (like logout button)
 *
 * SECURITY NOTE:
 * - Uses ANON_KEY (public, safe to expose)
 * - Auth tokens stored in httpOnly cookies (safe from XSS)
 * - Row Level Security (RLS) on database enforces permissions
 */

import { createBrowserClient } from '@supabase/ssr'

// COMMENT: createBrowserClient handles browser cookie access automatically
// It's a singleton, so we can export a single instance for the whole app
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

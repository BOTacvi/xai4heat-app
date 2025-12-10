/**
 * Root Layout - Minimal Wrapper
 *
 * LEARNING: Next.js Nested Layouts
 *
 * BEFORE (monolithic layout):
 * - Root layout had navigation, header, auth logic
 * - Navigation showed even on auth pages
 * - Hard to have different layouts for different route groups
 *
 * AFTER (nested layouts):
 * - Root layout: Minimal - providers, fonts, global styles only
 * - /auth/layout.tsx: Auth-specific layout (centered forms, no nav)
 * - /dashboard/layout.tsx: App layout (navigation, header)
 *
 * BENEFITS:
 * - Clean separation of concerns
 * - Different layouts for different routes
 * - No layout flickering on logout
 * - Easier to maintain and understand
 *
 * THIS LAYOUT PROVIDES:
 * - Font configuration
 * - Global CSS
 * - AuthProvider (global auth state)
 * - HTML/body tags
 *
 * THIS LAYOUT DOES NOT:
 * - Show navigation (that's in /dashboard/layout.tsx)
 * - Show header (that's in /dashboard/layout.tsx)
 * - Redirect users (that's in middleware + page-level)
 */

import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { AuthProvider } from "@/lib/contexts/AuthContext"
import { ThemeProvider } from "@/lib/contexts/ThemeContext"
import { getCurrentUser } from "@/lib/supabase/server"
import { Toaster } from 'react-hot-toast'

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "xai4heat",
  description: "Keep track of your heating and monitoring devices",
}

/**
 * LEARNING: Why force-dynamic?
 *
 * This layout uses getCurrentUser() which reads cookies.
 * Cookies are only available at request time, not build time.
 * force-dynamic tells Next.js: "Always render this on the server per request"
 *
 * WITHOUT force-dynamic:
 * - Next.js tries to pre-render at build time
 * - cookies() throws errors during build
 * - Ugly error messages in console
 *
 * WITH force-dynamic:
 * - Next.js knows to skip build-time rendering
 * - Clean builds, no errors
 * - Layout renders on every request with fresh auth state
 */
export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // STEP 1: Fetch initial user server-side
  // COMMENT: This provides fast initial render with auth state
  // If user is logged in, AuthProvider starts with user data immediately
  let initialUser = null

  try {
    initialUser = await getCurrentUser()
  } catch (error) {
    // COMMENT: If error fetching user, continue with null
    // User will see appropriate page based on their actual auth state
    console.error("[RootLayout] Error fetching user:", error)
  }

  const bodyClasses = `${geistSans.variable} ${geistMono.variable} antialiased`

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply theme before React hydrates to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme-preference');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  // Check system preference
                  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body className={bodyClasses}>
        {/* STEP 2: Provide theme state to entire app */}
        {/* COMMENT: ThemeProvider manages dark/light mode */}
        <ThemeProvider>
          {/* STEP 3: Provide auth state to entire app */}
          {/* COMMENT: AuthProvider wraps everything so any component can useAuth() */}
          {/* initialUser prevents flash of "not logged in" state */}
          <AuthProvider initialUser={initialUser}>
            {/* STEP 4: Render children - could be auth pages or dashboard pages */}
            {/* COMMENT: Nested layouts (/auth/layout.tsx, /dashboard/layout.tsx) */}
            {/* will add their own structure (forms, navigation, etc.) */}
            {children}

            {/* Toast Notifications */}
            {/* LEARNING: Colors styled via globals.css using CSS variables */}
            {/* This ensures colors update when tailwind.config.js changes */}
            {/* See globals.css for .react-hot-toast styles */}
            <Toaster
              position="top-right"
              containerClassName="react-hot-toast"
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

/**
 * Root Layout - Server Component
 *
 * LEARNING: Layout vs Page in Next.js App Router
 *
 * LAYOUT:
 * - Wraps multiple pages
 * - Persists across navigation (doesn't remount)
 * - Perfect for: nav bars, providers, global state
 * - Can be Server Component or Client Component
 *
 * THIS LAYOUT:
 * - Fetches initial user data (server-side)
 * - Passes to AuthProvider (client component)
 * - Wraps entire app in auth context
 *
 * ARCHITECTURE:
 * RootLayout (Server) → fetches user
 *     ↓
 * AuthProvider (Client) → provides auth state
 *     ↓
 * Pages (Server/Client) → access useAuth()
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import GlobalNavigation from "@/components/globals/GlobalNavigation";
import GlobalHeader from "@/components/globals/GlobalHeader";
import { AuthProvider, AuthRedirect } from "@/lib/contexts/AuthContext";
import { getCurrentUser } from "@/lib/supabase/server";

import "./globals.css";
import "./layout.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thermionix",
  description: "Keep track of your Thermionix devices",
};

const BODY_CLASSES = `${geistSans.variable} ${geistMono.variable} antialiased`;

/**
 * COMMENT: This is an async Server Component
 * We fetch the initial user on the server for fast first render
 *
 * LEARNING: Why export const dynamic = 'force-dynamic'?
 * - This tells Next.js: "Don't try to statically generate this layout at build time"
 * - Our layout uses cookies() via getCurrentUser() - this is dynamic by nature
 * - Without this, Next.js logs errors during build (even though they're handled)
 * - With this, Next.js knows to always render this layout on each request
 *
 * STATIC vs DYNAMIC:
 * - Static: Pre-rendered at build time, same HTML for all users (fast but no personalization)
 * - Dynamic: Rendered per request, can access cookies/headers (personalized but requires server)
 * - Our app needs dynamic because we check authentication on every request
 */
export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // STEP 1: Fetch initial user server-side
  // LEARNING: This runs on every page navigation
  // Result is cached during the request, so multiple calls don't hit DB
  // COMMENT: With dynamic = 'force-dynamic', this won't throw during build
  let initialUser = null;

  try {
    initialUser = await getCurrentUser();
  } catch (error) {
    // COMMENT: If auth check fails, continue with null user
    // This allows the app to still render (user will see login page)
    console.error("Error fetching user in layout:", error);
  }

  // STEP 2: Determine if we should show navigation
  // LEARNING: Simple approach - show navigation only when user is authenticated
  // The AuthRedirect component will handle redirecting unauthenticated users
  // So if initialUser exists, we know they should see the navigation
  const shouldShowNav = initialUser !== null;

  return (
    <html lang="en">
      <body className={BODY_CLASSES}>
        {/* STEP 2: Wrap app in AuthProvider */}
        {/* COMMENT: initialUser passed to avoid loading flash on first render */}
        {/* AuthProvider is a Client Component, but we can use it in Server Component */}
        <AuthProvider initialUser={initialUser}>
          {/* STEP 3: Wrap in AuthRedirect for client-side route protection */}
          {/* COMMENT: This component monitors auth state and redirects when needed */}
          {/* - Redirects unauthenticated users to /login */}
          {/* - Redirects authenticated users away from /login, /signup */}
          {/* - Preserves URL for return after login */}
          <AuthRedirect>
            {/* COMMENT: Only show header/nav for authenticated users on protected routes */}
            {/* LEARNING: We check both initialUser AND shouldShowNav */}
            {/* - initialUser: Is the user logged in? */}
            {/* - shouldShowNav: Is this a protected route that needs navigation? */}
            {/* Both must be true to show the full app layout */}
            {initialUser && shouldShowNav ? (
              <>
                <GlobalHeader />
                <div className="thermionix-layout-container">
                  <GlobalNavigation />
                  <main>{children}</main>
                </div>
              </>
            ) : (
              /* COMMENT: For public pages or non-authenticated users, just show the page content without header/nav */
              <>{children}</>
            )}
          </AuthRedirect>
        </AuthProvider>
      </body>
    </html>
  );
}

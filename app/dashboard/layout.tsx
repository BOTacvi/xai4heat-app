/**
 * Dashboard Layout - Authenticated App Layout
 *
 * LEARNING: Nested Layout for Authenticated Routes
 *
 * This layout wraps all pages under /dashboard/*:
 * - /dashboard (homepage with 4 cards)
 * - /dashboard/thermionix
 * - /dashboard/scada
 * - /dashboard/weatherlink
 * - /dashboard/settings/*
 *
 * PURPOSE:
 * - Provide navigation sidebar and header
 * - Only renders when user is on dashboard routes
 * - Automatically removed when user logs out (routes to /auth/*)
 * - Mobile-responsive with hamburger menu
 *
 * BENEFITS:
 * - Navigation only shows for authenticated users
 * - No need for conditional rendering in components
 * - Clean separation from auth pages
 * - No layout flickering on auth state changes
 * - Mobile-friendly overlay navigation
 */

'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import clsx from "clsx";
import GlobalNavigation from "@/components/globals/GlobalNavigation";
import GlobalHeader from "@/components/globals/GlobalHeader";

import styles from "./layout.module.css";

type DashboardLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  className,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // Close menu on route change (mobile only)
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  // COMMENT: Root wrapper that fills viewport
  const wrapperClasses = clsx(styles['dashboard-wrapper'], className);

  return (
    <div className={wrapperClasses}>
      {/* Header with logo, hamburger menu (mobile), and logout button */}
      <GlobalHeader onMenuToggle={() => setIsMobileMenuOpen(old => !old)} />

      {/* Main container with sidebar + content */}
      <div className={styles['dashboard-layout-container']}>
        {/* Sidebar navigation with mobile overlay support */}
        <GlobalNavigation
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Page content */}
        <main className={styles['dashboard-main']}>{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;

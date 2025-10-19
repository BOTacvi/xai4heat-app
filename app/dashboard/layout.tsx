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
 *
 * BENEFITS:
 * - Navigation only shows for authenticated users
 * - No need for conditional rendering in components
 * - Clean separation from auth pages
 * - No layout flickering on auth state changes
 */

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
  // COMMENT: Root wrapper that fills viewport
  const wrapperClasses = clsx(styles.dashboardWrapper, className);

  return (
    <div className={wrapperClasses}>
      {/* Header with logo and logout button */}
      <GlobalHeader />

      {/* Main container with sidebar + content */}
      <div className={styles.dashboardLayoutContainer}>
        {/* Sidebar navigation */}
        <GlobalNavigation />

        {/* Page content */}
        <main className={styles.dashboardMain}>{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;

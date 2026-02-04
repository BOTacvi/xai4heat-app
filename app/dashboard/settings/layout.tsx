/**
 * Settings Layout - Wraps all settings pages
 *
 * LEARNING: Nested Layouts in Next.js App Router + Data-Driven Navigation
 * - Provides navigation between User Settings and App Settings
 * - Layout persists across navigation (doesn't remount)
 * - Perfect for tab-like navigation
 *
 * REFACTOR:
 * - BEFORE: 2 hardcoded Link components for tabs
 * - AFTER: Map over SETTINGS_TABS data array
 * - BENEFIT: Easy to add/remove/reorder tabs
 */

import clsx from "clsx";
import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavLink from "@/components/atoms/NavLink";
import { SETTINGS_TABS } from "./data";
import { AUTH_ROUTES } from "@/lib/constants/routes";
import styles from "./Settings.module.css";

type SettingsLayoutProps = {
  children: React.ReactNode;
};

const SettingsLayout: React.FC<SettingsLayoutProps> = async ({
  children,
}) => {
  // COMMENT: Check authentication
  const user = await getCurrentUser();

  if (!user) {
    // REFACTOR: Use centralized route constant instead of hardcoded path
    redirect(AUTH_ROUTES.LOGIN);
  }

  const containerClasses = clsx(styles.container);

  return (
    <div className={containerClasses}>
      {/* REMOVED: "Settings" heading per design requirements */}

      {/* Top Card: Navigation Tabs */}
      {/* COMMENT: Map over SETTINGS_TABS for dynamic rendering */}
      {/* BENEFIT: Add/remove tabs by editing data/index.ts only */}
      {/* Uses global card-container utility for consistent card styling */}
      <nav className={clsx('card-container', styles['nav-card'])}>
        {SETTINGS_TABS.map((tab) => (
          <NavLink
            key={tab.href}
            href={tab.href}
            className={styles['nav-link']}
            activeClassName="active"
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Card: Content */}
      {/* Uses global card-container utility for consistent card styling */}
      <div className={clsx('card-container', styles['content-card'])}>{children}</div>
    </div>
  );
};

export default SettingsLayout;

/**
 * GlobalNavigation Component
 *
 * Main application sidebar navigation
 * Following claude.md conventions:
 * - Type: GlobalNavigationProps
 * - Pattern: React.FC<PropsType>
 * - Classes: kebab-case (global-navigation)
 *
 * RESPONSIVE:
 * - Desktop: Fixed sidebar always visible
 * - Mobile: Overlay sidebar with backdrop, slides in/out
 * - Theme toggle at bottom
 * - Proper spacing and layout
 */

"use client";

import NavLink from "@/components/atoms/NavLink";
import { ThemeToggle } from "@/components/atoms/ThemeToggle";
import { X, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { ROUTES } from "./data";
import clsx from "clsx";
import styles from "./GlobalNavigation.module.css";

type GlobalNavigationProps = {
  className?: string;
  isOpen: boolean;
  onClose: () => void;
};

const GlobalNavigation: React.FC<GlobalNavigationProps> = ({
  className,
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
    router.refresh();
  };
  // COMMENT: Main container classes - local styles, parent override, mobile open state
  const navigationClasses = clsx(
    styles["global-navigation"],
    isOpen && styles["mobile-open"],
    className
  );

  return (
    <>
      {/* Backdrop (mobile only, when menu open) */}
      {isOpen && (
        <div
          className={styles.backdrop}
          onClick={onClose}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar */}
      <aside className={navigationClasses}>
        {/* Close button (mobile only) */}
        <button
          className={styles["close-button"]}
          onClick={onClose}
          aria-label="Close menu"
          type="button"
        >
          <X size={24} />
        </button>

        {/* Navigation links */}
        <nav className={styles.nav}>
          {ROUTES.map(({ label, href, icon: Icon, exact }) => {
            // LEARNING: Destructure icon as Icon (capital I)
            // This allows us to use it as a React component: <Icon />
            // If we kept it lowercase, React would think it's an HTML element

            const linkClasses = clsx(styles.link);
            const activeClasses = clsx(styles.active);

            return (
              <NavLink
                key={href}
                href={href}
                className={linkClasses}
                activeClassName={activeClasses}
                exact={exact}
              >
                {/* COMMENT: Render the icon component with size */}
                {/* lucide-react icons accept size, color, strokeWidth props */}
                <span className={styles.icon}>
                  <Icon size={20} />
                </span>
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom row: Logout + Theme toggle */}
        <div className={styles["bottom-row"]}>
          {/* Logout button - styled as underlined link */}
          <button
            onClick={handleLogout}
            className={styles["logout-link"]}
            type="button"
          >
            <span className={styles.icon}>
              <LogOut size={20} />
            </span>
            <span>Logout</span>
          </button>

          {/* Theme toggle */}
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
};

export default GlobalNavigation;

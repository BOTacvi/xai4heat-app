/**
 * GlobalNavigation Component
 *
 * Main application sidebar navigation
 * Following claude.md conventions:
 * - Type: GlobalNavigationProps
 * - Pattern: React.FC<PropsType>
 * - Classes: kebab-case (global-navigation)
 *
 * UPDATES:
 * - White background (light) / dark card background (dark)
 * - Theme toggle at bottom
 * - Proper spacing and layout
 */

'use client'

import NavLink from "@/components/atoms/NavLink";
import { ThemeToggle } from "@/components/atoms/ThemeToggle";
import { ROUTES } from "./data";
import clsx from "clsx";
import styles from "./GlobalNavigation.module.css";

type GlobalNavigationProps = {
  className?: string;
};

const GlobalNavigation: React.FC<GlobalNavigationProps> = ({ className }) => {
  // COMMENT: Main container classes - local styles, parent override
  const navigationClasses = clsx(
    styles.globalNavigation,
    className
  );

  return (
    <aside className={navigationClasses}>
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

      {/* Theme toggle at bottom */}
      <div className={styles.themeToggleContainer}>
        <ThemeToggle />
      </div>
    </aside>
  );
};

export default GlobalNavigation;

/**
 * GlobalNavigation Component
 *
 * Main application sidebar navigation
 * Following claude.md conventions:
 * - Type: GlobalNavigationProps
 * - Pattern: React.FC<PropsType>
 * - Classes: kebab-case (global-navigation)
 */

import NavLink from "@/components/atoms/NavLink";
import { ROUTES } from "./data";
import clsx from "clsx";
import styles from "./GlobalNavigation.module.css";

type GlobalNavigationProps = {
  className?: string;
};

const GlobalNavigation: React.FC<GlobalNavigationProps> = ({ className }) => {
  // COMMENT: Main container classes - local styles, global classes, parent override
  const navigationClasses = clsx(
    styles.globalNavigation,
    "thermionix-white-container",
    className
  );

  return (
    <aside className={navigationClasses}>
      <nav className={styles.nav}>
        {ROUTES.map(({ label, href, icon: Icon }) => {
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
    </aside>
  );
};

export default GlobalNavigation;

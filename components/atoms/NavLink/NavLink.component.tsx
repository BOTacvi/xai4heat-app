/**
 * NavLink Component - Client Component
 *
 * Navigation link with active state support
 * Following claude.md conventions:
 * - Type: NavLinkProps
 * - Pattern: React.FC<PropsType>
 * - Classes: kebab-case (nav-link)
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import styles from "./NavLink.module.css";

type NavLinkProps = {
  href: string;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
};

const NavLink: React.FC<NavLinkProps> = ({
  href,
  className,
  activeClassName,
  children,
}) => {
  // COMMENT: usePathname() gives us the current route
  // We use this to determine if this link is active
  const pathname = usePathname();

  // LEARNING: Active state matching strategy
  // - Exact match: pathname === href (e.g., /dashboard === /dashboard)
  // - Prefix match: pathname starts with href + "/" (e.g., /dashboard/settings/app starts with /dashboard/settings/)
  // This ensures that parent routes stay active when navigating to subroutes
  const isActive = pathname === href || pathname.startsWith(href + "/");

  // COMMENT: Compose classes following our pattern
  const linkClasses = clsx(
    styles.navLink, // Local base styles
    className, // Parent-provided classes
    {
      [styles.active]: isActive, // Apply active styles if current route
      [activeClassName || ""]: isActive && activeClassName, // Parent-provided active class
    }
  );

  return (
    <Link href={href} className={linkClasses}>
      {children}
    </Link>
  );
};

export default NavLink;

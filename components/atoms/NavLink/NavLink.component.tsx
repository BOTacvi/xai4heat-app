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
  exact?: boolean; // If true, only match exact pathname
};

const NavLink: React.FC<NavLinkProps> = ({
  href,
  className,
  activeClassName,
  children,
  exact = false,
}) => {
  // COMMENT: usePathname() gives us the current route
  // We use this to determine if this link is active
  const pathname = usePathname();

  // LEARNING: Active state matching strategy
  // - Exact match (exact=true): pathname === href only
  //   Use for Home route so it doesn't match all subroutes
  // - Prefix match (exact=false): pathname === href OR pathname starts with href + "/"
  //   Use for Settings to keep it active on subroutes like /dashboard/settings/app
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

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

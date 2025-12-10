/**
 * GlobalHeader Component - Client Component
 *
 * LEARNING: Why Client Component?
 * - Hamburger menu toggle (mobile)
 * - Button needs onClick handler (interactivity)
 *
 * Main application header with title and hamburger menu (mobile)
 * Following claude.md conventions:
 * - Type: GlobalHeaderProps
 * - Pattern: React.FC<PropsType>
 * - Classes: kebab-case (global-header)
 */

"use client";

import clsx from "clsx";
import Image from "next/image";
import { Menu } from "lucide-react";
import styles from "./GlobalHeader.module.css";

type GlobalHeaderProps = {
  className?: string;
  onMenuToggle: () => void;
};

const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  className,
  onMenuToggle,
}) => {
  // COMMENT: Compose classes following our pattern
  const headerClasses = clsx(styles["global-header"], className);

  return (
    <header className={headerClasses}>
      {/* Hamburger button (mobile only) */}

      <div className={styles.left}>
        <Image
          src="/xai4heat-logo-small.png"
          alt="xai4heat"
          width={50}
          height={50}
          className={styles.logoSmall}
        />
      </div>
      <button
        className={styles.hamburger}
        onClick={onMenuToggle}
        aria-label="Open menu"
        type="button"
      >
        <Menu size={24} />
      </button>
    </header>
  );
};

export default GlobalHeader;

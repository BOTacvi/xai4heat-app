/**
 * Button Component - Reusable button atom
 *
 * COMPONENT ARCHITECTURE:
 * - Located in /components/atoms/ (basic building block)
 * - No business logic, just presentational
 * - Variants for different styles (primary, secondary, danger)
 * - Fully accessible (disabled state, loading state)
 */

'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import styles from './Button.module.css'

/**
 * Button variants - different visual styles
 *
 * LEARNING: Using TypeScript union types for props
 * This gives autocomplete and prevents invalid values
 */
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'small' | 'medium' | 'large'

/**
 * COMPONENT PROPS:
 * Following claude.md pattern - ComponentName + "Props"
 */
type ButtonProps = {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  className?: string
} & ButtonHTMLAttributes<HTMLButtonElement>

/**
 * COMPONENT NOTE:
 * We extend HTMLButtonElement props, so this supports all native button props:
 * - onClick, onMouseEnter, etc.
 * - disabled, type (submit/button), etc.
 * - aria-* attributes for accessibility
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  ...rest
}) => {
  // COMMENT: clsx combines class names conditionally
  // Styles come from Button.styles.css (Tailwind with @apply)
  const buttonClasses = clsx(
    styles.button,
    styles[variant], // e.g., styles.primary
    styles[size],
    {
      [styles.loading]: loading,
      [styles.fullWidth]: fullWidth,
    },
    className // Allow overrides from parent
  )

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      // COMMENT: Spread remaining props (onClick, type, etc.)
      {...rest}
    >
      {loading && <span className={styles.spinner} aria-label="Loading..." />}
      <span className={styles.content}>{children}</span>
    </button>
  )
}

/**
 * ExportButton Component - Reusable export button
 *
 * PURPOSE:
 * - Triggers data export to Excel format
 * - Shows loading state during export
 * - Reusable across different pages (Thermionix, SCADA, etc.)
 *
 * USAGE:
 * ```tsx
 * <ExportButton
 *   onExport={handleExport}
 *   disabled={!hasData}
 * />
 * ```
 */

'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import clsx from 'clsx'
import styles from './ExportButton.module.css'

type ExportButtonProps = {
  /** Function called when export is triggered */
  onExport: () => void | Promise<void>
  /** Button label (default: "Export") */
  label?: string
  /** Disabled state */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost'
  /** Button size */
  size?: 'small' | 'medium'
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  label = 'Export',
  disabled = false,
  className,
  variant = 'secondary',
  size = 'medium',
}) => {
  const [isExporting, setIsExporting] = useState(false)

  const handleClick = async () => {
    if (isExporting || disabled) return

    setIsExporting(true)
    try {
      await onExport()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const buttonClasses = clsx(
    styles.exportButton,
    styles[variant],
    styles[size],
    {
      [styles.loading]: isExporting,
      [styles.disabled]: disabled,
    },
    className
  )

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || isExporting}
      aria-label={isExporting ? 'Exporting...' : label}
    >
      {isExporting ? (
        <span className={styles.spinner} />
      ) : (
        <Download size={size === 'small' ? 14 : 16} className={styles.icon} />
      )}
      <span className={styles.label}>
        {isExporting ? 'Exporting...' : label}
      </span>
    </button>
  )
}

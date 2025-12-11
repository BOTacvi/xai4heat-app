/**
 * ConnectionBadge Component
 *
 * Displays real-time connection status with an animated dot indicator.
 *
 * USAGE:
 * ```typescript
 * <ConnectionBadge isConnected={isConnected} />
 * <ConnectionBadge isConnected={isConnected} label="LIVE" />
 * ```
 */

import React from 'react'
import clsx from 'clsx'
import styles from './ConnectionBadge.module.css'

type ConnectionBadgeProps = {
  isConnected: boolean
  label?: string
  className?: string
}

export const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({
  isConnected,
  label = 'LIVE',
  className
}) => {
  return (
    <div
      className={clsx(
        styles.badge,
        isConnected ? styles.connected : styles.disconnected,
        className
      )}
    >
      <span className={styles.dot}>●</span>
      <span className={styles.label}>{isConnected ? label : 'Disconnected'}</span>
    </div>
  )
}

/**
 * MetricCard Component
 *
 * Displays current metric value with expected range indicator
 * - Red text if value exceeds max
 * - Blue text if value below min
 * - Green text if within expected range
 */

'use client'

import React from 'react'
import styles from './MetricCard.module.css'

type MetricCardProps = {
  title: string
  value: number | null
  unit: string
  expectedMin?: number
  expectedMax?: number
  timestamp?: string
  isLoading?: boolean
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  expectedMin,
  expectedMax,
  timestamp,
  isLoading = false,
  className,
}) => {
  const getStatusColor = (): 'normal' | 'high' | 'low' => {
    if (value === null) return 'normal'
    if (expectedMax !== undefined && value > expectedMax) return 'high'
    if (expectedMin !== undefined && value < expectedMin) return 'low'
    return 'normal'
  }

  const status = getStatusColor()

  const valueClasses = [
    styles.value,
    status === 'high' && styles.valueHigh,
    status === 'low' && styles.valueLow,
    status === 'normal' && styles.valueNormal,
  ]
    .filter(Boolean)
    .join(' ')

  const cardClasses = ['card-container', styles.card, className].filter(Boolean).join(' ')

  if (isLoading) {
    return (
      <div className={cardClasses}>
        <div className={styles.title}>{title}</div>
        <div className={styles.valueRow}>
          <div className={styles.loadingValue}>--</div>
          <div className={styles.unit}>{unit}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cardClasses}>
      <div className={styles.title}>{title}</div>
      <div className={styles.valueRow}>
        <div className={valueClasses}>
          {value !== null ? value.toFixed(1) : '--'}
        </div>
        <div className={styles.unit}>{unit}</div>
      </div>
      {timestamp && (
        <div className={styles.timestamp}>
          Last updated: {new Date(timestamp).toLocaleString()}
        </div>
      )}
      {(expectedMin !== undefined || expectedMax !== undefined) && (
        <div className={styles.range}>
          Expected: {expectedMin ?? '?'}–{expectedMax ?? '?'} {unit}
        </div>
      )}
    </div>
  )
}

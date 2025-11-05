/**
 * ChartSkeleton Component
 *
 * Loading skeleton for TimeSeriesChart using react-content-loader
 */

'use client'

import React from 'react'
import ContentLoader from 'react-content-loader'
import styles from './ChartSkeleton.module.css'

type ChartSkeletonProps = {
  className?: string
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  className,
}) => {
  // Detect dark mode for skeleton colors
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')

  // Light theme: light grey, Dark theme: dark grey
  const backgroundColor = isDark ? '#262626' : '#f3f3f3'
  const foregroundColor = isDark ? '#404040' : '#ecebeb'

  return (
    <div className={`card-container ${styles.card} ${className || ''}`}>
      <ContentLoader
        speed={2}
        width="100%"
        height={350}
        backgroundColor={backgroundColor}
        foregroundColor={foregroundColor}
      >
        {/* Title */}
        <rect x="20" y="20" rx="4" ry="4" width="200" height="24" />
        {/* Chart area */}
        <rect x="20" y="70" rx="8" ry="8" width="95%" height="250" />
      </ContentLoader>
    </div>
  )
}

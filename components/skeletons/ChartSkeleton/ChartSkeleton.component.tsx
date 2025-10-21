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
  return (
    <div className={`card-container ${styles.card} ${className || ''}`}>
      <ContentLoader
        speed={2}
        width="100%"
        height={350}
        backgroundColor="#f3f3f3"
        foregroundColor="#ecebeb"
      >
        {/* Title */}
        <rect x="20" y="20" rx="4" ry="4" width="200" height="24" />
        {/* Chart area */}
        <rect x="20" y="70" rx="8" ry="8" width="95%" height="250" />
      </ContentLoader>
    </div>
  )
}

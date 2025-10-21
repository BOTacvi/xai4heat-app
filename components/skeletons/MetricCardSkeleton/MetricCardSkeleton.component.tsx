/**
 * MetricCardSkeleton Component
 *
 * Loading skeleton for MetricCard using react-content-loader
 */

'use client'

import React from 'react'
import ContentLoader from 'react-content-loader'
import styles from './MetricCardSkeleton.module.css'

type MetricCardSkeletonProps = {
  className?: string
}

export const MetricCardSkeleton: React.FC<MetricCardSkeletonProps> = ({
  className,
}) => {
  return (
    <div className={`card-container ${styles.card} ${className || ''}`}>
      <ContentLoader
        speed={2}
        width="100%"
        height={200}
        backgroundColor="#f3f3f3"
        foregroundColor="#ecebeb"
      >
        {/* Title */}
        <rect x="25%" y="20" rx="4" ry="4" width="50%" height="16" />
        {/* Value */}
        <rect x="20%" y="60" rx="8" ry="8" width="60%" height="48" />
        {/* Unit */}
        <rect x="35%" y="120" rx="4" ry="4" width="30%" height="16" />
        {/* Range */}
        <rect x="25%" y="150" rx="4" ry="4" width="50%" height="12" />
      </ContentLoader>
    </div>
  )
}

/**
 * TimeSeriesChart Component
 *
 * Line chart for displaying time-series data (temperature, pressure, etc.)
 */

'use client'

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import styles from './TimeSeriesChart.module.css'

export type TimeSeriesDataPoint = {
  timestamp: string
  value: number
}

type TimeSeriesChartProps = {
  data: TimeSeriesDataPoint[]
  title: string
  yAxisLabel: string
  isLoading?: boolean
  className?: string
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title,
  yAxisLabel,
  isLoading = false,
  className,
}) => {
  // Format data for recharts
  const chartData = data.map((point) => ({
    time: new Date(point.timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    value: point.value,
  }))

  const cardClasses = ['card-container', styles.card, className].filter(Boolean).join(' ')

  if (isLoading) {
    return (
      <div className={cardClasses}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingText}>Loading chart data...</div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={cardClasses}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.loadingContainer}>
          <div className={styles.emptyText}>No data available for selected range</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cardClasses}>
      <h3 className={styles.title}>{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis
            dataKey="time"
            stroke="#737373"
            tick={{ fill: '#737373', fontSize: 12 }}
          />
          <YAxis
            label={{
              value: yAxisLabel,
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#737373', fontSize: 14, textAnchor: 'middle' },
            }}
            stroke="#737373"
            tick={{ fill: '#737373', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ fill: '#16a34a', r: 3 }}
            activeDot={{ r: 5 }}
            name={yAxisLabel}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

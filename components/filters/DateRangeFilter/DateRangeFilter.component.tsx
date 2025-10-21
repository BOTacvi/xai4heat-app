/**
 * DateRangeFilter Component
 *
 * Date range selector with preset options (Week, Year, Custom)
 */

'use client'

import React, { useState } from 'react'
import { Select, SelectOption } from '@/components/fields/Select'
import { Input } from '@/components/fields/Input'
import styles from './DateRangeFilter.module.css'

export type DateRange = {
  from: string
  to: string
}

type DateRangeFilterProps = {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

const presetOptions: SelectOption[] = [
  { label: 'Last Week', value: 'week' },
  { label: 'Last Month', value: 'month' },
  { label: 'Last Year', value: 'year' },
  { label: 'Custom Range', value: 'custom' },
]

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  className,
}) => {
  const [preset, setPreset] = useState<string>('week')

  const handlePresetChange = (newPreset: string | number) => {
    setPreset(String(newPreset))

    if (newPreset === 'custom') {
      // Don't auto-update, wait for user input
      return
    }

    const now = new Date()
    const to = now.toISOString()
    let from: string

    if (newPreset === 'week') {
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      from = weekAgo.toISOString()
    } else if (newPreset === 'month') {
      const monthAgo = new Date(now)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      from = monthAgo.toISOString()
    } else if (newPreset === 'year') {
      const yearAgo = new Date(now)
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      from = yearAgo.toISOString()
    } else {
      from = to
    }

    onChange({ from, to })
  }

  const handleCustomDateChange = (field: 'from' | 'to', dateValue: string) => {
    // Convert date input (YYYY-MM-DD) to ISO string
    const isoValue = new Date(dateValue).toISOString()
    onChange({
      ...value,
      [field]: isoValue,
    })
  }

  const formatDateForInput = (isoString: string): string => {
    // Convert ISO string to YYYY-MM-DD format for date input
    return isoString.split('T')[0]
  }

  const isCustomRange = preset === 'custom'

  return (
    <div className={`card-container ${styles.container} ${className || ''}`}>
      <Select
        label="Date Range"
        options={presetOptions}
        value={preset}
        onChange={handlePresetChange}
        fullWidth
      />
      <div className={styles.dateInputs}>
        <Input
          label="From"
          type="date"
          value={formatDateForInput(value.from)}
          onChange={(e) => handleCustomDateChange('from', e.target.value)}
          disabled={!isCustomRange}
          fullWidth
        />
        <Input
          label="To"
          type="date"
          value={formatDateForInput(value.to)}
          onChange={(e) => handleCustomDateChange('to', e.target.value)}
          disabled={!isCustomRange}
          fullWidth
        />
      </div>
    </div>
  )
}

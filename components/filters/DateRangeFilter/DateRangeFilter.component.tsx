/**
 * DateRangeFilter Component
 *
 * Date range selector with preset options (Week, Month, Year, Custom)
 * Uses custom DatePicker component for full styling control
 */

'use client'

import React, { useState } from 'react'
import { Select, SelectOption } from '@/components/fields/Select'
import { DatePicker } from '@/components/fields/DatePicker'
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

  const handleCustomDateChange = (field: 'from' | 'to', date: Date | undefined) => {
    if (!date) return

    const isoValue = date.toISOString()
    const newValue = {
      ...value,
      [field]: isoValue,
    }

    // Auto-adjust: If changing "from" to a date after current "to", update "to" to match "from"
    if (field === 'from') {
      const newFromDate = new Date(isoValue)
      const currentToDate = new Date(value.to)

      if (newFromDate > currentToDate) {
        // Set "to" to the same date as the new "from"
        newValue.to = isoValue
      }
    }

    // Auto-adjust: If changing "to" to a date before current "from", update "from" to match "to"
    if (field === 'to') {
      const newToDate = new Date(isoValue)
      const currentFromDate = new Date(value.from)

      if (newToDate < currentFromDate) {
        // Set "from" to the same date as the new "to"
        newValue.from = isoValue
      }
    }

    onChange(newValue)
  }

  const parseISOtoDate = (isoString: string): Date => {
    return new Date(isoString)
  }

  const isCustomRange = preset === 'custom'

  // Validation: Calculate disabled dates for each picker
  const fromDate = parseISOtoDate(value.from)
  const toDate = parseISOtoDate(value.to)

  // For "To" picker: disable all dates before "From" date
  // (user cannot select a "To" date earlier than "From")
  const disabledDaysForTo = (date: Date) => {
    return date < fromDate
  }

  // No restrictions on "From" picker - auto-adjusts "To" if needed

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
        <DatePicker
          label="From"
          value={fromDate}
          onChange={(date) => handleCustomDateChange('from', date)}
          disabled={!isCustomRange}
          fullWidth
        />
        <DatePicker
          label="To"
          value={toDate}
          onChange={(date) => handleCustomDateChange('to', date)}
          disabled={!isCustomRange}
          disabledDays={disabledDaysForTo}
          fullWidth
        />
      </div>
    </div>
  )
}

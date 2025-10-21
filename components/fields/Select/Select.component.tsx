/**
 * Select Component
 *
 * Reusable select dropdown with theme support
 */

'use client'

import React from 'react'
import styles from './Select.module.css'

export type SelectOption = {
  label: string
  value: string | number
}

type SelectProps = {
  label?: string
  options: SelectOption[]
  value: string | number
  onChange: (value: string | number) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  fullWidth?: boolean
  className?: string
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  fullWidth = false,
  className,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value
    // Try to convert to number if original value was number
    const option = options.find(opt => String(opt.value) === newValue)
    if (option) {
      onChange(option.value)
    }
  }

  const wrapperClasses = [
    styles.wrapper,
    fullWidth && styles.fullWidth,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const selectClasses = [
    styles.select,
    error && styles.error,
    disabled && styles.disabled,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClasses}>
      {label && <label className={styles.label}>{label}</label>}
      <select
        className={selectClasses}
        value={String(value)}
        onChange={handleChange}
        disabled={disabled}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  )
}

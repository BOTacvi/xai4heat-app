/**
 * Input Component - Reusable form input field
 *
 * COMPONENT ARCHITECTURE:
 * - Located in /components/fields/ (form-related components)
 * - Handles label, error messages, icons
 * - Works with both controlled and React Hook Form usage
 * - Accessible (proper label association, error announcements)
 *
 * USAGE PATTERNS:
 *
 * 1. WITH REACT HOOK FORM (Recommended):
 * ```tsx
 * const { register, formState: { errors } } = useForm()
 *
 * <Input
 *   label="Email"
 *   error={errors.email?.message}
 *   {...register('email')}
 * />
 * ```
 *
 * 2. CONTROLLED (Legacy/Non-form usage):
 * ```tsx
 * const [value, setValue] = useState('')
 *
 * <Input
 *   label="Email"
 *   value={value}
 *   onChange={(e) => setValue(e.target.value)}
 * />
 * ```
 *
 * WHY THIS DESIGN:
 * - register() from React Hook Form returns { name, ref, onChange, onBlur }
 * - We spread {...register('fieldName')} to get all these props automatically
 * - Component is flexible - works with or without React Hook Form
 * - No breaking changes for existing usage
 */

'use client'

import { InputHTMLAttributes, ReactNode, useId, forwardRef } from 'react'
import clsx from 'clsx'
import styles from './Input.module.css'

/**
 * COMPONENT PROPS:
 * Following claude.md pattern - ComponentName + "Props"
 *
 * LEARNING: Why Omit<..., 'id'>?
 * - We generate ID automatically with useId() for accessibility
 * - Prevents users from passing conflicting IDs
 * - Ensures unique IDs even with multiple instances
 */
type InputProps = {
  label: string
  error?: string
  helperText?: string
  icon?: ReactNode
  fullWidth?: boolean
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>

/**
 * LEARNING: forwardRef with React Hook Form
 *
 * WHY forwardRef:
 * - React Hook Form's register() needs to attach a ref to the input
 * - The ref is used for focus management and validation
 * - Without forwardRef, register() can't access the input element
 * - TypeScript requires proper typing: React.forwardRef<HTMLInputElement, InputProps>
 *
 * HOW IT WORKS:
 * 1. Parent calls register('email') → returns { name, ref, onChange, onBlur }
 * 2. Parent spreads {...register('email')} onto <Input />
 * 3. Input component receives ref and forwards it to <input> element
 * 4. React Hook Form can now control the input and read its value
 *
 * EXAMPLE:
 * const { register } = useForm()
 * <Input {...register('email')} label="Email" />
 *
 * This is equivalent to:
 * <Input name="email" ref={someRef} onChange={handleChange} onBlur={handleBlur} label="Email" />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  fullWidth = true,
  className,
  ...rest
}, ref) => {
  // Generate unique IDs for accessibility
  const id = useId()
  const errorId = `${id}-error`
  const helperId = `${id}-helper`

  const wrapperClasses = clsx(
    styles.wrapper,
    {
      [styles.fullWidth]: fullWidth,
      [styles.hasError]: error,
    },
    className
  )

  const inputClasses = clsx(
    styles.input,
    {
      [styles.withIcon]: icon,
      [styles.error]: error,
    }
  )

  return (
    <div className={wrapperClasses}>
      {/* Label */}
      <label htmlFor={id} className={styles.label}>
        {label}
        {rest.required && <span className={styles.required} aria-label="required">*</span>}
      </label>

      {/* Input container (for icon positioning) */}
      <div className={styles.inputContainer}>
        {icon && <span className={styles.icon}>{icon}</span>}

        {/* Input field */}
        {/* COMMENT: ref prop forwarded from forwardRef for React Hook Form */}
        <input
          id={id}
          ref={ref}
          className={inputClasses}
          // ACCESSIBILITY: Link error and helper text to input
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={clsx({
            [errorId]: error,
            [helperId]: helperText,
          })}
          {...rest}
        />
      </div>

      {/* Error message */}
      {error && (
        <p id={errorId} className={styles.errorText} role="alert">
          {error}
        </p>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p id={helperId} className={styles.helperText}>
          {helperText}
        </p>
      )}
    </div>
  )
})

// LEARNING: displayName for forwardRef components
// Required for React DevTools to show component name instead of "Anonymous"
// Also helps with debugging and error messages
Input.displayName = 'Input'

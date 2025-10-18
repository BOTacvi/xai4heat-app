/**
 * AppSettingsForm Component - Client Component
 *
 * LEARNING: Why Client Component?
 * - Uses React Hook Form for form management
 * - Needs to call API (fetch) on submit
 * - Needs to call refreshSettings() from AuthContext
 * - Interactive form with validation
 *
 * FORM FIELDS:
 * - Expected Temperature Min (°C)
 * - Expected Temperature Max (°C)
 * - Expected Pressure Min (bar)
 * - Expected Pressure Max (bar)
 *
 * ON SUBMIT:
 * 1. Validate inputs (Zod schema)
 * 2. PUT /api/user/settings
 * 3. Call refreshSettings() to update AuthContext
 * 4. Show success message
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/lib/contexts/AuthContext'
import { Input } from '@/components/fields/Input'
import { Button } from '@/components/atoms/Button'
import styles from './AppSettingsForm.module.css'
import type { UserSettings } from '@/lib/generated/prisma'

/**
 * App Settings Form Validation Schema
 *
 * VALIDATION RULES:
 * - All values must be numbers
 * - Temperature: -50 to 100 (covers most realistic scenarios)
 * - Pressure: 0 to 10 (bar - typical heating system range)
 * - Min must be less than Max
 */
const appSettingsSchema = z.object({
  expected_temp_min: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(-50, 'Temperature must be at least -50°C')
    .max(100, 'Temperature must be at most 100°C'),
  expected_temp_max: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(-50, 'Temperature must be at least -50°C')
    .max(100, 'Temperature must be at most 100°C'),
  expected_pressure_min: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(0, 'Pressure must be at least 0 bar')
    .max(10, 'Pressure must be at most 10 bar'),
  expected_pressure_max: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(0, 'Pressure must be at least 0 bar')
    .max(10, 'Pressure must be at most 10 bar'),
}).refine(data => data.expected_temp_min < data.expected_temp_max, {
  message: 'Min temperature must be less than max temperature',
  path: ['expected_temp_max'],
}).refine(data => data.expected_pressure_min < data.expected_pressure_max, {
  message: 'Min pressure must be less than max pressure',
  path: ['expected_pressure_max'],
})

type AppSettingsFormData = z.infer<typeof appSettingsSchema>

type AppSettingsFormProps = {
  currentSettings: UserSettings
}

export const AppSettingsForm: React.FC<AppSettingsFormProps> = ({ currentSettings }) => {
  const { refreshSettings } = useAuth()
  const [apiError, setApiError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AppSettingsFormData>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      expected_temp_min: currentSettings.expected_temp_min,
      expected_temp_max: currentSettings.expected_temp_max,
      expected_pressure_min: currentSettings.expected_pressure_min,
      expected_pressure_max: currentSettings.expected_pressure_max,
    },
  })

  /**
   * Handle form submission
   *
   * LEARNING: Form submission flow with API
   * 1. React Hook Form validates (Zod schema)
   * 2. If valid, onSubmit is called with validated data
   * 3. PUT request to API
   * 4. API validates again (never trust client!)
   * 5. API updates database
   * 6. Refresh AuthContext to sync UI
   * 7. Show success message
   */
  const onSubmit = async (data: AppSettingsFormData) => {
    setApiError(null)
    setSuccessMessage(null)

    try {
      // STEP 1: Send PUT request to API
      // COMMENT: No userId needed - API reads from session
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update settings')
      }

      // STEP 2: Refresh settings in AuthContext
      // COMMENT: This updates the global state so other components see new settings
      await refreshSettings()

      // STEP 3: Show success message
      setSuccessMessage('Settings updated successfully!')

      // COMMENT: Auto-hide success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)

    } catch (err: any) {
      console.error('Error updating settings:', err)
      setApiError(err.message || 'An error occurred while updating settings')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <h3 className={styles.formTitle}>Update Settings</h3>

      {/* API Error Banner */}
      {apiError && (
        <div className={styles.errorBanner} role="alert">
          {apiError}
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className={styles.successBanner} role="status">
          {successMessage}
        </div>
      )}

      {/* Temperature Settings */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Temperature Range (°C)</h4>
        <p className={styles.sectionDescription}>
          Values outside this range will be marked as warnings on the dashboard
        </p>

        <div className={styles.fieldRow}>
          <Input
            label="Minimum Temperature"
            type="number"
            step="0.1"
            disabled={isSubmitting}
            error={errors.expected_temp_min?.message}
            {...register('expected_temp_min', { valueAsNumber: true })}
          />

          <Input
            label="Maximum Temperature"
            type="number"
            step="0.1"
            disabled={isSubmitting}
            error={errors.expected_temp_max?.message}
            {...register('expected_temp_max', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Pressure Settings */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Pressure Range (bar)</h4>
        <p className={styles.sectionDescription}>
          Values outside this range will be marked as warnings on the dashboard
        </p>

        <div className={styles.fieldRow}>
          <Input
            label="Minimum Pressure"
            type="number"
            step="0.1"
            disabled={isSubmitting}
            error={errors.expected_pressure_min?.message}
            {...register('expected_pressure_min', { valueAsNumber: true })}
          />

          <Input
            label="Maximum Pressure"
            type="number"
            step="0.1"
            disabled={isSubmitting}
            error={errors.expected_pressure_max?.message}
            {...register('expected_pressure_max', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        loading={isSubmitting}
        fullWidth
      >
        Save Settings
      </Button>
    </form>
  )
}

/**
 * AppSettingsForm Component - Client Component
 *
 * Form for configuring alert threshold ranges:
 * - Temperature (used by Thermionix and SCADA)
 * - Humidity (used by Thermionix)
 * - Pressure (used by SCADA)
 * - CO2 (used by Thermionix)
 */

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/contexts/AuthContext'
import { Input } from '@/components/fields/Input'
import { Button } from '@/components/atoms/Button'
import styles from './AppSettingsForm.module.css'
import type { UserSettings } from '@/lib/generated/prisma'

const appSettingsSchema = z.object({
  // Temperature (°C)
  expected_temp_min: z
    .number({ message: 'Must be a number' })
    .min(-50, 'Must be at least -50°C')
    .max(100, 'Must be at most 100°C'),
  expected_temp_max: z
    .number({ message: 'Must be a number' })
    .min(-50, 'Must be at least -50°C')
    .max(100, 'Must be at most 100°C'),
  // Humidity (%)
  expected_humidity_min: z
    .number({ message: 'Must be a number' })
    .min(0, 'Must be at least 0%')
    .max(100, 'Must be at most 100%'),
  expected_humidity_max: z
    .number({ message: 'Must be a number' })
    .min(0, 'Must be at least 0%')
    .max(100, 'Must be at most 100%'),
  // Pressure (bar)
  expected_pressure_min: z
    .number({ message: 'Must be a number' })
    .min(0, 'Must be at least 0 bar')
    .max(10, 'Must be at most 10 bar'),
  expected_pressure_max: z
    .number({ message: 'Must be a number' })
    .min(0, 'Must be at least 0 bar')
    .max(10, 'Must be at most 10 bar'),
  // CO2 (ppm)
  expected_co2_min: z
    .number({ message: 'Must be a number' })
    .min(0, 'Must be at least 0 ppm')
    .max(5000, 'Must be at most 5000 ppm'),
  expected_co2_max: z
    .number({ message: 'Must be a number' })
    .min(0, 'Must be at least 0 ppm')
    .max(5000, 'Must be at most 5000 ppm'),
}).refine(data => data.expected_temp_min < data.expected_temp_max, {
  message: 'Min must be less than max',
  path: ['expected_temp_max'],
}).refine(data => data.expected_humidity_min < data.expected_humidity_max, {
  message: 'Min must be less than max',
  path: ['expected_humidity_max'],
}).refine(data => data.expected_pressure_min < data.expected_pressure_max, {
  message: 'Min must be less than max',
  path: ['expected_pressure_max'],
}).refine(data => data.expected_co2_min < data.expected_co2_max, {
  message: 'Min must be less than max',
  path: ['expected_co2_max'],
})

type AppSettingsFormData = z.infer<typeof appSettingsSchema>

type AppSettingsFormProps = {
  currentSettings: UserSettings
}

export const AppSettingsForm: React.FC<AppSettingsFormProps> = ({ currentSettings }) => {
  const { refreshSettings } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AppSettingsFormData>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      expected_temp_min: currentSettings.expected_temp_min,
      expected_temp_max: currentSettings.expected_temp_max,
      expected_humidity_min: currentSettings.expected_humidity_min,
      expected_humidity_max: currentSettings.expected_humidity_max,
      expected_pressure_min: currentSettings.expected_pressure_min,
      expected_pressure_max: currentSettings.expected_pressure_max,
      expected_co2_min: currentSettings.expected_co2_min,
      expected_co2_max: currentSettings.expected_co2_max,
    },
  })

  const onSubmit = async (data: AppSettingsFormData) => {
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update settings')
      }

      await refreshSettings()
      toast.success('Settings updated successfully!')
    } catch (err: any) {
      console.error('Error updating settings:', err)
      toast.error(err.message || 'An error occurred while updating settings')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      {/* Temperature Settings */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Temperature (°C)</h4>
        <p className={styles.sectionDescription}>
          Thermionix apartment sensors and SCADA system
        </p>

        <div className={styles.fieldRow}>
          <Input
            label="Minimum"
            type="number"
            step="0.1"
            disabled={isSubmitting}
            error={errors.expected_temp_min?.message}
            {...register('expected_temp_min', { valueAsNumber: true })}
          />

          <Input
            label="Maximum"
            type="number"
            step="0.1"
            disabled={isSubmitting}
            error={errors.expected_temp_max?.message}
            {...register('expected_temp_max', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Humidity Settings */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Humidity (%)</h4>
        <p className={styles.sectionDescription}>
          Thermionix apartment sensors
        </p>

        <div className={styles.fieldRow}>
          <Input
            label="Minimum"
            type="number"
            step="1"
            disabled={isSubmitting}
            error={errors.expected_humidity_min?.message}
            {...register('expected_humidity_min', { valueAsNumber: true })}
          />

          <Input
            label="Maximum"
            type="number"
            step="1"
            disabled={isSubmitting}
            error={errors.expected_humidity_max?.message}
            {...register('expected_humidity_max', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Pressure Settings */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Pressure (bar)</h4>
        <p className={styles.sectionDescription}>
          SCADA system
        </p>

        <div className={styles.fieldRow}>
          <Input
            label="Minimum"
            type="number"
            step="0.1"
            disabled={isSubmitting}
            error={errors.expected_pressure_min?.message}
            {...register('expected_pressure_min', { valueAsNumber: true })}
          />

          <Input
            label="Maximum"
            type="number"
            step="0.1"
            disabled={isSubmitting}
            error={errors.expected_pressure_max?.message}
            {...register('expected_pressure_max', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* CO2 Settings */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>CO2 (ppm)</h4>
        <p className={styles.sectionDescription}>
          Thermionix apartment sensors
        </p>

        <div className={styles.fieldRow}>
          <Input
            label="Minimum"
            type="number"
            step="10"
            disabled={isSubmitting}
            error={errors.expected_co2_min?.message}
            {...register('expected_co2_min', { valueAsNumber: true })}
          />

          <Input
            label="Maximum"
            type="number"
            step="10"
            disabled={isSubmitting}
            error={errors.expected_co2_max?.message}
            {...register('expected_co2_max', { valueAsNumber: true })}
          />
        </div>
      </div>

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

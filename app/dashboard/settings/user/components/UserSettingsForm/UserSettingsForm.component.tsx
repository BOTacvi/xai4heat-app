/**
 * UserSettingsForm Component - Client Component
 *
 * Form for managing user account settings:
 * - Password change
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Input } from '@/components/fields/Input'
import { Button } from '@/components/atoms/Button'
import styles from './UserSettingsForm.module.css'

const MIN_PASSWORD_LENGTH = 6

const passwordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your new password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
})

type PasswordFormData = z.infer<typeof passwordSchema>

type UserSettingsFormProps = {
  userEmail: string
}

export const UserSettingsForm: React.FC<UserSettingsFormProps> = ({ userEmail }) => {
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: PasswordFormData) => {
    try {
      setIsSuccess(false)

      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update password')
      }

      setIsSuccess(true)
      reset()
      toast.success('Password updated successfully!')
    } catch (err: any) {
      console.error('Error updating password:', err)
      toast.error(err.message || 'An error occurred while updating password')
    }
  }

  return (
    <div className={styles.container}>
      {/* User Info Section */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Account Information</h4>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Email</span>
          <span className={styles.infoValue}>{userEmail}</span>
        </div>
      </div>

      {/* Password Change Section */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Change Password</h4>
        <p className={styles.sectionDescription}>
          Enter your current password and choose a new one
        </p>

        {isSuccess && (
          <div className={styles.successBanner}>
            Password updated successfully!
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <Input
            label="Current Password"
            type="password"
            autoComplete="current-password"
            disabled={isSubmitting}
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />

          <Input
            label="New Password"
            type="password"
            autoComplete="new-password"
            disabled={isSubmitting}
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />

          <Input
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            disabled={isSubmitting}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button
            type="submit"
            loading={isSubmitting}
            fullWidth
          >
            Update Password
          </Button>
        </form>
      </div>
    </div>
  )
}

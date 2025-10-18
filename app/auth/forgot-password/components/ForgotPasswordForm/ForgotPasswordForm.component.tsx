/**
 * ForgotPasswordForm Component
 *
 * LEARNING: Supabase Password Reset
 *
 * supabase.auth.resetPasswordForEmail() sends an email with a magic link.
 * The link contains a token and redirects to the URL you specify.
 *
 * SECURITY NOTE:
 * - Supabase doesn't reveal whether email exists (prevents user enumeration)
 * - Always shows success message even if email doesn't exist
 * - This is a security best practice
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabaseClient'
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/lib/validations/auth'
import { Input } from '@/components/fields/Input'
import { Button } from '@/components/atoms/Button'
import styles from './ForgotPasswordForm.module.css'

type ForgotPasswordFormProps = {
  className?: string
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ className }) => {
  // LEARNING: React Hook Form for email validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
  })

  const [apiError, setApiError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  /**
   * Handle form submission
   *
   * LEARNING: Password Reset Flow
   * 1. User enters email
   * 2. Supabase sends email with magic link
   * 3. User clicks link → redirected to /auth/reset-password
   * 4. Reset password page shows password fields
   * 5. User sets new password
   *
   * COMMENT: We only handle step 1-2 here
   * Step 3-5 will be handled by /auth/reset-password page
   */
  const onSubmit = async (data: ForgotPasswordFormData) => {
    setApiError(null)

    try {
      // COMMENT: Send password reset email
      // redirectTo specifies where user lands after clicking email link
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (resetError) {
        throw resetError
      }

      // Success - show confirmation
      setSuccess(true)

    } catch (err: any) {
      console.error('Password reset error:', err)
      setApiError(err.message || 'An error occurred')
    }
  }

  // Success state
  if (success) {
    const email = getValues('email')
    return (
      <div className={styles.successCard}>
        <div className={styles.successIcon}>✉️</div>
        <h2 className={styles.successTitle}>Check your email</h2>
        <p className={styles.successText}>
          If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
        </p>
        <p className={styles.successHint}>
          Didn't receive it? Check your spam folder or try again in a few minutes.
        </p>
        <Link href="/auth/login" className={styles.backLink}>
          Back to login
        </Link>
      </div>
    )
  }

  // Form state
  const formClasses = clsx(styles.form, className)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={formClasses}>
      {apiError && (
        <div className={styles.errorBanner} role="alert">
          {apiError}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        disabled={isSubmitting}
        placeholder="you@example.com"
        helperText="We'll send a password reset link to this email"
        error={errors.email?.message}
        {...register('email')}
      />

      <Button
        type="submit"
        loading={isSubmitting}
        fullWidth
      >
        Send Reset Link
      </Button>

      <div className={styles.footer}>
        <Link href="/auth/login" className={styles.link}>
          ← Back to login
        </Link>
      </div>
    </form>
  )
}

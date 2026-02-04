/**
 * SignupForm Component - Client Component
 *
 * LEARNING: Supabase Signup Flow
 *
 * 1. supabase.auth.signUp() creates user in Supabase Auth
 * 2. Supabase sends confirmation email (if enabled)
 * 3. User clicks link in email → email_confirmed = true
 * 4. User can now login
 *
 * CONFIGURATION OPTIONS:
 * - Email confirmation required (default, more secure)
 * - Auto-confirm (faster UX, less secure)
 * - Email confirmation can be disabled in Supabase Dashboard:
 *   Authentication > Settings > Email Auth > "Confirm email"
 *
 * FOR DEVELOPMENT:
 * You might want to disable email confirmation to test faster.
 * In production, ALWAYS require email confirmation for security.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import clsx from 'clsx'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import { signupSchema, SignupFormData } from '@/lib/validations/auth'
import { Input } from '@/components/fields/Input'
import { Button } from '@/components/atoms/Button'
import styles from './SignupForm.module.css'

type SignupFormProps = {
  className?: string
}

export const SignupForm: React.FC<SignupFormProps> = ({ className }) => {
  const router = useRouter()

  // LEARNING: React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues, // COMMENT: getValues() gets current form values (for displaying email in success)
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
  })

  // UI state
  // REFACTOR: Removed apiError state - now using toast notifications
  const [success, setSuccess] = useState(false)

  /**
   * Handle form submission
   *
   * LEARNING: Why no manual validation?
   * - Zod schema handles ALL validation:
   *   ✓ Email format
   *   ✓ Password length (min 8 characters)
   *   ✓ Password strength (uppercase, lowercase, number)
   *   ✓ Password confirmation match
   * - onSubmit only called if validation passes
   * - data is type-safe SignupFormData
   */
  const onSubmit = async (data: SignupFormData) => {
    try {
      // COMMENT: Supabase signup
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          // LEARNING: emailRedirectTo specifies where user goes after confirming email
          // This should be your production domain in production
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      })

      if (signUpError) {
        throw signUpError
      }

      if (!authData.user) {
        throw new Error('Signup failed - no user returned')
      }

      // SUCCESS
      // COMMENT: Check if email confirmation is required
      // If user.identities is empty, it means email already exists
      if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
        throw new Error('An account with this email already exists')
      }

      setSuccess(true)

      // LEARNING: Two scenarios:
      // 1. Email confirmation required → show success message
      // 2. Auto-confirmed → redirect to app
      if (authData.session) {
        // User is auto-confirmed and logged in
        // Initialize user settings with defaults (humidity, temp, CO2, pressure)
        fetch('/api/user/settings').catch((err) =>
          console.error('Failed to initialize user settings:', err)
        )

        toast.success('Account created successfully!')
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 2000)
      } else {
        // User needs to confirm email
        // Show success message (see UI below)
      }

    } catch (err: any) {
      console.error('Signup error:', err)
      // REFACTOR: Display API error via toast instead of inline banner
      toast.error(err.message || 'An error occurred during signup')
    }
  }

  // Success state - show confirmation message
  if (success) {
    const email = getValues('email') // Get email from form
    return (
      <div className={styles.successCard}>
        <div className={styles.successIcon}>✓</div>
        <h2 className={styles.successTitle}>Check your email!</h2>
        <p className={styles.successText}>
          We've sent a confirmation link to <strong>{email}</strong>.
          Click the link to activate your account.
        </p>
        <p className={styles.successHint}>
          Didn't receive the email? Check your spam folder.
        </p>
      </div>
    )
  }

  // Form state
  const formClasses = clsx(styles.form, className)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={formClasses}>
      {/* REFACTOR: Removed inline error banner - now using toast notifications */}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        disabled={isSubmitting}
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        disabled={isSubmitting}
        placeholder="••••••••"
        helperText="At least 8 characters with uppercase, lowercase, and number"
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        disabled={isSubmitting}
        placeholder="••••••••"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Button
        type="submit"
        loading={isSubmitting}
        fullWidth
      >
        Create Account
      </Button>

      <div className={styles.footer}>
        <span className={styles.footerText}>Already have an account?</span>
        <Link href="/auth/login" className={styles.link}>
          Sign in
        </Link>
      </div>
    </form>
  )
}

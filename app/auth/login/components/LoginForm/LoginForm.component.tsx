/**
 * LoginForm Component - Client Component
 *
 * LEARNING: Why Client Component?
 * - Uses React Hook Form (client-side form management)
 * - Needs event handlers (onSubmit)
 * - Needs to call Supabase auth (client-side)
 * - Needs to show loading/error states
 *
 * FORM HANDLING PATTERN (React Hook Form + Zod):
 * 1. Define Zod schema (lib/validations/auth.ts)
 * 2. useForm with zodResolver
 * 3. register() fields - automatic validation, no useState needed
 * 4. handleSubmit() wraps submission - validates before calling onSubmit
 * 5. formState gives us errors, isSubmitting, etc.
 *
 * BENEFITS over manual validation:
 * - No useState for each field (form state managed by library)
 * - No manual validation functions (Zod handles it)
 * - Type-safe form data (TypeScript knows exact shape)
 * - Less boilerplate code overall
 */

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import clsx from 'clsx'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabaseClient'
import { loginSchema, LoginFormData } from '@/lib/validations/auth'
import { Input } from '@/components/fields/Input'
import { Button } from '@/components/atoms/Button'
import styles from './LoginForm.module.css'

type LoginFormProps = {
  className?: string
}

export const LoginForm: React.FC<LoginFormProps> = ({ className }) => {
  // LEARNING: useRouter for client-side navigation
  // Different from next/router (Pages Router) - this is from next/navigation
  const router = useRouter()

  // LEARNING: useSearchParams to read URL query parameters
  // Example: /auth/login?redirectTo=/thermionix
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/thermionix'

  // LEARNING: React Hook Form setup
  // - register: Function to register inputs (spreads name, ref, onChange, onBlur)
  // - handleSubmit: Wraps our onSubmit, validates before calling it
  // - formState: Contains errors, isSubmitting, isDirty, isValid, etc.
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema), // Connects Zod schema to React Hook Form
    mode: 'onBlur', // Validate on blur (when user leaves field)
  })

  // COMMENT: Still need useState for API errors (not field validation errors)
  // Form validation errors come from Zod/React Hook Form (errors.email, errors.password)
  // API errors come from Supabase (wrong password, network error, etc.)
  const [apiError, setApiError] = useState<string | null>(null)

  /**
   * Handle form submission
   *
   * LEARNING: React Hook Form onSubmit pattern
   * - This function ONLY runs if validation passes
   * - data parameter is type-safe: LoginFormData = { email: string, password: string }
   * - No need to check if fields are empty - Zod already validated
   * - No need to call e.preventDefault() - handleSubmit does it
   *
   * SUPABASE AUTH FLOW:
   * 1. supabase.auth.signInWithPassword() sends credentials to Supabase
   * 2. Supabase verifies against Auth database
   * 3. Returns JWT token + user object
   * 4. Token automatically stored in httpOnly cookie
   * 5. AuthContext listener picks up change
   * 6. User is now authenticated
   */
  const onSubmit = async (data: LoginFormData) => {
    setApiError(null)

    try {
      // COMMENT: Call Supabase auth with validated data
      // data.email and data.password are guaranteed to exist and be valid
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (signInError) {
        // LEARNING: Supabase error messages are user-friendly
        // - "Invalid login credentials" for wrong password
        // - "Email not confirmed" if email verification pending
        throw signInError
      }

      if (!authData.user) {
        throw new Error('Login failed - no user returned')
      }

      // SUCCESS: User logged in
      // COMMENT: router.push() triggers client-side navigation
      // AuthContext will update automatically (onAuthStateChange listener)
      // Middleware will allow access to protected routes

      // LEARNING: Redirect to original page or default to /thermionix
      // If user came from /scada, they'll be redirected back to /scada
      // This provides better UX - user returns to where they were
      console.log('[LoginForm] Login successful, redirecting to:', redirectTo)
      router.push(redirectTo)

      // LEARNING: router.refresh() forces a re-fetch of server components
      // This ensures the new auth state is reflected immediately
      router.refresh()

    } catch (err: any) {
      console.error('Login error:', err)
      // Display API error to user
      setApiError(err.message || 'An error occurred during login')
    }
  }

  const formClasses = clsx(styles.form, className)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={formClasses}>
      {/* API Error banner */}
      {/* COMMENT: Show API errors (from Supabase) at top of form */}
      {apiError && (
        <div className={styles.errorBanner} role="alert">
          {apiError}
        </div>
      )}

      {/* Email field */}
      {/* LEARNING: {...register('email')} spreads name, ref, onChange, onBlur */}
      {/* error={errors.email?.message} shows Zod validation error */}
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        disabled={isSubmitting}
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />

      {/* Password field */}
      {/* COMMENT: Same pattern - register + error from formState */}
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        disabled={isSubmitting}
        placeholder="••••••••"
        error={errors.password?.message}
        {...register('password')}
      />

      {/* Forgot password link */}
      <div className={styles.forgotPassword}>
        <Link href="/auth/forgot-password" className={styles.link}>
          Forgot your password?
        </Link>
      </div>

      {/* Submit button */}
      {/* COMMENT: isSubmitting from formState - automatically true during async onSubmit */}
      <Button
        type="submit"
        loading={isSubmitting}
        fullWidth
      >
        Sign In
      </Button>

      {/* Sign up link */}
      <div className={styles.footer}>
        <span className={styles.footerText}>Don't have an account?</span>
        <Link href="/auth/signup" className={styles.link}>
          Sign up
        </Link>
      </div>
    </form>
  )
}

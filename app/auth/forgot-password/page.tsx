/**
 * Forgot Password Page - Server Component
 *
 * LEARNING: Password Reset Flow in Supabase
 *
 * 1. User enters email
 * 2. supabase.auth.resetPasswordForEmail() sends reset link to email
 * 3. User clicks link → redirected to your app with token in URL
 * 4. Your app shows "Update Password" form
 * 5. User enters new password
 * 6. supabase.auth.updateUser() updates password
 * 7. User can now login with new password
 *
 * This page handles steps 1-2
 */

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import ForgotPasswordForm from './components/ForgotPasswordForm'
import styles from './ForgotPassword.module.css'

export default async function ForgotPasswordPage() {
  // If already logged in, redirect to app
  const user = await getCurrentUser()

  if (user) {
    redirect('/thermionix')
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <ForgotPasswordForm />
      </div>
    </div>
  )
}

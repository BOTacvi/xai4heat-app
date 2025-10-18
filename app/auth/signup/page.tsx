/**
 * Signup Page - Server Component
 */

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import SignupForm from './components/SignupForm'
import styles from './Signup.module.css'

export default async function SignupPage() {
  // Check if user is already logged in
  const user = await getCurrentUser()

  if (user) {
    redirect('/thermionix')
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>
            Start monitoring your Thermionix devices
          </p>
        </div>

        <SignupForm />
      </div>
    </div>
  )
}

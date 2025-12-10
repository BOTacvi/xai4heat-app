/**
 * Signup Page - Server Component
 */

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import Image from 'next/image'
import SignupForm from './components/SignupForm'
import styles from './Signup.module.css'

type SignupPageProps = {}

const SignupPage: React.FC<SignupPageProps> = async () => {
  // Check if user is already logged in
  const user = await getCurrentUser()

  if (user) {
    redirect('/thermionix')
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <Image
            src="/xai4heat-logo.png"
            alt="xai4heat"
            width={200}
            height={60}
            priority
            className={styles.logo}
          />
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>
            Start monitoring your heating devices
          </p>
        </div>

        <SignupForm />
      </div>
    </div>
  )
}

export default SignupPage

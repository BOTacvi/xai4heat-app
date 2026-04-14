import { Suspense } from 'react'
import Image from 'next/image'
import ResetPasswordForm from './components/ResetPasswordForm'
import styles from './ResetPassword.module.css'

export default function ResetPasswordPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
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
          <h1 className={styles.title}>Set New Password</h1>
          <p className={styles.subtitle}>Enter your new password below</p>
        </div>

        <Suspense fallback={<p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}

/**
 * Auth Layout - Centered Forms Layout
 *
 * LEARNING: Route Group Layouts
 *
 * This layout wraps all pages under /auth/*:
 * - /auth/login
 * - /auth/signup
 * - /auth/forgot-password
 * - /auth/reset-password
 *
 * PURPOSE:
 * - Provide consistent centered layout for auth forms
 * - No navigation (users aren't logged in yet)
 * - Clean, minimal design focused on the form
 *
 * STRUCTURE:
 * - Centered container
 * - Max width for readability
 * - Vertical centering for visual balance
 */

import clsx from 'clsx'
import styles from './layout.module.css'

type AuthLayoutProps = {
  children: React.ReactNode
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className={styles['auth-layout']}>
      {/* COMMENT: Centered container for auth forms */}
      <div className={styles['auth-container']}>
        {children}
      </div>
    </div>
  )
}

export default AuthLayout

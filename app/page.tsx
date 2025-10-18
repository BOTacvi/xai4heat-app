/**
 * Homepage - Landing Page
 *
 * LEARNING: This is the root page of the application (/)
 *
 * ARCHITECTURE:
 * - Server Component (can fetch data, check auth on server)
 * - Redirects authenticated users to Thermionix monitoring
 * - Shows welcome screen for unauthenticated users
 *
 * WHY THIS APPROACH:
 * - Authenticated users don't need a landing page, go straight to app
 * - Non-authenticated users see a clean welcome screen with login link
 * - All logic server-side = fast, SEO-friendly
 */

import Link from "next/link";
import styles from "./page.module.css";

export default async function Home() {
  // COMMENT: User commented out auth check to always show landing page
  // Original code checked if user was logged in and redirected to /thermionix
  // Now the landing page is always visible

  // COMMENT: Show welcome screen for non-authenticated users
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>
            Welcome to <span className={styles.brand}>Thermionix</span>
          </h1>

          <p className={styles.description}>
            Monitor temperature, pressure, and environmental data from your
            apartment sensors in real-time.
          </p>

          <div className={styles.features}>
            <div className={styles.feature}>
              <h3 className={styles.featureTitle}>Real-Time Monitoring</h3>
              <p className={styles.featureText}>
                Track temperature and pressure data as it happens with live
                updates.
              </p>
            </div>

            <div className={styles.feature}>
              <h3 className={styles.featureTitle}>SCADA Integration</h3>
              <p className={styles.featureText}>
                View aggregated data from entire building complexes (lamelas).
              </p>
            </div>

            <div className={styles.feature}>
              <h3 className={styles.featureTitle}>Weather Data</h3>
              <p className={styles.featureText}>
                Compare indoor conditions with outside temperature and weather.
              </p>
            </div>
          </div>

          <div className={styles.actions}>
            <Link href="/auth/login" className={styles.loginButton}>
              Log In
            </Link>
            <Link href="/auth/signup" className={styles.signupButton}>
              Sign Up
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

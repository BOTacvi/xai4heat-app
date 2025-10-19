/**
 * Dashboard Homepage - 4 Cards Overview
 *
 * LEARNING: Dashboard Landing Page Pattern + Data-Driven UI
 *
 * PURPOSE:
 * - Quick overview of all main sections
 * - Fast navigation to specific pages
 * - Show current key metrics at a glance
 *
 * REFACTOR:
 * - BEFORE: 4 hardcoded Link components (repetitive)
 * - AFTER: Map over DASHBOARD_CARDS data array
 * - BENEFIT: Easy to add/remove/reorder cards
 *
 * CONTENT:
 * - Just "Welcome" heading
 * - Cards dynamically rendered from data
 * - NO descriptions, NO extra text
 * - Focus on clean, minimal interface
 */

import Link from 'next/link'
import { DASHBOARD_CARDS } from './data'
import styles from './page.module.css'

type DashboardPageProps = {}

const DashboardPage: React.FC<DashboardPageProps> = () => {
  return (
    <div className={styles.container}>
      {/* REMOVED: "Welcome" heading per design requirements */}

      <div className={styles.cardGrid}>
        {/* COMMENT: Map over DASHBOARD_CARDS data for dynamic rendering */}
        {/* BENEFIT: Add/remove/reorder cards by editing data/index.ts only */}
        {DASHBOARD_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.href} href={card.href} className={styles.card}>
              <Icon size={32} className={styles.icon} />
              <h2 className={styles.cardTitle}>{card.title}</h2>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default DashboardPage

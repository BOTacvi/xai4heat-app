/**
 * Dashboard Homepage - 4 Cards Overview with Stats
 *
 * PURPOSE:
 * - Quick overview of all main sections
 * - Show current key metrics at a glance
 * - Show unacknowledged alert counts per section
 * - Fast navigation to specific pages
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DASHBOARD_CARDS } from './data'
import styles from './page.module.css'

type DashboardStats = {
  thermionix: {
    avgTemp: number | null
    avgHumidity: number | null
    avgCO2: number | null
    deviceCount: number
    alertCount: number
  }
  scada: {
    avgAmbientTemp: number | null
    avgPressure: number | null
    locationCount: number
    alertCount: number
  }
  weatherlink: {
    tempOut: number | null
    humOut: number | null
    windSpeed: number | null
    alertCount: number
  }
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Helper to get stats for a card based on title
  const getCardStats = (title: string) => {
    if (!stats) return null

    switch (title) {
      case 'Thermionix':
        return {
          items: [
            { label: 'Avg Temp', value: stats.thermionix.avgTemp, unit: '°C' },
            { label: 'Avg Humidity', value: stats.thermionix.avgHumidity, unit: '%' },
            { label: 'Avg CO2', value: stats.thermionix.avgCO2, unit: 'ppm' },
          ],
          alertCount: stats.thermionix.alertCount,
        }
      case 'SCADA':
        return {
          items: [
            { label: 'Ambient Temp', value: stats.scada.avgAmbientTemp, unit: '°C' },
            { label: 'Pressure', value: stats.scada.avgPressure, unit: 'bar' },
            { label: 'Locations', value: stats.scada.locationCount, unit: '' },
          ],
          alertCount: stats.scada.alertCount,
        }
      case 'WeatherLink':
        return {
          items: [
            { label: 'Outdoor', value: stats.weatherlink.tempOut, unit: '°C' },
            { label: 'Humidity', value: stats.weatherlink.humOut, unit: '%' },
            { label: 'Wind', value: stats.weatherlink.windSpeed, unit: 'm/s' },
          ],
          alertCount: stats.weatherlink.alertCount,
        }
      default:
        return null
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.cardGrid}>
        {DASHBOARD_CARDS.map((card) => {
          const Icon = card.icon
          const cardStats = getCardStats(card.title)

          return (
            <Link key={card.href} href={card.href} className={styles.card}>
              <div className={styles.cardHeader}>
                <Icon size={28} className={styles.icon} />
                <h2 className={styles.cardTitle}>{card.title}</h2>
              </div>

              {/* Stats Section */}
              {cardStats && (
                <div className={styles.statsSection}>
                  {isLoading ? (
                    <div className={styles.statsLoading}>Loading...</div>
                  ) : (
                    <>
                      <div className={styles.statsGrid}>
                        {cardStats.items.map((item) => (
                          <div key={item.label} className={styles.statItem}>
                            <span className={styles.statLabel}>{item.label}</span>
                            <span className={styles.statValue}>
                              {item.value !== null ? `${item.value}${item.unit}` : '—'}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Alert Badge */}
                      {cardStats.alertCount > 0 && (
                        <div className={styles.alertBadge}>
                          {cardStats.alertCount} alert{cardStats.alertCount !== 1 ? 's' : ''}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Settings card has no stats */}
              {!cardStats && (
                <div className={styles.settingsText}>
                  Configure thresholds
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default DashboardPage

/**
 * AlertsDropdown Component
 *
 * PURPOSE:
 * - Display bell icon with red badge showing unread alert count
 * - Show dropdown with recent unread alerts
 * - Enable deep-linking to dashboards with proper context
 *
 * FEATURES:
 * - Real-time unread count badge
 * - Click alert to navigate to source dashboard
 * - Auto-mark alert as read on click
 * - "Mark all read" functionality
 * - Click outside to close
 *
 * DEEP-LINKING:
 * - THERMIONIX: /dashboard/thermionix?device={id}&from={time}&to={now}
 * - SCADA: /dashboard/scada?lamela={location}&from={time}&to={now}
 * - WEATHERLINK: /dashboard/weatherlink?from={time}&to={now}
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAlerts } from '@/lib/contexts/AlertsContext'
import type { Alert } from '@/lib/generated/prisma'
import styles from './AlertsDropdown.module.css'

/**
 * Generate Deep-Link URL for Alert
 *
 * ROUTING LOGIC:
 * - THERMIONIX: Navigate to device with date range context
 * - SCADA: Navigate to lamela with date range context
 * - WEATHERLINK: Navigate to weather station with date range context
 *
 * DATE RANGE:
 * - from: measurement_time (when violation occurred)
 * - to: current time (to see latest data)
 */
function getAlertLink(alert: Alert): string {
  const measurementTime = new Date(alert.measurement_time)
  const now = new Date()

  const fromISO = measurementTime.toISOString()
  const toISO = now.toISOString()

  switch (alert.source) {
    case 'THERMIONIX':
      if (alert.device_id) {
        return `/dashboard/thermionix?apartment=${alert.device_id}&from=${fromISO}&to=${toISO}`
      }
      return `/dashboard/thermionix?from=${fromISO}&to=${toISO}`

    case 'SCADA':
      if (alert.location) {
        return `/dashboard/scada?lamela=${alert.location}&from=${fromISO}&to=${toISO}`
      }
      return `/dashboard/scada?from=${fromISO}&to=${toISO}`

    case 'WEATHERLINK':
      return `/dashboard/weatherlink?from=${fromISO}&to=${toISO}`

    default:
      return '/dashboard/notifications'
  }
}

/**
 * Generate Human-Readable Alert Text
 *
 * FORMAT:
 * - "{location/apartment}: {metric} too {high/low} ({value} {comparison} {threshold})"
 *
 * EXAMPLES:
 * - "L8_33_67: Temperature too high (28.5°C > 26.0°C)"
 * - "L8: Pressure too low (1.2bar < 1.5bar)"
 */
function getAlertText(alert: Alert): string {
  // Determine location/device display name
  const location = alert.apartment_name || alert.location || 'Unknown'

  // Determine metric name
  let metric = ''
  if (alert.alert_type.includes('TEMP')) metric = 'Temperature'
  else if (alert.alert_type.includes('PRESSURE')) metric = 'Pressure'
  else if (alert.alert_type.includes('HUMIDITY')) metric = 'Humidity'
  else if (alert.alert_type.includes('CO2')) metric = 'CO2'

  // Determine direction
  const direction = alert.alert_type.includes('HIGH') ? 'too high' : 'too low'
  const comparison = alert.alert_type.includes('HIGH') ? '>' : '<'

  // Format values with unit
  const measuredValue = `${alert.measured_value.toFixed(1)}${alert.unit}`
  const thresholdValue = `${alert.threshold_value.toFixed(1)}${alert.unit}`

  return `${location}: ${metric} ${direction} (${measuredValue} ${comparison} ${thresholdValue})`
}

export const AlertsDropdown: React.FC = () => {
  const router = useRouter()
  const { alerts, unreadCount, markAsRead, markAllAsRead } = useAlerts()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get recent unread alerts (max 10)
  const recentUnreadAlerts = alerts.filter(a => !a.is_read).slice(0, 10)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleBellClick = () => {
    setIsOpen(!isOpen)
  }

  const handleAlertClick = async (alert: Alert) => {
    // Mark as read if not already
    if (!alert.is_read) {
      await markAsRead(alert.id)
    }

    // Navigate to deep-link
    const link = getAlertLink(alert)
    router.push(link)

    // Close dropdown
    setIsOpen(false)
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  const handleViewAll = () => {
    router.push('/dashboard/notifications')
    setIsOpen(false)
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      {/* Bell Button with Badge */}
      <button
        className={styles.bellButton}
        onClick={handleBellClick}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={styles.dropdown}>
          {/* Header */}
          <div className={styles.dropdownHeader}>
            <h3 className={styles.dropdownTitle}>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className={styles.markAllButton}
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Alerts List */}
          <div className={styles.alertsList}>
            {recentUnreadAlerts.length === 0 ? (
              // Empty State
              <div className={styles.emptyState}>
                <Bell size={48} className={styles.emptyIcon} />
                <p className={styles.emptyText}>No new notifications</p>
              </div>
            ) : (
              // Alert Items
              recentUnreadAlerts.map((alert) => {
                const severityClass =
                  alert.severity === 'HIGH' ? styles.severityHigh :
                  alert.severity === 'MEDIUM' ? styles.severityMedium :
                  styles.severityLow

                return (
                  <button
                    key={alert.id}
                    className={styles.alertItem}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <div className={`${styles.alertDot} ${severityClass}`} />
                    <div className={styles.alertContent}>
                      <p className={styles.alertText}>
                        {getAlertText(alert)}
                      </p>
                      <span className={styles.alertTime}>
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className={styles.dropdownFooter}>
            <button
              className={styles.viewAllButton}
              onClick={handleViewAll}
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

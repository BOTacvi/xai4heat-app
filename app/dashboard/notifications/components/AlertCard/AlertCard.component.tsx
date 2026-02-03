'use client'

import React from 'react'
import {
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Zap,
  Server,
  Cloud,
  LucideIcon
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import type { Alert, AlertSource, AlertSeverity } from '@/lib/generated/prisma'
import styles from './AlertCard.module.css'

type AlertCardProps = {
  alert: Alert
  isSelected: boolean
  onSelect: (alertId: string) => void
  onClick: (alert: Alert) => void
  onAcknowledge: (alertId: string) => void
  className?: string
}

const METRIC_ICONS: Record<string, LucideIcon> = {
  TEMP: Thermometer,
  HUMIDITY: Droplets,
  CO2: Wind,
  PRESSURE: Gauge,
}

const SOURCE_ICONS: Record<AlertSource, LucideIcon> = {
  THERMIONIX: Zap,
  SCADA: Server,
  WEATHERLINK: Cloud,
}

const SEVERITY_ICONS: Record<AlertSeverity, LucideIcon> = {
  HIGH: AlertCircle,
  MEDIUM: AlertTriangle,
  LOW: Info,
}

function getMetricIcon(alertType: string): LucideIcon {
  for (const [key, icon] of Object.entries(METRIC_ICONS)) {
    if (alertType.includes(key)) return icon
  }
  return Info
}

function getAlertText(alert: Alert): string {
  const location = alert.apartment_name || alert.location || 'Unknown'

  let metric = ''
  if (alert.alert_type.includes('TEMP')) metric = 'Temperature'
  else if (alert.alert_type.includes('PRESSURE')) metric = 'Pressure'
  else if (alert.alert_type.includes('HUMIDITY')) metric = 'Humidity'
  else if (alert.alert_type.includes('CO2')) metric = 'CO2'

  const direction = alert.alert_type.includes('HIGH') ? 'too high' : 'too low'
  const comparison = alert.alert_type.includes('HIGH') ? '>' : '<'
  const measuredValue = `${alert.measured_value.toFixed(1)}${alert.unit}`
  const thresholdValue = `${alert.threshold_value.toFixed(1)}${alert.unit}`

  return `${location}: ${metric} ${direction} (${measuredValue} ${comparison} ${thresholdValue})`
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  isSelected,
  onSelect,
  onClick,
  onAcknowledge,
  className,
}) => {
  const MetricIcon = getMetricIcon(alert.alert_type)
  const SourceIcon = SOURCE_ICONS[alert.source] || Info
  const SeverityIcon = SEVERITY_ICONS[alert.severity] || Info

  const cardClasses = clsx(
    styles.card,
    !alert.is_read && styles.unread,
    styles[alert.severity.toLowerCase()],
    className
  )

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleAcknowledgeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAcknowledge(alert.id)
  }

  return (
    <div className={cardClasses} onClick={() => onClick(alert)}>
      {/* Checkbox - only show for unacknowledged alerts */}
      {!alert.is_acknowledged && (
        <div className={styles.checkbox}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(alert.id)}
            onClick={handleCheckboxClick}
          />
        </div>
      )}

      {/* Icon */}
      <div className={styles.iconWrapper}>
        <MetricIcon size={24} />
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.badges}>
            <span className={styles.sourceBadge}>
              <SourceIcon size={14} />
              <span>{alert.source}</span>
            </span>
            <span className={clsx(styles.severityBadge, styles[alert.severity.toLowerCase()])}>
              <SeverityIcon size={14} />
              <span>{alert.severity}</span>
            </span>
            {alert.is_acknowledged && (
              <span className={styles.acknowledgedBadge}>
                <CheckCircle2 size={14} />
                <span>Acknowledged</span>
              </span>
            )}
          </div>
          <span className={styles.timestamp}>
            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
          </span>
        </div>

        <p className={styles.text}>{getAlertText(alert)}</p>

        <span className={styles.measurementTime}>
          Measured: {new Date(alert.measurement_time).toLocaleString()}
        </span>
      </div>

      {/* Actions */}
      {!alert.is_acknowledged && (
        <button className={styles.acknowledgeButton} onClick={handleAcknowledgeClick}>
          <CheckCircle2 size={14} />
          <span>Acknowledge</span>
        </button>
      )}
    </div>
  )
}

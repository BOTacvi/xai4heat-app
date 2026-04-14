'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import type { Alert } from '@/lib/generated/prisma'
import { createClient } from '@/lib/supabase/client'

function getAlertLink(alert: Alert): string {
  const measurementTime = new Date(alert.measurement_time)
  const from = new Date(measurementTime.getTime() - 3 * 60 * 60 * 1000).toISOString()
  const to = new Date().toISOString()
  switch (alert.source) {
    case 'THERMIONIX':
      return `/dashboard/thermionix?apartment=${alert.device_id}&from=${from}&to=${to}`
    case 'SCADA':
      return `/dashboard/scada?lamela=${alert.location}&from=${from}&to=${to}`
    case 'WEATHERLINK':
      return `/dashboard/weatherlink?from=${from}&to=${to}`
    default:
      return '/dashboard/notifications'
  }
}

function getAlertText(alert: Alert): string {
  const location = alert.apartment_name || alert.location || 'Unknown'
  const metric = alert.alert_type.includes('TEMP') ? 'Temperature'
    : alert.alert_type.includes('PRESSURE') ? 'Pressure'
    : alert.alert_type.includes('HUMIDITY') ? 'Humidity'
    : 'CO2'
  const direction = alert.alert_type.includes('HIGH') ? 'too high' : 'too low'
  const cmp = alert.alert_type.includes('HIGH') ? '>' : '<'
  return `${location}: ${metric} ${direction} (${alert.measured_value.toFixed(1)}${alert.unit} ${cmp} ${alert.threshold_value.toFixed(1)}${alert.unit})`
}

function showAlertToast(alert: Alert, markAsRead: (id: string) => Promise<void>) {
  const link = getAlertLink(alert)
  const text = getAlertText(alert)
  toast.custom(
    (t) => (
      <div
        onClick={() => { toast.dismiss(t.id); markAsRead(alert.id); window.location.href = link }}
        style={{
          cursor: 'pointer',
          background: '#ef4444',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '8px',
          maxWidth: '320px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          opacity: t.visible ? 1 : 0,
          transition: 'opacity 0.2s',
          fontSize: '14px',
          lineHeight: '1.4',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 2 }}>New Alert</div>
        <div>{text}</div>
        <div style={{ fontSize: '11px', opacity: 0.8, marginTop: 4 }}>Click to view</div>
      </div>
    ),
    { duration: 8000 }
  )
}

type AlertsContextType = {
  alerts: Alert[]
  unreadCount: number
  isLoading: boolean
  refetch: () => Promise<void>
  markAsRead: (alertId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  acknowledgeAlert: (alertId: string) => Promise<void>
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined)

const POLL_INTERVAL_MS = 10000 // Poll every 10 seconds
const MAX_ALERTS_TO_FETCH = 50 // Fetch max 50 recent alerts

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const knownAlertIdsRef = useRef<Set<string>>(new Set())
  const isInitialFetchRef = useRef(true)

  // Fetch alerts from API
  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: MAX_ALERTS_TO_FETCH.toString(),
        offset: '0',
      })

      const res = await fetch(`/api/alerts?${params}`)

      if (!res.ok) {
        console.error('[AlertsContext] Failed to fetch alerts:', res.statusText)
        return
      }

      const data = await res.json()

      if (data.alerts) {
        // Show toast for new unread alerts (skip on first load — those are pre-existing)
        if (!isInitialFetchRef.current) {
          const newUnread = (data.alerts as Alert[]).filter(
            (a) => !a.is_read && !knownAlertIdsRef.current.has(a.id)
          )
          newUnread.forEach((a) => showAlertToast(a, markAsRead))
        }

        // Update known IDs and state
        knownAlertIdsRef.current = new Set((data.alerts as Alert[]).map((a) => a.id))
        isInitialFetchRef.current = false

        setAlerts(data.alerts)
        setUnreadCount(data.alerts.filter((a: Alert) => !a.is_read).length)
      }
    } catch (error) {
      console.error('[AlertsContext] Error fetching alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  // Set up polling
  useEffect(() => {
    pollIntervalRef.current = setInterval(() => {
      fetchAlerts()
    }, POLL_INTERVAL_MS)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [fetchAlerts])

  // Refetch when user switches back to this tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAlerts()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchAlerts])

  // Set up Supabase Realtime subscription for new alerts
  useEffect(() => {
    const supabase = createClient()

    // Get current user to subscribe to user-specific channel
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        console.log('[AlertsContext] No user, skipping realtime subscription')
        return
      }

      const channelName = `alerts:${user.id}`
      console.log('[AlertsContext] Subscribing to channel:', channelName)

      const channel = supabase
        .channel(channelName)
        .on('broadcast', { event: 'new_alert' }, (payload) => {
          console.log('[AlertsContext] Received new alert broadcast:', payload)
          const newAlert = payload.payload as Alert
          showAlertToast(newAlert, markAsRead)
          knownAlertIdsRef.current.add(newAlert.id)
          setAlerts((prev) => [newAlert, ...prev].slice(0, MAX_ALERTS_TO_FETCH))
          setUnreadCount((prev) => prev + 1)
        })
        .subscribe((status) => {
          console.log('[AlertsContext] Subscription status:', status)
        })

      // Cleanup on unmount
      return () => {
        console.log('[AlertsContext] Unsubscribing from channel:', channelName)
        supabase.removeChannel(channel)
      }
    })
  }, [])

  // Mark single alert as read
  const markAsRead = useCallback(async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      })

      if (!res.ok) {
        console.error('[AlertsContext] Failed to mark alert as read:', res.statusText)
        return
      }

      const updatedAlert = await res.json()

      // Update local state
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? updatedAlert : a))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('[AlertsContext] Error marking alert as read:', error)
    }
  }, [])

  // Mark all alerts as read
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadAlertIds = alerts.filter((a) => !a.is_read).map((a) => a.id)

      if (unreadAlertIds.length === 0) return

      const res = await fetch('/api/alerts/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_ids: unreadAlertIds }),
      })

      if (!res.ok) {
        console.error('[AlertsContext] Failed to mark all alerts as read:', res.statusText)
        return
      }

      // Update local state
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('[AlertsContext] Error marking all alerts as read:', error)
    }
  }, [alerts])

  // Acknowledge single alert
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_acknowledged: true, is_read: true }),
      })

      if (!res.ok) {
        console.error('[AlertsContext] Failed to acknowledge alert:', res.statusText)
        return
      }

      const updatedAlert = await res.json()

      // Update local state
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? updatedAlert : a))
      )
    } catch (error) {
      console.error('[AlertsContext] Error acknowledging alert:', error)
    }
  }, [])

  const value: AlertsContextType = {
    alerts,
    unreadCount,
    isLoading,
    refetch: fetchAlerts,
    markAsRead,
    markAllAsRead,
    acknowledgeAlert,
  }

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
}

export function useAlerts() {
  const context = useContext(AlertsContext)
  if (!context) {
    throw new Error('useAlerts must be used within AlertsProvider')
  }
  return context
}

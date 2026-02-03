'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { Alert } from '@/lib/generated/prisma'
import { createClient } from '@/lib/supabase/client'

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

const POLL_INTERVAL_MS = 30000 // Poll every 30 seconds
const MAX_ALERTS_TO_FETCH = 50 // Fetch max 50 recent alerts

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

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

          // Add new alert to the list
          const newAlert = payload.payload as Alert
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
        body: JSON.stringify({ is_acknowledged: true }),
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

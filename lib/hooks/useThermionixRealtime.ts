/**
 * useThermionixRealtime Hook
 *
 * Subscribes to real-time Thermionix measurement inserts from Supabase.
 * Automatically filters by device_id to only receive relevant updates.
 *
 * USAGE:
 * ```typescript
 * const { isConnected } = useThermionixRealtime({
 *   deviceId: 'L8_53_67',
 *   onNewMeasurement: (measurement) => {
 *     setMeasurements(prev => [measurement, ...prev])
 *   },
 *   enabled: !!selectedDevice
 * })
 * ```
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type ThermionixMeasurement = {
  datetime: string
  device_id: number
  probe_id: number
  temperature: number | null
  relative_humidity: number | null
  co2: number | null
}

type UseThermionixRealtimeProps = {
  deviceId: string | null
  onNewMeasurement: (measurement: ThermionixMeasurement) => void
  enabled?: boolean
}

export function useThermionixRealtime({
  deviceId,
  onNewMeasurement,
  enabled = true
}: UseThermionixRealtimeProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  // Memoize callback to prevent unnecessary re-subscriptions
  const handleNewMeasurement = useCallback(
    (payload: any) => {
      console.log('New Thermionix measurement:', payload.new)
      onNewMeasurement(payload.new as ThermionixMeasurement)
    },
    [onNewMeasurement]
  )

  useEffect(() => {
    // Don't subscribe if disabled or no device selected
    if (!enabled || !deviceId) {
      setIsConnected(false)
      return
    }

    const supabase = createClient()

    // Create unique channel name
    const channelName = `thermionix-${deviceId}`

    console.log(`Subscribing to Thermionix realtime for device: ${deviceId}`)

    // Subscribe to INSERT events for this device
    const newChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'thermionyx_measurements',
          filter: `device_id=eq.${deviceId}`
        },
        handleNewMeasurement
      )
      .subscribe((status) => {
        console.log(`Thermionix subscription status: ${status}`)

        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false)
        }
      })

    setChannel(newChannel)

    // Cleanup function
    return () => {
      console.log(`Unsubscribing from Thermionix realtime for device: ${deviceId}`)
      newChannel.unsubscribe()
      setIsConnected(false)
    }
  }, [deviceId, enabled, handleNewMeasurement])

  return { isConnected, channel }
}

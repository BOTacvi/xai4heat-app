/**
 * useWeatherLinkRealtime Hook
 *
 * Subscribes to real-time WeatherLink measurement inserts from Supabase.
 * No filtering needed as there's only one weather station.
 *
 * USAGE:
 * ```typescript
 * const { isConnected } = useWeatherLinkRealtime({
 *   onNewMeasurement: (measurement) => {
 *     setMeasurements(prev => [measurement, ...prev])
 *   },
 *   enabled: true
 * })
 * ```
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type WeatherLinkMeasurement = {
  datetime: string
  temp_out: number | null
  hum_out: number | null
  bar: number | null
  wind_speed: number | null
  rain_rate_mm: number | null
  dew_point: number | null
}

type UseWeatherLinkRealtimeProps = {
  onNewMeasurement: (measurement: WeatherLinkMeasurement) => void
  enabled?: boolean
}

export function useWeatherLinkRealtime({
  onNewMeasurement,
  enabled = true
}: UseWeatherLinkRealtimeProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  const handleNewMeasurement = useCallback(
    (payload: any) => {
      console.log('New WeatherLink measurement:', payload.new)
      onNewMeasurement(payload.new as WeatherLinkMeasurement)
    },
    [onNewMeasurement]
  )

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false)
      return
    }

    const supabase = createClient()
    const channelName = 'weatherlink-all'

    console.log('Subscribing to WeatherLink realtime')

    // No filter needed - only one weather station
    const newChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'weatherlink_measurements'
        },
        handleNewMeasurement
      )
      .subscribe((status) => {
        console.log(`WeatherLink subscription status: ${status}`)

        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false)
        }
      })

    setChannel(newChannel)

    return () => {
      console.log('Unsubscribing from WeatherLink realtime')
      newChannel.unsubscribe()
      setIsConnected(false)
    }
  }, [enabled, handleNewMeasurement])

  return { isConnected, channel }
}

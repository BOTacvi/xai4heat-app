/**
 * useSCADARealtime Hook
 *
 * Subscribes to real-time SCADA measurement inserts from Supabase.
 * Automatically filters by lamela to only receive relevant updates.
 *
 * USAGE:
 * ```typescript
 * const { isConnected } = useSCADARealtime({
 *   lamela: 'L8',
 *   onNewMeasurement: (measurement) => {
 *     setMeasurements(prev => [measurement, ...prev])
 *   },
 *   enabled: !!selectedLamela
 * })
 * ```
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type SCADAMeasurement = {
  datetime: string
  location: string
  t_amb: number | null
  t_ref: number | null
  t_sup_prim: number | null
  t_ret_prim: number | null
  t_sup_sec: number | null
  t_ret_sec: number | null
  e: number | null
  pe: number | null
}

type UseSCADARealtimeProps = {
  lamela: string | null
  onNewMeasurement: (measurement: SCADAMeasurement) => void
  enabled?: boolean
}

export function useSCADARealtime({
  lamela,
  onNewMeasurement,
  enabled = true
}: UseSCADARealtimeProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  const handleNewMeasurement = useCallback(
    (payload: any) => {
      console.log('New SCADA measurement:', payload.new)
      onNewMeasurement(payload.new as SCADAMeasurement)
    },
    [onNewMeasurement]
  )

  useEffect(() => {
    if (!enabled || !lamela) {
      setIsConnected(false)
      return
    }

    const supabase = createClient()
    const channelName = `scada-${lamela}`

    console.log(`Subscribing to SCADA realtime for lamela: ${lamela}`)

    // Note: SCADA table has 'location' field that contains lamela identifier
    // Filter using location contains the lamela string
    const newChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scada_measurements',
          // Filter by location containing the lamela identifier
          filter: `location=ilike.%${lamela}%`
        },
        handleNewMeasurement
      )
      .subscribe((status) => {
        console.log(`SCADA subscription status: ${status}`)

        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false)
        }
      })

    setChannel(newChannel)

    return () => {
      console.log(`Unsubscribing from SCADA realtime for lamela: ${lamela}`)
      newChannel.unsubscribe()
      setIsConnected(false)
    }
  }, [lamela, enabled, handleNewMeasurement])

  return { isConnected, channel }
}

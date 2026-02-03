/**
 * Alert Detection Utility
 *
 * PURPOSE:
 * - Detect when measurements violate user-defined thresholds
 * - Create alerts in database with duplicate prevention
 * - Broadcast alerts to users via Supabase Realtime
 *
 * WORKFLOW:
 * 1. Background worker fetches new measurement
 * 2. Calls checkThermionixMeasurement() or checkScadaMeasurement()
 * 3. Function checks if value violates thresholds
 * 4. If violation, calls createAndBroadcastAlert()
 * 5. Alert saved to DB and broadcast to user's channel
 * 6. User's frontend receives alert via Supabase subscription
 *
 * DUPLICATE PREVENTION:
 * - Checks for existing alerts within 30-minute window
 * - Same alert_type + source + device_id/location + user_id
 * - If duplicate exists, updates it instead of creating new
 * - Prevents alert spam for persistent violations
 */

import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import type { Alert, AlertType, AlertSource, AlertSeverity } from '@/lib/generated/prisma'

/**
 * Create Supabase server client for broadcasting
 * IMPORTANT: Uses SERVICE_ROLE_KEY for server-side operations
 * - Can bypass RLS policies
 * - Required for broadcasting to channels
 * - Never expose this key to client-side code
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials for alert broadcasting')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Calculate Alert Severity Based on Deviation Percentage
 *
 * LOGIC:
 * - Measures how far the value is from the threshold
 * - Larger deviation = higher severity
 * - Helps prioritize which alerts need immediate attention
 *
 * CALCULATION:
 * deviation = |measured_value - threshold_value| / threshold_value * 100
 *
 * SEVERITY LEVELS:
 * - HIGH: deviation > 20% (critical, needs immediate action)
 * - MEDIUM: deviation > 10% (notable, should be reviewed)
 * - LOW: deviation <= 10% (minor, informational)
 *
 * EXAMPLES:
 * - Temp: 30°C, threshold: 24°C → deviation = 25% → HIGH
 * - Temp: 26°C, threshold: 24°C → deviation = 8.3% → LOW
 */
export function calculateSeverity(
  measuredValue: number,
  thresholdValue: number
): AlertSeverity {
  // Avoid division by zero
  if (thresholdValue === 0) return 'MEDIUM'

  const deviation = Math.abs(measuredValue - thresholdValue) / Math.abs(thresholdValue) * 100

  if (deviation > 20) return 'HIGH'
  if (deviation > 10) return 'MEDIUM'
  return 'LOW'
}

/**
 * Broadcast Alert via Supabase Realtime
 *
 * CHANNEL NAMING:
 * - alerts:${userId} - User-specific channel
 * - Frontend subscribes to this channel to receive notifications
 *
 * EVENT:
 * - 'new_alert' - Triggers notification badge update
 *
 * PAYLOAD:
 * - Full alert object with all fields
 * - Frontend can immediately display the alert
 *
 * ERROR HANDLING:
 * - Logs errors but doesn't throw
 * - Alert is already saved to DB, broadcast failure is non-critical
 */
async function broadcastAlert(alert: Alert): Promise<void> {
  try {
    const channel = supabaseAdmin.channel(`alerts:${alert.user_id}`)

    await channel.send({
      type: 'broadcast',
      event: 'new_alert',
      payload: alert,
    })

    console.log(`[Alert] Broadcast to channel alerts:${alert.user_id}:`, {
      type: alert.alert_type,
      source: alert.source,
      severity: alert.severity,
    })
  } catch (error) {
    console.error('[Alert] Failed to broadcast alert:', error)
    // Don't throw - alert is saved, broadcast failure is non-critical
  }
}

/**
 * Create Alert and Broadcast via Realtime
 *
 * DUPLICATE PREVENTION:
 * - Checks for existing alert within 30-minute window
 * - Matching: alert_type + source + device_id/location + user_id
 * - If found: updates existing alert (measurement_time, measured_value)
 * - If not found: creates new alert
 *
 * WHY 30 MINUTES?
 * - Balance between spam prevention and alerting responsiveness
 * - Persistent violations update existing alert
 * - New violations after 30min create separate alert
 *
 * BROADCASTING:
 * - Always broadcasts after create/update
 * - Frontend receives real-time notification
 * - User sees badge count update immediately
 */
export async function createAndBroadcastAlert(params: {
  alert_type: AlertType
  source: AlertSource
  device_id?: string
  location?: string
  apartment_name?: string
  measured_value: number
  threshold_value: number
  measurement_time: Date
  unit: string
  severity: AlertSeverity
  user_id: string
}): Promise<Alert | null> {
  try {
    // STEP 1: Check for duplicate alerts within 30-minute window
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

    const existingAlert = await prisma.alert.findFirst({
      where: {
        alert_type: params.alert_type,
        source: params.source,
        device_id: params.device_id || null,
        location: params.location || null,
        user_id: params.user_id,
        created_at: {
          gte: thirtyMinutesAgo,
        },
        resolved_at: null, // Only consider unresolved alerts
      },
      orderBy: {
        created_at: 'desc',
      },
    })

    let alert: Alert

    if (existingAlert) {
      // STEP 2a: Update existing alert (persistent violation)
      console.log('[Alert] Updating existing alert:', existingAlert.id)

      alert = await prisma.alert.update({
        where: { id: existingAlert.id },
        data: {
          measured_value: params.measured_value,
          threshold_value: params.threshold_value,
          measurement_time: params.measurement_time,
          severity: params.severity,
          updated_at: new Date(),
        },
      })
    } else {
      // STEP 2b: Create new alert
      console.log('[Alert] Creating new alert:', {
        type: params.alert_type,
        source: params.source,
        device: params.device_id || params.location,
      })

      alert = await prisma.alert.create({
        data: {
          alert_type: params.alert_type,
          source: params.source,
          device_id: params.device_id,
          location: params.location,
          apartment_name: params.apartment_name,
          measured_value: params.measured_value,
          threshold_value: params.threshold_value,
          measurement_time: params.measurement_time,
          unit: params.unit,
          severity: params.severity,
          user_id: params.user_id,
          is_read: false,
          is_acknowledged: false,
        },
      })
    }

    // STEP 3: Broadcast alert via Supabase Realtime
    await broadcastAlert(alert)

    return alert
  } catch (error) {
    console.error('[Alert] Failed to create/broadcast alert:', error)
    // Don't throw - alerts shouldn't break main measurement flow
    return null
  }
}

/**
 * Check Thermionix Measurement for Threshold Violations
 *
 * CHECKS:
 * 1. Temperature vs expected_temp_min/max
 * 2. Humidity vs expected_pressure_min/max (reused for humidity)
 * 3. CO2 vs expected_co2_min/max
 *
 * CREATES ALERTS FOR:
 * - TEMP_HIGH: temperature > expected_temp_max
 * - TEMP_LOW: temperature < expected_temp_min
 * - HUMIDITY_HIGH: humidity > expected_pressure_max
 * - HUMIDITY_LOW: humidity < expected_pressure_min
 * - CO2_HIGH: co2 > expected_co2_max
 * - CO2_LOW: co2 < expected_co2_min
 *
 * PARAMETERS:
 * @param measurement - Thermionix measurement with datetime, device_id, temperature, relative_humidity, co2
 * @param device - Device info with device_id and name (e.g., "L8_33_67")
 * @param thresholds - User settings with expected ranges
 */
export async function checkThermionixMeasurement(
  measurement: {
    datetime: Date | string
    device_id: number
    temperature: number | null
    relative_humidity: number | null
    co2: number | null
  },
  device: {
    device_id: string
    name: string | null
  },
  thresholds: {
    user_id: string
    expected_temp_min: number
    expected_temp_max: number
    expected_pressure_min: number // Used for humidity
    expected_pressure_max: number // Used for humidity
    expected_co2_min: number
    expected_co2_max: number
  }
): Promise<void> {
  const measurementTime = typeof measurement.datetime === 'string'
    ? new Date(measurement.datetime)
    : measurement.datetime

  // Check Temperature
  if (measurement.temperature !== null) {
    // Temperature too high
    if (measurement.temperature > thresholds.expected_temp_max) {
      const severity = calculateSeverity(measurement.temperature, thresholds.expected_temp_max)

      await createAndBroadcastAlert({
        alert_type: 'TEMP_HIGH',
        source: 'THERMIONIX',
        device_id: device.device_id,
        apartment_name: device.name || undefined,
        measured_value: measurement.temperature,
        threshold_value: thresholds.expected_temp_max,
        measurement_time: measurementTime,
        unit: '°C',
        severity,
        user_id: thresholds.user_id,
      })
    }

    // Temperature too low
    if (measurement.temperature < thresholds.expected_temp_min) {
      const severity = calculateSeverity(measurement.temperature, thresholds.expected_temp_min)

      await createAndBroadcastAlert({
        alert_type: 'TEMP_LOW',
        source: 'THERMIONIX',
        device_id: device.device_id,
        apartment_name: device.name || undefined,
        measured_value: measurement.temperature,
        threshold_value: thresholds.expected_temp_min,
        measurement_time: measurementTime,
        unit: '°C',
        severity,
        user_id: thresholds.user_id,
      })
    }
  }

  // Check Humidity (using pressure thresholds - they're reused for humidity)
  if (measurement.relative_humidity !== null) {
    // Humidity too high
    if (measurement.relative_humidity > thresholds.expected_pressure_max) {
      const severity = calculateSeverity(measurement.relative_humidity, thresholds.expected_pressure_max)

      await createAndBroadcastAlert({
        alert_type: 'HUMIDITY_HIGH',
        source: 'THERMIONIX',
        device_id: device.device_id,
        apartment_name: device.name || undefined,
        measured_value: measurement.relative_humidity,
        threshold_value: thresholds.expected_pressure_max,
        measurement_time: measurementTime,
        unit: '%',
        severity,
        user_id: thresholds.user_id,
      })
    }

    // Humidity too low
    if (measurement.relative_humidity < thresholds.expected_pressure_min) {
      const severity = calculateSeverity(measurement.relative_humidity, thresholds.expected_pressure_min)

      await createAndBroadcastAlert({
        alert_type: 'HUMIDITY_LOW',
        source: 'THERMIONIX',
        device_id: device.device_id,
        apartment_name: device.name || undefined,
        measured_value: measurement.relative_humidity,
        threshold_value: thresholds.expected_pressure_min,
        measurement_time: measurementTime,
        unit: '%',
        severity,
        user_id: thresholds.user_id,
      })
    }
  }

  // Check CO2
  if (measurement.co2 !== null) {
    // CO2 too high
    if (measurement.co2 > thresholds.expected_co2_max) {
      const severity = calculateSeverity(measurement.co2, thresholds.expected_co2_max)

      await createAndBroadcastAlert({
        alert_type: 'CO2_HIGH',
        source: 'THERMIONIX',
        device_id: device.device_id,
        apartment_name: device.name || undefined,
        measured_value: measurement.co2,
        threshold_value: thresholds.expected_co2_max,
        measurement_time: measurementTime,
        unit: 'ppm',
        severity,
        user_id: thresholds.user_id,
      })
    }

    // CO2 too low
    if (measurement.co2 < thresholds.expected_co2_min) {
      const severity = calculateSeverity(measurement.co2, thresholds.expected_co2_min)

      await createAndBroadcastAlert({
        alert_type: 'CO2_LOW',
        source: 'THERMIONIX',
        device_id: device.device_id,
        apartment_name: device.name || undefined,
        measured_value: measurement.co2,
        threshold_value: thresholds.expected_co2_min,
        measurement_time: measurementTime,
        unit: 'ppm',
        severity,
        user_id: thresholds.user_id,
      })
    }
  }
}

/**
 * Check SCADA Measurement for Threshold Violations
 *
 * CHECKS:
 * 1. t_amb (ambient temperature) vs expected_temp_min/max
 * 2. e (pressure) vs expected_pressure_min/max
 *
 * CREATES ALERTS FOR:
 * - TEMP_HIGH: t_amb > expected_temp_max
 * - TEMP_LOW: t_amb < expected_temp_min
 * - PRESSURE_HIGH: e > expected_pressure_max
 * - PRESSURE_LOW: e < expected_pressure_min
 *
 * PARAMETERS:
 * @param measurement - SCADA measurement with datetime, location, t_amb, e
 * @param thresholds - User settings with expected ranges
 */
export async function checkScadaMeasurement(
  measurement: {
    datetime: Date | string
    location: string
    t_amb: number | null
    e: number | null
  },
  thresholds: {
    user_id: string
    expected_temp_min: number
    expected_temp_max: number
    expected_pressure_min: number
    expected_pressure_max: number
  }
): Promise<void> {
  const measurementTime = typeof measurement.datetime === 'string'
    ? new Date(measurement.datetime)
    : measurement.datetime

  // Check Ambient Temperature
  if (measurement.t_amb !== null) {
    // Temperature too high
    if (measurement.t_amb > thresholds.expected_temp_max) {
      const severity = calculateSeverity(measurement.t_amb, thresholds.expected_temp_max)

      await createAndBroadcastAlert({
        alert_type: 'TEMP_HIGH',
        source: 'SCADA',
        location: measurement.location,
        measured_value: measurement.t_amb,
        threshold_value: thresholds.expected_temp_max,
        measurement_time: measurementTime,
        unit: '°C',
        severity,
        user_id: thresholds.user_id,
      })
    }

    // Temperature too low
    if (measurement.t_amb < thresholds.expected_temp_min) {
      const severity = calculateSeverity(measurement.t_amb, thresholds.expected_temp_min)

      await createAndBroadcastAlert({
        alert_type: 'TEMP_LOW',
        source: 'SCADA',
        location: measurement.location,
        measured_value: measurement.t_amb,
        threshold_value: thresholds.expected_temp_min,
        measurement_time: measurementTime,
        unit: '°C',
        severity,
        user_id: thresholds.user_id,
      })
    }
  }

  // Check Pressure
  if (measurement.e !== null) {
    // Pressure too high
    if (measurement.e > thresholds.expected_pressure_max) {
      const severity = calculateSeverity(measurement.e, thresholds.expected_pressure_max)

      await createAndBroadcastAlert({
        alert_type: 'PRESSURE_HIGH',
        source: 'SCADA',
        location: measurement.location,
        measured_value: measurement.e,
        threshold_value: thresholds.expected_pressure_max,
        measurement_time: measurementTime,
        unit: 'bar',
        severity,
        user_id: thresholds.user_id,
      })
    }

    // Pressure too low
    if (measurement.e < thresholds.expected_pressure_min) {
      const severity = calculateSeverity(measurement.e, thresholds.expected_pressure_min)

      await createAndBroadcastAlert({
        alert_type: 'PRESSURE_LOW',
        source: 'SCADA',
        location: measurement.location,
        measured_value: measurement.e,
        threshold_value: thresholds.expected_pressure_min,
        measurement_time: measurementTime,
        unit: 'bar',
        severity,
        user_id: thresholds.user_id,
      })
    }
  }
}

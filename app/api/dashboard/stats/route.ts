/**
 * Dashboard Stats API Route
 *
 * Returns summary statistics for the dashboard cards:
 * - Thermionix: avg temp, humidity, CO2 + unacknowledged alert count
 * - SCADA: avg ambient temp, pressure + unacknowledged alert count
 * - WeatherLink: current outdoor temp, humidity + unacknowledged alert count
 *
 * GET /api/dashboard/stats
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all data in parallel for efficiency
    const [
      thermionixStats,
      scadaStats,
      weatherlinkStats,
      alertCounts,
    ] = await Promise.all([
      // Thermionix: Get latest measurements and calculate averages
      getThermionixStats(),
      // SCADA: Get latest measurements
      getScadaStats(),
      // WeatherLink: Get latest measurement
      getWeatherlinkStats(),
      // Alert counts by source (unacknowledged only)
      getAlertCountsBySource(user.id),
    ])

    return NextResponse.json({
      thermionix: {
        ...thermionixStats,
        alertCount: alertCounts.THERMIONIX || 0,
      },
      scada: {
        ...scadaStats,
        alertCount: alertCounts.SCADA || 0,
      },
      weatherlink: {
        ...weatherlinkStats,
        alertCount: alertCounts.WEATHERLINK || 0,
      },
    })
  } catch (error) {
    console.error('[Dashboard Stats] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}

async function getThermionixStats() {
  // Get measurements from last 24 hours for averages
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const measurements = await prisma.thermionyx_measurements.findMany({
    where: {
      datetime: { gte: oneDayAgo },
    },
    orderBy: { datetime: 'desc' },
    take: 1000, // Limit for performance
  })

  if (measurements.length === 0) {
    return {
      avgTemp: null,
      avgHumidity: null,
      avgCO2: null,
      deviceCount: 0,
    }
  }

  // Calculate averages (ignoring nulls)
  const temps = measurements.filter(m => m.temperature !== null).map(m => m.temperature!)
  const humidities = measurements.filter(m => m.relative_humidity !== null).map(m => m.relative_humidity!)
  const co2s = measurements.filter(m => m.co2 !== null).map(m => m.co2!)

  const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null
  const avgHumidity = humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : null
  const avgCO2 = co2s.length > 0 ? co2s.reduce((a, b) => a + b, 0) / co2s.length : null

  // Count unique devices
  const uniqueDevices = new Set(measurements.map(m => m.device_id))

  return {
    avgTemp: avgTemp !== null ? Math.round(avgTemp * 10) / 10 : null,
    avgHumidity: avgHumidity !== null ? Math.round(avgHumidity) : null,
    avgCO2: avgCO2 !== null ? Math.round(avgCO2) : null,
    deviceCount: uniqueDevices.size,
  }
}

async function getScadaStats() {
  // Get latest measurement per location
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const measurements = await prisma.scada_measurements.findMany({
    where: {
      datetime: { gte: oneDayAgo },
    },
    orderBy: { datetime: 'desc' },
    take: 500,
  })

  if (measurements.length === 0) {
    return {
      avgAmbientTemp: null,
      avgPressure: null,
      locationCount: 0,
    }
  }

  // Calculate averages
  const ambientTemps = measurements.filter(m => m.t_amb !== null).map(m => m.t_amb!)
  const pressures = measurements.filter(m => m.e !== null).map(m => m.e!)

  const avgAmbientTemp = ambientTemps.length > 0
    ? ambientTemps.reduce((a, b) => a + b, 0) / ambientTemps.length
    : null
  const avgPressure = pressures.length > 0
    ? pressures.reduce((a, b) => a + b, 0) / pressures.length
    : null

  // Count unique locations
  const uniqueLocations = new Set(measurements.map(m => m.location))

  return {
    avgAmbientTemp: avgAmbientTemp !== null ? Math.round(avgAmbientTemp * 10) / 10 : null,
    avgPressure: avgPressure !== null ? Math.round(avgPressure * 100) / 100 : null,
    locationCount: uniqueLocations.size,
  }
}

async function getWeatherlinkStats() {
  // Get most recent measurement
  const latestMeasurement = await prisma.weatherlink_measurements.findFirst({
    orderBy: { datetime: 'desc' },
  })

  if (!latestMeasurement) {
    return {
      tempOut: null,
      humOut: null,
      windSpeed: null,
    }
  }

  return {
    tempOut: latestMeasurement.temp_out !== null
      ? Math.round(latestMeasurement.temp_out * 10) / 10
      : null,
    humOut: latestMeasurement.hum_out,
    windSpeed: latestMeasurement.wind_speed !== null
      ? Math.round(latestMeasurement.wind_speed * 10) / 10
      : null,
  }
}

async function getAlertCountsBySource(userId: string) {
  // Count unacknowledged alerts grouped by source
  const alerts = await prisma.alert.groupBy({
    by: ['source'],
    where: {
      user_id: userId,
      is_acknowledged: false,
    },
    _count: {
      id: true,
    },
  })

  // Convert to object { THERMIONIX: 3, SCADA: 1, ... }
  const counts: Record<string, number> = {}
  for (const alert of alerts) {
    counts[alert.source] = alert._count.id
  }

  return counts
}

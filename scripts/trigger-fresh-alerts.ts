/**
 * Trigger Fresh Alerts Script
 *
 * This script:
 * 1. Deletes recent alerts to avoid the 30-minute duplicate prevention
 * 2. Inserts actual measurements into the database
 * 3. Triggers alert detection to create NEW alerts
 * 4. Broadcasts the new alerts via Supabase Realtime
 *
 * Usage: npx tsx scripts/trigger-fresh-alerts.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { prisma } from '../lib/prisma'
import { checkThermionixMeasurement } from '../lib/utils/alertDetection'

async function triggerFreshAlerts() {
  console.log('🔔 Triggering FRESH alerts...\n')

  try {
    // STEP 1: Get user settings
    const userSettings = await prisma.userSettings.findFirst({
      orderBy: { updated_at: 'desc' },
    })

    if (!userSettings) {
      console.error('❌ No user settings found.')
      return
    }

    console.log('📋 Thresholds:')
    console.log(`   Temperature: ${userSettings.expected_temp_min}°C - ${userSettings.expected_temp_max}°C`)
    console.log(`   CO2: ${userSettings.expected_co2_min} - ${userSettings.expected_co2_max} ppm\n`)

    // STEP 2: Get a device
    const device = await prisma.device.findFirst()
    if (!device) {
      console.error('❌ No devices found.')
      return
    }

    console.log(`📱 Device: ${device.name || device.device_id}\n`)

    // STEP 3: Delete recent alerts for this device to avoid duplicate prevention
    console.log('🗑️  Deleting recent alerts for this device...')
    const deleted = await prisma.alert.deleteMany({
      where: {
        device_id: device.device_id,
        user_id: userSettings.user_id,
        created_at: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    })
    console.log(`   Deleted ${deleted.count} recent alerts\n`)

    const deviceIdNum = parseInt(device.device_id, 10)
    const now = new Date()

    // STEP 4: Insert measurement and create alert for HIGH TEMPERATURE
    console.log('🌡️  Creating HIGH TEMPERATURE alert...')
    const highTemp = userSettings.expected_temp_max + 8 // Well above threshold

    const tempMeasurement = await prisma.thermionyx_measurements.create({
      data: {
        datetime: now,
        device_id: deviceIdNum,
        probe_id: 1,
        temperature: highTemp,
        relative_humidity: 45,
        co2: 500,
      },
    })

    await checkThermionixMeasurement(
      {
        datetime: tempMeasurement.datetime,
        device_id: tempMeasurement.device_id,
        temperature: tempMeasurement.temperature,
        relative_humidity: tempMeasurement.relative_humidity,
        co2: tempMeasurement.co2,
      },
      { device_id: device.device_id, name: device.name },
      {
        user_id: userSettings.user_id,
        expected_temp_min: userSettings.expected_temp_min,
        expected_temp_max: userSettings.expected_temp_max,
        expected_humidity_min: userSettings.expected_humidity_min,
        expected_humidity_max: userSettings.expected_humidity_max,
        expected_co2_min: userSettings.expected_co2_min,
        expected_co2_max: userSettings.expected_co2_max,
      }
    )
    console.log(`   ✅ Temperature: ${highTemp}°C (threshold: ${userSettings.expected_temp_max}°C)`)
    console.log(`   🔔 NEW alert created and broadcast!\n`)

    // Wait a bit to ensure separate alerts
    await new Promise(resolve => setTimeout(resolve, 500))

    // STEP 5: Insert measurement and create alert for HIGH CO2
    console.log('💨 Creating HIGH CO2 alert...')
    const highCO2 = userSettings.expected_co2_max + 800

    const co2Measurement = await prisma.thermionyx_measurements.create({
      data: {
        datetime: new Date(now.getTime() + 1000),
        device_id: deviceIdNum,
        probe_id: 1,
        temperature: 24,
        relative_humidity: 45,
        co2: highCO2,
      },
    })

    await checkThermionixMeasurement(
      {
        datetime: co2Measurement.datetime,
        device_id: co2Measurement.device_id,
        temperature: co2Measurement.temperature,
        relative_humidity: co2Measurement.relative_humidity,
        co2: co2Measurement.co2,
      },
      { device_id: device.device_id, name: device.name },
      {
        user_id: userSettings.user_id,
        expected_temp_min: userSettings.expected_temp_min,
        expected_temp_max: userSettings.expected_temp_max,
        expected_humidity_min: userSettings.expected_humidity_min,
        expected_humidity_max: userSettings.expected_humidity_max,
        expected_co2_min: userSettings.expected_co2_min,
        expected_co2_max: userSettings.expected_co2_max,
      }
    )
    console.log(`   ✅ CO2: ${highCO2} ppm (threshold: ${userSettings.expected_co2_max} ppm)`)
    console.log(`   🔔 NEW alert created and broadcast!\n`)

    console.log('✨ Done! Check your notifications page.')
    console.log('   If the page is open, alerts should appear in real-time.')
    console.log('   If not, refresh the page to see them.')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

triggerFreshAlerts()

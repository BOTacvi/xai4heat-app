/**
 * Update and Trigger Alert Script
 *
 * This script:
 * 1. Finds an existing measurement
 * 2. Updates it with values that exceed thresholds
 * 3. Triggers alert detection
 *
 * Usage: npx tsx scripts/update-and-trigger-alert.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { prisma } from '../lib/prisma'
import { checkThermionixMeasurement } from '../lib/utils/alertDetection'

async function updateAndTriggerAlert() {
  console.log('🔔 Updating measurement and triggering alert...\n')

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

    // STEP 3: Find the most recent measurement for this device
    const deviceIdNum = parseInt(device.device_id, 10)
    const existingMeasurement = await prisma.thermionyx_measurements.findFirst({
      where: { device_id: deviceIdNum },
      orderBy: { datetime: 'desc' },
    })

    if (!existingMeasurement) {
      console.error('❌ No existing measurements found.')
      return
    }

    console.log(`📊 Found measurement:`)
    console.log(`   Device: ${existingMeasurement.device_id}, Probe: ${existingMeasurement.probe_id}`)
    console.log(`   Datetime: ${existingMeasurement.datetime}`)
    console.log(`   Current temp: ${existingMeasurement.temperature}°C`)
    console.log(`   Current CO2: ${existingMeasurement.co2} ppm\n`)

    // STEP 4: Update the measurement with HIGH temperature
    const highTemp = userSettings.expected_temp_max + 10 // 10 degrees above max

    console.log('🌡️  Updating measurement with HIGH TEMPERATURE...')
    const updated = await prisma.thermionyx_measurements.update({
      where: {
        datetime_device_id_probe_id: {
          datetime: existingMeasurement.datetime,
          device_id: existingMeasurement.device_id,
          probe_id: existingMeasurement.probe_id,
        },
      },
      data: {
        temperature: highTemp,
      },
    })

    console.log(`   ✅ Updated: Temperature now ${updated.temperature}°C (threshold: ${userSettings.expected_temp_max}°C)\n`)

    // STEP 5: Trigger alert detection
    console.log('🔔 Triggering alert detection...')
    await checkThermionixMeasurement(
      {
        datetime: updated.datetime,
        device_id: updated.device_id,
        temperature: updated.temperature,
        relative_humidity: updated.relative_humidity,
        co2: updated.co2,
      },
      { device_id: device.device_id, name: device.name },
      {
        user_id: userSettings.user_id,
        expected_temp_min: userSettings.expected_temp_min,
        expected_temp_max: userSettings.expected_temp_max,
        expected_pressure_min: userSettings.expected_pressure_min,
        expected_pressure_max: userSettings.expected_pressure_max,
        expected_co2_min: userSettings.expected_co2_min,
        expected_co2_max: userSettings.expected_co2_max,
      }
    )

    console.log('   ✅ Alert detection triggered!\n')
    console.log('✨ Done! Check your notifications page.')
    console.log('   If real-time is working, the alert should appear automatically.')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateAndTriggerAlert()

/**
 * Trigger Real Alerts Script
 *
 * This script creates REAL alerts by:
 * 1. Inserting actual measurements into the thermionyx_measurements table
 * 2. Triggering alert detection for those measurements
 *
 * This way, when you click on the notification, you'll see the actual data on the page.
 *
 * Usage: npx tsx scripts/trigger-real-alerts.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { prisma } from '../lib/prisma'
import { checkThermionixMeasurement } from '../lib/utils/alertDetection'

async function triggerRealAlerts() {
  console.log('🔔 Triggering real alerts with actual measurements...\n')

  try {
    // STEP 1: Get user settings to know the thresholds
    const userSettings = await prisma.userSettings.findFirst({
      orderBy: { updated_at: 'desc' },
    })

    if (!userSettings) {
      console.error('❌ No user settings found. Please configure settings first.')
      return
    }

    console.log('📋 Current thresholds:')
    console.log(`   Temperature: ${userSettings.expected_temp_min}°C - ${userSettings.expected_temp_max}°C`)
    console.log(`   CO2: ${userSettings.expected_co2_min} - ${userSettings.expected_co2_max} ppm`)
    console.log('')

    // STEP 2: Get a device to use for the test
    const device = await prisma.device.findFirst()

    if (!device) {
      console.error('❌ No devices found. Please add devices first.')
      return
    }

    console.log(`📱 Using device: ${device.name || device.device_id} (ID: ${device.device_id})\n`)

    const deviceIdNum = parseInt(device.device_id, 10)
    const now = new Date()

    // STEP 3: Insert REAL measurements that exceed thresholds

    // Test 1: Temperature too HIGH
    console.log('🌡️  Inserting HIGH TEMPERATURE measurement...')
    const highTemp = userSettings.expected_temp_max + 5 // 5 degrees above max

    const tempMeasurement = await prisma.thermionyx_measurements.create({
      data: {
        datetime: now,
        device_id: deviceIdNum,
        probe_id: 1,
        temperature: highTemp,
        relative_humidity: 50, // normal
        co2: 600, // normal
      },
    })
    console.log(`   ✅ Inserted measurement for device ${tempMeasurement.device_id}`)
    console.log(`   📊 Temperature: ${highTemp}°C (threshold: ${userSettings.expected_temp_max}°C)`)

    // Trigger alert detection
    await checkThermionixMeasurement(
      {
        datetime: tempMeasurement.datetime,
        device_id: tempMeasurement.device_id,
        temperature: tempMeasurement.temperature,
        relative_humidity: tempMeasurement.relative_humidity,
        co2: tempMeasurement.co2,
      },
      {
        device_id: device.device_id,
        name: device.name,
      },
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
    console.log(`   🔔 Alert created!\n`)

    // Test 2: CO2 too HIGH
    console.log('💨 Inserting HIGH CO2 measurement...')
    const highCO2 = userSettings.expected_co2_max + 500 // 500 ppm above max

    const co2Measurement = await prisma.thermionyx_measurements.create({
      data: {
        datetime: new Date(now.getTime() + 1000), // 1 second later
        device_id: deviceIdNum,
        probe_id: 1,
        temperature: 23, // normal
        relative_humidity: 50, // normal
        co2: highCO2,
      },
    })
    console.log(`   ✅ Inserted measurement for device ${co2Measurement.device_id}`)
    console.log(`   📊 CO2: ${highCO2} ppm (threshold: ${userSettings.expected_co2_max} ppm)`)

    // Trigger alert detection
    await checkThermionixMeasurement(
      {
        datetime: co2Measurement.datetime,
        device_id: co2Measurement.device_id,
        temperature: co2Measurement.temperature,
        relative_humidity: co2Measurement.relative_humidity,
        co2: co2Measurement.co2,
      },
      {
        device_id: device.device_id,
        name: device.name,
      },
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
    console.log(`   🔔 Alert created!\n`)

    // Test 3: Temperature too LOW
    console.log('❄️  Inserting LOW TEMPERATURE measurement...')
    const lowTemp = userSettings.expected_temp_min - 5 // 5 degrees below min

    const lowTempMeasurement = await prisma.thermionyx_measurements.create({
      data: {
        datetime: new Date(now.getTime() + 2000), // 2 seconds later
        device_id: deviceIdNum,
        probe_id: 1,
        temperature: lowTemp,
        relative_humidity: 50, // normal
        co2: 600, // normal
      },
    })
    console.log(`   ✅ Inserted measurement for device ${lowTempMeasurement.device_id}`)
    console.log(`   📊 Temperature: ${lowTemp}°C (threshold: ${userSettings.expected_temp_min}°C)`)

    // Trigger alert detection
    await checkThermionixMeasurement(
      {
        datetime: lowTempMeasurement.datetime,
        device_id: lowTempMeasurement.device_id,
        temperature: lowTempMeasurement.temperature,
        relative_humidity: lowTempMeasurement.relative_humidity,
        co2: lowTempMeasurement.co2,
      },
      {
        device_id: device.device_id,
        name: device.name,
      },
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
    console.log(`   🔔 Alert created!\n`)

    console.log('✨ Done! Real measurements have been inserted.')
    console.log('   When you click on the notifications, you should now see the data on the charts.')
    console.log(`   Device: ${device.name || device.device_id}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

triggerRealAlerts()

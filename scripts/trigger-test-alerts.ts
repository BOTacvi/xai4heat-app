/**
 * Trigger Test Alerts Script
 *
 * This script creates REAL alerts by posting measurements that exceed thresholds.
 * It calls the actual API routes, so alerts go through the full flow:
 * 1. Measurement saved to DB
 * 2. Alert detection triggered
 * 3. Alert created in DB
 * 4. Alert broadcast via Supabase Realtime
 *
 * Usage: npx ts-node scripts/trigger-test-alerts.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { prisma } from '../lib/prisma'
import { checkThermionixMeasurement, checkScadaMeasurement } from '../lib/utils/alertDetection'

async function triggerTestAlerts() {
  console.log('🔔 Triggering test alerts...\n')

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
    console.log(`   Humidity: ${userSettings.expected_pressure_min}% - ${userSettings.expected_pressure_max}%`)
    console.log(`   CO2: ${userSettings.expected_co2_min} - ${userSettings.expected_co2_max} ppm`)
    console.log('')

    // STEP 2: Get a device to use for the test
    const device = await prisma.device.findFirst()

    if (!device) {
      console.error('❌ No devices found. Please add devices first.')
      return
    }

    console.log(`📱 Using device: ${device.name || device.device_id}\n`)

    // STEP 3: Create measurements that EXCEED thresholds to trigger alerts
    const now = new Date()

    // Test 1: Temperature too HIGH
    console.log('🌡️  Testing TEMP_HIGH alert...')
    const highTemp = userSettings.expected_temp_max + 5 // 5 degrees above max
    await checkThermionixMeasurement(
      {
        datetime: now,
        device_id: parseInt(device.device_id),
        temperature: highTemp,
        relative_humidity: 50, // normal
        co2: 600, // normal
      },
      {
        device_id: device.device_id,
        name: device.name,
      },
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
    console.log(`   ✅ Created alert: Temperature ${highTemp}°C > ${userSettings.expected_temp_max}°C (threshold)\n`)

    // Test 2: CO2 too HIGH
    console.log('💨 Testing CO2_HIGH alert...')
    const highCO2 = userSettings.expected_co2_max + 500 // 500 ppm above max
    await checkThermionixMeasurement(
      {
        datetime: new Date(now.getTime() + 1000), // 1 second later
        device_id: parseInt(device.device_id),
        temperature: 22, // normal
        relative_humidity: 50, // normal
        co2: highCO2,
      },
      {
        device_id: device.device_id,
        name: device.name,
      },
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
    console.log(`   ✅ Created alert: CO2 ${highCO2} ppm > ${userSettings.expected_co2_max} ppm (threshold)\n`)

    // Test 3: Temperature too LOW
    console.log('❄️  Testing TEMP_LOW alert...')
    const lowTemp = userSettings.expected_temp_min - 5 // 5 degrees below min
    await checkThermionixMeasurement(
      {
        datetime: new Date(now.getTime() + 2000), // 2 seconds later
        device_id: parseInt(device.device_id),
        temperature: lowTemp,
        relative_humidity: 50, // normal
        co2: 600, // normal
      },
      {
        device_id: device.device_id,
        name: device.name,
      },
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
    console.log(`   ✅ Created alert: Temperature ${lowTemp}°C < ${userSettings.expected_temp_min}°C (threshold)\n`)

    console.log('✨ Done! Check your notifications page to see the new alerts.')
    console.log('   The alerts should appear in real-time if you have the page open.')

  } catch (error) {
    console.error('❌ Error triggering alerts:', error)
  } finally {
    await prisma.$disconnect()
  }
}

triggerTestAlerts()

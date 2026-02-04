/**
 * Test Alert System
 *
 * This script creates a test measurement that violates thresholds
 * and triggers the alert detection system
 */

import { prisma } from '@/lib/prisma'
import { checkThermionixMeasurement } from '@/lib/utils/alertDetection'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function testAlertSystem() {
  console.log('🧪 Testing Alert System...\n')

  try {
    // STEP 1: Get the first user and their settings
    console.log('📝 Step 1: Getting user settings...')
    const userSettings = await prisma.userSettings.findFirst()

    if (!userSettings) {
      console.error('❌ No user settings found!')
      console.log('   Please create user settings first')
      process.exit(1)
    }

    console.log(`✅ Found user settings for user: ${userSettings.user_id}`)
    console.log(`   Temperature range: ${userSettings.expected_temp_min}°C - ${userSettings.expected_temp_max}°C`)
    console.log(`   Humidity range: ${userSettings.expected_humidity_min}% - ${userSettings.expected_humidity_max}%`)
    console.log(`   CO2 range: ${userSettings.expected_co2_min} - ${userSettings.expected_co2_max} ppm\n`)

    // STEP 2: Get a device (or create a mock one)
    console.log('📝 Step 2: Getting device info...')
    const device = await prisma.device.findFirst()

    const testDevice = device || {
      device_id: '42',
      name: 'TEST_DEVICE',
    }

    console.log(`✅ Using device: ${testDevice.device_id} (${testDevice.name})\n`)

    // STEP 3: Create a test measurement that VIOLATES temperature threshold
    console.log('📝 Step 3: Creating test measurement with HIGH temperature...')
    const highTemp = userSettings.expected_temp_max + 5 // 5 degrees above max

    const testMeasurement = {
      datetime: new Date(),
      device_id: 42,
      temperature: highTemp,
      relative_humidity: 50.0,
      co2: 800.0,
    }

    console.log(`   Temperature: ${highTemp}°C (threshold: ${userSettings.expected_temp_max}°C)`)
    console.log(`   This should trigger a TEMP_HIGH alert!\n`)

    // STEP 4: Run alert detection
    console.log('⚡ Step 4: Running alert detection...')
    await checkThermionixMeasurement(
      testMeasurement,
      testDevice,
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

    console.log('✅ Alert detection completed!\n')

    // STEP 5: Check if alert was created
    console.log('📝 Step 5: Checking if alert was created...')
    const recentAlert = await prisma.alert.findFirst({
      where: {
        user_id: userSettings.user_id,
        alert_type: 'TEMP_HIGH',
      },
      orderBy: {
        created_at: 'desc',
      },
    })

    if (recentAlert) {
      console.log('✅ Alert created successfully!')
      console.log(`   Alert ID: ${recentAlert.id}`)
      console.log(`   Type: ${recentAlert.alert_type}`)
      console.log(`   Severity: ${recentAlert.severity}`)
      console.log(`   Measured: ${recentAlert.measured_value}${recentAlert.unit}`)
      console.log(`   Threshold: ${recentAlert.threshold_value}${recentAlert.unit}`)
      console.log(`   Created: ${recentAlert.created_at}\n`)
    } else {
      console.log('⚠️  No alert found (might have been deduplicated)\n')
    }

    console.log('🎉 Test complete!')
    console.log('\n📌 Next steps:')
    console.log('1. Start the dev server: npm run dev')
    console.log('2. Log in and check the bell icon in the header')
    console.log('3. You should see a red badge with the unread count')
    console.log('4. Click the bell to see the alert in the dropdown')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAlertSystem()

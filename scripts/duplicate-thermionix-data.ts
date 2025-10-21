/**
 * Script to Duplicate Thermionix Measurements for Existing Device IDs
 *
 * PROBLEM:
 * - thermionyx_measurements table has device_id values (e.g., 10049)
 * - devices table has different device_id values (e.g., "L8_33_67")
 * - The IDs don't match, so the Thermionix page can't display data
 *
 * SOLUTION:
 * - Find all device IDs from the devices table
 * - Take existing thermionyx_measurements data
 * - Duplicate it for each device ID that exists in devices table
 * - Parse device_id as integer from the devices table string IDs
 *
 * USAGE:
 * npx tsx scripts/duplicate-thermionix-data.ts
 */

import { prisma } from '../lib/prisma'

async function duplicateThermionixData() {
  console.log('🔄 Starting Thermionix data duplication...\n')

  try {
    // STEP 1: Fetch all devices from devices table
    console.log('📋 Step 1: Fetching devices from devices table...')
    const devices = await prisma.device.findMany({
      select: {
        device_id: true,
        name: true,
        location: true,
      },
    })
    console.log(`✅ Found ${devices.length} devices\n`)

    if (devices.length === 0) {
      console.log('⚠️  No devices found in devices table. Exiting.')
      return
    }

    // STEP 2: Fetch sample of existing thermionyx_measurements
    console.log('📋 Step 2: Fetching sample thermionyx_measurements...')
    const sampleMeasurements = await prisma.thermionyx_measurements.findMany({
      take: 100, // Take 100 measurements to duplicate
      orderBy: {
        datetime: 'desc',
      },
    })
    console.log(`✅ Found ${sampleMeasurements.length} sample measurements\n`)

    if (sampleMeasurements.length === 0) {
      console.log('⚠️  No measurements found in thermionyx_measurements table. Exiting.')
      return
    }

    // STEP 3: Parse device IDs as integers (try to extract numeric part)
    console.log('📋 Step 3: Extracting numeric device IDs...')
    const deviceIdMapping: number[] = []

    for (const device of devices) {
      // Try to extract a number from device_id string
      // Examples: "SENSOR_001" -> 1, "L8_33_67" -> 833, "10321" -> 10321
      const numericMatch = device.device_id.match(/\d+/)
      if (numericMatch) {
        const numericId = parseInt(numericMatch[0], 10)
        deviceIdMapping.push(numericId)
        console.log(`  - Device: ${device.device_id} (${device.name}) -> numeric ID: ${numericId}`)
      }
    }

    if (deviceIdMapping.length === 0) {
      console.log('⚠️  Could not extract numeric IDs from devices. Exiting.')
      return
    }

    console.log(`✅ Extracted ${deviceIdMapping.length} numeric device IDs\n`)

    // STEP 4: Duplicate measurements for each device ID
    console.log('📋 Step 4: Duplicating measurements...')
    let createdCount = 0
    let skippedCount = 0

    for (const deviceId of deviceIdMapping) {
      console.log(`\n  Processing device_id: ${deviceId}`)

      for (const measurement of sampleMeasurements) {
        try {
          // Create new measurement with the device_id from devices table
          await prisma.thermionyx_measurements.create({
            data: {
              datetime: measurement.datetime,
              device_id: deviceId, // Use the numeric device ID
              probe_id: measurement.probe_id,
              temperature: measurement.temperature,
              relative_humidity: measurement.relative_humidity,
              co2: measurement.co2,
            },
          })
          createdCount++
        } catch (error) {
          // Skip if duplicate (unique constraint violation)
          if (error instanceof Error && error.message.includes('Unique constraint')) {
            skippedCount++
          } else {
            console.error(`    ❌ Error creating measurement:`, error)
          }
        }
      }

      console.log(`    ✅ Created ${createdCount} measurements for device ${deviceId}`)
    }

    console.log('\n✨ Data duplication complete!')
    console.log(`📊 Summary:`)
    console.log(`   - Created: ${createdCount} new measurements`)
    console.log(`   - Skipped: ${skippedCount} duplicates`)

  } catch (error) {
    console.error('❌ Error during data duplication:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
duplicateThermionixData()
  .then(() => {
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

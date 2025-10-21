/**
 * Rollback Script - Delete Duplicate Thermionix Data
 *
 * This script removes the duplicate measurements created by duplicate-thermionix-data.ts
 * which added fake data for device IDs from the devices table.
 *
 * USAGE: npx tsx scripts/rollback-thermionix-duplicates.ts
 */

import { prisma } from '../lib/prisma'

async function rollbackDuplicates() {
  console.log('🔄 Starting rollback of duplicate Thermionix data...\n')

  try {
    // Get all device IDs from devices table that were used to create duplicates
    const devices = await prisma.device.findMany({
      select: { device_id: true },
    })

    // Extract numeric IDs that were created by the duplication script
    const deviceIdsToDelete: number[] = []
    for (const device of devices) {
      const numericMatch = device.device_id.match(/\d+/)
      if (numericMatch) {
        const numericId = parseInt(numericMatch[0], 10)
        deviceIdsToDelete.push(numericId)
      }
    }

    console.log(`📋 Found ${deviceIdsToDelete.length} device IDs that may have duplicates:`)
    console.log(deviceIdsToDelete.join(', '))
    console.log()

    // Count measurements for these device IDs
    const countResult = await prisma.thermionyx_measurements.count({
      where: {
        device_id: {
          in: deviceIdsToDelete,
        },
      },
    })

    console.log(`⚠️  Found ${countResult} measurements to delete`)
    console.log()

    // Delete all measurements with these device IDs
    const deleteResult = await prisma.thermionyx_measurements.deleteMany({
      where: {
        device_id: {
          in: deviceIdsToDelete,
        },
      },
    })

    console.log(`✅ Deleted ${deleteResult.count} duplicate measurements`)
    console.log()
    console.log('✨ Rollback complete!')

  } catch (error) {
    console.error('❌ Error during rollback:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
rollbackDuplicates()
  .then(() => {
    console.log('\n✅ Rollback script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Rollback script failed:', error)
    process.exit(1)
  })

/**
 * Insert a temperature measurement above the max threshold for L4_37_15
 * and trigger an alert notification for the correct logged-in user.
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { prisma } from '../lib/prisma'
import { checkThermionixMeasurement } from '../lib/utils/alertDetection'

// akvedoto@gmail.com — the logged-in user
const TARGET_USER_ID = '57a35c50-bdc3-4283-a826-dc014e86f189'

async function main() {
  const settings = await prisma.userSettings.findUnique({ where: { user_id: TARGET_USER_ID } })
  if (!settings) throw new Error('No settings found for user ' + TARGET_USER_ID)

  const tempValue = settings.expected_temp_max + 1.3  // 27.3°C — above max of 26

  console.log(`User: akvedoto@gmail.com (${TARGET_USER_ID})`)
  console.log(`Thresholds: ${settings.expected_temp_min}–${settings.expected_temp_max}°C`)
  console.log(`Inserting ${tempValue}°C for apartment L4_37_15 (probe 10320)...`)

  // Clean up any stale alerts for this device to avoid duplicate-skip
  await prisma.alert.deleteMany({
    where: { device_id: '10320', alert_type: 'TEMP_HIGH', resolved_at: null, user_id: TARGET_USER_ID }
  })

  // Also delete wrong-user alerts from previous runs
  await prisma.alert.deleteMany({
    where: { user_id: '48c7eea5-7cd3-429f-84f2-d74384f6d58b' }
  })

  const latest = await prisma.thermionyx_measurements.findFirst({
    where: { probe_id: 10320 },
    orderBy: { datetime: 'desc' },
  })
  if (!latest) throw new Error('No records for probe 10320')

  const now = new Date()

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "xai4heat_db"."thermionyx_measurements" DISABLE TRIGGER ALL`
  )
  const measurement = await prisma.thermionyx_measurements.create({
    data: {
      datetime: now,
      device_id: latest.device_id,
      probe_id: 10320,
      temperature: tempValue,
      relative_humidity: 48,
      co2: null,
    },
  })
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "xai4heat_db"."thermionyx_measurements" ENABLE TRIGGER ALL`
  )

  console.log(`Measurement inserted: ${measurement.temperature}°C`)

  await checkThermionixMeasurement(
    {
      datetime: measurement.datetime,
      device_id: measurement.device_id,
      temperature: measurement.temperature,
      relative_humidity: measurement.relative_humidity,
      co2: measurement.co2,
    },
    { device_id: '10320', name: 'L4_37_15' },
    {
      user_id: TARGET_USER_ID,
      expected_temp_min: settings.expected_temp_min,
      expected_temp_max: settings.expected_temp_max,
      expected_humidity_min: settings.expected_humidity_min,
      expected_humidity_max: settings.expected_humidity_max,
      expected_co2_min: settings.expected_co2_min,
      expected_co2_max: settings.expected_co2_max,
    }
  )

  console.log(`Alert created for akvedoto@gmail.com — L4_37_15 at ${tempValue}°C (max: ${settings.expected_temp_max}°C)`)
  console.log('Bell should update within 10 seconds via polling.')
}

main().catch(console.error).finally(() => prisma.$disconnect())

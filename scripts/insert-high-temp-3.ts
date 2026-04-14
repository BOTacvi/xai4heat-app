import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { prisma } from '../lib/prisma'
import { checkThermionixMeasurement } from '../lib/utils/alertDetection'

const TARGET_USER_ID = '57a35c50-bdc3-4283-a826-dc014e86f189'
const TEMP_VALUE = 27.2

async function main() {
  const settings = await prisma.userSettings.findUnique({ where: { user_id: TARGET_USER_ID } })
  if (!settings) throw new Error('No settings')

  // Pick a random probe (not 10316 or 10320)
  const probe = await prisma.thermionyx_measurements.findFirst({
    where: { probe_id: { notIn: [10316, 10320] } },
    orderBy: { datetime: 'desc' },
    select: { probe_id: true, device_id: true },
  })
  if (!probe) throw new Error('No probe found')

  const probeId = probe.probe_id
  const deviceId = probe.device_id

  // Clean up stale unresolved alert for this device
  await prisma.alert.deleteMany({
    where: { device_id: String(probeId), alert_type: 'TEMP_HIGH', resolved_at: null, user_id: TARGET_USER_ID }
  })

  await prisma.$executeRawUnsafe(`ALTER TABLE "xai4heat_db"."thermionyx_measurements" DISABLE TRIGGER ALL`)
  const m = await prisma.thermionyx_measurements.create({
    data: { datetime: new Date(), device_id: deviceId, probe_id: probeId, temperature: TEMP_VALUE, relative_humidity: 52, co2: null }
  })
  await prisma.$executeRawUnsafe(`ALTER TABLE "xai4heat_db"."thermionyx_measurements" ENABLE TRIGGER ALL`)

  await checkThermionixMeasurement(
    { datetime: m.datetime, device_id: m.device_id, temperature: m.temperature, relative_humidity: m.relative_humidity, co2: m.co2 },
    { device_id: String(probeId), name: String(probeId) },
    { user_id: TARGET_USER_ID, expected_temp_min: settings.expected_temp_min, expected_temp_max: settings.expected_temp_max, expected_humidity_min: settings.expected_humidity_min, expected_humidity_max: settings.expected_humidity_max, expected_co2_min: settings.expected_co2_min, expected_co2_max: settings.expected_co2_max }
  )

  console.log(`Alert created: probe ${probeId} (device ${deviceId}) at ${TEMP_VALUE}°C (max: ${settings.expected_temp_max}°C)`)
}

main().catch(console.error).finally(() => prisma.$disconnect())

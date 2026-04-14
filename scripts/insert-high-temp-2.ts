import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { prisma } from '../lib/prisma'
import { checkThermionixMeasurement } from '../lib/utils/alertDetection'

const TARGET_USER_ID = '57a35c50-bdc3-4283-a826-dc014e86f189'

async function main() {
  const settings = await prisma.userSettings.findUnique({ where: { user_id: TARGET_USER_ID } })
  if (!settings) throw new Error('No settings')

  const tempValue = settings.expected_temp_max + 2.1 // 28.1°C — different apartment

  await prisma.alert.deleteMany({
    where: { device_id: '10316', alert_type: 'TEMP_HIGH', resolved_at: null, user_id: TARGET_USER_ID }
  })

  const latest = await prisma.thermionyx_measurements.findFirst({
    where: { probe_id: 10316 },
    orderBy: { datetime: 'desc' },
  })
  if (!latest) throw new Error('No records for probe 10316')

  await prisma.$executeRawUnsafe(`ALTER TABLE "xai4heat_db"."thermionyx_measurements" DISABLE TRIGGER ALL`)
  const m = await prisma.thermionyx_measurements.create({
    data: { datetime: new Date(), device_id: latest.device_id, probe_id: 10316, temperature: tempValue, relative_humidity: 55, co2: null }
  })
  await prisma.$executeRawUnsafe(`ALTER TABLE "xai4heat_db"."thermionyx_measurements" ENABLE TRIGGER ALL`)

  await checkThermionixMeasurement(
    { datetime: m.datetime, device_id: m.device_id, temperature: m.temperature, relative_humidity: m.relative_humidity, co2: m.co2 },
    { device_id: '10316', name: 'L8_53_2' },
    { user_id: TARGET_USER_ID, expected_temp_min: settings.expected_temp_min, expected_temp_max: settings.expected_temp_max, expected_humidity_min: settings.expected_humidity_min, expected_humidity_max: settings.expected_humidity_max, expected_co2_min: settings.expected_co2_min, expected_co2_max: settings.expected_co2_max }
  )

  console.log(`Alert created: L8_53_2 at ${tempValue}°C (max: ${settings.expected_temp_max}°C)`)
}

main().catch(console.error).finally(() => prisma.$disconnect())

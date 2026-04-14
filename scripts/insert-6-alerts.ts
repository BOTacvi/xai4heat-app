import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Suppress the Supabase realtime WebSocket teardown error in script context
process.on('uncaughtException', (err) => {
  if (err.message?.includes('close is not a function')) return
  console.error(err)
  process.exit(1)
})

import { prisma } from '../lib/prisma'
import { checkThermionixMeasurement } from '../lib/utils/alertDetection'

const TARGET_USER_ID = '57a35c50-bdc3-4283-a826-dc014e86f189'

// With range 22–26°C:
// TEMP_LOW threshold = 22°C:  LOW ~21.5°C (2.3%), MEDIUM ~19.5°C (11.4%), HIGH ~17.0°C (22.7%)
// TEMP_HIGH threshold = 26°C: LOW ~27.0°C (3.8%), MEDIUM ~29.0°C (11.5%), HIGH ~31.5°C (21.2%)
const ALERTS = [
  { probe_id: 10334, device_id: 10049, temp: 21.5, label: 'TEMP_LOW LOW' },
  { probe_id: 10321, device_id: 10049, temp: 19.5, label: 'TEMP_LOW MEDIUM' },
  { probe_id: 10318, device_id: 10046, temp: 17.0, label: 'TEMP_LOW HIGH' },
  { probe_id: 10337, device_id: 10047, temp: 27.0, label: 'TEMP_HIGH LOW' },
  { probe_id: 10331, device_id: 10048, temp: 29.0, label: 'TEMP_HIGH MEDIUM' },
  { probe_id: 10335, device_id: 10049, temp: 31.5, label: 'TEMP_HIGH HIGH' },
]

async function main() {
  const settings = await prisma.userSettings.findUnique({ where: { user_id: TARGET_USER_ID } })
  if (!settings) throw new Error('No settings found')

  for (const alert of ALERTS) {
    // Clean up any stale unresolved alerts for this probe
    await prisma.alert.deleteMany({
      where: {
        device_id: String(alert.probe_id),
        alert_type: { in: ['TEMP_HIGH', 'TEMP_LOW'] },
        resolved_at: null,
        user_id: TARGET_USER_ID,
      },
    })

    await prisma.$executeRawUnsafe(`ALTER TABLE "xai4heat_db"."thermionyx_measurements" DISABLE TRIGGER ALL`)
    const m = await prisma.thermionyx_measurements.create({
      data: {
        datetime: new Date(),
        device_id: alert.device_id,
        probe_id: alert.probe_id,
        temperature: alert.temp,
        relative_humidity: 50,
        co2: null,
      },
    })
    await prisma.$executeRawUnsafe(`ALTER TABLE "xai4heat_db"."thermionyx_measurements" ENABLE TRIGGER ALL`)

    await checkThermionixMeasurement(
      { datetime: m.datetime, device_id: m.device_id, temperature: m.temperature, relative_humidity: m.relative_humidity, co2: m.co2 },
      { device_id: String(alert.probe_id), name: String(alert.probe_id) },
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

    console.log(`✓ ${alert.label}: probe ${alert.probe_id} at ${alert.temp}°C`)
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    // Wait for all broadcast timeouts (5s each) to flush before exiting
    await new Promise((r) => setTimeout(r, 6000))
    process.exit(0)
  })

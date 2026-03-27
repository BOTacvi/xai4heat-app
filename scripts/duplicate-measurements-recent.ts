/**
 * Script to Duplicate All Measurements with Recent Dates
 *
 * PURPOSE:
 * Takes all existing measurements and creates copies with dates
 * proportionally mapped to a recent window (last N months up to today).
 * This makes the data appear current while preserving relative time differences.
 *
 * TABLES:
 * - scada_measurements        (@@id [datetime, location])
 * - thermionyx_measurements   (@@id [datetime, device_id, probe_id])
 * - weatherlink_measurements  (@@id [datetime, location])
 *
 * USAGE:
 * npx tsx scripts/duplicate-measurements-recent.ts
 *
 * CONFIG (edit below):
 * TARGET_MONTHS_BACK - how many months back the new data should start from today
 */

import { prisma } from '../lib/prisma'


// Simple offset shift: find the latest record, move it to `targetEnd`,
// shift every other record by the same offset. This preserves all relative
// differences AND ensures every device/lamela's most recent data ends up
// near today — unlike proportional mapping which scatters them unevenly.
function buildOffsetMap(
  records: { datetime: Date }[],
  targetEnd: Date
): Map<number, Date> {
  let originalMax = -Infinity
  for (const r of records) {
    const t = r.datetime.getTime()
    if (t > originalMax) originalMax = t
  }

  const offsetMs = targetEnd.getTime() - originalMax

  const map = new Map<number, Date>()
  for (const r of records) {
    const key = r.datetime.getTime()
    map.set(key, new Date(key + offsetMs))
  }
  return map
}

const BATCH_SIZE = 500

async function insertBatched<T>(
  items: T[],
  insertFn: (batch: T[]) => Promise<{ count: number }>
): Promise<number> {
  let total = 0
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const result = await insertFn(batch)
    total += result.count
    process.stdout.write(`\r   Inserted ${total} / ${items.length}...`)
  }
  process.stdout.write('\n')
  return total
}

async function main() {
  console.log('🚀 Starting measurement duplication with recent dates...\n')

  const today = new Date()

  console.log(`📅 Shifting all records so the latest date = ${today.toISOString()}\n`)

  // ── SCADA ────────────────────────────────────────────────────────────────────
  // SKIPPED: already duplicated in a previous run (1,130,600 rows created)
  console.log('📋 Skipping scada_measurements (already duplicated)\n')

  // ── THERMIONYX ───────────────────────────────────────────────────────────────
  // NOTE: thermionyx_measurements has a DB trigger that references alert_severity enum.
  // We disable triggers for the session to avoid that conflict during bulk inserts.
  console.log('\n📋 Processing thermionyx_measurements...')
  const thermioRecords = await prisma.thermionyx_measurements.findMany()
  console.log(`   Found ${thermioRecords.length} existing records`)

  if (thermioRecords.length > 0) {
    const dateMap = buildOffsetMap(thermioRecords, today)
    const newRows = thermioRecords.map((r) => ({
      datetime:          dateMap.get(r.datetime.getTime())!,
      device_id:         r.device_id,
      probe_id:          r.probe_id,
      temperature:       r.temperature,
      relative_humidity: r.relative_humidity,
      co2:               r.co2,
    }))

    // Disable trigger at table level (the trigger has a broken enum type reference)
    await prisma.$executeRawUnsafe(`ALTER TABLE "xai4heat_db"."thermionyx_measurements" DISABLE TRIGGER ALL`)
    let total = 0
    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const batch = newRows.slice(i, i + BATCH_SIZE)
      const values = batch.map((r) => {
        const dt = r.datetime.toISOString()
        const temp = r.temperature === null ? 'NULL' : r.temperature
        const hum = r.relative_humidity === null ? 'NULL' : r.relative_humidity
        const co2 = r.co2 === null ? 'NULL' : r.co2
        return `('${dt}',${r.device_id},${r.probe_id},${temp},${hum},${co2})`
      }).join(',')
      const result = await prisma.$executeRawUnsafe(`
        INSERT INTO "xai4heat_db"."thermionyx_measurements" (datetime, device_id, probe_id, temperature, relative_humidity, co2)
        VALUES ${values}
        ON CONFLICT DO NOTHING
      `)
      total += result
      process.stdout.write(`\r   Inserted ${total} / ${newRows.length}...`)
    }
    process.stdout.write('\n')
    await prisma.$executeRawUnsafe(`ALTER TABLE "xai4heat_db"."thermionyx_measurements" ENABLE TRIGGER ALL`)
    const created = total

    console.log(`   ✅ Created: ${created} | Skipped (duplicates): ${thermioRecords.length - created}`)
  }

  // ── WEATHERLINK ──────────────────────────────────────────────────────────────
  console.log('\n📋 Processing weatherlink_measurements...')
  const weatherRecords = await prisma.weatherlink_measurements.findMany()
  console.log(`   Found ${weatherRecords.length} existing records`)

  if (weatherRecords.length > 0) {
    const dateMap = buildOffsetMap(weatherRecords, today)
    const newRows = weatherRecords.map((r) => {
      let newRainStormStart: Date | null = null
      if (r.rain_storm_start_date) {
        newRainStormStart = dateMap.get(r.rain_storm_start_date.getTime()) ?? r.rain_storm_start_date
      }
      return {
        datetime:              dateMap.get(r.datetime.getTime())!,
        location:              r.location,
        bar_trend:             r.bar_trend,
        bar:                   r.bar,
        temp_in:               r.temp_in,
        hum_in:                r.hum_in,
        temp_out:              r.temp_out,
        wind_speed:            r.wind_speed,
        wind_speed_10_min_avg: r.wind_speed_10_min_avg,
        wind_dir:              r.wind_dir,
        hum_out:               r.hum_out,
        rain_rate_mm:          r.rain_rate_mm,
        uv:                    r.uv,
        solar_rad:             r.solar_rad,
        rain_storm_mm:         r.rain_storm_mm,
        rain_storm_start_date: newRainStormStart,
        rain_day_mm:           r.rain_day_mm,
        rain_month_mm:         r.rain_month_mm,
        rain_year_mm:          r.rain_year_mm,
        et_day:                r.et_day,
        et_month:              r.et_month,
        et_year:               r.et_year,
        wet_leaf_4:            r.wet_leaf_4,
        forecast_rule:         r.forecast_rule,
        forecast_desc:         r.forecast_desc,
        dew_point:             r.dew_point,
        heat_index:            r.heat_index,
        wind_chill:            r.wind_chill,
        wind_gust_10_min:      r.wind_gust_10_min,
      }
    })
    const created = await insertBatched(newRows, (batch) =>
      prisma.weatherlink_measurements.createMany({ data: batch, skipDuplicates: true })
    )
    console.log(`   ✅ Created: ${created} | Skipped (duplicates): ${weatherRecords.length - created}`)
  }

  console.log('\n✨ Done! All measurement tables have been duplicated with recent dates.')
}

main()
  .then(() => {
    console.log('✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

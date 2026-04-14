/**
 * Fill data for today and yesterday (March 26-27, 2026)
 *
 * Sources:
 * - thermionyx: Mar 26-27, 2025 → shift +365 days
 * - weatherlink: Mar 24-25, 2026 → shift +2 days
 * - scada: Mar 22-24, 2026 → shift +3 days (fills Mar 25-27)
 */

import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();
const BATCH_SIZE = 500;

async function main() {
  console.log("Filling data for March 26-27, 2026...\n");

  // ── THERMIONYX ────────────────────────────────────────────────────────────────
  console.log("Processing thermionyx_measurements (source: Mar 26-27, 2025)...");
  const thermioSource = await prisma.$queryRawUnsafe<any[]>(`
    SELECT datetime, device_id, probe_id, temperature, relative_humidity, co2
    FROM "xai4heat_db"."thermionyx_measurements"
    WHERE datetime >= '2025-03-26'::date AND datetime < '2025-03-28'::date
    ORDER BY datetime ASC
  `);
  console.log(`  Found ${thermioSource.length} source records`);

  if (thermioSource.length > 0) {
    const shiftMs = 365 * 24 * 60 * 60 * 1000; // 365 days

    await prisma.$executeRawUnsafe(
      `ALTER TABLE "xai4heat_db"."thermionyx_measurements" DISABLE TRIGGER ALL`
    );

    let inserted = 0;
    for (let i = 0; i < thermioSource.length; i += BATCH_SIZE) {
      const batch = thermioSource.slice(i, i + BATCH_SIZE);
      const values = batch
        .map((r) => {
          const newDt = new Date(new Date(r.datetime).getTime() + shiftMs).toISOString();
          const temp = r.temperature === null ? "NULL" : r.temperature;
          const hum = r.relative_humidity === null ? "NULL" : r.relative_humidity;
          const co2 = r.co2 === null ? "NULL" : r.co2;
          return `('${newDt}',${r.device_id},${r.probe_id},${temp},${hum},${co2})`;
        })
        .join(",");
      const result = await prisma.$executeRawUnsafe(`
        INSERT INTO "xai4heat_db"."thermionyx_measurements" (datetime, device_id, probe_id, temperature, relative_humidity, co2)
        VALUES ${values}
        ON CONFLICT DO NOTHING
      `);
      inserted += result;
      process.stdout.write(`\r  Inserted ${inserted} / ${thermioSource.length}...`);
    }
    process.stdout.write("\n");

    await prisma.$executeRawUnsafe(
      `ALTER TABLE "xai4heat_db"."thermionyx_measurements" ENABLE TRIGGER ALL`
    );
    console.log(`  Done: ${inserted} inserted\n`);
  }

  // ── WEATHERLINK ───────────────────────────────────────────────────────────────
  console.log("Processing weatherlink_measurements (source: Mar 24-25, 2026)...");
  const weatherSource = await prisma.$queryRawUnsafe<any[]>(`
    SELECT datetime, location, bar_trend, bar, temp_in, hum_in, temp_out, wind_speed,
           wind_speed_10_min_avg, wind_dir, hum_out, rain_rate_mm, uv, solar_rad,
           rain_storm_mm, rain_storm_start_date, rain_day_mm, rain_month_mm, rain_year_mm,
           et_day, et_month, et_year, wet_leaf_4, forecast_rule, forecast_desc,
           dew_point, heat_index, wind_chill, wind_gust_10_min
    FROM "xai4heat_db"."weatherlink_measurements"
    WHERE datetime >= '2026-03-24'::date AND datetime <= '2026-03-25'::date
    ORDER BY datetime ASC
  `);
  console.log(`  Found ${weatherSource.length} source records`);

  if (weatherSource.length > 0) {
    const shiftMs = 2 * 24 * 60 * 60 * 1000; // 2 days

    const newRows = weatherSource.map((r) => ({
      datetime: new Date(new Date(r.datetime).getTime() + shiftMs),
      location: r.location,
      bar_trend: r.bar_trend,
      bar: r.bar,
      temp_in: r.temp_in,
      hum_in: r.hum_in,
      temp_out: r.temp_out,
      wind_speed: r.wind_speed,
      wind_speed_10_min_avg: r.wind_speed_10_min_avg,
      wind_dir: r.wind_dir,
      hum_out: r.hum_out,
      rain_rate_mm: r.rain_rate_mm,
      uv: r.uv,
      solar_rad: r.solar_rad,
      rain_storm_mm: r.rain_storm_mm,
      rain_storm_start_date: r.rain_storm_start_date
        ? new Date(new Date(r.rain_storm_start_date).getTime() + shiftMs)
        : null,
      rain_day_mm: r.rain_day_mm,
      rain_month_mm: r.rain_month_mm,
      rain_year_mm: r.rain_year_mm,
      et_day: r.et_day,
      et_month: r.et_month,
      et_year: r.et_year,
      wet_leaf_4: r.wet_leaf_4,
      forecast_rule: r.forecast_rule,
      forecast_desc: r.forecast_desc,
      dew_point: r.dew_point,
      heat_index: r.heat_index,
      wind_chill: r.wind_chill,
      wind_gust_10_min: r.wind_gust_10_min,
    }));

    let inserted = 0;
    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const batch = newRows.slice(i, i + BATCH_SIZE);
      const result = await prisma.weatherlink_measurements.createMany({
        data: batch,
        skipDuplicates: true,
      });
      inserted += result.count;
      process.stdout.write(`\r  Inserted ${inserted} / ${newRows.length}...`);
    }
    process.stdout.write("\n");
    console.log(`  Done: ${inserted} inserted\n`);
  }

  // ── SCADA ─────────────────────────────────────────────────────────────────────
  console.log("Processing scada_measurements (source: Mar 22-24, 2026)...");
  const scadaSource = await prisma.$queryRawUnsafe<any[]>(`
    SELECT datetime, location, t_amb, t_ref, t_sup_prim, t_ret_prim, t_sup_sec, t_ret_sec, e, pe
    FROM "xai4heat_db"."scada_measurements"
    WHERE datetime >= '2026-03-22'::date AND datetime < '2026-03-25'::date
    ORDER BY datetime ASC
  `);
  console.log(`  Found ${scadaSource.length} source records`);

  if (scadaSource.length > 0) {
    const shiftMs = 3 * 24 * 60 * 60 * 1000; // 3 days

    let inserted = 0;
    for (let i = 0; i < scadaSource.length; i += BATCH_SIZE) {
      const batch = scadaSource.slice(i, i + BATCH_SIZE);
      const values = batch
        .map((r) => {
          const newDt = new Date(new Date(r.datetime).getTime() + shiftMs).toISOString();
          const t_amb = r.t_amb === null ? "NULL" : r.t_amb;
          const t_ref = r.t_ref === null ? "NULL" : r.t_ref;
          const t_sup_prim = r.t_sup_prim === null ? "NULL" : r.t_sup_prim;
          const t_ret_prim = r.t_ret_prim === null ? "NULL" : r.t_ret_prim;
          const t_sup_sec = r.t_sup_sec === null ? "NULL" : r.t_sup_sec;
          const t_ret_sec = r.t_ret_sec === null ? "NULL" : r.t_ret_sec;
          const e = r.e === null ? "NULL" : r.e;
          const pe = r.pe === null ? "NULL" : r.pe;
          return `('${newDt}','${r.location.replace(/'/g, "''")}',${t_amb},${t_ref},${t_sup_prim},${t_ret_prim},${t_sup_sec},${t_ret_sec},${e},${pe})`;
        })
        .join(",");
      const result = await prisma.$executeRawUnsafe(`
        INSERT INTO "xai4heat_db"."scada_measurements" (datetime, location, t_amb, t_ref, t_sup_prim, t_ret_prim, t_sup_sec, t_ret_sec, e, pe)
        VALUES ${values}
        ON CONFLICT DO NOTHING
      `);
      inserted += result;
      process.stdout.write(`\r  Inserted ${inserted} / ${scadaSource.length}...`);
    }
    process.stdout.write("\n");
    console.log(`  Done: ${inserted} inserted\n`);
  }

  console.log("All tables updated with data through March 27, 2026.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

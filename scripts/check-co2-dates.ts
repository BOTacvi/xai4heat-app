import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      probe_id,
      MIN(datetime) as min_date,
      MAX(datetime) as max_date,
      COUNT(*)::int as total,
      COUNT(co2)::int as co2_count,
      MIN(co2) as co2_min,
      MAX(co2) as co2_max
    FROM "xai4heat_db"."thermionyx_measurements"
    WHERE probe_id IN (10318, 10323, 10324, 10335, 10337, 10338)
    GROUP BY probe_id
    ORDER BY probe_id
  `);

  console.log("CO2 probe stats:");
  for (const row of result) {
    console.log(`  probe_id=${row.probe_id}: ${row.total} rows, co2_count=${row.co2_count}, min=${row.min_date}, max=${row.max_date}, co2_range=[${row.co2_min}, ${row.co2_max}]`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

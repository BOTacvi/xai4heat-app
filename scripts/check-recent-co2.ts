import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  console.log(`Checking from ${weekAgo.toISOString()} to ${now.toISOString()}`);

  // Check probe 10338 (L8_53_13_CO2) for last 7 days
  const result = await prisma.$queryRawUnsafe<any[]>(`
    SELECT COUNT(*)::int as count, MIN(co2) as co2_min, MAX(co2) as co2_max,
           MIN(datetime) as oldest, MAX(datetime) as newest
    FROM "xai4heat_db"."thermionyx_measurements"
    WHERE probe_id = 10338
      AND datetime >= '${weekAgo.toISOString()}'
      AND datetime <= '${now.toISOString()}'
  `);
  console.log("probe_id=10338 (L8_53_13_CO2) last 7 days:", result[0]);

  // Also get most recent 3 records
  const recent = await prisma.thermionyx_measurements.findMany({
    where: { probe_id: 10338, datetime: { gte: weekAgo, lte: now } },
    orderBy: { datetime: "desc" },
    take: 3,
  });
  console.log("Most recent CO2 readings:");
  for (const r of recent) {
    console.log(`  datetime=${r.datetime.toISOString()}, co2=${r.co2}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

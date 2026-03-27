import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      COUNT(*)::int as total,
      MIN(datetime) as min_date,
      MAX(datetime) as max_date,
      COUNT(CASE WHEN datetime >= NOW() - INTERVAL '7 days' THEN 1 END)::int as last_7d,
      COUNT(CASE WHEN datetime >= NOW() - INTERVAL '30 days' THEN 1 END)::int as last_30d,
      COUNT(CASE WHEN datetime >= NOW() - INTERVAL '365 days' THEN 1 END)::int as last_365d
    FROM "xai4heat_db"."weatherlink_measurements"
  `);
  console.log("WeatherLink date range:", JSON.stringify(result[0], null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

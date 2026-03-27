import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  // All distinct probe_ids in measurements
  const probes = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      probe_id,
      COUNT(*)::int as total,
      COUNT(co2)::int as co2_count,
      MAX(datetime) as max_date
    FROM "xai4heat_db"."thermionyx_measurements"
    GROUP BY probe_id
    ORDER BY probe_id
  `);

  console.log("All probe_ids in measurements:");
  for (const p of probes) {
    console.log(`  probe_id=${p.probe_id}: total=${p.total}, co2_count=${p.co2_count}, max=${p.max_date}`);
  }

  // All devices in Device table
  const devices = await prisma.$queryRawUnsafe<any[]>(`
    SELECT device_id, name FROM "xai4heat_db"."devices" ORDER BY device_id::int
  `);

  console.log("\nAll devices:");
  for (const d of devices) {
    const match = probes.find((p) => p.probe_id === parseInt(d.device_id));
    const status = match ? `✓ probe_id=${match.probe_id} (co2: ${match.co2_count})` : "✗ NO DATA";
    console.log(`  device_id=${d.device_id}, name=${d.name} → ${status}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

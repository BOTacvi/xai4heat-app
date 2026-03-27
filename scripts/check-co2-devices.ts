import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.$queryRawUnsafe<any[]>(`
    SELECT device_id, name, location
    FROM "xai4heat_db"."devices"
    WHERE name LIKE '%CO2%' OR name IN ('L8_53_13', 'L4_37_12', 'L12_19_2')
    ORDER BY name
  `);

  console.log("CO2 related devices:");
  for (const d of devices) {
    console.log(`  device_id=${d.device_id}, name=${d.name}, location=${d.location}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

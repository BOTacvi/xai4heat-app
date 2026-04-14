import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { prisma } from '../lib/prisma'

async function main() {
  const userId = '48c7eea5-7cd3-429f-84f2-d74384f6d58b'
  const alerts = await prisma.alert.findMany({
    where: { user_id: userId },
    orderBy: [{ is_acknowledged: 'asc' }, { severity: 'desc' }, { created_at: 'desc' }],
    take: 50,
    skip: 0,
  })
  const unread = alerts.filter(a => a.is_read === false)
  console.log('Total alerts:', alerts.length, '| Unread:', unread.length)
  for (const a of unread) {
    console.log(' -', a.apartment_name, a.alert_type, a.measured_value + a.unit, 'created:', a.created_at.toISOString())
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())

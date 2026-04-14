import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { prisma } from '../lib/prisma'

async function main() {
  // Check Supabase auth users
  const authUsers = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, email, created_at FROM auth.users`
  )
  console.log('Auth users:', authUsers)

  // Check userSettings
  const settings = await prisma.userSettings.findMany()
  console.log('UserSettings user_ids:', settings.map(s => s.user_id))

  // Check alerts
  const alerts = await prisma.alert.findMany({ orderBy: { created_at: 'desc' }, take: 3 })
  console.log('Alerts user_ids:', alerts.map(a => ({ id: a.id.slice(0,8), user_id: a.user_id, is_read: a.is_read })))
}

main().catch(console.error).finally(() => prisma.$disconnect())

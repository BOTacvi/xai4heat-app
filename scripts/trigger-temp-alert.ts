import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { prisma } from '../lib/prisma'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const settings = await prisma.userSettings.findFirst({ orderBy: { updated_at: 'desc' } })
  if (!settings) throw new Error('No settings found')

  const overTemp = settings.expected_temp_max + 1.5

  // Remove existing unresolved TEMP_HIGH for this device so it won't be skipped as duplicate
  await prisma.alert.deleteMany({
    where: { device_id: '10315', alert_type: 'TEMP_HIGH', resolved_at: null, user_id: settings.user_id }
  })

  const alert = await prisma.alert.create({
    data: {
      alert_type: 'TEMP_HIGH',
      source: 'THERMIONIX',
      severity: 'LOW',
      device_id: '10315',
      apartment_name: 'L8_53_12',
      measured_value: overTemp,
      threshold_value: settings.expected_temp_max,
      measurement_time: new Date(),
      unit: '°C',
      is_read: false,
      is_acknowledged: false,
      user_id: settings.user_id,
    }
  })
  console.log('Alert created:', alert.id, '— temp', overTemp, 'vs max', settings.expected_temp_max)

  await new Promise<void>((resolve) => {
    const channel = supabaseAdmin.channel(`alerts:${settings.user_id}`)
    const timeout = setTimeout(() => {
      supabaseAdmin.removeChannel(channel)
      console.warn('Broadcast timed out after 5s')
      resolve()
    }, 5000)

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({ type: 'broadcast', event: 'new_alert', payload: alert })
        console.log('Broadcast sent to channel alerts:' + settings.user_id)
        clearTimeout(timeout)
        await supabaseAdmin.removeChannel(channel)
        resolve()
      }
    })
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())

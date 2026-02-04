/**
 * Test Script to Trigger Alerts
 *
 * This script creates test measurements that violate thresholds to trigger alerts
 * Run with: npx tsx scripts/test-alerts.ts
 */

import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Testing Alert System...\n')

  // Get the first user settings (Supabase Auth manages users, not Prisma)
  const settings = await prisma.userSettings.findFirst()

  if (!settings) {
    console.error('❌ No user settings found. Please create a user first.')
    return
  }

  console.log(`✅ Found user: ${settings.user_id}`)

  if (!settings) {
    console.error('❌ No settings found for user.')
    return
  }

  console.log(`\n📊 Current Thresholds:`)
  console.log(`   Temperature: ${settings.expected_temp_min}°C - ${settings.expected_temp_max}°C`)
  console.log(`   Humidity: ${settings.expected_humidity_min}% - ${settings.expected_humidity_max}%`)
  console.log(`   CO2: ${settings.expected_co2_min}ppm - ${settings.expected_co2_max}ppm\n`)

  // Get a thermionix device
  const device = await prisma.device.findFirst()

  if (!device) {
    console.error('❌ No Thermionix device found.')
    return
  }

  console.log(`✅ Found device: ${device.name} (ID: ${device.device_id})\n`)

  // Create test measurements that will trigger alerts
  const now = new Date()
  const deviceIdNum = parseInt(device.device_id, 10)

  console.log('🔥 Creating measurements that will trigger alerts...\n')

  // 1. High temperature alert
  console.log(`1️⃣ Creating HIGH temperature reading (${settings.expected_temp_max + 5}°C)...`)
  await fetch('http://localhost:3000/api/thermionix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      measurements: [{
        datetime: new Date(now.getTime() - 5000).toISOString(),
        device_id: deviceIdNum,
        probe_id: 1,
        temperature: settings.expected_temp_max + 5, // Too hot!
        relative_humidity: 50,
        co2: 800
      }]
    })
  })

  await delay(1000)

  // 2. Low temperature alert
  console.log(`2️⃣ Creating LOW temperature reading (${settings.expected_temp_min - 3}°C)...`)
  await fetch('http://localhost:3000/api/thermionix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      measurements: [{
        datetime: new Date(now.getTime() - 4000).toISOString(),
        device_id: deviceIdNum,
        probe_id: 1,
        temperature: settings.expected_temp_min - 3, // Too cold!
        relative_humidity: 50,
        co2: 800
      }]
    })
  })

  await delay(1000)

  // 3. High humidity alert
  console.log(`3️⃣ Creating HIGH humidity reading (${settings.expected_humidity_max + 15}%)...`)
  await fetch('http://localhost:3000/api/thermionix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      measurements: [{
        datetime: new Date(now.getTime() - 3000).toISOString(),
        device_id: deviceIdNum,
        probe_id: 1,
        temperature: 22,
        relative_humidity: settings.expected_humidity_max + 15, // Too humid!
        co2: 800
      }]
    })
  })

  await delay(1000)

  // 4. High CO2 alert
  console.log(`4️⃣ Creating HIGH CO2 reading (${settings.expected_co2_max + 500}ppm)...`)
  await fetch('http://localhost:3000/api/thermionix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      measurements: [{
        datetime: new Date(now.getTime() - 2000).toISOString(),
        device_id: deviceIdNum,
        probe_id: 1,
        temperature: 22,
        relative_humidity: 50,
        co2: settings.expected_co2_max + 500 // Too much CO2!
      }]
    })
  })

  await delay(1000)

  // 5. Normal reading (should NOT trigger alert)
  console.log(`5️⃣ Creating NORMAL reading (all values within range)...`)
  await fetch('http://localhost:3000/api/thermionix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      measurements: [{
        datetime: now.toISOString(),
        device_id: deviceIdNum,
        probe_id: 1,
        temperature: (settings.expected_temp_min + settings.expected_temp_max) / 2,
        relative_humidity: (settings.expected_humidity_min + settings.expected_humidity_max) / 2,
        co2: (settings.expected_co2_min + settings.expected_co2_max) / 2
      }]
    })
  })

  console.log('\n✅ Test measurements created!')
  console.log('\n🔔 Check your alerts dropdown in the UI!')
  console.log('   Navigate to: http://localhost:3000/dashboard/notifications')
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

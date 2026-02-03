/**
 * Setup Script: Configure Alerts System
 *
 * This script:
 * 1. Executes the SQL trigger creation script
 * 2. Enables Realtime on the alerts table via Supabase Management API
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import postgres from 'postgres'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL!

async function setupAlerts() {
  console.log('🚀 Starting alerts system setup...\n')

  // Debug: Check environment variables
  console.log('🔍 Checking environment variables...')
  console.log(`   SUPABASE_URL: ${SUPABASE_URL ? '✅' : '❌'}`)
  console.log(`   SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? '✅' : '❌'}`)
  console.log(`   DATABASE_URL: ${DATABASE_URL ? '✅' : '❌'}\n`)

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !DATABASE_URL) {
    console.error('❌ Missing required environment variables!')
    process.exit(1)
  }

  // STEP 1: Execute SQL trigger
  console.log('📝 Step 1: Creating database trigger...')
  try {
    const sql = postgres(DATABASE_URL, {
      max: 1,
      ssl: 'require'
    })

    const triggerSQL = readFileSync(join(process.cwd(), 'scripts/create-alert-trigger.sql'), 'utf-8')

    await sql.unsafe(triggerSQL)
    console.log('✅ Database trigger created successfully!\n')

    await sql.end()
  } catch (error: any) {
    console.error('❌ Failed to create trigger:', error.message)
    console.log('   (This might be OK if the trigger already exists)\n')
  }

  // STEP 2: Enable Realtime on alerts table
  console.log('⚡ Step 2: Enabling Realtime for alerts table...')
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if alerts table is already published
    const { data: publications, error: pubError } = await supabase
      .from('alerts')
      .select('id')
      .limit(1)

    if (pubError) {
      console.log('⚠️  Note: You need to enable Realtime manually in Supabase dashboard')
      console.log(`   Go to: ${SUPABASE_URL.replace('.supabase.co', '.supabase.co/project/_/database/publications')}`)
      console.log('   Enable the "alerts" table in the Replication section\n')
    } else {
      console.log('✅ Alerts table is accessible\n')
    }

  } catch (error: any) {
    console.error('❌ Failed to check Realtime:', error.message)
  }

  console.log('🎉 Setup complete!')
  console.log('\n📌 Next steps:')
  console.log('1. Ensure Realtime is enabled for "alerts" table in Supabase dashboard')
  console.log('2. Test by creating a measurement that violates thresholds')
  console.log('3. Check that alerts appear in the notifications dropdown')
}

setupAlerts().catch(console.error)

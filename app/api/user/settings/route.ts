/**
 * User Settings API Route
 *
 * LEARNING: Next.js API Routes (Route Handlers)
 *
 * In Next.js App Router, API routes are defined as:
 * - Files named route.ts inside app/api/ folders
 * - Export functions named after HTTP methods (GET, POST, PUT, DELETE)
 *
 * WHY API ROUTES:
 * 1. Server-side code execution (access to database)
 * 2. Secure - never expose database credentials to client
 * 3. Can add authentication/authorization checks
 * 4. RESTful endpoint that any client can call
 *
 * AUTHENTICATION PATTERN:
 * Every API route should:
 * 1. Check if user is authenticated
 * 2. Verify user has permission to access the resource
 * 3. Return 401/403 errors if not authorized
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/user/settings
 *
 * Fetches user settings for the authenticated user
 *
 * QUERY PARAMS: None needed!
 * - Automatically uses authenticated user from session
 *
 * SECURITY:
 * - Reads user from auth session cookie
 * - User can only access their own settings (determined automatically)
 * - More secure than accepting userId as parameter
 *
 * LEARNING: Why no userId parameter?
 * - User is determined from auth session, not from request
 * - This prevents users from trying to access other users' settings
 * - The session cookie is httpOnly (can't be accessed by JavaScript)
 * - Session is validated on every request by Supabase
 *
 * RETURNS:
 * - 200: UserSettings object
 * - 401: User not authenticated
 * - 500: Database error
 */
export async function GET(request: NextRequest) {
  try {
    // STEP 1: Authenticate - get current user from Supabase session
    // COMMENT: createServerClient uses Next.js cookies to read auth token
    // The token is validated by Supabase - we can trust the user object
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      // COMMENT: 401 Unauthorized = user needs to login
      console.error('[Settings API] Auth error:', authError?.message)
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('[Settings API] Fetching settings for user:', user.id)

    // STEP 2: Query database using authenticated user's ID
    // COMMENT: Prisma findUnique is efficient - uses unique constraint on user_id
    let settings = await prisma.userSettings.findUnique({
      where: { user_id: user.id }
    })

    // STEP 3: Create default settings if none exist
    // COMMENT: This is "lazy initialization" - settings created on first access
    // Alternatively, we could create settings during signup (more proactive)
    if (!settings) {
      console.log('[Settings API] No settings found, creating defaults for user:', user.id)
      settings = await prisma.userSettings.create({
        data: {
          user_id: user.id,
          // Defaults from Prisma schema: temp 23-26, pressure 1.5-2.5
        }
      })
    }

    // STEP 4: Return success response
    // Settings always have values from Prisma schema defaults
    console.log('[Settings API] Successfully fetched settings:', settings.id)
    return NextResponse.json(settings)

  } catch (error) {
    // LEARNING: Error Handling Best Practices
    // 1. Log detailed error server-side (for debugging)
    // 2. Return generic message to client (don't expose internal details)
    console.error('[Settings API] Error fetching user settings:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/user/settings
 *
 * Updates user settings for the authenticated user
 *
 * REQUEST BODY:
 * {
 *   expected_temp_min: number,
 *   expected_temp_max: number,
 *   expected_humidity_min: number,
 *   expected_humidity_max: number,
 *   expected_pressure_min: number,
 *   expected_pressure_max: number,
 *   expected_co2_min: number,
 *   expected_co2_max: number
 * }
 *
 * VALIDATION:
 * - Min values must be less than max values
 * - Values must be within reasonable ranges
 *
 * RETURNS:
 * - 200: Updated UserSettings object
 * - 400: Invalid input (validation failed)
 * - 401: Not authenticated
 */
export async function PUT(request: NextRequest) {
  try {
    // STEP 1: Authenticate
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // STEP 2: Parse request body
    const body = await request.json()

    const {
      expected_temp_min,
      expected_temp_max,
      expected_humidity_min,
      expected_humidity_max,
      expected_pressure_min,
      expected_pressure_max,
      expected_co2_min,
      expected_co2_max,
    } = body

    // STEP 3: Validation
    const errors: string[] = []

    // Temperature validation (-50 to 100°C)
    if (typeof expected_temp_min !== 'number' || expected_temp_min < -50 || expected_temp_min > 100) {
      errors.push('Invalid expected_temp_min (must be between -50 and 100)')
    }
    if (typeof expected_temp_max !== 'number' || expected_temp_max < -50 || expected_temp_max > 100) {
      errors.push('Invalid expected_temp_max (must be between -50 and 100)')
    }
    if (expected_temp_min >= expected_temp_max) {
      errors.push('expected_temp_min must be less than expected_temp_max')
    }

    // Humidity validation (0 to 100%)
    if (typeof expected_humidity_min !== 'number' || expected_humidity_min < 0 || expected_humidity_min > 100) {
      errors.push('Invalid expected_humidity_min (must be between 0 and 100)')
    }
    if (typeof expected_humidity_max !== 'number' || expected_humidity_max < 0 || expected_humidity_max > 100) {
      errors.push('Invalid expected_humidity_max (must be between 0 and 100)')
    }
    if (expected_humidity_min >= expected_humidity_max) {
      errors.push('expected_humidity_min must be less than expected_humidity_max')
    }

    // Pressure validation (0 to 10 bar)
    if (typeof expected_pressure_min !== 'number' || expected_pressure_min < 0 || expected_pressure_min > 10) {
      errors.push('Invalid expected_pressure_min (must be between 0 and 10)')
    }
    if (typeof expected_pressure_max !== 'number' || expected_pressure_max < 0 || expected_pressure_max > 10) {
      errors.push('Invalid expected_pressure_max (must be between 0 and 10)')
    }
    if (expected_pressure_min >= expected_pressure_max) {
      errors.push('expected_pressure_min must be less than expected_pressure_max')
    }

    // CO2 validation (0 to 5000 ppm)
    if (typeof expected_co2_min !== 'number' || expected_co2_min < 0 || expected_co2_min > 5000) {
      errors.push('Invalid expected_co2_min (must be between 0 and 5000)')
    }
    if (typeof expected_co2_max !== 'number' || expected_co2_max < 0 || expected_co2_max > 5000) {
      errors.push('Invalid expected_co2_max (must be between 0 and 5000)')
    }
    if (expected_co2_min >= expected_co2_max) {
      errors.push('expected_co2_min must be less than expected_co2_max')
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }

    // STEP 4: Update or create settings
    const settings = await prisma.userSettings.upsert({
      where: { user_id: user.id },
      update: {
        expected_temp_min,
        expected_temp_max,
        expected_humidity_min,
        expected_humidity_max,
        expected_pressure_min,
        expected_pressure_max,
        expected_co2_min,
        expected_co2_max,
      },
      create: {
        user_id: user.id,
        expected_temp_min,
        expected_temp_max,
        expected_humidity_min,
        expected_humidity_max,
        expected_pressure_min,
        expected_pressure_max,
        expected_co2_min,
        expected_co2_max,
      }
    })

    // STEP 5: Return updated settings
    return NextResponse.json(settings)

  } catch (error) {
    console.error('Error updating user settings:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/alerts/acknowledge-multiple
 *
 * Batch acknowledge multiple alerts
 *
 * REQUEST BODY:
 * {
 *   alert_ids: string[]  // Array of alert UUIDs
 * }
 *
 * BEHAVIOR:
 * - Sets is_acknowledged = true
 * - Sets acknowledged_at = current timestamp
 * - Sets acknowledged_by = current user's ID
 *
 * USE CASES:
 * - Facility manager reviews and acknowledges multiple alerts
 * - Bulk operations after fixing an issue affecting multiple devices
 * - Acknowledging all alerts for a specific device/location
 *
 * SECURITY:
 * - Requires authentication
 * - Only updates alerts belonging to the authenticated user
 * - Ignores alert_ids that don't belong to user (doesn't return error)
 *
 * RESPONSE:
 * {
 *   acknowledged_count: number  // Number of alerts actually acknowledged
 * }
 *
 * VALIDATION:
 * - alert_ids must be a non-empty array
 * - Returns 400 Bad Request if validation fails
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    // STEP 1: Authentication check
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // STEP 2: Parse and validate request body
    const body = await req.json()
    const { alert_ids } = body

    if (!Array.isArray(alert_ids) || alert_ids.length === 0) {
      return NextResponse.json(
        { error: 'alert_ids must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate all IDs are strings
    if (!alert_ids.every(id => typeof id === 'string')) {
      return NextResponse.json(
        { error: 'All alert_ids must be strings' },
        { status: 400 }
      )
    }

    console.log('[API /alerts/acknowledge-multiple] POST request:', {
      user_id: user.id,
      alert_count: alert_ids.length,
    })

    // STEP 3: Batch update alerts with acknowledgment data
    // Security: WHERE clause ensures we only update user's own alerts
    const now = new Date()

    const result = await prisma.alert.updateMany({
      where: {
        id: {
          in: alert_ids,
        },
        user_id: user.id, // Security: only update user's own alerts
      },
      data: {
        is_acknowledged: true,
        acknowledged_at: now,
        acknowledged_by: user.id,
      },
    })

    console.log('[API /alerts/acknowledge-multiple] Acknowledged:', {
      requested: alert_ids.length,
      acknowledged: result.count,
    })

    return NextResponse.json({
      acknowledged_count: result.count,
    })
  } catch (error) {
    console.error('[API /alerts/acknowledge-multiple] Error acknowledging alerts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

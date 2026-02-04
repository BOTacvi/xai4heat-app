/**
 * PATCH /api/alerts/[id]
 *
 * Update a single alert's read or acknowledgment status
 *
 * REQUEST BODY:
 * {
 *   is_read?: boolean,
 *   is_acknowledged?: boolean
 * }
 *
 * BEHAVIOR:
 * - When is_acknowledged is set to true:
 *   - Sets acknowledged_at to current timestamp
 *   - Sets acknowledged_by to current user's ID
 * - When is_read is set to true:
 *   - Simply updates the flag
 *
 * SECURITY:
 * - Requires authentication
 * - User can only update their own alerts
 * - Returns 403 if alert doesn't belong to user
 * - Returns 404 if alert doesn't exist
 *
 * RESPONSE:
 * - Returns updated alert object
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(
  req: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params

    // STEP 1: Authentication check
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // STEP 2: Parse request body
    const body = await req.json()
    const { is_read, is_acknowledged } = body

    // STEP 3: Validate at least one field is provided
    if (is_read === undefined && is_acknowledged === undefined) {
      return NextResponse.json(
        { error: 'Must provide either is_read or is_acknowledged' },
        { status: 400 }
      )
    }

    // STEP 4: Fetch alert and verify ownership
    const alert = await prisma.alert.findUnique({
      where: { id },
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    // STEP 5: Security check - verify alert belongs to user
    if (alert.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to update this alert' },
        { status: 403 }
      )
    }

    // STEP 6: Build update data
    const updateData: any = {}

    if (is_read !== undefined) {
      updateData.is_read = is_read
    }

    if (is_acknowledged !== undefined) {
      updateData.is_acknowledged = is_acknowledged

      // When acknowledging, set timestamp and user
      if (is_acknowledged === true) {
        updateData.acknowledged_at = new Date()
        updateData.acknowledged_by = user.id
      } else {
        // When un-acknowledging, clear timestamp and user
        updateData.acknowledged_at = null
        updateData.acknowledged_by = null
      }
    }

    console.log('[API /alerts/[id]] PATCH request:', {
      alert_id: id,
      user_id: user.id,
      updates: updateData,
    })

    // STEP 7: Update alert
    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: updateData,
    })

    console.log('[API /alerts/[id]] Alert updated successfully')

    return NextResponse.json(updatedAlert)
  } catch (error) {
    console.error('[API /alerts/[id]] Error updating alert:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

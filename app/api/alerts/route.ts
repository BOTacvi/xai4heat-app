/**
 * GET /api/alerts
 *
 * Fetch user's alerts with filtering, sorting, and pagination
 *
 * QUERY PARAMETERS:
 * - is_acknowledged (boolean): Filter by acknowledgment status
 * - is_read (boolean): Filter by read status
 * - source (AlertSource): Filter by THERMIONIX, SCADA, or WEATHERLINK
 * - alert_type (AlertType): Filter by specific alert type
 * - severity (AlertSeverity): Filter by LOW, MEDIUM, or HIGH
 * - from (ISO date): Filter alerts created after this date
 * - to (ISO date): Filter alerts created before this date
 * - limit (number): Results per page (max 200, default 50)
 * - offset (number): Pagination offset (default 0)
 *
 * ORDERING:
 * 1. Unacknowledged alerts first (is_acknowledged ASC)
 * 2. High severity first (severity DESC: HIGH > MEDIUM > LOW)
 * 3. Most recent first (created_at DESC)
 *
 * RESPONSE:
 * {
 *   alerts: Alert[],
 *   total: number,
 *   limit: number,
 *   offset: number,
 *   hasMore: boolean
 * }
 *
 * AUTHENTICATION:
 * - Requires valid session
 * - Returns 401 if not authenticated
 * - Only returns alerts belonging to authenticated user
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { AlertType, AlertSource, AlertSeverity } from '@/lib/generated/prisma'

export async function GET(req: Request) {
  try {
    // STEP 1: Authentication check
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // STEP 2: Parse query parameters
    const { searchParams } = new URL(req.url)

    const isAcknowledged = searchParams.get('is_acknowledged')
    const isRead = searchParams.get('is_read')
    const source = searchParams.get('source') as AlertSource | null
    const alertType = searchParams.get('alert_type') as AlertType | null
    const severity = searchParams.get('severity') as AlertSeverity | null
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    // STEP 3: Validate and parse pagination parameters
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 50
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0

    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      )
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { error: 'Invalid offset parameter' },
        { status: 400 }
      )
    }

    // STEP 4: Build WHERE clause for filtering
    const whereClause: any = {
      user_id: user.id, // Security: only user's alerts
    }

    // Filter by acknowledgment status
    if (isAcknowledged !== null) {
      whereClause.is_acknowledged = isAcknowledged === 'true'
    }

    // Filter by read status
    if (isRead !== null) {
      whereClause.is_read = isRead === 'true'
    }

    // Filter by source
    if (source && ['THERMIONIX', 'SCADA', 'WEATHERLINK'].includes(source)) {
      whereClause.source = source
    }

    // Filter by alert type
    if (alertType) {
      whereClause.alert_type = alertType
    }

    // Filter by severity
    if (severity && ['LOW', 'MEDIUM', 'HIGH'].includes(severity)) {
      whereClause.severity = severity
    }

    // Filter by date range
    if (from || to) {
      whereClause.created_at = {}

      if (from) {
        const fromDate = new Date(from)
        if (!isNaN(fromDate.getTime())) {
          whereClause.created_at.gte = fromDate
        }
      }

      if (to) {
        const toDate = new Date(to)
        if (!isNaN(toDate.getTime())) {
          whereClause.created_at.lte = toDate
        }
      }
    }

    console.log('[API /alerts] GET request:', {
      user_id: user.id,
      filters: whereClause,
      limit,
      offset,
    })

    // STEP 5: Fetch alerts with pagination
    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where: whereClause,
        orderBy: [
          { is_acknowledged: 'asc' },  // Unacknowledged first
          { severity: 'desc' },         // HIGH > MEDIUM > LOW
          { created_at: 'desc' },       // Most recent first
        ],
        take: limit,
        skip: offset,
      }),
      prisma.alert.count({
        where: whereClause,
      }),
    ])

    // STEP 6: Calculate hasMore flag for pagination
    const hasMore = offset + alerts.length < total

    console.log('[API /alerts] Returning:', {
      count: alerts.length,
      total,
      hasMore,
    })

    return NextResponse.json({
      alerts,
      total,
      limit,
      offset,
      hasMore,
    })
  } catch (error) {
    console.error('[API /alerts] Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

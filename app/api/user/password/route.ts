/**
 * Password Change API Route
 *
 * PUT /api/user/password
 *
 * Allows authenticated users to change their password
 *
 * REQUEST BODY:
 * {
 *   currentPassword: string,
 *   newPassword: string
 * }
 *
 * SECURITY:
 * - Requires authentication
 * - Validates current password before allowing change
 * - Enforces minimum password length
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const MIN_PASSWORD_LENGTH = 6

export async function PUT(request: NextRequest) {
  try {
    // STEP 1: Get authenticated user
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
    const { currentPassword, newPassword } = body

    // STEP 3: Validate input
    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { error: 'Current password is required' },
        { status: 400 }
      )
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      )
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      )
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      )
    }

    // STEP 4: Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })

    if (signInError) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // STEP 5: Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      console.error('[Password API] Update error:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 400 }
      )
    }

    // STEP 6: Return success
    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    })

  } catch (error) {
    console.error('[Password API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

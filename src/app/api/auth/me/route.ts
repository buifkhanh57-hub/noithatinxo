import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-token'

/**
 * GET /api/auth/me
 *
 * Verifies the caller's ACCESS token (Authorization: Bearer, or ?token=
 * legacy convenience) and returns the FRESH user row from the DB so
 * name/role/points are always current.
 *
 * Failure codes (machine-readable):
 *   NO_TOKEN       → no token provided (user simply not logged in)
 *   TOKEN_EXPIRED  → expired access token (client should try /api/auth/refresh)
 *   TOKEN_INVALID  → bad signature / wrong type → re-login required
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(
    req.headers.get('authorization') ?? (req.nextUrl.searchParams.get('token')
      ? `Bearer ${req.nextUrl.searchParams.get('token')}`
      : null)
  )
  if ('error' in auth) {
    return NextResponse.json(
      { success: false, error: auth.error, code: auth.code },
      { status: auth.status }
    )
  }

  // Always re-read from DB so role promotions / profile edits are reflected.
  const user = await db.user.findUnique({ where: { id: auth.userId } })
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Tài khoản không còn tồn tại', code: 'TOKEN_INVALID' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      loyaltyPoints: user.loyaltyPoints,
      memberTier: user.memberTier,
    },
  })
}

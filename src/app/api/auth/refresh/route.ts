import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/lib/db'
import {
  REFRESH_COOKIE,
  setRefreshCookie,
  clearRefreshCookie,
  signAuthToken,
  signRefreshToken,
} from '@/lib/auth-token'

/**
 * POST /api/auth/refresh
 *
 * Exchanges a VALID httpOnly refresh-token cookie for:
 *   1. A brand-new short-lived ACCESS token (returned in the body)
 *   2. A rotated long-lived refresh cookie (set again below)
 *
 * The user row is re-read from the DB on every refresh so role changes
 * (e.g. promote-user to ADMIN) propagate WITHOUT forcing re-login.
 *
 * Failure codes (machine-readable, used by the client auth layer):
 *   NO_REFRESH_TOKEN → no cookie at all (user never logged in / cookie lost)
 *   REFRESH_EXPIRED  → refresh token expired → real re-login required
 *   REFRESH_INVALID  → bad signature / tampered / user gone → re-login required
 */
export async function POST(req: NextRequest) {
  const raw = req.cookies.get(REFRESH_COOKIE)?.value

  if (!raw) {
    return NextResponse.json(
      {
        success: false,
        error: 'Không tìm thấy phiên đăng nhập để làm mới',
        code: 'NO_REFRESH_TOKEN',
      },
      { status: 401 }
    )
  }

  // Verify the refresh JWT with a precise failure reason.
  const SECRET = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'fallback-dev-secret-change-in-production'
  )
  let reason: 'expired' | 'invalid' | 'valid' = 'invalid'
  let userId = ''
  try {
    const { payload } = await jwtVerify(raw, SECRET)
    if ((payload.typ as string | undefined) === 'refresh' && payload.userId) {
      userId = payload.userId as string
      reason = 'valid'
    }
  } catch (err) {
    reason =
      err && typeof err === 'object' && (err as { code?: string }).code === 'ERR_JWT_EXPIRED'
        ? 'expired'
        : 'invalid'
  }

  if (reason !== 'valid' || !userId) {
    // Kill the dead/invalid cookie so the browser stops sending it.
    const rejectRes = NextResponse.json(
      {
        success: false,
        error:
          reason === 'expired'
            ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
            : 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
        code: reason === 'expired' ? 'REFRESH_EXPIRED' : 'REFRESH_INVALID',
      },
      { status: 401 }
    )
    clearRefreshCookie(rejectRes)
    return rejectRes
  }

  // Refresh valid — re-read the CURRENT user from DB (fresh role/points).
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) {
    const ghostRes = NextResponse.json(
      {
        success: false,
        error: 'Tài khoản không còn tồn tại. Vui lòng đăng nhập lại.',
        code: 'REFRESH_INVALID',
      },
      { status: 401 }
    )
    clearRefreshCookie(ghostRes)
    return ghostRes
  }

  const token = await signAuthToken({ userId: user.id, email: user.email, role: user.role })
  const newRefresh = await signRefreshToken({ userId: user.id, email: user.email, role: user.role })

  const res = NextResponse.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      loyaltyPoints: user.loyaltyPoints,
      memberTier: user.memberTier,
      token,
    },
  })
  // Rotation — every refresh issues a fresh long-lived cookie.
  setRefreshCookie(res, newRefresh)
  return res
}

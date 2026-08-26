// JWT auth token — sign/verify tokens using NEXTAUTH_SECRET.
//
// Token model (2-token pattern):
//   - ACCESS token: short-lived, returned in the login/register response body
//     and stored by the client; sent as `Authorization: Bearer <token>` on
//     every authenticated API call.
//   - REFRESH token: long-lived, NEVER exposed to JS — delivered + rotated
//     via an httpOnly cookie (`avh_refresh`). Used only by /api/auth/refresh.
//
// Backwards compatibility: legacy tokens signed before this change have no
// `typ` claim and a 7d expiry — they verify as ACCESS tokens (typ 'access'),
// so existing sessions keep working until their natural expiry. After that
// the refresh flow transparently takes over.

import { SignJWT, jwtVerify } from 'jose'
import type { NextRequest, NextResponse } from 'next/server'

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-dev-secret-change-in-production'
)

export const ACCESS_TOKEN_TTL = '30m'
export const REFRESH_TOKEN_TTL = '30d'

export interface AuthPayload {
  userId: string
  email: string
  role: string // CUSTOMER | ADMIN | STAFF
}

/** Sign a short-lived ACCESS JWT for a user (returned by login/register/oauth). */
export async function signAuthToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload, typ: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(SECRET)
}

/** Sign a long-lived REFRESH JWT (stored ONLY in an httpOnly cookie). */
export async function signRefreshToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload, typ: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(SECRET)
}

export type VerifyResult =
  | { ok: true; payload: AuthPayload }
  | { ok: false; reason: 'expired' | 'invalid' }

/**
 * Verify a JWT with PRECISE failure reasons so the UI can distinguish:
 *   - access token hết hạn   → reason 'expired'  (refresh flow can recover)
 *   - token sai/h bị giả mạo → reason 'invalid' (re-login required)
 *
 * expectedType:
 *   - 'access'  → accepts access tokens + legacy tokens without typ (default)
 *   - 'refresh' → accepts ONLY refresh tokens (never accepted elsewhere)
 *   - 'any'     → no type filter
 */
export async function verifyAuthTokenDetailed(
  token: string,
  expectedType: 'access' | 'refresh' | 'any' = 'access'
): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    const typ = (payload.typ as string | undefined) || 'access' // legacy → access
    if (expectedType !== 'any' && typ !== expectedType) {
      return { ok: false, reason: 'invalid' }
    }
    if (!payload.userId || !payload.email || !payload.role) {
      return { ok: false, reason: 'invalid' }
    }
    return {
      ok: true,
      payload: {
        userId: payload.userId as string,
        email: payload.email as string,
        role: payload.role as string,
      },
    }
  } catch (err) {
    // jose throws JWTExpired with code ERR_JWT_EXPIRED for expired tokens
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'ERR_JWT_EXPIRED') {
      return { ok: false, reason: 'expired' }
    }
    return { ok: false, reason: 'invalid' }
  }
}

/** Verify an ACCESS token. Returns payload or null. Refresh tokens are REJECTED here. */
export async function verifyAuthToken(token: string): Promise<AuthPayload | null> {
  const res = await verifyAuthTokenDetailed(token, 'access')
  return res.ok ? res.payload : null
}

/** Extract + verify ACCESS token from an Authorization header. Returns payload or null. */
export async function getAuthFromHeader(authHeader: string | null): Promise<AuthPayload | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  return verifyAuthToken(authHeader.slice(7))
}

export interface AuthErrorInfo {
  error: string
  status: number
  /** machine-readable code — client maps these to friendly VN messages */
  code: 'NO_TOKEN' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'FORBIDDEN'
}

/**
 * Require admin role. Call at the top of every admin API route (or use
 * adminGuard which wraps this). Returns the auth payload if OK, or
 * `{ error, status, code }` with a PRECISE kind of failure:
 *   NO_TOKEN       → request had no Authorization header at all
 *   TOKEN_EXPIRED  → access token expired but signature was valid
 *   TOKEN_INVALID  → bad signature / wrong token type
 * NOT "everything is not-logged-in" like before.
 */
export async function requireAdmin(
  authHeader: string | null
): Promise<AuthPayload | AuthErrorInfo> {
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: 'Bạn cần đăng nhập để thực hiện thao tác này',
      status: 401,
      code: 'NO_TOKEN',
    }
  }
  const res = await verifyAuthTokenDetailed(authHeader.slice(7), 'access')
  if (!res.ok) {
    if (res.reason === 'expired') {
      return {
        error: 'Phiên đăng nhập đã hết hạn. Vui lòng thử lại hoặc đăng nhập lần nữa.',
        status: 401,
        code: 'TOKEN_EXPIRED',
      }
    }
    return {
      error: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
      status: 401,
      code: 'TOKEN_INVALID',
    }
  }
  const payload = res.payload
  if (payload.role !== 'ADMIN' && payload.role !== 'STAFF') {
    return {
      error: 'Không có quyền truy cập quản trị',
      status: 403,
      code: 'FORBIDDEN',
    }
  }
  return payload
}

/**
 * Require ANY logged-in user (no role check). Same precise error kinds as
 * requireAdmin — used by customer-scoped routes (addresses, profile, orders…).
 */
export async function requireUser(
  authHeader: string | null
): Promise<AuthPayload | AuthErrorInfo> {
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: 'Bạn cần đăng nhập để thực hiện thao tác này',
      status: 401,
      code: 'NO_TOKEN',
    }
  }
  const res = await verifyAuthTokenDetailed(authHeader.slice(7), 'access')
  if (!res.ok) {
    if (res.reason === 'expired') {
      return {
        error: 'Phiên đăng nhập đã hết hạn. Vui lòng thử lại hoặc đăng nhập lần nữa.',
        status: 401,
        code: 'TOKEN_EXPIRED',
      }
    }
    return {
      error: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
      status: 401,
      code: 'TOKEN_INVALID',
    }
  }
  return res.payload
}

// ─── Refresh-token httpOnly cookie helpers ──────────────────────────────

export const REFRESH_COOKIE = 'avh_refresh'

const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days, matches REFRESH_TOKEN_TTL

/** Set the httpOnly refresh cookie on a response (login/register/refresh). */
export function setRefreshCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: REFRESH_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  })
}

/** Clear the refresh cookie (logout / rejected refresh). */
export function clearRefreshCookie(res: NextResponse): void {
  res.cookies.set({
    name: REFRESH_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

/** Read + verify the refresh token from the incoming request's cookies. */
export async function getVerifiedRefreshToken(req: NextRequest): Promise<VerifyResult> {
  const raw = req.cookies.get(REFRESH_COOKIE)?.value
  if (!raw) return { ok: false, reason: 'invalid' }
  return verifyAuthTokenDetailed(raw, 'refresh')
}

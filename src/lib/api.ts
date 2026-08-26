// Lightweight typed fetch wrapper for the AVH API.
//
// Auth behaviour (fixed per merchant requirement):
//   1. Attaches the JWT access token from the auth store to every request.
//   2. On a 401 whose code indicates an expired/invalid token, silently
//      refreshes the session ONCE via /api/auth/refresh and RETRIES the
//      original request EXACTLY ONCE with the new token.
//   3. If refresh fails → the session is genuinely dead: stale identity is
//      cleared and a PRECISE error kind is thrown so UI can say exactly what
//      happened ("chưa đăng nhập" vs "phiên hết hạn" vs "không đủ quyền").
//   No infinite retries, no blanket "not logged in" for every failure.

import { performSessionRefresh } from '@/lib/auth-client'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string
}

export type ApiErrorKind =
  | 'auth_not_logged_in'   // chưa đăng nhập
  | 'auth_session_expired' // access token hết hạn & refresh thất bại
  | 'forbidden'            // đã đăng nhập nhưng không đủ quyền
  | 'validation'           // 4xx khác (thiếu dữ liệu, sai định dạng…)
  | 'server'               // 5xx
  | 'network'              // không gọi được server
  | 'unknown'

export class ApiError extends Error {
  status: number
  kind: ApiErrorKind
  code?: string
  constructor(message: string, status: number, kind?: ApiErrorKind, code?: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
    this.code = code
    this.kind = kind ?? inferKind(status)
  }
}

function inferKind(status: number): ApiErrorKind {
  if (status === 401) return 'auth_session_expired'
  if (status === 403) return 'forbidden'
  if (status >= 500) return 'server'
  if (status >= 400) return 'validation'
  return 'unknown'
}

/** Read the auth token from localStorage (avoids circular import with zustand). */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('avh-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.user?.token || null
  } catch {
    return null
  }
}

/** These endpoints manage auth themselves — never auto-refresh/retry them. */
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/reset-password', '/api/auth/logout']

/** Backend codes that mean "the ACCESS token failed, refresh might fix it". */
const REFRESHABLE_CODES = new Set(['NO_TOKEN', 'TOKEN_EXPIRED', 'TOKEN_INVALID'])

async function request<T>(url: string, options?: RequestInit, retried = false): Promise<T> {
  const token = getAuthToken()
  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // Attach JWT token for authentication — API routes verify this.
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers || {}),
      },
      cache: 'no-store',
    })
  } catch {
    // fetch only throws on network-level failures (offline, DNS…)
    throw new ApiError('Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.', 0, 'network')
  }

  // handle non-JSON gracefully
  const text = await res.text()
  let body: ApiResponse<T> & { code?: string }
  try {
    body = text ? JSON.parse(text) : { success: false }
  } catch {
    throw new ApiError(`Phản hồi không hợp lệ từ máy chủ`, res.status, 'server')
  }

  if (!res.ok || !body.success) {
    const code = body.code

    // ── Silent session renewal ────────────────────────────────────────
    // Access token expired (or lost) but the httpOnly refresh cookie may
    // still be valid → refresh once, then retry the request once.
    if (
      res.status === 401 &&
      !retried &&
      code !== undefined &&
      REFRESHABLE_CODES.has(code) &&
      !AUTH_ENDPOINTS.some((ep) => url.startsWith(ep))
    ) {
      const refreshed = await performSessionRefresh()
      if (refreshed) {
        return request<T>(url, options, true)
      }
    }

    // Precise kind mapping instead of the old catch-all "not logged in".
    let kind: ApiErrorKind
    let message = body.error || body.message || `Lỗi ${res.status}`
    if (res.status === 401) {
      if (code === 'NO_TOKEN' || (!code && message.includes('cần đăng nhập'))) {
        kind = 'auth_not_logged_in'
      } else {
        kind = 'auth_session_expired'
      }
    } else if (res.status === 403) {
      kind = 'forbidden'
    } else if (res.status >= 500) {
      kind = 'server'
    } else if (res.status >= 400) {
      kind = 'validation'
    } else {
      kind = 'unknown'
    }
    throw new ApiError(message, res.status, kind, code)
  }
  return (body.data ?? (body as unknown as T))
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  del: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
}

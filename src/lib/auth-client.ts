'use client'

// Shared client-side session renewal.
//
// Contract (matches the merchant requirement):
//   - Access token hết hạn nhưng refresh token còn hiệu lực
//       → tự động refresh session, request được thử lại ĐÚNG MỘT LẦN.
//   - Refresh cũng hết hạn / không hợp lệ
//       → xoá identity cũ khỏi localStorage/store để UI không còn "giả vờ"
//         đã đăng nhập, thông báo lỗi chính xác cho người dùng đăng nhập lại.
//
// `performSessionRefresh` is single-flight: N parallel API calls hitting 401
// trigger ONE refresh call, then all proceed — no thundering herd, no loops.

import { useAuthStore } from '@/lib/stores/auth-store'

let refreshPromise: Promise<boolean> | null = null

/** Ask /api/auth/refresh to rotate the session. Returns true on success. */
export async function performSessionRefresh(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // send the httpOnly avh_refresh cookie
        cache: 'no-store',
      })
      const body = await res.json().catch(() => null)

      if (res.ok && body?.success && body?.data?.token) {
        const st = useAuthStore.getState()
        const prev = st.user
        const d = body.data
        st.setUser({
          id: d.id ?? prev?.id ?? '',
          name: d.name ?? prev?.name ?? '',
          email: d.email ?? prev?.email ?? '',
          role: (d.role ?? prev?.role ?? 'CUSTOMER'),
          avatarUrl: d.avatarUrl ?? prev?.avatarUrl,
          loyaltyPoints: d.loyaltyPoints ?? prev?.loyaltyPoints,
          memberTier: d.memberTier ?? prev?.memberTier,
          token: d.token,
        })
        return true
      }

      // 401 from refresh = refresh token missing/expired/invalid —
      // this is the REAL "session hết hạn" case: clear stale identity so
      // every UI surface stops treating the visitor as logged in.
      if (res.status === 401) {
        useAuthStore.getState().setUser(null)
      }
      return false
    } catch {
      // Network failure during refresh — do NOT clear the session;
      // the user may simply be offline for a moment.
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

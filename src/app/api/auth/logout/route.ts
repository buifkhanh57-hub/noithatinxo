import { NextRequest, NextResponse } from 'next/server'
import { clearRefreshCookie } from '@/lib/auth-token'

// POST /api/auth/logout — clears the httpOnly refresh-token cookie.
// The short-lived access token held by the client simply expires unused.
export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true })
  clearRefreshCookie(res)
  return res
}

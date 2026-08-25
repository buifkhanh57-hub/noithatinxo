import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'

const GMAIL_ACCOUNTS = [
  'buifkhanh57@gmail.com',
  'nguyenanh2406@gmail.com',
  'duongyenavh@gmail.com',
  'buithimai11021987@gmail.com',
]

export async function GET() {
  return POST(new NextRequest('http://localhost/api/admin/promote-users'))
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { verifyAuthToken } = await import('@/lib/auth-token')
  const auth = await verifyAuthToken(token)
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Not admin' }, { status: 403 })
  }

  const results: string[] = []
  for (const email of GMAIL_ACCOUNTS) {
    const user = await db.user.findUnique({ where: { email } })
    if (user) {
      await db.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN', passwordHash: hashPassword('AVHSTORE@123') },
      })
      results.push(`✓ ${email} promoted to ADMIN`)
    } else {
      await db.user.create({
        data: {
          email,
          name: email.split('@')[0],
          role: 'ADMIN',
          passwordHash: hashPassword('AVHSTORE@123'),
          authProviders: 'email',
          memberTier: 'PLATINUM',
        },
      })
      results.push(`✓ ${email} created as ADMIN`)
    }
  }

  return NextResponse.json({ success: true, data: results })
}

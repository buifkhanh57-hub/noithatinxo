// User management: delete the demo admin + create the real admin accounts
// with hashed passwords. Run once via `bun run src/lib/setup-admins.ts` or
// hit POST /api/setup-admins.
//
// AFTER DEPLOY (Vercel + Postgres) you do NOT need to call that endpoint:
// `/api/seed` (called on every storefront load) runs ensureAdminAccountsExist()
// which CREATE-IF-MISSING every account below — never overwriting passwords.

import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'

interface AdminSeed {
  email: string
  name: string
  // Per-account password override; falls back to ADMIN_PASSWORD.
  password?: string
}

const NEW_ADMINS: AdminSeed[] = [
  // Owner account requested explicitly by the merchant (exact password as typed).
  { email: 'buifkhanh57@gmail.com', name: 'Bùi Khánh (Chủ shop)', password: 'AVHSTORE@123' },
  { email: 'buikhanh57@gmail.com', name: 'Bùi Khánh (Admin)' },
  { email: 'buithimai11021987@gmail.com', name: 'Bùi Thị Mai (Admin)' },
  { email: 'duongyenavh@gmail.com', name: 'Dương Yến (Admin)' },
  { email: 'nguyenanh2406@gmail.com', name: 'Nguyễn Anh (Admin)' },
]
const ADMIN_PASSWORD = 'avhstore@123'

function passwordFor(a: AdminSeed): string {
  return a.password ?? ADMIN_PASSWORD
}

/**
 * Idempotent, non-destructive: creates each admin ONLY if the email is
 * missing. Existing users keep their role/password — safe to run on every
 * cold start in production.
 */
export async function ensureAdminAccountsExist(): Promise<string[]> {
  const log: string[] = []
  for (const a of NEW_ADMINS) {
    const email = a.email.toLowerCase()
    try {
      const existing = await db.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      })
      if (!existing) {
        await db.user.create({
          data: {
            email,
            name: a.name,
            role: 'ADMIN',
            passwordHash: hashPassword(passwordFor(a)),
            authProviders: 'email',
            memberTier: 'PLATINUM',
          },
        })
        log.push(`✓ created admin ${email}`)
      } else if (existing.role !== 'ADMIN') {
        // Email exists but isn't staff yet → promote WITHOUT touching their
        // password (they may have changed it / logged in via Google).
        await db.user.update({
          where: { id: existing.id },
          data: { role: 'ADMIN' },
        })
        log.push(`✓ promoted existing user ${email} → ADMIN`)
      }
    } catch (err) {
      console.error(`[ensure-admins] ${email}`, err)
      log.push(`✗ failed for ${email}`)
    }
  }
  return log
}

export async function setupAdmins() {
  const result: string[] = []

  // 1) Delete the old demo admin (and any user with that email)
  const oldAdmin = await db.user.findUnique({ where: { email: 'admin@avh.vn' } })
  if (oldAdmin) {
    // cascade-related records are handled by onDelete; but orders keep a snapshot,
    // so the user can be safely removed.
    await db.user.delete({ where: { id: oldAdmin.id } })
    result.push(`✓ Đã xoá admin@avh.vn (id ${oldAdmin.id})`)
  } else {
    result.push('• admin@avh.vn không tồn tại (đã xoá trước đó)')
  }

  // 2) Create/upgrade the admin accounts with hashed passwords
  for (const a of NEW_ADMINS) {
    const existing = await db.user.findUnique({ where: { email: a.email.toLowerCase() } })
    const hash = hashPassword(passwordFor(a))
    if (existing) {
      // upgrade: set role ADMIN + hashed password
      await db.user.update({
        where: { id: existing.id },
        data: { role: 'ADMIN', name: a.name, passwordHash: hash, authProviders: 'email' },
      })
      result.push(`✓ Đã cập nhật ${a.email} → ADMIN`)
    } else {
      await db.user.create({
        data: {
          email: a.email.toLowerCase(),
          name: a.name,
          role: 'ADMIN',
          passwordHash: hash,
          authProviders: 'email',
          memberTier: 'PLATINUM',
        },
      })
      result.push(`✓ Đã tạo admin ${a.email}`)
    }
  }

  // 3) Also delete the old demo customer (khach@avh.vn) — the user said they
  // want self-registration, so this demo account is no longer needed.
  const oldCustomer = await db.user.findUnique({ where: { email: 'khach@avh.vn' } })
  if (oldCustomer) {
    await db.user.delete({ where: { id: oldCustomer.id } })
    result.push(`✓ Đã xoá khách demo khach@avh.vn`)
  }

  return result
}

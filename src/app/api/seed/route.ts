import { NextResponse } from 'next/server'
import { seedDatabase } from '@/lib/seed'
import { ensureAdminAccountsExist } from '@/lib/setup-admins'

// POST /api/seed?force=true  — seed (or re-seed) the database.
// In production this would be protected by an admin token.
export async function POST(req: Request) {
  const url = new URL(req.url)
  const force = url.searchParams.get('force') === 'true'
  try {
    const counts = await seedDatabase(force)
    // Auto-provision admin accounts after deploy — create-if-missing only,
    // never overwrites existing users/passwords. Non-fatal on error.
    let admins: string[] = []
    try {
      admins = await ensureAdminAccountsExist()
    } catch (err) {
      console.error('[seed] ensureAdminAccountsExist', err)
    }
    return NextResponse.json({ success: true, data: { ...counts, admins: admins.length } })
  } catch (err) {
    console.error('[seed] error', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Seed failed' },
      { status: 500 }
    )
  }
}

// GET /api/seed — also allow triggering via GET for convenience (e.g. browser prefetch)
export async function GET() {
  try {
    const counts = await seedDatabase(false)
    // Same auto-provisioning as POST. Runs on every storefront load but is
    // a handful of fast indexed lookups once all admins exist.
    let admins = 0
    try {
      const log = await ensureAdminAccountsExist()
      admins = log.filter((l) => l.startsWith('✓')).length
    } catch (err) {
      console.error('[seed] ensureAdminAccountsExist', err)
    }
    return NextResponse.json({ success: true, data: { ...counts, adminsProvisioned: admins } })
  } catch (err) {
    console.error('[seed] error', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Seed failed' },
      { status: 500 }
    )
  }
}

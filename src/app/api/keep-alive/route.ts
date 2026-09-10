import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/keep-alive
//
// ANTI-PAUSE HEARTBEAT for the hosted Postgres database (Supabase).
//
// WHY THIS EXISTS:
//   Supabase pauses free-tier projects after ~5-7 days with ZERO activity
//   (no API requests / DB connections). The storefront itself only touches
//   the DB when someone visits the site — a shop with no visitors for a few
//   days gets its database paused, which takes the whole site down until
//   someone manually restores the project in the Supabase dashboard.
//
// FIX: a Vercel Cron job (see vercel.json) calls this endpoint once a day.
//   The endpoint opens a DB connection and runs a couple of cheap indexed
//   reads, which counts as activity and keeps the Supabase project awake.
//
// SAFE TO EXPOSE:
//   - Only aggregated counts are returned (no PII, no emails, no orders).
//   - Read-only: never mutates any data.
//   - Called by Vercel Cron daily; a stray external hit costs one SELECT.

export async function GET() {
  const startedAt = Date.now()
  try {
    await db.$queryRaw`SELECT 1`

    // A few light reads so the connection does real work (and so the
    // response doubles as a tiny health report for the storefront).
    const [products, categories, blogPosts, orders] = await Promise.all([
      db.product.count({ where: { published: true } }),
      db.category.count(),
      db.blogPost.count({ where: { published: true } }),
      db.order.count(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        heartbeat: 'ok',
        products,
        categories,
        blogPosts,
        orders,
        durationMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[keep-alive] database check failed', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Database unreachable',
      },
      { status: 500 }
    )
  }
}

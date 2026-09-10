import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Browser-side Supabase client (safe to import in Client Components).
//
// NOTE: the AVH storefront talks to its database through Prisma
// (src/lib/db.ts) — this client exists for Supabase platform features that
// Prisma does not cover: Storage (product/transfer-slip files), Realtime,
// and Auth if the shop ever migrates to Supabase Auth.
//
// Required env vars (public, safe to expose to the browser):
//   NEXT_PUBLIC_SUPABASE_URL            e.g. https://<project-ref>.supabase.co
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   sb_publishable_... (or legacy anon key)

let cached: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (cached) return cached

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
        'Set them in .env.local (dev) and Vercel → Settings → Environment Variables (prod).'
    )
  }

  cached = createBrowserClient(supabaseUrl, supabaseKey)
  return cached
}

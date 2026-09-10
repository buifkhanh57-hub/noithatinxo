import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

// Server-side Supabase client for Server Components / Route Handlers.
//
// NOTE: the AVH storefront talks to its database through Prisma
// (src/lib/db.ts) — this client exists for Supabase platform features that
// Prisma does not cover (Storage, Realtime, Supabase Auth admin calls).
//
// Required env vars (public, safe to expose):
//   NEXT_PUBLIC_SUPABASE_URL            e.g. https://<project-ref>.supabase.co
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   sb_publishable_... (or legacy anon key)
//
// Usage in a Server Component / Route Handler:
//   const supabase = await createClient()
//   const { data } = await supabase.from('todos').select()

export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
        'Set them in .env (dev) and Vercel → Settings → Environment Variables (prod).'
    )
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component — safe to ignore because the
          // middleware refreshes user sessions (only relevant when Supabase
          // Auth is actually used; this app currently uses NextAuth).
        }
      },
    },
  })
}

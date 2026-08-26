// Canonical site URL helpers — used by SEO surfaces (metadata, JSON-LD,
// sitemap, robots) and by share buttons that need an absolute link.
//
// Resolution order (server):
//   1. NEXT_PUBLIC_SITE_URL  (recommended on Vercel — set to your domain,
//      e.g. https://noithat-avh.vercel.app or https://noithatavh.vn)
//   2. NEXTAUTH_URL          (already required by auth — good fallback)
//   3. http://localhost:3000 (local dev only)
//
// On the client we always use window.location.origin so the Preview Panel
// (proxied domain), vercel.app domain, and custom domains all work without
// extra configuration.

export function siteUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin

  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'

  return raw.replace(/\/+$/, '')
}

/** Deep-linkable product URL: https://site/san-pham/<slug> */
export function productUrl(slug: string): string {
  return `${siteUrl()}/san-pham/${encodeURIComponent(slug)}`
}

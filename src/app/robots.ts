import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

/**
 * robots.txt — dynamic so the Sitemap line always points at the real domain
 * (works identically on localhost, vercel.app preview and the custom domain,
 * with zero configuration).
 */

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/'] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}

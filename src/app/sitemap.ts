import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { siteUrl } from '@/lib/site-url'

/**
 * Dynamic sitemap — home + every published product.
 *
 * The SPA views (cart/admin/…) have no standalone URLs by design; only
 * crawlable routes belong here. DB failure must NEVER break the sitemap —
 * it degrades to the static entries so crawlers still get a valid XML.
 */

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  try {
    const products = await db.product.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    })
    for (const p of products) {
      entries.push({
        url: `${base}/san-pham/${encodeURIComponent(p.slug)}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  } catch (err) {
    console.error('[sitemap] DB unavailable, serving static entries', err)
  }

  return entries
}

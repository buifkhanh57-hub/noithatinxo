import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { siteUrl } from '@/lib/site-url'

/**
 * Dynamic sitemap:
 *   - static storefront pages (/ /san-pham /blog /theo-doi-don-hang /so-sanh)
 *   - every published product   → /san-pham/<slug>
 *   - every published blog post → /blog/<slug>
 *
 * Transient/private pages (cart, checkout, payment, account, admin,
 * wishlist, order-success) are intentionally excluded. DB failure must
 * NEVER break the sitemap — it degrades to the static entries.
 */

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const now = new Date()

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/san-pham`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/theo-doi-don-hang`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/so-sanh`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

  try {
    const [products, posts] = await Promise.all([
      db.product.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
      db.blogPost.findMany({
        where: { published: true },
        select: { slug: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
    ])

    for (const p of products) {
      entries.push({
        url: `${base}/san-pham/${encodeURIComponent(p.slug)}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
    for (const post of posts) {
      entries.push({
        url: `${base}/blog/${encodeURIComponent(post.slug)}`,
        lastModified: post.createdAt,
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }
  } catch (err) {
    console.error('[sitemap] DB unavailable, serving static entries', err)
  }

  return entries
}

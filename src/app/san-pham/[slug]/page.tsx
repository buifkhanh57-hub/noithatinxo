import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { siteUrl } from '@/lib/site-url'
import { AvhShell } from '@/components/avh/spa-shell'

/**
 * SEO landing page for a single product.
 *
 * URL: /san-pham/<slug>
 *
 * Everything visible to crawlers (title, description, canonical, Open Graph,
 * Twitter card, Product JSON-LD) is rendered SERVER-SIDE from the database;
 * the interactive SPA shell is then mounted so the customer can keep
 * shopping without leaving the app.
 */

export const dynamic = 'force-dynamic' // fresh price/stock on every crawl

interface PageProps {
  params: Promise<{ slug: string }>
}

// ── Helpers ──────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Make a media URL absolute; skip data-URIs (too long for OG tags). */
function absoluteMediaUrl(url: string | undefined | null): string | null {
  if (!url) return null
  if (url.startsWith('data:')) return null
  try {
    return new URL(url, siteUrl()).toString()
  } catch {
    return null
  }
}

async function getProduct(slug: string) {
  try {
    return await db.product.findUnique({
      where: { slug },
      include: {
        category: true,
        media: { orderBy: { sortOrder: 'asc' } },
        variants: { select: { price: true, stock: true } },
      },
    })
  } catch (err) {
    console.error('[san-pham] DB error', err)
    return null
  }
}

// ── Metadata (SEO) ───────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const base = siteUrl()
  const product = await getProduct(slug)

  if (!product || !product.published) {
    return {
      title: 'Không tìm thấy sản phẩm | Nội Thất AVH',
      robots: { index: false, follow: false },
    }
  }

  const description =
    stripHtml(product.description).slice(0, 158) ||
    `${product.name} chính hãng ${product.brand} — giá tốt tại Nội Thất AVH. Giao hàng toàn quốc, bảo hành rõ ràng.`

  const images = product.media
    .filter((m) => m.type === 'image')
    .map((m) => absoluteMediaUrl(m.url))
    .filter((u): u is string => Boolean(u))
    .slice(0, 3)

  return {
    title: `${product.name} | Nội Thất AVH`,
    description,
    alternates: {
      canonical: `${base}/san-pham/${encodeURIComponent(product.slug)}`,
    },
    openGraph: {
      title: product.name,
      description,
      url: `${base}/san-pham/${encodeURIComponent(product.slug)}`,
      siteName: 'Nội Thất AVH',
      locale: 'vi_VN',
      type: 'website',
      images: images.length > 0 ? images : [`${base}/avh-logo.png`],
    },
    twitter: {
      card: images.length > 0 ? 'summary_large_image' : 'summary',
      title: product.name,
      description,
      images: images.slice(0, 1),
    },
    robots: { index: true, follow: true },
  }
}

// ── Structured data (Google Rich Results) ────────────────────────────────

function buildProductJsonLd(product: NonNullable<Awaited<ReturnType<typeof getProduct>>>) {
  const base = siteUrl()
  const prices = [
    ...product.variants.map((v) => v.price),
    product.basePrice,
  ].filter((p) => typeof p === 'number' && p > 0)

  const price = prices.length > 0 ? Math.min(...prices) : product.basePrice
  const totalStock = product.variants.reduce((s, v) => s + (v.stock || 0), 0)

  const images = product.media
    .filter((m) => m.type === 'image')
    .map((m) => absoluteMediaUrl(m.url))
    .filter((u): u is string => Boolean(u))
    .slice(0, 5)

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: `AVH-${product.id.slice(-8).toUpperCase()}`,
    description: stripHtml(product.description).slice(0, 500),
    image: images,
    brand: { '@type': 'Brand', name: product.brand || 'AVH' },
    category: product.category?.name,
    offers: {
      '@type': 'Offer',
      url: `${base}/san-pham/${encodeURIComponent(product.slug)}`,
      priceCurrency: 'VND',
      price,
      availability:
        totalStock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Nội Thất AVH' },
    },
  }

  // Google requires ≥1 rating + ≥1 review count for star snippets — only
  // emit when the denormalized counters are meaningful.
  if (product.reviewCount > 0 && product.rating > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round(product.rating * 10) / 10,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return JSON.stringify(jsonLd)
}

// ── Page ─────────────────────────────────────────────────────────────────

export default async function ProductSeoPage({ params }: PageProps) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product || !product.published) {
    // Emits a real HTTP 404 (good for SEO) and renders not-found.tsx
    notFound()
  }

  return (
    <>
      {/* Google Rich Results — server-rendered, invisible to users */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildProductJsonLd(product) }}
      />
      <AvhShell initialSlug={slug} />
    </>
  )
}

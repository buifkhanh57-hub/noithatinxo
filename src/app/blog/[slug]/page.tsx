import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { siteUrl } from '@/lib/site-url'
import { AppShellForRoute } from '@/components/avh/route-mount'

/**
 * SEO landing page for a blog post: /blog/<slug>
 * Server-renders title/description/canonical/OG + BlogPosting JSON-LD,
 * then mounts the SPA shell with the blog-detail view.
 */

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Make the cover URL absolute; skip data-URIs (too long for OG). */
function absoluteCover(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('data:')) return null
  try {
    return new URL(url, siteUrl()).toString()
  } catch {
    return null
  }
}

async function getPost(slug: string) {
  try {
    const post = await db.blogPost.findUnique({
      where: { slug },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        coverUrl: true,
        tags: true,
        published: true,
        createdAt: true,
        authorId: true,
      },
    })
    if (!post) return null
    // Schema has no author relation on BlogPost → resolve the display name
    // separately; absence is fine (falls back to brand).
    let authorName: string | null = null
    if (post.authorId) {
      try {
        const u = await db.user.findUnique({
          where: { id: post.authorId },
          select: { name: true },
        })
        authorName = u?.name ?? null
      } catch {
        /* keep null */
      }
    }
    return { ...post, authorName }
  } catch (err) {
    console.error('[blog/slug] DB error', err)
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const base = siteUrl()
  const post = await getPost(slug)

  if (!post || !post.published) {
    return {
      title: 'Không tìm thấy bài viết | Nội Thất AVH',
      robots: { index: false, follow: false },
    }
  }

  const description =
    stripHtml(post.excerpt || post.content).slice(0, 158) ||
    'Bài viết cẩm nang nội thất từ Nội Thất AVH.'

  const cover = absoluteCover(post.coverUrl)

  return {
    title: `${post.title} | Cẩm nang nội thất AVH`,
    description,
    alternates: { canonical: `${base}/blog/${encodeURIComponent(post.slug)}` },
    openGraph: {
      title: post.title,
      description,
      url: `${base}/blog/${encodeURIComponent(post.slug)}`,
      siteName: 'Nội Thất AVH',
      locale: 'vi_VN',
      type: 'article',
      publishedTime: post.createdAt?.toISOString(),
      images: cover ? [cover] : [`${base}/avh-logo.png`],
    },
    twitter: {
      card: cover ? 'summary_large_image' : 'summary',
      title: post.title,
      description,
      images: cover ? [cover] : undefined,
    },
    robots: { index: true, follow: true },
  }
}

export default async function BlogSeoPage({ params }: PageProps) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post || !post.published) {
    notFound()
  }

  // BlogPosting structured data — eligible for Google article rich results.
  let jsonLd = ''
  try {
    const cover = absoluteCover(post.coverUrl)
    jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: stripHtml(post.excerpt || post.content).slice(0, 300),
      image: cover ? [cover] : undefined,
      datePublished: post.createdAt?.toISOString(),
      dateModified: post.createdAt?.toISOString(),
      author: { '@type': 'Organization', name: post.authorName || 'Nội Thất AVH' },
      publisher: {
        '@type': 'Organization',
        name: 'Nội Thất AVH',
        logo: { '@type': 'ImageObject', url: `${siteUrl()}/avh-logo.png` },
      },
      mainEntityOfPage: `${siteUrl()}/blog/${encodeURIComponent(post.slug)}`,
      inLanguage: 'vi-VN',
    })
  } catch {
    /* metadata must never break page render */
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      <AppShellForRoute view="blog-detail" params={{ slug }} />
    </>
  )
}

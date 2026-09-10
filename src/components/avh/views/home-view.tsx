'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUIStore } from '@/lib/stores/ui-store'
import { useMounted } from '@/hooks/use-mounted'
import { useRecentStore } from '@/lib/stores/recent-store'
import { HeroCarousel } from '@/components/avh/hero-carousel'
import { ProductCard, ProductListItem } from '@/components/avh/product-card'
import { CountdownTimer } from '@/components/avh/countdown-timer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowRight, Flame, Sparkles, Truck, ShieldCheck, Headphones, TrendingUp, Newspaper, Zap } from 'lucide-react'
import Image from 'next/image'
import { formatVND } from '@/lib/format'

interface Banner { id: string; title: string; imageUrl: string; mobileImageUrl?: string; link?: string }
interface Category { id: string; name: string; slug: string; icon?: string; imageUrl?: string; productCount: number }

export function HomeView() {
  const setView = useUIStore((s) => s.setView)
  // `mounted` is false during SSR + first client render → render skeletons
  // (matching server). After mount, we render real data (which TanStack
  // Query may have from cache or fetch fresh). Without this gate, the
  // server renders skeletons (no data fetched yet) while the client's
  // first render may have cached data → React throws hydration error:
  // "server rendered HTML didn't match the client".
  const mounted = useMounted()

  const { data: banners } = useQuery<Banner[]>({
    queryKey: ['banners'],
    queryFn: () => api.get('/api/banners'),
  })
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories'),
  })
  const { data: featured } = useQuery<{ items: ProductListItem[] }>({
    queryKey: ['products', 'featured'],
    queryFn: () => api.get('/api/products?featured=true&limit=8'),
  })
  const { data: flashSale } = useQuery<{ items: ProductListItem[] }>({
    queryKey: ['products', 'flashSale'],
    queryFn: () => api.get('/api/products?flashSale=true&limit=6'),
  })
  const { data: newProducts } = useQuery<{ items: ProductListItem[] }>({
    queryKey: ['products', 'new'],
    queryFn: () => api.get('/api/products?sort=newest&limit=8'),
  })
  const { data: blogPosts } = useQuery<any[]>({
    queryKey: ['blog'],
    queryFn: () => api.get('/api/blog'),
  })

  // Flash sale window: ends at 23:59:59 TODAY (real deadline). When the
  // countdown hits zero the whole section hides — no fake "permanent" sale.
  // useMemo keeps the target stable across re-renders so it never drifts.
  const flashEnd = useMemo(() => {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d
  }, [])
  const [flashOver, setFlashOver] = useState(false)

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
      {/* Hero */}
      <HeroCarousel banners={banners ?? []} />

      {/* Quick service highlights */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Truck, title: 'Giao toàn quốc', sub: 'Free ship 3tr+' },
          { icon: ShieldCheck, title: 'Bảo hành 24-36T', sub: 'Chính hãng AVH' },
          { icon: Flame, title: 'Flash sale cuối tuần', sub: 'Giảm đến 35%' },
          { icon: Headphones, title: 'Hỗ trợ 24/7', sub: 'Trợ Lý AVH' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-lg border bg-card p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <s.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold sm:text-sm">{s.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{s.sub}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categories — frameless tiles: chỉ ảnh + tên, không viền/khung */}
      <section className="mt-6 sm:mt-8">
        <SectionHeader title="Danh mục nổi bật" subtitle="Duyệt theo không gian sống" />
        {!mounted || !categories ? (
          <div className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-6 sm:gap-y-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
          </div>
        ) : (
          <nav aria-label="Danh mục sản phẩm">
            <div className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-6 sm:gap-y-4">
              {categories.map((c) => (
                <a
                  key={c.id}
                  href={`/san-pham?cat=${encodeURIComponent(c.slug)}`}
                  className="group flex flex-col items-center gap-2 text-center"
                  title={c.name}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                    {c.imageUrl ? (
                      <Image
                        src={c.imageUrl}
                        alt={c.name}
                        fill
                        sizes="(max-width: 640px) 33vw, 160px"
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl">🪑</div>
                    )}
                  </div>
                  <p className="line-clamp-1 text-xs font-medium sm:text-sm group-hover:text-primary">{c.name}</p>
                </a>
              ))}
            </div>
          </nav>
        )}
      </section>

      {/* Flash Sale — ticket-style red banner with scalloped edge.
          Hidden completely once the countdown reaches zero. */}
      {mounted && !flashOver && flashSale && flashSale.items.length > 0 && (
        <section
          aria-label="Flash sale cuối tuần"
          className="mt-6 overflow-hidden rounded-2xl shadow-lg shadow-red-600/15 ring-1 ring-red-600/25 sm:mt-8"
        >
          {/* Red gradient header band */}
          <div className="relative bg-gradient-to-r from-red-700 via-red-600 to-rose-500 px-4 py-3.5 sm:px-5">
            <div aria-hidden className="pointer-events-none absolute -right-8 -top-14 h-36 w-36 rounded-full bg-white/10" />
            <div aria-hidden className="pointer-events-none absolute -bottom-10 right-24 h-20 w-20 rounded-full bg-white/10" />
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1.5 h-2 w-2 rounded-full bg-white/25" />
            <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Flame className="h-5 w-5 text-white" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-extrabold uppercase leading-tight tracking-wide text-white sm:text-xl">
                    Flash Sale Cuối Tuần
                  </h2>
                  <p className="text-[11px] font-medium text-white/85 sm:text-xs">
                    Giảm sốc đến 35% · Số lượng có hạn
                  </p>
                </div>
                <span className="ml-1 hidden rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-red-600 shadow-sm sm:inline-block">
                  -35%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/90 sm:text-xs">
                  Kết thúc sau
                </span>
                <CountdownTimer target={flashEnd} variant="light" size="sm" onEnd={() => setFlashOver(true)} />
              </div>
            </div>
          </div>
          {/* Scalloped tear between header and body */}
          <svg
            aria-hidden
            className="block h-2 w-full bg-gradient-to-r from-red-700 via-red-600 to-rose-500 text-white"
            preserveAspectRatio="none"
            viewBox="0 0 240 8"
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <circle key={i} cx={i * 8 + 4} cy={8} r={4.5} fill="currentColor" />
            ))}
          </svg>
          {/* White body */}
          <div className="bg-white px-3 pb-3.5 pt-2.5 sm:px-4 sm:pb-4">
            <div className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 ${flashSale.items.length > 4 ? 'lg:grid-cols-6' : 'lg:grid-cols-4'}`}>
              {flashSale.items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <div className="mt-4 text-center">
              <Button
                size="sm"
                onClick={() => setView('shop', { flashSale: 'true' })}
                className="gap-1.5 bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md hover:from-red-700 hover:to-rose-600"
              >
                <Zap className="h-4 w-4" aria-hidden />
                Xem tất cả ưu đãi
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="mt-6 sm:mt-8">
        <SectionHeader
          title="Sản phẩm nổi bật"
          subtitle="Được khách hàng yêu thích nhất"
          icon={Sparkles}
          action={() => setView('shop')}
        />
        {!mounted || !featured ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featured.items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Banner promo split */}
      <section className="mt-6 sm:mt-8 grid gap-3 md:grid-cols-2">
        <div className="relative aspect-[16/7] overflow-hidden rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40">
          <div className="absolute inset-0 flex flex-col justify-center p-4 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Bộ sưu tập mùa thu</p>
            <h3 className="mt-1 text-lg font-bold sm:text-2xl">Mang sắc thu vào tổ ấm</h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Tone màu ấm, gỗ tự nhiên, vải linen êm ái</p>
            <Button size="sm" className="mt-3 w-fit" onClick={() => setView('shop', { cat: 'phong-khach' })}>
              Khám phá →
            </Button>
          </div>
        </div>
        <div className="relative aspect-[16/7] overflow-hidden rounded-xl bg-gradient-to-br from-rose-100 to-stone-100 dark:from-rose-950/40 dark:to-stone-900">
          <div className="absolute inset-0 flex flex-col justify-center p-4 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">Phòng ngủ thư giãn</p>
            <h3 className="mt-1 text-lg font-bold sm:text-2xl">Giấc ngủ êm với AVH Sleep</h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Giường bọc đầu êm ái, bảo hành 36 tháng</p>
            <Button size="sm" className="mt-3 w-fit" variant="secondary" onClick={() => setView('shop', { cat: 'phong-ngu' })}>
              Xem ngay →
            </Button>
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="mt-6 sm:mt-8">
        <SectionHeader
          title="Hàng mới về"
          subtitle="Cập nhật xu hướng nội thất mới nhất"
          icon={TrendingUp}
          action={() => setView('shop', { sort: 'newest' })}
        />
        {!mounted || !newProducts ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {newProducts.items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Best sellers */}
      <BestSellers />

      {/* Recently viewed — localStorage based, shows what user browsed */}
      <RecentlyViewed />

      {/* Blog teaser */}
      <section className="mt-6 sm:mt-8">
        <SectionHeader
          title="Cẩm nang nội thất"
          subtitle="Mẹo trang trí, xu hướng, hướng dẫn chọn đồ"
          icon={Newspaper}
          action={() => setView('blog')}
        />
        {!mounted || !blogPosts ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-[16/9] rounded-lg" />)}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {blogPosts.slice(0, 3).map((post) => (
              <button
                key={post.id}
                onClick={() => setView('blog-detail', { slug: post.slug })}
                className="group overflow-hidden rounded-lg border bg-card text-left transition hover:shadow-md"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                  <Image src={post.coverUrl} alt={post.title} fill sizes="400px" className="object-cover transition group-hover:scale-105" />
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {post.tags?.slice(0, 2).map((t: string) => (
                      <span key={t} className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">#{t}</span>
                    ))}
                  </div>
                  <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold group-hover:text-primary">{post.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.excerpt}</p>
                  <span className="mt-2 block text-[11px] text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString('vi-VN')} · {post.authorName}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Newsletter / CTA */}
      <section className="mt-6 sm:mt-8 overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-center text-primary-foreground">
        <h3 className="text-lg font-bold sm:text-2xl">Trở thành thành viên AVH Gold</h3>
        <p className="mx-auto mt-1 max-w-xl text-sm opacity-90">
          Tích điểm mỗi đơn hàng, đổi voucher giảm giá, nhận ưu đãi độc quyền theo hạng thành viên.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="Tài khoản"]')?.click()}
        >
          Tham gia ngay
        </Button>
      </section>
    </div>
  )
}

function SectionHeader({
  title,
  subtitle,
  action,
  icon: Icon,
}: {
  title: string
  subtitle?: string
  action?: () => void
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-2">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          {title}
        </h2>
        {subtitle && <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
      </div>
      {action && (
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={action}>
          Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

function BestSellers() {
  const { data } = useQuery<{ items: ProductListItem[] }>({
    queryKey: ['products', 'best'],
    queryFn: () => api.get('/api/products?sort=best-selling&limit=5'),
  })
  if (!data?.items?.length) return null
  return (
    <section className="mt-6 sm:mt-8 rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <TrendingUp className="h-5 w-5 text-primary" /> Bán chạy nhất
      </h2>
      <ol className="grid gap-2 sm:grid-cols-5">
        {data.items.map((p, i) => (
          <li key={p.id}>
            <button onClick={() => useUIStore.getState().setView('product', { slug: p.slug })} className="group flex w-full items-center gap-2 rounded-lg p-2 text-left transition hover:bg-accent">
              <span className="w-6 shrink-0 text-2xl font-bold text-primary/30">{i + 1}</span>
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                {p.image && <Image src={p.image} alt={p.name} fill sizes="48px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-medium group-hover:text-primary">{p.name}</p>
                <p className="text-sm font-semibold text-primary">{formatVND(p.basePrice)}</p>
                {p.comparePrice && p.comparePrice > p.basePrice && (
                  <p className="text-[10px] text-muted-foreground line-through">{formatVND(p.comparePrice)}</p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

function RecentlyViewed() {
  const setView = useUIStore((s) => s.setView)
  const items = useRecentStore((s) => s.items)
  const mounted = useMounted()

  if (!mounted || items.length === 0) return null

  return (
    <section className="mt-6 sm:mt-8">
      <SectionHeader title="Đã xem gần đây" subtitle="Sản phẩm bạn vừa xem" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {items.slice(0, 5).map((p) => (
          <button
            key={p.id}
            onClick={() => setView('product', { slug: p.slug })}
            className="group flex flex-col gap-2"
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted/40">
              <Image src={p.image} alt={p.name} fill sizes="150px" className="object-cover transition group-hover:scale-105" />
            </div>
            <p className="line-clamp-2 text-xs font-medium group-hover:text-primary">{p.name}</p>
            <p className="text-sm font-semibold text-primary">{formatVND(p.basePrice)}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
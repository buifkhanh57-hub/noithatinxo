'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUIStore } from '@/lib/stores/ui-store'
import { useMounted } from '@/hooks/use-mounted'
import { useRecentStore } from '@/lib/stores/recent-store'
import { orderCategories } from '@/lib/category-order'
import { HeroCarousel } from '@/components/avh/hero-carousel'
import { ProductCard, ProductListItem } from '@/components/avh/product-card'
import { CountdownTimer } from '@/components/avh/countdown-timer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowRight, Flame, Sparkles, TrendingUp, Newspaper } from 'lucide-react'
import Image from 'next/image'
import { formatVND } from '@/lib/format'
import { cn } from '@/lib/utils'

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
  const { data: flashSale } = useQuery<{ items: ProductListItem[]; flashActive?: boolean; flashName?: string | null; flashStart?: string | null; flashEnd?: string | null }>({
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
  // Thứ tự CHUẨN theo ảnh mẫu chủ shop (Đèn → Phòng Ăn → Phòng Khách →
  // Phòng Ngủ → Tủ & Kệ → Văn Phòng) — cùng thứ tự với thanh MENU ngang
  const orderedCategories = orderCategories(categories ?? [])

  // Flash sale ĐÓNG HỮU: chỉ hiện khi API xác nhận có chương trình ĐANG CHẠY
  // (Quản trị → Flash Sale đặt startAt/endAt thật). Hết giờ → onExpired ẩn
  // ngay; KHÔNG tự quay về 24h nữa (lib/flash-sale v3 đọc DB, không chu kỳ).
  const [flashExpired, setFlashExpired] = useState(false)

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
      {/* DANH MỤC MENU NỔI BẬT: các ô DANH MỤC dạng pill bo viền, nền trắng,
          chữ ĐẬM + NHỎ, RỘNG THEO TÊN (không chia đều cột).
          (Task 32: đã XÓA ô ghi chú "Chỉnh được ở phần cài đặt" theo yêu cầu
          chủ shop — hàng pill chỉ còn đúng các danh mục.)
          MOBILE: GIỮ NGUYÊN lưới 4 ô/hàng như cũ (chủ shop đã khen đẹp — task 29).
          DESKTOP (sm+): hàng pill ngang, tự wrap. */}
      <section>
        {!mounted || !categories ? (
          <>
            {/* mobile skeleton — lưới 4 ô như cũ */}
            <div className="grid max-w-md grid-cols-4 gap-2 sm:hidden">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
            {/* desktop skeleton — hàng pill đúng ảnh */}
            <div className="mx-auto hidden max-w-4xl flex-wrap items-center gap-3 sm:flex">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-32 rounded-lg" />)}
            </div>
          </>
        ) : (
          <nav aria-label="Danh mục nhanh">
            {/* MOBILE — lưới 4 ô/hàng NGUYÊN TRẠNG (được khen đẹp, không đụng vào) */}
            <div className="grid max-w-md grid-cols-4 gap-2 sm:hidden">
              {orderedCategories.map((c) => (
                <a
                  key={c.id}
                  href={`/san-pham?cat=${encodeURIComponent(c.slug)}`}
                  className="flex min-h-14 items-center justify-center rounded-lg border border-border bg-card px-1.5 py-2 text-center text-[11px] font-bold leading-tight text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/70 hover:bg-accent/40 hover:text-primary hover:shadow-md"
                  title={c.name}
                >
                  {c.name}
                </a>
              ))}
            </div>
            {/* DESKTOP — hàng PILL đúng ảnh: nền trắng, viền mảnh, bo góc,
                chữ đậm nhỏ, rộng theo tên.
                FIX (task 31): px-6+gap-5 cần 844px/6 pill — chủ shop thêm
                danh mục mới trong Quản trị là tràn 896px (max-w-4xl) → pill
                cuối rơi lẻ xuống hàng 2 như ảnh lỗi. Gọn lại px-4 + gap-3
                (612px/6 pill) ⇒ chứa được ~8 danh mục vẫn ĐỦ 1 HÀNG; danh
                mục mới tự xếp cuối hàng.
                FIX (task 32): XÓA ô ghi chú "Chỉnh được ở phần cài đặt"
                theo yêu cầu chủ shop — hàng pill chỉ còn đúng các danh mục. */}
            <div className="mx-auto hidden max-w-4xl flex-wrap items-center justify-start gap-x-3 gap-y-3 sm:flex">
              {orderedCategories.map((c) => (
                <a
                  key={c.id}
                  href={`/san-pham?cat=${encodeURIComponent(c.slug)}`}
                  className="flex min-h-12 items-center justify-center whitespace-nowrap rounded-lg border border-border bg-card px-4 text-[12px] font-bold text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/70 hover:bg-accent/40 hover:text-primary hover:shadow-md"
                  title={c.name}
                >
                  {c.name}
                </a>
              ))}
            </div>
          </nav>
        )}
      </section>

      {/* Hero — cách hàng pill DANH MỤC một khoảng thỏáng (trước đây 0px
          → ảnh hero dính sát hàng pill “Đèn Trang Trí…”, chủ shop bắt lỗi) */}
      <div className="mt-5 sm:mt-6">
        <HeroCarousel banners={banners ?? []} />
      </div>

      {/* MENU — chủ shop dặn: tên chỉ là "MENU" (ô đỏ), KHÔNG kèm chữ "nổi bật".
          GIỮ NGUYÊN LƯỚI ẢNH DANH MỤC GỐC ("vẫn đủ nguyên ảnh"): ô vuông có
          ảnh danh mục + tên bên dưới, 3 cột mobile / 6 cột desktop. */}
      <section className="mt-10 sm:mt-12">
        <div className="mb-3">
          <h2 className="flex items-center gap-1.5 text-lg font-extrabold sm:text-xl">
            <span className="rounded-md bg-primary px-2 py-0.5 uppercase tracking-wide text-primary-foreground shadow-sm">MENU</span>
          </h2>
          {/* chủ shop: XÓA dòng phụ đề "Duyệt theo không gian sống" (bị gạch đỏ trong ảnh) */}
        </div>
        {!mounted || !categories ? (
          <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
          </div>
        ) : (
          <nav aria-label="Danh mục sản phẩm">
            <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-6">
              {orderedCategories.map((c) => (
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

      {/* Flash Sale — banner vè đổi mới, chỉ hiện khi có chương trình ĐANG
          chạy trong DB (Quản trị → Flash Sale). Hết giờ ⇒ tự ẩn, không lặp. */}
      {mounted && flashSale?.flashActive && flashSale.flashStart && flashSale.flashEnd && flashSale.items.length > 0 && !flashExpired && (
        <section className="relative mt-8 overflow-hidden rounded-2xl shadow-lg ring-1 ring-red-900/20">
          <div className="relative bg-gradient-to-br from-red-950 via-red-900 to-red-800">
            {/* decorations — vệt sáng chéo + quầng sáng ấm + lửa mờ lớn */}
            <span aria-hidden className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
            <span aria-hidden className="pointer-events-none absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
            <span aria-hidden className="pointer-events-none absolute -right-2 -top-16 h-52 w-52 rotate-12 bg-gradient-to-b from-white/10 to-transparent blur-2xl [clip-path:polygon(45%_0,55%_0,20%_100%,10%_100%)]" />
            <Flame aria-hidden className="pointer-events-none absolute -bottom-6 right-4 h-32 w-32 text-white/5 sm:right-10 sm:h-44 sm:w-44" />
            <div className="relative flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 ring-1 ring-amber-300/40">
                  <Flame className="h-6 w-6 animate-pulse text-amber-300" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-black uppercase tracking-wide text-white drop-shadow-sm sm:text-2xl">
                    Flash Sale
                  </h2>
                  <p className="truncate text-[11px] font-semibold uppercase tracking-widest text-white/75 sm:text-xs">
                    {flashSale.flashName || 'Ưu đãi giới hạn — số lượng có hạn'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <span className="text-xs font-semibold text-white/90">Kết thúc sau:</span>
                <CountdownTimer
                  target={flashSale.flashEnd}
                  variant="dark"
                  labels
                  onExpired={() => setFlashExpired(true)}
                />
              </div>
            </div>
            {/* progress — % thời gian đã chạy của chương trình */}
            <div className="relative px-4 pb-3 sm:px-6 sm:pb-4">
              <FlashProgress start={flashSale.flashStart} end={flashSale.flashEnd} />
            </div>
            {/* serrated tear-off edge */}
            <svg aria-hidden className="block h-2 w-full" preserveAspectRatio="none" viewBox="0 0 100 4">
              {Array.from({ length: 25 }).map((_, i) => (
                <circle key={i} cx={i * 4 + 2} cy={4} r={2} fill="rgb(254 242 242)" />
              ))}
            </svg>
          </div>
          <div className="bg-primary/5">
            <div className={cn(
              'grid grid-cols-2 gap-3 p-4 sm:grid-cols-3',
              flashSale.items.length > 4 ? 'lg:grid-cols-6' : 'lg:grid-cols-4'
            )}>
              {flashSale.items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <div className="border-t border-primary/15 p-3 text-center">
              <Button size="sm" onClick={() => setView('shop', { flashSale: 'true' })} className="gap-1.5 font-bold">
                Xem tất cả flash sale <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* SẢN PHẨM THEO TỪNG DANH MỤC — yêu cầu chủ shop: khách vào trang chủ
          phải thấy hàng xếp THEO THỨ TỰ DANH SÁCH DANH MỤC (Đèn → Phòng Ăn →
          Phòng Khách → Phòng Ngủ → Tủ & Kệ → Văn Phòng, giống thanh MENU và
          ảnh mẫu anhkhoa); "Hàng mới về" xếp NGAY SAU các mục này. Mục rỗng
          tự ẩn. */}
      {orderedCategories.map((c) => <CategoryProducts key={c.id} category={c} />)}

      {/* New arrivals — NGAY sau các section danh mục (đúng yêu cầu chủ shop:
          hết sản phẩm theo danh mục rồi mới đến "hàng mới về" phía dưới) */}
      <section className="mt-8">
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

      {/* Featured — xếp SAU "Hàng mới về" (chủ shop: danh mục xong → hàng mới
          về → phần còn lại) */}
      <section className="mt-8">
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

      {/* Best sellers */}
      <BestSellers />

      {/* Recently viewed — localStorage based, shows what user browsed */}
      <RecentlyViewed />

      {/* Blog teaser */}
      <section className="mt-8">
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
      <section className="mt-8 overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-center text-primary-foreground">
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

function CategoryProducts({ category }: { category: Category }) {
  const setView = useUIStore((s) => s.setView)
  const mounted = useMounted()
  const { data } = useQuery<{ items: ProductListItem[] }>({
    queryKey: ['products', 'cat', category.slug],
    queryFn: () => api.get(`/api/products?category=${encodeURIComponent(category.slug)}&limit=8`),
  })
  const items = data?.items
  // Chặn bằng `mounted` cho CẢ section (kể cả tiêu đề): SSR và lần render đầu
  // của client phải GIỐNG NHAU — nếu TanStack Query đã có cache từ lần render
  // đầu, client render section trong khi server không → hydration mismatch.
  if (!mounted) return null
  // Danh mục chưa có sản phẩm → ẩn section (trang chủ không có mục rỗng)
  if (!items || items.length === 0) return null
  return (
    <section className="mt-8">
      <SectionHeader
        title={category.name}
        subtitle={category.productCount ? `${category.productCount} sản phẩm chính hãng AVH` : 'Sản phẩm chính hãng AVH'}
        action={() => setView('shop', { cat: category.slug })}
      />
      {!mounted || !items ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  )
}

function BestSellers() {
  const mounted = useMounted()
  const { data } = useQuery<{ items: ProductListItem[] }>({
    queryKey: ['products', 'best'],
    queryFn: () => api.get('/api/products?sort=best-selling&limit=5'),
  })
  // mounted-gate: tránh hydration mismatch khi client có sẵn cache (như
  // CategoryProducts phía trên — SSR và lần render đầu client phải giống nhau)
  if (!mounted || !data?.items?.length) return null
  return (
    <section className="mt-8 rounded-xl border bg-card p-4 sm:p-5">
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
    <section className="mt-8">
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
/**
 * Progress bar của chương trình flash sale: % thời gian đã trôi qua
 * giữa startAt → endAt. Render null ở lần render đầu (SSR-safe) để tránh
 * lệch hydration, rồi cập nhật mỗi 30s.
 */
function FlashProgress({ start, end }: { start: string; end: string }) {
  const [pct, setPct] = useState<number | null>(null)
  useEffect(() => {
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    const tick = () => setPct(Math.min(100, Math.max(0, ((Date.now() - s) / Math.max(1, e - s)) * 100)))
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [start, end])
  if (pct === null) return null
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400 transition-[width] duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-bold tabular-nums text-white/75">
        {pct >= 100 ? 'Sắp kết thúc!' : `Đã qua ${Math.round(pct)}%`}
      </span>
    </div>
  )
}

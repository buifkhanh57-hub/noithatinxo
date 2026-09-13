'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  X,
  Phone,
  ChevronRight,
  LayoutDashboard,
  MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useUIStore, ViewName } from '@/lib/stores/ui-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { useWishlistStore } from '@/lib/stores/wishlist-store'
import { useCompareStore } from '@/lib/stores/compare-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useSettingsStore } from '@/lib/stores/settings-store'
import { AuthDialog } from './auth-dialog'
import { useMounted } from '@/hooks/use-mounted'
import { orderCategories } from '@/lib/category-order'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
  slug: string
  icon?: string
  imageUrl?: string
}

/** Zalo deep link: http(s) passthrough, otherwise personal link zalo.me/<phone> */
function zaloHref(zalo: string): string {
  if (!zalo) return ''
  if (zalo.startsWith('http')) return zalo
  return `https://zalo.me/${zalo.replace(/\D/g, '')}`
}

export function Header() {
  const setView = useUIStore((s) => s.setView)
  const openCart = useUIStore((s) => s.openCart)
  const mobileSearchOpen = useUIStore((s) => s.mobileSearchOpen)
  const setMobileSearchOpen = useUIStore((s) => s.setMobileSearchOpen)

  const cartCount = useCartStore((s) => s.count())
  const wishlistCount = useWishlistStore((s) => s.productIds.length)
  const compareCount = useCompareStore((s) => s.productIds.length)
  const user = useAuthStore((s) => s.user)
  const mounted = useMounted()
  const settings = useSettingsStore()
  const brandName = settings.get('brand_name')
  const brandTagline = settings.get('brand_tagline')
  const brandLogoUrl = settings.get('brand_logo_url')
  const hotline = settings.get('contact_hotline')
  const zalo = settings.get('social_zalo')

  const [searchValue, setSearchValue] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [menuGridOpen, setMenuGridOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const view = useUIStore((s) => s.view)
  const viewParams = useUIStore((s) => s.params)

  const { data: categoriesRaw } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories'),
  })
  // Thứ tự CHUẨN theo ảnh mẫu chủ shop (Đèn → Phòng Ăn → Phòng Khách →
  // Phòng Ngủ → Tủ & Kệ → Văn Phòng) — dùng chung cho mọi nơi hiển thị
  const categories = orderCategories(categoriesRaw ?? [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchValue.trim()) return
    setView('shop', { q: searchValue.trim() })
    setMobileSearchOpen(false)
  }

  const go = (v: ViewName, params?: Record<string, string>) => {
    setView(v, params)
    setMenuGridOpen(false)
  }

  // shortcut: press "/" to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        document.getElementById('avh-search-input')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* Nền gỗ CHỈ hiện cho ADMIN (user?.role === 'ADMIN') theo yêu cầu chủ shop:
     khách truy cập luôn thấy header trắng mờ trong suốt như cũ.
     Admin: nền gỗ óc chó sậm + chữ/icon KEM TRẮNG để logo & nội dung thật sự nổi bật. */
  const isWood = user?.role === 'ADMIN'
  const actionHover = isWood ? 'hover:bg-white/12' : 'hover:bg-accent'
  const iconColor = isWood ? 'text-[#f3e7d3]' : 'text-foreground'

  return (
    <>
      {/* Thanh trên cùng — Hotline + Chat Zalo (thay cho header quảng cáo).
          Số hotline / số Zalo chỉnh trong Quản trị → Cài đặt → Liên hệ. */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-1.5 text-[11px] sm:text-xs">
          {hotline ? (
            <a
              href={`tel:${hotline.replace(/\s/g, '')}`}
              className="flex min-w-0 items-center gap-1.5 font-bold transition hover:underline"
              aria-label={`Gọi tư vấn ${hotline}`}
            >
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">Hotline: {hotline}</span>
              <span className="hidden font-medium opacity-90 md:inline">— Gọi tư vấn &amp; lắp đặt</span>
            </a>
          ) : (
            <span />
          )}
          {zalo && (
            <a
              href={zaloHref(zalo)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1.5 font-bold transition hover:underline"
              aria-label="Chat Zalo với Nội Thất AVH"
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
              Chat Zalo
            </a>
          )}
        </div>
      </div>

      {/* Main header — ADMIN: gỗ óc chó sậm sang trọng, chữ kem nổi rõ;
          KHÁCH: trắng mờ trong suốt (backdrop-blur) như thiết kế cũ */}
      <header
        className={cn(
          'sticky top-0 z-40 w-full',
          isWood
            ? 'wood-surface-admin border-b border-black/40 shadow-[0_2px_10px_rgba(0,0,0,0.35)]'
            : 'border-b border-border/70 bg-background/85 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md',
        )}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-1.5 px-2 sm:h-16 sm:gap-4 sm:px-4">
          {/* ☰ MENU — bấm xổ LƯỚI Ô DANH MỤC ngay dưới header (đúng ảnh mẫu
              anhkhoa chủ shop gửi: ô viền bo tròn tên danh mục, ô đang xem
              nền đỏ). Trước đây là drawer trái — nay thay bằng lưới ô này. */}
          <button
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-2 sm:px-2',
              actionHover,
            )}
            onClick={() => setMenuGridOpen((o) => !o)}
            aria-expanded={menuGridOpen}
            aria-controls="avh-menu-grid"
            aria-label={menuGridOpen ? 'Đóng menu danh mục' : 'Mở menu danh mục'}
          >
            {menuGridOpen ? (
              <X className={cn('h-6 w-6', iconColor)} strokeWidth={2.5} />
            ) : (
              <Menu className={cn('h-6 w-6', iconColor)} strokeWidth={2.5} />
            )}
            <span className={cn('text-sm font-extrabold uppercase tracking-wide', iconColor)}>
              Menu
            </span>
          </button>

          {/* Brand — logo + name + tagline, luôn hiển thị cả mobile.
              KHÔNG dùng shrink-0 cho cả khối: trên mobile 390px header bị
              tràn 22px (nút giỏ hàng bị cắt mất mép phải) → cho phần chữ
              co/truncate còn logo giữ nguyên. */}
          <button
            onClick={() => go('home')}
            className="flex min-w-0 items-center gap-2"
            aria-label={`Trang chủ ${brandName}`}
          >
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={brandName} className="h-9 w-auto shrink-0 sm:h-11" />
            ) : (
              <span
                aria-hidden
                className={cn(
                  'shrink-0 select-none text-2xl font-black italic leading-none tracking-tighter drop-shadow-sm sm:text-3xl',
                  isWood
                    ? 'text-[#f7ecd8] drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]'
                    : 'text-primary',
                )}
              >
                AVH
              </span>
            )}
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span
                className={cn(
                  'truncate text-sm font-extrabold uppercase tracking-tight sm:text-base',
                  isWood
                    ? 'text-[#fdf6ea] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
                    : 'text-primary',
                )}
              >
                {brandName.toUpperCase()}
              </span>
              <span
                className={cn(
                  'max-w-[130px] truncate text-[9px] font-semibold uppercase tracking-wider sm:max-w-none sm:text-[10px]',
                  isWood ? 'text-[#f6ead0]' : 'text-muted-foreground',
                )}
              >
                {brandTagline}
              </span>
            </span>
          </button>

          {/* Search (desktop) */}
          <form onSubmit={handleSearch} className="relative mx-auto hidden w-full max-w-xl md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="avh-search-input"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Tìm sofa, giường, đèn trang trí… (ấn / để focus)"
              className={cn('h-10 pl-9 pr-4', isWood && 'border-white/30 bg-white/95 shadow-md placeholder:text-stone-400')}
              aria-label="Tìm kiếm sản phẩm"
            />
            {searchFocused && searchValue && categories && (
              <div className="absolute left-0 right-0 top-12 z-50 rounded-lg border bg-popover p-2 shadow-lg">
                <p className="px-2 py-1 text-xs text-muted-foreground">Gợi ý tìm kiếm</p>
                <button
                  type="button"
                  onMouseDown={() => {
                    setSearchValue('')
                    setView('shop', { q: searchValue })
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-accent"
                >
                  <Search className="h-4 w-4 text-muted-foreground" />
                  Xem kết quả cho &ldquo;{searchValue}&rdquo;
                </button>
                <div className="my-1 border-t" />
                {categories.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => {
                      setSearchValue('')
                      setView('shop', { cat: c.slug })
                    }}
                    className="flex w-full items-center justify-between rounded px-2 py-2 text-sm hover:bg-accent"
                  >
                    {c.name}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Actions */}
          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn('md:hidden', actionHover)}
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              aria-label="Tìm kiếm"
            >
              <Search className={cn('h-5 w-5', iconColor)} />
            </Button>
            {user?.role === 'ADMIN' && (
              <Button
                variant="secondary"
                size="sm"
                className="hidden gap-1.5 sm:inline-flex"
                onClick={() => go('admin')}
                aria-label="Vào trang quản trị"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="text-xs font-semibold">Quản trị</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn('relative', actionHover)}
              onClick={() => (user ? go('account') : setAuthOpen(true))}
              aria-label="Tài khoản"
            >
              <User className={cn('h-5 w-5', iconColor)} />
              {user && <span className="sr-only">{user.name}</span>}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('relative hidden sm:inline-flex', actionHover)}
              onClick={() => go('wishlist')}
              aria-label="Sản phẩm yêu thích"
            >
              <Heart className={cn('h-5 w-5', iconColor)} />
              {mounted && wishlistCount > 0 && (
                <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px]">
                  {wishlistCount}
                </Badge>
              )}
            </Button>
            {mounted && compareCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className={cn('relative hidden sm:inline-flex', actionHover)}
                onClick={() => go('compare')}
                aria-label="So sánh"
              >
                <svg viewBox="0 0 24 24" className={cn('h-5 w-5', iconColor)} fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h10M4 18h7" strokeLinecap="round" />
                </svg>
                <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px]">
                  {compareCount}
                </Badge>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn('relative', actionHover)}
              onClick={openCart}
              aria-label="Giỏ hàng"
            >
              <ShoppingCart className={cn('h-5 w-5', iconColor)} />
              {mounted && cartCount > 0 && (
                <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px]">
                  {cartCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Lưới ô danh mục khi bấm MENU — giống ảnh mẫu anhkhoa:
            ô viền bo tròn tên danh mục, ô đang xem nền đỏ. Nằm TRONG header
            sticky nên mở lúc nào cũng thấy ngay, không cần cuộn lên đầu. */}
        {menuGridOpen && (
          <div id="avh-menu-grid" className={cn('avh-menu-drop border-t px-3 py-3 sm:px-4', isWood ? 'border-white/15 bg-black/20' : 'border-border bg-background')}>
            <nav aria-label="Lưới danh mục MENU">
              <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2 sm:grid-cols-6">
                {categories?.map((c) => {
                  const active = view === 'shop' && viewParams.cat === c.slug
                  return (
                    <button
                      key={c.id}
                      onClick={() => go('shop', { cat: c.slug })}
                      className={cn(
                        'rounded-lg border px-2 py-3 text-center text-xs font-semibold transition sm:text-sm',
                        active
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : cn(
                              'bg-card',
                              isWood
                                ? 'border-white/25 text-[#f7ecd8] hover:border-white/60 hover:bg-white/10'
                                : 'border-border text-foreground/90 hover:border-primary/60 hover:text-primary',
                            ),
                      )}
                    >
                      {c.name}
                    </button>
                  )
                })}
              </div>
              <div className={cn('mx-auto mt-2.5 flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 border-t pt-2 text-[11px] sm:text-xs', isWood ? 'border-white/15 text-[#f6ead0]' : 'border-border/60 text-muted-foreground')}>
                <button onClick={() => go('shop')} className="font-medium transition hover:text-primary">Tất cả sản phẩm</button>
                <button onClick={() => go('order-tracking')} className="font-medium transition hover:text-primary">Theo dõi đơn hàng</button>
                <button onClick={() => go('wishlist')} className="font-medium transition hover:text-primary">Yêu thích</button>
                <button onClick={() => go('blog')} className="font-medium transition hover:text-primary">Cẩm nang nội thất</button>
                {mounted && !user && (
                  <button
                    onClick={() => { setMenuGridOpen(false); setAuthOpen(true) }}
                    className="font-bold text-primary hover:underline"
                  >
                    Đăng nhập / Đăng ký
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}

        {/* Mobile search bar */}
        {mobileSearchOpen && (
          <div className={cn('border-t px-3 py-2 md:hidden', isWood ? 'border-white/15' : 'border-border')}>
            <form onSubmit={handleSearch} className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Tìm sản phẩm…"
                className={cn('h-9 pl-9 pr-9', isWood && 'border-white/30 bg-white/95')}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                aria-label="Đóng tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* MENU BAR — thanh menu danh mục nằm ở ĐẦU TRANG, ngay dưới header,
          đúng như ảnh mẫu chủ shop gửi (anhkhoa): ☰ MENU chữ ĐỎ đậm + vạch
          ngăn dọc, rồi các danh mục xếp ngang ĐÈN TRANG TRÍ → PHÒNG ĂN →
          PHÒNG KHÁCH → PHÒNG NGỦ → TỦ & KỆ → VĂN PHÒNG (thứ tự chung trong
          lib/category-order.ts). Mobile: cuộn ngang, ẩn scrollbar cho gọn. */}
      <nav aria-label="MENU danh mục sản phẩm" className="border-b border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="mx-auto flex max-w-7xl items-stretch overflow-x-auto px-2 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setMenuGridOpen((o) => !o)}
            aria-expanded={menuGridOpen}
            aria-label="Mở/đóng lưới danh mục"
            className="mr-1 flex shrink-0 items-center gap-1.5 border-r border-border/70 pr-3 text-xs font-extrabold uppercase tracking-wide text-red-600 transition hover:text-red-700 sm:text-sm"
          >
            <Menu className="h-4 w-4 text-red-600" strokeWidth={2.75} />
            Menu
          </button>
          <button
            onClick={() => go('shop')}
            data-active={view === 'shop' && !viewParams.cat}
            className="avh-nav-link shrink-0 whitespace-nowrap px-2.5 py-2.5 text-xs font-semibold text-foreground/90 transition hover:text-primary sm:text-sm"
          >
            Tất cả sản phẩm
          </button>
          {categories.map((c) => {
            const active = view === 'shop' && viewParams.cat === c.slug
            return (
              <button
                key={c.id}
                onClick={() => go('shop', { cat: c.slug })}
                data-active={active}
                className={cn(
                  'avh-nav-link shrink-0 whitespace-nowrap px-2.5 py-2.5 text-xs font-semibold transition sm:text-sm',
                  active ? 'text-primary' : 'text-foreground/90 hover:text-primary',
                )}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </nav>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  )
}

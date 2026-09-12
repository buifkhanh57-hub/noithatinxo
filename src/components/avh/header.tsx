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
  LogIn,
  MessageCircle,
  SlidersHorizontal,
  Armchair,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet'
import { useUIStore, ViewName } from '@/lib/stores/ui-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { useWishlistStore } from '@/lib/stores/wishlist-store'
import { useCompareStore } from '@/lib/stores/compare-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useSettingsStore } from '@/lib/stores/settings-store'
import { AuthDialog } from './auth-dialog'
import { useMounted } from '@/hooks/use-mounted'
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
  const announcementText = settings.get('announcement_text')
  const brandName = settings.get('brand_name')
  const brandTagline = settings.get('brand_tagline')
  const brandLogoUrl = settings.get('brand_logo_url')
  const hotline = settings.get('contact_hotline')
  const zalo = settings.get('social_zalo')
  const showTracking = settings.get('announcement_show_tracking') === 'true'
  const showBlog = settings.get('announcement_show_blog') === 'true'

  const [searchValue, setSearchValue] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories'),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchValue.trim()) return
    setView('shop', { q: searchValue.trim() })
    setMobileSearchOpen(false)
  }

  const go = (v: ViewName, params?: Record<string, string>) => {
    setView(v, params)
    setMobileMenuOpen(false)
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

  /* Quick-nav: mobile shows 8 tiles (4×2) + red "Tất cả" tile; desktop shows
     one scrollable row — mirrors the Anh Khoa reference the client approved. */
  const mobileCats = categories?.slice(0, 8) ?? []
  const iconCls = 'text-[#7a4a21]'

  return (
    <>
      {/* Announcement bar — text & links are admin-configurable */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-1.5 text-[11px] sm:text-xs">
          <p className="flex items-center gap-1.5 truncate">
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate">{announcementText}</span>
          </p>
          <div className="hidden items-center gap-3 sm:flex">
            {showTracking && (
              <button onClick={() => go('order-tracking')} className="hover:underline">
                Theo dõi đơn
              </button>
            )}
            {showTracking && showBlog && <span className="opacity-50">·</span>}
            {showBlog && (
              <button onClick={() => go('blog')} className="hover:underline">
                Cẩm nang
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main header — light-oak wood grain (Anh Khoa style) */}
      <header className="sticky top-0 z-40 w-full border-b-2 border-[#b98a4e]/40 wood-surface shadow-[0_1px_3px_rgba(87,52,21,0.18)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-1.5 px-2 sm:h-16 sm:gap-4 sm:px-4">
          {/* Mobile menu (hamburger + MENU label, like the reference) */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-2 hover:bg-[#e6d3b4]/60 sm:px-2"
                aria-label="Mở menu"
              >
                <Menu className="h-6 w-6 text-[#5c3a17]" strokeWidth={2.5} />
                <span className="text-sm font-extrabold uppercase tracking-wide text-[#5c3a17]">
                  Menu
                </span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
              <SheetHeader className="border-b px-4 py-4">
                {mounted && user ? (
                  /* Logged in → avatar + name, tap = account page */
                  <button
                    onClick={() => go('account')}
                    className="flex w-full items-center gap-3 text-left"
                    aria-label="Vào trang tài khoản"
                  >
                    <Avatar className="h-10 w-10 border border-primary/30">
                      <AvatarFallback className="bg-primary font-bold text-primary-foreground">
                        {(user.name || 'K').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email || 'Tài khoản AVH'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ) : (
                  /* Guest → red login/register CTA (yêu cầu: menu có đăng nhập) */
                  <>
                    <SheetTitle className="text-left text-sm font-semibold text-muted-foreground">
                      Xin chào quý khách 👋
                    </SheetTitle>
                    <Button
                      className="mt-2 w-full gap-2 font-bold"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        setAuthOpen(true)
                      }}
                    >
                      <LogIn className="h-4 w-4" />
                      Đăng nhập / Đăng ký
                    </Button>
                  </>
                )}
              </SheetHeader>
              <nav className="flex flex-col gap-0.5 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
                <button
                  onClick={() => go('home')}
                  className="flex items-center justify-between rounded px-3 py-2.5 text-sm hover:bg-accent"
                >
                  Trang chủ
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
                {categories?.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => go('shop', { cat: c.slug })}
                    className="flex items-center justify-between rounded px-3 py-2.5 text-sm hover:bg-accent"
                  >
                    {c.name}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
                <div className="my-2 border-t" />
                <button onClick={() => go('wishlist')} className="rounded px-3 py-2.5 text-sm hover:bg-accent text-left">
                  Sản phẩm yêu thích {mounted && wishlistCount > 0 ? `(${wishlistCount})` : ''}
                </button>
                <button onClick={() => go('compare')} className="rounded px-3 py-2.5 text-sm hover:bg-accent text-left">
                  So sánh sản phẩm {mounted && compareCount > 0 ? `(${compareCount})` : ''}
                </button>
                <button onClick={() => go('order-tracking')} className="rounded px-3 py-2.5 text-sm hover:bg-accent text-left">
                  Theo dõi đơn hàng
                </button>
                <button onClick={() => go('blog')} className="rounded px-3 py-2.5 text-sm hover:bg-accent text-left">
                  Cẩm nang nội thất
                </button>
                {user?.role === 'ADMIN' && (
                  <button onClick={() => go('admin')} className="rounded px-3 py-2.5 text-sm hover:bg-accent text-left flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" /> Quản trị
                  </button>
                )}

                {/* Menu footer: hotline + zalo (thêm phần sdt & zalo theo yêu cầu) */}
                <div className="mt-3 rounded-lg border bg-card p-3">
                  <a
                    href={`tel:${(hotline || '').replace(/\s/g, '')}`}
                    className="flex items-center gap-2 text-sm font-semibold text-primary"
                  >
                    <Phone className="h-4 w-4" /> {hotline}
                  </a>
                  {zalo && (
                    <a
                      href={zaloHref(zalo)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#0180c7]"
                    >
                      <MessageCircle className="h-4 w-4" /> Chat Zalo
                    </a>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Brand — logo + name + tagline, luôn hiển thị cả mobile */}
          <button
            onClick={() => go('home')}
            className="flex min-w-0 shrink-0 items-center gap-2"
            aria-label={`Trang chủ ${brandName}`}
          >
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={brandName} className="h-9 w-auto sm:h-11" />
            ) : (
              <span
                aria-hidden
                className="select-none text-2xl font-black italic leading-none tracking-tighter text-primary drop-shadow-sm sm:text-3xl"
              >
                AVH
              </span>
            )}
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="truncate text-sm font-extrabold uppercase tracking-tight text-[#4a2f12] sm:text-base">
                {brandName.toUpperCase()}
              </span>
              <span className="max-w-[130px] truncate text-[9px] font-semibold uppercase tracking-wider text-[#8a5a26] sm:max-w-none sm:text-[10px]">
                {brandTagline}
              </span>
            </span>
          </button>

          {/* Search (desktop) */}
          <form onSubmit={handleSearch} className="relative mx-auto hidden w-full max-w-xl md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a5a26]" />
            <Input
              id="avh-search-input"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Tìm sofa, giường, đèn trang trí… (ấn / để focus)"
              className="h-10 border-[#c9a06a] bg-white/95 pl-9 pr-4 placeholder:text-[#a98a63]"
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
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-[#e6d3b4]/60"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              aria-label="Tìm kiếm"
            >
              <Search className="h-5 w-5 text-[#5c3a17]" />
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
              className="relative hover:bg-[#e6d3b4]/60"
              onClick={() => (user ? go('account') : setAuthOpen(true))}
              aria-label="Tài khoản"
            >
              <User className="h-5 w-5 text-[#5c3a17]" />
              {user && <span className="sr-only">{user.name}</span>}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative hidden hover:bg-[#e6d3b4]/60 sm:inline-flex"
              onClick={() => go('wishlist')}
              aria-label="Sản phẩm yêu thích"
            >
              <Heart className="h-5 w-5 text-[#5c3a17]" />
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
                className="relative hidden hover:bg-[#e6d3b4]/60 sm:inline-flex"
                onClick={() => go('compare')}
                aria-label="So sánh"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#5c3a17]" fill="none" stroke="currentColor" strokeWidth="2">
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
              className="relative hover:bg-[#e6d3b4]/60"
              onClick={openCart}
              aria-label="Giỏ hàng"
            >
              <ShoppingCart className="h-5 w-5 text-[#5c3a17]" />
              {mounted && cartCount > 0 && (
                <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px]">
                  {cartCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile search bar */}
        {mobileSearchOpen && (
          <div className="border-t border-[#c9a06a]/40 px-3 py-2 md:hidden">
            <form onSubmit={handleSearch} className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a5a26]" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Tìm sản phẩm…"
                className="h-9 border-[#c9a06a] bg-white/95 pl-9 pr-9"
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

      {/* ---- Quick category nav (dưới header, cuộn theo trang như Anh Khoa) ---- */}
      <section aria-label="Danh mục nhanh" className="wood-surface-soft border-b border-[#b98a4e]/30">
        <div className="mx-auto max-w-7xl px-2 sm:px-4">
          {/* Mobile: 4-cột grid 8 nhóm + ô đỏ "Tất cả" */}
          <div className="grid grid-cols-4 gap-px py-1.5 md:hidden">
            {mobileCats.map((c) => (
              <button
                key={c.id}
                onClick={() => go('shop', { cat: c.slug })}
                className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5 text-center transition active:bg-[#e6d3b4]/70"
              >
                <Armchair className={cn('h-4 w-4', iconCls)} />
                <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-[#4a2f12]">
                  {c.name}
                </span>
              </button>
            ))}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md bg-primary px-1 py-1.5 text-center text-primary-foreground transition active:bg-primary/90"
              aria-label="Xem tất cả danh mục"
            >
              <Package className="h-4 w-4" />
              <span className="text-[10px] font-bold leading-tight">Tất cả</span>
            </button>
          </div>

          {/* Desktop: 1 hàng cuộn ngang + nút đỏ mở bộ lọc */}
          <nav className="hidden items-center gap-0.5 md:flex">
            <div className="flex flex-1 items-center gap-0.5 overflow-x-auto py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => go('shop', { cat: c.slug })}
                  className="shrink-0 rounded-md px-3 py-1.5 text-[13px] font-semibold text-[#4a2f12] transition hover:bg-[#e6d3b4]/70 hover:text-primary"
                >
                  {c.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => go('shop')}
              className="ml-2 flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
              aria-label="Tìm kiếm nâng cao"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Lọc sản phẩm
            </button>
          </nav>
        </div>
      </section>

      {/* ---- Red contact strip: SDT + Zalo (yêu cầu "thêm phần sdt và zalo") ---- */}
      <section aria-label="Liên hệ tư vấn" className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <a
            href={`tel:${(hotline || '').replace(/\s/g, '')}`}
            className="flex min-w-0 items-center gap-2 text-xs font-bold sm:text-sm"
            aria-label={`Gọi tư vấn ${hotline}`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 sm:h-7 sm:w-7">
              <Phone className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">
              {hotline}
              <span className="ml-1.5 hidden font-medium opacity-90 sm:inline">— Gọi Tư Vấn</span>
            </span>
          </a>
          {zalo && (
            <a
              href={zaloHref(zalo)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-2 text-xs font-bold sm:text-sm"
              aria-label="Chat Zalo"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 sm:h-7 sm:w-7">
                <MessageCircle className="h-3.5 w-3.5" />
              </span>
              Chat Zalo
            </a>
          )}
        </div>
      </section>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  )
}

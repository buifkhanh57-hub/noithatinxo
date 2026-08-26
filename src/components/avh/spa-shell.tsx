'use client'

/**
 * AvhShell — the entire single-page-application UI (header, active view,
 * footer, drawers, chat widget). Shared by every real route:
 *
 *   /            → home        /gio-hang   → cart      /blog/<slug> → blog detail
 *   /san-pham    → shop        /dat-hang   → checkout  … see src/lib/view-routes.ts
 *   /san-pham/x  → product     /thanh-toan → payment
 *
 * The server `page.tsx` for each route renders its own SEO metadata (title,
 * canonical, OG, JSON-LD) and passes the matching view here; the shell then
 * mounts it silently and takes over as a normal SPA. All in-app navigation
 * keeps working instantly AND syncs the URL via history.pushState, while a
 * popstate listener keeps back/forward correct.
 */

export interface ShellRoute {
  view: string
  params?: Record<string, string | undefined>
}

import { useEffect, useRef, lazy, Suspense, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { Header } from '@/components/avh/header'
import { Footer } from '@/components/avh/footer'
import { CartDrawer } from '@/components/avh/cart-drawer'
import { ChatWidget } from '@/components/avh/chat-widget'
import { CompareTray } from '@/components/avh/compare-tray'
import { useUIStore } from '@/lib/stores/ui-store'
import { routeFromLocation } from '@/lib/view-routes'
import { useAuthStore } from '@/lib/stores/auth-store'
import { api, ApiError } from '@/lib/api'
import { useSettingsStore } from '@/lib/stores/settings-store'

// Lazy-load each view as its own chunk so the dev server only compiles the
// view the user is currently on — crucial to keep memory usage bounded.
const HomeView = lazy(() => import('@/components/avh/views/home-view').then(m => ({ default: m.HomeView })))
const ShopView = lazy(() => import('@/components/avh/views/shop-view').then(m => ({ default: m.ShopView })))
const ProductView = lazy(() => import('@/components/avh/views/product-view').then(m => ({ default: m.ProductView })))
const CartPageView = lazy(() => import('@/components/avh/views/cart-view').then(m => ({ default: m.CartPageView })))
const CheckoutView = lazy(() => import('@/components/avh/views/checkout-view').then(m => ({ default: m.CheckoutView })))
const PaymentView = lazy(() => import('@/components/avh/views/payment-view').then(m => ({ default: m.PaymentView })))
const OrderSuccessView = lazy(() => import('@/components/avh/views/order-success-view').then(m => ({ default: m.OrderSuccessView })))
const WishlistView = lazy(() => import('@/components/avh/views/wishlist-view').then(m => ({ default: m.WishlistView })))
const AccountView = lazy(() => import('@/components/avh/views/account-view').then(m => ({ default: m.AccountView })))
const OrderTrackingView = lazy(() => import('@/components/avh/views/order-tracking-view').then(m => ({ default: m.OrderTrackingView })))
const AdminView = lazy(() => import('@/components/avh/views/admin-view').then(m => ({ default: m.AdminView })))
const BlogView = lazy(() => import('@/components/avh/views/blog-view').then(m => ({ default: m.BlogView })))
const BlogDetailView = lazy(() => import('@/components/avh/views/blog-detail-view').then(m => ({ default: m.BlogDetailView })))
const CompareView = lazy(() => import('@/components/avh/views/compare-view').then(m => ({ default: m.CompareView })))

function ViewFallback({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

/**
 * useBodyScrollLock — observes the `data-scroll-locked` attribute that Radix
 * Dialog / Sheet / Drawer sets on <body> when an overlay is open, and locks
 * the background page from scrolling.
 *
 * CRITICAL: We must NOT use `body { position: fixed; top: -scrollY }` here.
 * Setting `position: fixed` on <body> turns <body> into a containing block
 * for `position: fixed` descendants (per CSS Containment spec — a fixed
 * ancestor establishes a containing block for its fixed children even without
 * a transform). That means Radix Portals rendered into <body> (the cart
 * drawer, hamburger menu, auth dialog) inherit the body's `top: -scrollY`
 * offset → they get pushed OUT OF VIEWPORT (e.g. drawer.top = -2000px when
 * user opens cart at scrollY=2000). The drawer disappears visually.
 *
 * Fix: only manipulate `overflow`, `touch-action`, and `overscroll-behavior`
 * on <html> AND <body>. That blocks wheel/trackpad + Android/iOS touch
 * scroll behind the dialog without shifting any fixed-positioned overlay.
 *
 * Scroll restoration: we don't need to save/restore scrollY because the
 * page's scroll position is preserved naturally (overflow:hidden doesn't
 * reset scrollTop). When the dialog closes, the lock is removed and the
 * user is back at the same spot.
 *
 * `padding-right: <scrollbarWidth>` reserves space for the now-hidden
 * vertical scrollbar so content doesn't shift horizontally on lock engage.
 */
function useBodyScrollLock() {
  const lockRef = useRef<{ prev: Record<string, string> } | null>(null)

  useEffect(() => {
    const lock = () => {
      if (lockRef.current) return
      const html = document.documentElement
      const body = document.body
      // Scrollbar width = inner viewport - HTML client width.
      const scrollbarWidth = window.innerWidth - html.clientWidth
      const prevBody = {
        overflow: body.style.overflow,
        touchAction: body.style.touchAction,
        overscrollBehavior: body.style.overscrollBehavior,
        paddingRight: body.style.paddingRight,
      }
      const prevHtml = {
        overflow: html.style.overflow,
      }
      // Lock: hide overflow on both <html> (the actual scroll container in
      // standards mode) and <body> (covers any remaining touch surface).
      body.style.setProperty('overflow', 'hidden', 'important')
      body.style.setProperty('touch-action', 'none', 'important')
      body.style.setProperty('overscroll-behavior', 'none', 'important')
      if (scrollbarWidth > 0) {
        body.style.setProperty('padding-right', `${scrollbarWidth}px`, 'important')
      }
      html.style.setProperty('overflow', 'hidden', 'important')
      lockRef.current = { prev: { ...prevBody, htmlOverflow: prevHtml.overflow } as any }
    }

    const unlock = () => {
      if (!lockRef.current) return
      const { prev } = lockRef.current
      const body = document.body
      const html = document.documentElement
      body.style.overflow = prev.overflow
      body.style.touchAction = prev.touchAction
      body.style.overscrollBehavior = prev.overscrollBehavior
      body.style.paddingRight = prev.paddingRight
      html.style.overflow = (prev as any).htmlOverflow
      lockRef.current = null
    }

    // Observe <body> attribute changes — Radix adds/removes
    // `data-scroll-locked` whenever a Dialog/Sheet/Drawer opens/closes.
    const observer = new MutationObserver(() => {
      const isLocked = document.body.hasAttribute('data-scroll-locked')
      if (isLocked) lock()
      else unlock()
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-scroll-locked'] })

    // Initial state check (in case a dialog is open on mount)
    if (document.body.hasAttribute('data-scroll-locked')) lock()

    return () => {
      observer.disconnect()
      unlock()
    }
  }, [])
}

export function AvhShell({ route }: { route?: ShellRoute }) {
  const view = useUIStore((s) => s.view)
  const setUser = useAuthStore((s) => s.setUser)
  const setSettings = useSettingsStore((s) => s.set)

  // Lock body scroll whenever any Radix Dialog / Sheet / Drawer is open —
  // prevents the "page slides behind cart drawer" bug on mobile (iOS Safari).
  useBodyScrollLock()

  // Route mount: when this shell is loaded under ANY real url we force the
  // corresponding view — beats whatever stale page was persisted in
  // localStorage. Guest on /gio-hang must see the cart, not their old admin
  // session's screen.
  //
  // Static routes (/san-pham) can't forward ?query= from the server page, so
  // when no explicit params arrive we read them from window.location at
  // mount time → refresh preserves filters like /san-pham?cat=phong-khach.
  const initial = useRef<ShellRoute | undefined>(route)
  useEffect(() => {
    if (!initial.current) return
    const st = useUIStore.getState()
    let params = initial.current.params ?? {}
    if (!initial.current.params) {
      try {
        params = routeFromLocation().params
      } catch { /* keep {} */ }
    }
    const sameView =
      st.view === initial.current.view &&
      JSON.stringify(st.params ?? {}) === JSON.stringify(params)
    if (!sameView) st.setViewSilent(initial.current.view as never, params)
  }, [])

  // Browser back/forward: re-sync the view from the URL. Silent — the URL is
  // already the source of truth here; pushing again would double entries.
  useEffect(() => {
    const onPop = () => {
      const r = routeFromLocation()
      useUIStore.getState().setViewSilent(r.view as never, r.params)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // One-time seed on first load (idempotent on backend). We DO NOT block the
  // UI on this fetch — the views use their own TanStack Query for data, so
  // they show skeletons while fetching and render the moment data arrives.
  // If we waited for /api/seed to resolve before rendering, a slow seed call
  // (e.g. cold DB, heavy migration) would leave the page stuck on a spinner
  // forever → user sees "products disappeared" → reload → still stuck →
  // reload again → finally renders. Bad UX. So we fire-and-forget the seed
  // and let the views handle their own loading state.
  useEffect(() => {
    // Use AbortController with a 5s timeout — if /api/seed hangs (rare but
    // possible on cold start), we abort silently. The seed is idempotent
    // anyway, so a future request will retry.
    const ac = new AbortController()
    const timeout = setTimeout(() => ac.abort(), 5000)
    fetch('/api/seed', { method: 'GET', signal: ac.signal })
      .catch(() => {})  // ignore — views will re-fetch their own data
    // Load site-wide settings (announcement bar, social links, footer text…)
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((b) => b?.success && setSettings(b.data.values))
      .catch(() => {})
    return () => clearTimeout(timeout)
  }, [setSettings])

  // Restore + VERIFY the session on mount.
  //
  // The old bootstrap had three desynced sources (cookie, NextAuth session,
  // localStorage) and could show "logged in" while the server considered the
  // token dead — surfacing later as confusing 401s on upload. Now:
  //   1. Collect candidate tokens (persisted store → Google callback cookie
  //      → NextAuth session for Apple users).
  //   2. Validate against /api/auth/me with the Bearer header. The shared
  //      `api` layer auto-refreshes ONCE if the access token has expired.
  //   3. On success → set fresh user data (role/points re-read from DB).
  //   4. On real session death → clear stale identity + precise toast once.
  useEffect(() => {
    let cancelled = false

    // Session-expiry notice shown at most once per page load.
    let expiryToasted = false
    const toastExpiryOnce = () => {
      if (expiryToasted || cancelled) return
      expiryToasted = true
      import('sonner').then(({ toast }) =>
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', { duration: 6000 })
      )
    }

    ;(async () => {
      try {
        const st = useAuthStore.getState()
        // Collect token candidates in priority order.
        const cookieToken = document.cookie
          .split('; ')
          .find((c) => c.startsWith('avh_auth_token='))
          ?.split('=')[1]

        let token = st.user?.token || cookieToken || null

        // NextAuth session (covers Apple OAuth users) as a last-resort source.
        try {
          if (!token) {
            const r = await fetch('/api/auth/session', { credentials: 'include' })
            const session = await r.json().catch(() => null)
            const u = session?.user as { id?: string; name?: string | null; email?: string | null; role?: string; token?: string; image?: string | null } | undefined
            if (u?.token) {
              token = u.token
              setUser({
                id: u.id || '',
                name: u.name || '',
                email: u.email || '',
                role: (u.role as 'CUSTOMER' | 'ADMIN' | 'STAFF') || 'CUSTOMER',
                avatarUrl: u.image || undefined,
                token: u.token,
              })
            }
          }
        } catch { /* non-blocking */ }

        if (!token) {
          st.setLoading(false)
          return // plain guest — nothing to verify
        }

        // Verify with the server (api.get attaches Bearer and auto-refreshes once).
        try {
          const data = await api.get<{
            id: string; name: string | null; email: string; role: string;
            avatarUrl?: string | null; loyaltyPoints?: number; memberTier?: string
          }>('/api/auth/me')
          if (!cancelled && data?.id) {
            setUser({
              id: data.id,
              name: data.name ?? '',
              email: data.email,
              role: data.role as 'CUSTOMER' | 'ADMIN' | 'STAFF',
              avatarUrl: data.avatarUrl ?? undefined,
              loyaltyPoints: data.loyaltyPoints,
              memberTier: data.memberTier,
              // keep the SAME working token (or refreshed one now in store)
              token: useAuthStore.getState().user?.token || token,
            })
          }
        } catch (err) {
          if (!cancelled) {
            // Only clear the stale identity on REAL auth failures.
            // Network/server hiccups must NOT log a valid user out.
            if (err instanceof ApiError && (err.kind === 'auth_session_expired' || err.kind === 'auth_not_logged_in')) {
              useAuthStore.getState().setUser(null)
              toastExpiryOnce()
            }
          }
        }
      } catch {
        // ignore — never block first paint on session restore
      } finally {
        if (!cancelled) useAuthStore.getState().setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [setUser])

  const fallback = <ViewFallback label="Đang tải…" />

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Render views IMMEDIATELY on first render — no `seeded` gate.
            Each view uses TanStack Query + shows its own skeleton while
            fetching data, so the page never appears blank/stuck even if
            /api/seed is slow. */}
        <div key={view} className="avh-fade-in">
          <Suspense fallback={fallback}>
            {view === 'home' && <HomeView />}
            {view === 'shop' && <ShopView />}
            {view === 'product' && <ProductView />}
            {view === 'cart' && <CartPageView />}
            {view === 'checkout' && <CheckoutView />}
            {view === 'payment' && <PaymentView />}
            {view === 'order-success' && <OrderSuccessView />}
            {view === 'wishlist' && <WishlistView />}
            {view === 'account' && <AccountView />}
            {view === 'order-tracking' && <OrderTrackingView />}
            {view === 'admin' && <AdminView />}
            {view === 'blog' && <BlogView />}
            {view === 'blog-detail' && <BlogDetailView />}
            {view === 'compare' && <CompareView />}
          </Suspense>
        </div>
      </main>
      <Footer />
      <CartDrawer />
      <ChatWidget />
      <CompareTray />
      {/* Back to top — appears when scrolled down */}
      <BackToTop />
    </div>
  )
}

function BackToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!show) return null
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-24 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-110 sm:bottom-28"
      aria-label="Lên đầu trang"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}

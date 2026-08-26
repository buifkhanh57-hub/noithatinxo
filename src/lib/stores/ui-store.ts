'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { viewPath, viewBase } from '@/lib/view-routes'

/**
 * UI navigation store — REAL-PAGE navigation across every route.
 *
 * Since v3 each view owns a real url (/gio-hang, /san-pham/<slug>,
 * /blog/<slug>, …) and setView() navigates the BROWSER to it:
 *   - moving to another PAGE  → window.location.assign() → the new page is
 *     fetched and rendered fresh, exactly like a classic website
 *     ("sang trang là load trang mới như mấy web khác" — yêu cầu của chủ shop)
 *   - refining the SAME page  (e.g. /san-pham → /san-pham?cat=phong-khach)
 *     → instant in-place swap + pushState so filters stay snappy yet shareable
 *
 * Two setters:
 *   setView        — user navigation (drives the browser to the right URL)
 *   setViewSilent  — mount/restore from a real URL or popstate
 *                    (URL already correct → never navigate again)
 */

export type ViewName =
  | 'home'
  | 'shop'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'payment'
  | 'order-success'
  | 'wishlist'
  | 'account'
  | 'order-tracking'
  | 'admin'
  | 'blog'
  | 'blog-detail'
  | 'compare'

type ViewParams = Record<string, string | undefined>

interface UIState {
  view: ViewName
  // params for the current view
  params: ViewParams
  // global cart drawer open
  cartOpen: boolean
  // AI chat widget open
  chatOpen: boolean
  // mobile search bar
  mobileSearchOpen: boolean
  setView: (view: ViewName, params?: ViewParams) => void
  setViewSilent: (view: ViewName, params?: ViewParams) => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  setMobileSearchOpen: (v: boolean) => void
}

/**
 * Push `path` into history unless it already matches the current URL.
 * Used ONLY for same-page refinements — the URL is kept shareable without
 * a document reload.
 */
function syncUrl(view: ViewName, params: ViewParams) {
  if (typeof window === 'undefined') return
  const target = viewPath(view, params)
  const current = window.location.pathname + window.location.search
  if (target !== current) {
    try {
      window.history.pushState({ avhView: true }, '', target)
    } catch {
      /* ignore — never block navigation on history quirks */
    }
  }
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      view: 'home',
      params: {},
      cartOpen: false,
      chatOpen: false,
      mobileSearchOpen: false,
      setView: (view, params = {}) => {
        // SSR safety: no window → pure state update only.
        if (typeof window === 'undefined') {
          set({ view, params, cartOpen: false, mobileSearchOpen: false })
          return
        }

        const target = viewPath(view, params)
        const current = window.location.pathname + window.location.search

        // Already on exactly this address → just sync internal state.
        // (Prevents reload loops: route pages force their own view on mount
        // and views may re-assert their params afterwards.)
        if (target === current) {
          set({ view, params, cartOpen: false, mobileSearchOpen: false })
          return
        }

        // Same-page refinement (e.g. /san-pham?cat=a → /san-pham?cat=b):
        // stay instant like a modern storefront but keep the URL shareable.
        if (viewBase(view) === window.location.pathname) {
          set({ view, params, cartOpen: false, mobileSearchOpen: false })
          syncUrl(view, params)
          return
        }

        // DIFFERENT PAGE → REAL browser navigation. The new URL is fetched
        // and rendered fresh — headers, SEO metadata and the page itself all
        // come from the server route, exactly like "mấy web khác". The whole
        // document is replaced right after this call, so we don't touch
        // persisted state here; each real route mounts its own view cleanly.
        try {
          window.location.assign(target)
        } catch {
          set({ view, params, cartOpen: false, mobileSearchOpen: false })
          syncUrl(view, params)
        }
      },
      setViewSilent: (view, params = {}) => {
        set({ view, params, cartOpen: false, mobileSearchOpen: false })
      },
      openCart: () => set({ cartOpen: true }),
      closeCart: () => set({ cartOpen: false }),
      toggleCart: () => set((s) => ({ cartOpen: !s.cartOpen })),
      openChat: () => set({ chatOpen: true }),
      closeChat: () => set({ chatOpen: false }),
      toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
      setMobileSearchOpen: (v) => set({ mobileSearchOpen: v }),
    }),
    {
      name: 'avh-ui',
      storage: createJSONStorage(() => localStorage),
      // Don't persist transient UI flags
      partialize: (s) => ({ view: s.view, params: s.params }),
    }
  )
)

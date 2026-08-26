'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { viewPath } from '@/lib/view-routes'

/**
 * UI navigation store — drives the SPA-style view switching across every
 * route. Since v2 each view also owns a REAL url (/gio-hang, /san-pham/<slug>,
 * /blog/<slug>, …): setView() pushes the matching path into browser history,
 * so any page is shareable, refreshable, and back/forward works.
 *
 * Two setters:
 *   setView        — user navigation inside the app (syncs the URL)
 *   setViewSilent  — mount/restore from a real URL or popstate
 *                    (URL already correct → do NOT push again)
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
 * Native History API keeps this a pure client-side swap — Next does not
 * re-render server components and no chunk reloads happen.
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
        set({ view, params, cartOpen: false, mobileSearchOpen: false })
        syncUrl(view, params)
        // Don't auto-scroll on view change — customers complained the smooth
        // scroll-to-top animation felt jarring (page "jumps up to the header"
        // whenever they clicked a product / category). They'd rather keep
        // their scroll position so they can browse naturally.
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

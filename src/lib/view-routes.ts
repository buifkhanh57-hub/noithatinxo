// View ⇄ real-URL mapping for the AVH storefront.
//
// The UI is still a snappy SPA (Zustand view switching, no full reloads),
// but every view now OWNS a real address so customers can:
//   - share/bookmark any page:  domain.com/gio-hang
//   - refresh without losing their place
//   - use browser back/forward across pages
//   - land directly from Google on the right page
//
// `viewPath()`   → path used by history.pushState inside setView()
// `routeFromPath()` → inverse, used when a route file mounts the shell or
//                     when popstate (back/forward) fires.
//
// Keep in sync with src/app/**/page.tsx route files.

export type AppParams = Record<string, string | undefined>

interface KnownView {
  base: string
  // extra query params this view persists into the URL
  queryKeys?: string[]
}

const VIEWS: Record<string, KnownView> = {
  home: { base: '/' },
  shop: {
    base: '/san-pham',
    queryKeys: ['cat', 'q', 'sort', 'flashSale', 'isNew'],
  },
  product: { base: '/san-pham' }, // + /{slug}
  cart: { base: '/gio-hang' },
  checkout: { base: '/dat-hang' },
  payment: { base: '/thanh-toan', queryKeys: ['code'] },
  'order-success': { base: '/dat-hang/thanh-cong' }, // ?orderCode=
  wishlist: { base: '/yeu-thich' },
  account: { base: '/tai-khoan' },
  'order-tracking': { base: '/theo-doi-don-hang', queryKeys: ['code'] },
  admin: { base: '/quan-tri' },
  blog: { base: '/blog' },
  'blog-detail': { base: '/blog' }, // + /{slug}
  compare: { base: '/so-sanh' },
}

function buildQuery(view: string, params?: AppParams): string {
  const keys = VIEWS[view]?.queryKeys || []
  const sp = new URLSearchParams()
  for (const k of keys) {
    const v = params?.[k]
    if (v !== undefined && v !== '' && !(k === 'flashSale' && v !== 'true') && !(k === 'isNew' && v !== 'true')) {
      sp.set(k, v)
    }
  }
  if (view === 'order-success') {
    const code = params?.orderCode ?? params?.code
    if (code) sp.set('orderCode', code)
  }
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

/** Canonical URL path for a store view (+params). */
export function viewPath(
  view: string,
  params?: AppParams
): string {
  const def = VIEWS[view]
  if (!def) return '/'

  switch (view) {
    case 'product':
      return params?.slug
        ? `/san-pham/${encodeURIComponent(params.slug)}`
        : '/san-pham'
    case 'blog-detail':
      return params?.slug
        ? `/blog/${encodeURIComponent(params.slug)}`
        : '/blog'
    default:
      return def.base + buildQuery(view, params)
  }
}

/**
 * Base pathname of a view WITHOUT query string. Used by setView() to tell
 * "navigating to another PAGE" (→ full browser load, like any classic
 * website) apart from "facet tweak on the SAME page" (e.g. /san-pham →
 * /san-pham?cat=phong-khach → smooth in-place swap, URL kept shareable).
 */
export function viewBase(view: string): string {
  switch (view) {
    case 'product':
      return '/san-pham'
    case 'blog-detail':
      return '/blog'
    case 'order-success':
      return '/dat-hang/thanh-cong'
    default:
      return VIEWS[view]?.base ?? '/'
  }
}

/**
 * Inverse of viewPath() — maps a browser pathname back to the SPA view that
 * should be mounted. Unknown paths fall back to home.
 */
export function routeFromPath(pathname: string, search = ''): { view: string; params: AppParams } {
  const path = pathname.replace(/\/+$/, '') || '/'
  const sp = new URLSearchParams(search)

  // /san-pham/<slug>
  if (path.startsWith('/san-pham/')) {
    const slug = decodeURIComponent(path.slice('/san-pham/'.length))
    if (slug) return { view: 'product', params: { slug } }
    return shopFromQuery(sp)
  }

  // /blog/<slug>
  if (path.startsWith('/blog/')) {
    const slug = decodeURIComponent(path.slice('/blog/'.length))
    if (slug) return { view: 'blog-detail', params: { slug } }
    return { view: 'blog', params: {} }
  }

  // /dat-hang/thanh-cong?orderCode=…
  if (path === '/dat-hang/thanh-cong') {
    return {
      view: 'order-success',
      params: { orderCode: sp.get('orderCode') ?? sp.get('code') ?? undefined },
    }
  }

  switch (path) {
    case '/': return { view: 'home', params: {} }
    case '/san-pham': return shopFromQuery(sp)
    case '/gio-hang': return { view: 'cart', params: {} }
    case '/dat-hang': return { view: 'checkout', params: {} }
    case '/thanh-toan': return { view: 'payment', params: { code: sp.get('code') ?? undefined } }
    case '/yeu-thich': return { view: 'wishlist', params: {} }
    case '/tai-khoan': return { view: 'account', params: {} }
    case '/theo-doi-don-hang': return { view: 'order-tracking', params: { code: sp.get('code') ?? undefined } }
    case '/quan-tri': return { view: 'admin', params: {} }
    case '/blog': return { view: 'blog', params: {} }
    case '/so-sanh': return { view: 'compare', params: {} }
    default: return { view: 'home', params: {} }
  }
}

function shopFromQuery(sp: URLSearchParams) {
  return {
    view: 'shop',
    params: {
      cat: sp.get('cat') ?? undefined,
      q: sp.get('q') ?? undefined,
      sort: sp.get('sort') ?? undefined,
      flashSale: sp.get('flashSale') ?? undefined,
      isNew: sp.get('isNew') ?? undefined,
    } as AppParams,
  }
}

/** Current URL → route object (client only). */
export function routeFromLocation(): { view: string; params: AppParams } {
  if (typeof window === 'undefined') return { view: 'home', params: {} }
  return routeFromPath(window.location.pathname, window.location.search)
}

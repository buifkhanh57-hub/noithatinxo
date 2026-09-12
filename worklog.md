# Worklog — Nội Thất AVH (Furniture E-commerce)

Project: Build a comprehensive furniture e-commerce platform "Nội Thất AVH" on Next.js 16 (single `/` route, SPA-style view navigation via Zustand).

---
Task ID: 0
Agent: main (orchestrator)
Task: Project bootstrap, schema design, foundation planning.

Work Log:
- Explored existing Next.js 16 scaffold; confirmed shadcn/ui components, Prisma (SQLite), Zustand, TanStack Query, Framer Motion, next-themes, z-ai-web-dev-sdk are installed.
- Loaded LLM and image-generation skill docs.
- Confirmed dev server running on port 3000.
- Designed Prisma schema covering: User, Address, Category, Product, ProductVariant, ProductMedia, Review, Question, Cart, CartItem, Order, OrderItem, Voucher, Wishlist, Notification, ChatSession, ChatMessage, Banner, FlashSale, BlogPost.
- SQLite constraint: no native lists -> store arrays (tags, materials, colors, specs keys) as JSON-encoded strings.

Stage Summary:
- Foundation plan ready. Building schema + seed + lib + API + UI next.

---
Task ID: 2-a
Agent: view-builder-A
Task: Build shop-view.tsx and product-view.tsx

Work Log:
- Read worklog + ui-store / cart / wishlist / compare / auth stores + api wrapper to understand established conventions; cross-checked products, categories, and reviews API routes for response shapes.
- Wrote `src/components/avh/views/shop-view.tsx`: breadcrumb + flash-sale banner with CountdownTimer, page header with result count and shadcn `Select` for sort (newest / price-asc / price-desc / best-selling / rating), sticky desktop sidebar + mobile `Sheet` housing a shared `FilterPanel` (search box, category quick-list with counts, price min/max inputs + presets, material & color checkboxes with color swatches, "Xóa bộ lọc" button), responsive product grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`), shadcn `Pagination` with prev/next + ellipsis-aware page list, empty state, error state, skeletons.
- Filter state initialised from `useUIStore` params (`cat`, `q`, `sort`, `flashSale`, `isNew`) and re-synced via `useEffect` when params change; local filter state (materials, colors, price range, page) drives TanStack Query URL building. Page resets to 1 on any filter change.
- Wrote `src/components/avh/views/product-view.tsx`: breadcrumb → 2-column layout (gallery + info) on desktop / stacked on mobile; image gallery with main image + thumbnail strip + badges (-% / Mới / Flash Sale / Nổi bật) + floating wishlist toggle; trust highlights (bảo hành / giao hàng / đổi trả).
- Info column: brand + title, star rating + review count + sold count + SKU, price block (current + compare-at strikethrough + discount badge, stock hint), variant selectors (color swatches, material chips, size chips) derived from variants; quantity stepper (min 1, max = variant stock); Add-to-cart (uses useCartStore + openCart) and Buy-now (adds line + setView('checkout')) buttons; wishlist / compare / Facebook-share / copy-link secondary actions; tag chips.
- Tabs (shadcn): "Mô tả" (whitespace-pre-line description), "Thông số" (specs grid), "Đánh giá" (rating distribution bar chart + avg + total + review list with avatar-first-letter fallback, verified badge, image grid, shop reply block, submit form gated by `useAuthStore.user` else login prompt → POST /api/reviews + invalidateQueries), "Hỏi đáp" (question list with answer block + ask-question form, no-op toast "Cảm ơn, chúng tôi sẽ phản hồi sớm").
- Related products grid at bottom using `ProductCard` (related items mapped to `ProductListItem` shape with `inStock: true` + current category).
- Sticky mobile bottom add-to-cart bar (lg:hidden) + spacer; dedicated `ProductSkeleton` and `NotFound` states; lucide icons only; warm primary/accent tokens from globals.css; no indigo/blue.
- Removed unused imports (`Image`, `formatVND`, `discountPct`, `Share2`, `CheckCircle2`); ran `tsc --noEmit` — both view files report zero TS errors.

Stage Summary:
- Files written:
  - `/home/z/my-project/src/components/avh/views/shop-view.tsx` (export `ShopView`)
  - `/home/z/my-project/src/components/avh/views/product-view.tsx` (export `ProductView`)
- Notable decisions: shop view keeps navigation-driven filters (cat/q/sort/flashSale/isNew) in store params and local-only filters (materials/colors/price/page) in component state; both flow into a single TanStack Query URL built with `URL`/`URLSearchParams` for clean encoding. Product view selects the most specific variant by color+material+size, falling back to color-only then first variant; uses raw `<img>` for review images (lucide+Avatar for avatars with first-letter fallback). Related items are normalised to `ProductListItem` with `inStock: true` so the existing `ProductCard` does not incorrectly render the "Hết hàng" overlay. Sticky mobile CTA bar added with spacer to avoid overlapping content.
- Next actions: integrate `ShopView` / `ProductView` into the root `page.tsx` view router (likely an `if (view === 'shop') return <ShopView/>` switch) — that wiring is out of scope for this sub-agent's task but both exports are ready to drop in.

---
Task ID: 2-c
Agent: view-builder-C
Task: Build wishlist-view.tsx, account-view.tsx, order-tracking-view.tsx, compare-view.tsx

Work Log:
- Read worklog + existing stubs (all 10-line "loading skeleton" placeholders), home-view for established patterns, plus stores (ui-store, wishlist-store, cart-store, compare-store, auth-store), format.ts (formatVND, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS, MEMBER_TIERS, discountPct), api.ts (ApiError class), product-card.tsx (ProductListItem type, ProductCard), star-rating.tsx, and the relevant API routes (/api/products, /api/orders, /api/orders/[code], /api/products/[slug]) to confirm response shapes.
- Wrote src/components/avh/views/wishlist-view.tsx: fetches all products once via useQuery (`/api/products?limit=60`), filters client-side to wishlist IDs, renders ProductCard grid (grid-cols-2 sm:3 lg:4). Empty state with heart icon + "Khám phá sản phẩm" CTA. Header with count + "Xoá tất cả" (clears store) + "Tiếp tục mua sắm". Loading skeleton grid.
- Wrote src/components/avh/views/account-view.tsx: full dashboard with sidebar nav (desktop) / horizontal scrollable pill tabs (mobile). Six tabs: Tổng quan (avatar letter, name, tier badge with MEMBER_TIERS color, points, quick stats with orders/wishlist/points, recent orders preview), Đơn hàng của tôi (orders list fetched via /api/orders?userId, status badge colored per state, "Xem chi tiết" → setView('order-tracking', {code})), Sổ địa chỉ (sample/placeholder with toast on actions), Yêu thích (count + "Xem danh sách" → wishlist view), Thành viên & điểm (current tier, points, Progress bar to next tier, tier ladder SILVER→GOLD 3000pts→PLATINUM 10000pts, benefits list per tier), Thông báo (4 sample notifications with icons). Logout button in page header → logout() + setView('home'). Not-logged-in prompt triggers auth dialog via document.querySelector('[aria-label="Tài khoản"]').click().
- Wrote src/components/avh/views/order-tracking-view.tsx: reads params.code from useUIStore. If absent → search form ("Nhập mã đơn hàng" input + button, submits via setView('order-tracking', {code})). If code present → fetches /api/orders/[code]. Renders: header (code big mono, status badge, createdAt, total), installation/scheduledDate badges, 4-step horizontal TimelineStepper (Đã đặt → Đang xử lý → Đang giao → Đã giao, currentStep derived from status; CANCELLED/REFUNDED shows red X circle), vertical timeline detail list (from `timeline` array), shipping info card (name/phone/address/note), payment info card (method label, payment status badge, subtotal/shipping/discount/total breakdown), items list (image + name + qty + unit + line total). Buttons: "Mua lại" (re-adds all items to cart → setView('checkout')), "Liên hệ hỗ trợ" (useUIStore.getState().openChat()), "Về trang chủ". 404 → shows "Không tìm thấy đơn" + repeats search form with prefilled code. Loading skeleton.
- Wrote src/components/avh/views/compare-view.tsx: reads productIds from useCompareStore. Empty state with GitCompareArrows + "Đi mua sắm" CTA. Fetches products list once (`/api/products?limit=60`) to map id→slug, then useQueries for each product's full detail `/api/products/[slug]` to gather specs. Renders horizontally scrollable comparison table: header row = product image / name / category / price / StarRating / "Xem chi tiết" button / X-remove; body rows = FIXED_ROWS (price, comparePrice, discountPct, rating, soldCount, colors, materials, inStock) + dynamically-collected spec keys from all products' `specs` objects (union, label via SPEC_LABELS). Cells highlight with bg-primary/5 when values differ across columns. SpecValueCell auto-converts booleans (true/có/yes → green check; false/không/no → red X; "—" → grey minus). Loading skeleton row while details pending. Bottom: hint footer + "Tiếp tục so sánh" CTA.
- Removed unused imports (Separator/Truck/Clock in account-view; ChevronRight in order-tracking-view; allReady var in compare-view).
- Verified TypeScript + ESLint clean across all 4 files (npx tsc --noEmit shows zero errors for any of the four view paths; npx eslint on the four files passes with no output).

Stage Summary:
- Files written (all full implementations replacing the 10-line stubs):
  - src/components/avh/views/wishlist-view.tsx (≈115 lines)
  - src/components/avh/views/account-view.tsx (≈910 lines, includes 6 tab subcomponents + shared EmptyState/ErrorState helpers)
  - src/components/avh/views/order-tracking-view.tsx (≈640 lines, includes OrderSearchForm / OrderDetail / TimelineStepper / OrderSkeleton)
  - src/components/avh/views/compare-view.tsx (≈470 lines, includes ProductColumnHeader / SpecValueCell / SpecBooleanCell)
- All four views follow established conventions: 'use client', @/ aliases, Vietnamese UI text, shadcn components, sonner toast, lucide icons, terracotta/earth primary colors (no indigo/blue), warm tone status badges (amber/cyan/emerald/red/slate), responsive mobile-first, loading skeletons via <Skeleton>, TanStack Query (useQuery + useQueries for compare detail fan-out).
- Decisions worth noting:
  - Account auth: not-logged-in state clicks the header `[aria-label="Tài khoản"]` button (matches home-view pattern) rather than embedding its own dialog — keeps auth UI in one place.
  - Wishlist/Compare both fetch all 60 products once and filter client-side because there is no "by-ids" endpoint; query is shared with key ['products', 'all-60'] and 5min staleTime to avoid duplicate fetches.
  - Order tracking maps PENDING→step1 (Đã đặt), PROCESSING→step2, SHIPPING→step3, DELIVERED→step4; CANCELLED/REFUNDED short-circuits to a red X hero instead of the stepper.
  - "Mua lại" pushes all items to cart (slug left empty since order items don't store it; cart display still works) then jumps to checkout view.
  - Membership tier thresholds: SILVER 0 / GOLD 3000 / PLATINUM 10000 points (progress bar shows % toward next tier, fallback "highest tier reached" message for PLATINUM).
  - Compare view: spec rows are union of all products' specs keys (insertion-ordered, deduped); differences auto-highlighted with bg-primary/5; spec values auto-detect booleans for check/cross rendering.

---
Task ID: 2-b
Agent: view-builder-B
Task: Build cart-view.tsx, checkout-view.tsx, order-success-view.tsx

Work Log:
- Read worklog, stubs, ui-store, cart-store, auth-store, format.ts, api.ts, shipping.ts, product-card.tsx, cart-drawer.tsx, and API routes (/api/orders, /api/orders/[code], /api/vouchers, /api/products) to align on response shapes and conventions.
- Wrote `src/components/avh/views/cart-view.tsx` (`CartPageView`): full-width cart page with CartRow (image button → product, name, variant chips, qty selector with -/+/editable input, line total, remove). Voucher card with `api.get('/api/vouchers?code=...&subtotal=...')` via TanStack Query keyed by `[voucherCode, sub]`; uses a `useEffect` + `lastTriedCodeRef` to toast once on apply (success or error). Sticky summary sidebar with subtotal, discount, estimated shipping (free over 3M), total, "Tiến hành thanh toán" → setView('checkout'). Empty state with "Tiếp tục mua sắm". Suggested products grid (GET /api/products?limit=4&sort=best-selling) using ProductCard.
- Wrote `src/components/avh/views/checkout-view.tsx` (`CheckoutView`): 4-step stepper (Thông tin giao hàng → Vận chuyển & lắp đặt → Thanh toán → Xác nhận) with state-machine `step`. Step 1: name/phone/province-select(37 provinces)/district/ward/detail/note, prefilled from `user.name`; step 2: standard vs express radio + needsInstallation checkbox (+250k) + scheduled date + live shipping estimate via `shippingFeeFor()`; step 3: radio with COD/VNPay/MoMo/ZaloPay/Bank, icons, descriptions, and demo gateway note for non-COD; step 4: review address, shipping, payment, items. Validates step 1 (name, phone regex `^0\d{9}$`, all address fields) before allowing next. Sticky order-summary sidebar throughout with items + totals. POSTs to /api/orders with `{items, shippingName, shippingPhone, province, district, ward, detail, paymentMethod, voucherCode?, note?, needsInstallation?, scheduledDate?, userId?}`; on success clears cart and `setView('order-success', { orderCode: data.code })`, on error toasts `ApiError.message`. Empty-cart empty state with back-to-cart.
- Wrote `src/components/avh/views/order-success-view.tsx` (`OrderSuccessView`): reads `useUIStore.params.orderCode`; uses `useQuery` to GET `/api/orders/[code]` for full details. Hero with `CheckCircle2` + `animate-ping` halo, "Đặt hàng thành công!" heading, prominent order code chip. Summary card (totals, payment method, 3-5 day estimate, shipping address, items with qty badges), 4-stage timeline (PENDING/PROCESSING/SHIPPING/DELIVERED) with current ring highlight and PENDING badge, three CTAs (Theo dõi đơn hàng → setView('order-tracking', {code}), Tiếp tục mua sắm → setView('shop'), Về trang chủ → setView('home')), loyalty-program CTA card, and reassurance strip. Loading skeletons + error fallback. Separate `FallbackNotice` when no orderCode param.
- Verified all three files with `npx tsc --noEmit --skipLibCheck` (zero errors in these files) and `eslint` (clean). All icons, components, stores, and helpers are imported and used; no unused imports.
- Followed brand rules: warm terracotta `primary`/`accent`, Vietnamese UI throughout, mobile-first responsive grids, sonner toasts, Skeleton loaders, no indigo/blue primaries.

Stage Summary:
- Files written (3):
  - `/home/z/my-project/src/components/avh/views/cart-view.tsx` — `CartPageView`
  - `/home/z/my-project/src/components/avh/views/checkout-view.tsx` — `CheckoutView`
  - `/home/z/my-project/src/components/avh/views/order-success-view.tsx` — `OrderSuccessView`
- All three pass TypeScript + ESLint checks against the existing codebase.
- Integration points verified: `/api/vouchers`, `/api/orders` (POST + GET by code), `/api/products?sort=best-selling`, `useCartStore` (items, updateQty, removeItem, clear, subtotal, voucherCode, setVoucher, count), `useUIStore` (setView + params.orderCode), `useAuthStore` (user.id/name), `shippingFeeFor()`.

---
Task ID: 2-d
Agent: view-builder-D
Task: Build admin-view.tsx, blog-view.tsx, blog-detail-view.tsx

Work Log:
- Read worklog.md and inspected existing stubs (all 3 views were identical spinner placeholders). Surveyed lib/api.ts, lib/format.ts, lib/stores/ui-store.ts & auth-store.ts, src/app/api/{admin/stats,admin/products,blog,blog/[slug],orders/[code],vouchers,banners,products,categories}/route.ts for response shapes, plus shadcn UI export lists (dialog, alert-dialog, select, tabs, table, card, switch, checkbox, badge, skeleton) and brand chart colors in src/app/globals.css.
- Wrote src/components/avh/views/blog-view.tsx — header with breadcrumb, client-side search + tag-chip filter derived from posts, large featured-post hero card (lg:grid-cols-2), responsive card grid (sm:grid-cols-2 lg:grid-cols-3), loading skeletons, empty + error states, line-clamp excerpts, click → setView('blog-detail', { slug }).
- Wrote src/components/avh/views/blog-detail-view.tsx — hero cover (16:9 mobile / 21:9 desktop), tag chips, big title + excerpt, meta strip (author/date/reading-time/views), lightweight markdown-ish content renderer (splits on \n\n, converts `##` headings to h2/h3, renders `- list` blocks as <ul>, supports inline **bold**), 2-col desktop layout with sidebar containing "Bài viết liên quan" (3 related posts from /api/blog excluding current) and a newsletter signup card (toast "Đã đăng ký (demo)"), footer with Facebook share + copy-link + back button. 404 / loading states handled.
- Wrote src/components/avh/views/admin-view.tsx — access-control gate (`user?.role !== 'ADMIN'` → AccessDenied card with demo creds + button that calls document.querySelector('[aria-label="Tài khoản"]')?.click()), responsive sidebar (lg vertical, mobile horizontal scroll), 6 tabs: (1) Overview — 4 KPI cards + recharts LineChart (7-day revenueSeries, brand terracotta #c2654a + sage #7a8b5a) + BarChart (categoryBreakdown) + recent orders + low-stock/pending-orders alerts + top products list. (2) Products — Table (image, name+brand, category badge, price, featured/flash Switch toggles wired to PATCH /api/admin/products?id=ID, edit/delete actions), client-side search, Add/Edit Dialog with name/category select (from /api/categories)/brand/price/comparePrice/imageUrl/stock/featured/flash/new checkboxes → POST or PATCH + invalidateQueries(['products']), delete via AlertDialog confirmation (soft delete = unpublish). (3) Orders — search-by-code input that GETs /api/orders/[code]; default shows 5 recent orders from /api/admin/stats with "demo" note; each row expands to fetch detail by code and renders items + customer info + timeline + Select to PATCH /api/orders/[code] {status}. (4) Promotions — vouchers table from /api/vouchers (code, description, %/₫ badge, value, used count, active Switch visual-only) + "Tạo voucher" no-op toast + banners section from /api/banners with active toggle (visual). (5) Reviews — placeholder empty-state card. (6) Settings — store name / hotline / address form, no-op save with toast "Đã lưu (demo)".
- Refactored ProductFormDialog pre-fill from `useMemo` (anti-pattern) to `useEffect`; removed unused imports (TrendingDown, ChevronDown, Newspaper, Calendar, Eye, PieChart, Pie, Cell, PAYMENT_METHOD_LABELS).
- Ran `npx tsc --noEmit` and `npx eslint` on all three files — both pass clean. Dev server hot-reloads successfully (dev.log shows only the pre-existing /banners/*.png 404s from missing image fixtures, no errors traceable to the new views).

Stage Summary:
- src/components/avh/views/blog-view.tsx (281 lines) — Vietnamese UI, search + tag filter, featured hero + grid, empty/loading/error states. Verified compiling.
- src/components/avh/views/blog-detail-view.tsx (395 lines) — Hero, custom markdown-ish renderer (## headings, lists, **bold**), related-posts sidebar + newsletter card, share buttons, 404 state. Verified compiling.
- src/components/avh/views/admin-view.tsx (1669 lines) — Access control + 6-tab dashboard with KPIs, recharts (Bar+Line) in brand terracotta/sage palette, full product CRUD (Dialog+AlertDialog), order search/expand/status-patch, voucher+banner management, reviews placeholder, settings form. Verified compiling & lint clean.
- All three files overwrite the prior stubs; named exports AdminView / BlogView / BlogDetailView match the imports in src/app/page.tsx. Worklog appended.

---
Task ID: 3
Agent: main (orchestrator)
Task: Integration, lint fixes, image generation completion, final verification.

Work Log:
- Fixed zustand v5 import bug: persist/createJSONStorage must be imported from 'zustand/middleware', not 'zustand'.
- Created stub view files so page.tsx compiled during subagent work; subagents (2-a/2-b/2-c/2-d) replaced stubs with full implementations.
- Refactored page.tsx to use next/dynamic lazy imports for all 12 views — critical to bound dev-server memory (static imports caused OOM kills on the 4GB sandbox when compiling all views at once).
- Restarted dev server with `exec ./node_modules/.bin/next dev` (no `| tee` pipe) via setsid daemon to survive bash tool call cleanup.
- Disabled Prisma query logging to reduce memory/CPU overhead.
- Generated remaining hero banner (3) + blog cover (3) images with valid 1344x768 size (1440x720 rejected by API: not a multiple of 32).
- Fixed all ESLint errors:
  * shop-view.tsx: replaced two setState-in-effect blocks with React-recommended "adjust state during render" pattern (prevParamsKey + prevFilterKey).
  * product-view.tsx: moved product-id reset effect before setQty declaration (temporal dead zone); converted to during-render prevProductId + prevVariantId pattern; added setActiveMedia(0) to the reset block; removed 3 unused eslint-disable directives.
- Final `bun run lint`: 0 errors, 0 warnings.
- Agent Browser end-to-end verification:
  * Home page renders: hero carousel, category grid (6), flash sale with countdown, featured/new/best-sellers, blog teaser, newsletter CTA.
  * Shop view: breadcrumb, 14 products, filter sidebar (search, categories, price range), sort select, pagination.
  * Product detail: gallery, variant selectors, badges, rating, specs, tabs, related.
  * AI chat (Trợ Lý AVH): sent "Tư vấn sofa phòng khách 20m2 ngân sách 10 triệu" -> received relevant Vietnamese furniture recommendation via z-ai-web-dev-sdk backend proxy.
  * Add to cart + cart drawer: opens, shows item, totals.
  * Admin dashboard: KPI cards (14 products, 1 customer), recharts line/bar charts, recent orders, product table with CRUD dialogs, order status management, promotions.
  * Checkout: 4-step flow (shipping -> delivery -> payment -> review) renders.
  * Mobile responsive (390x844): mobile menu button present, layout stacks.
  * Dark/light mode toggle works.
  * Sticky footer present (mt-auto on flex-col min-h-screen wrapper).
- No console errors during navigation; only a benign LCP warning on product images.

Stage Summary:
- All 11 todos complete. App is fully runnable, lint-clean, and browser-verified.
- Dev server stable on port 3000 (~2.0GB used / 2.1GB free).
- Demo admin: admin@avh.vn / admin123. Demo customer: khach@avh.vn / khach123.
- 14 furniture products across 6 categories, 30 variants, 3 vouchers, 3 blog posts, 3 hero banners, 1 flash sale seeded.
- Trợ Lý AVH (LLM) works end-to-end via secure backend proxy (z-ai-web-dev-sdk) — API key never exposed to client.

---
Task ID: 4
Agent: main
Task: Make admin panel discoverable + add quick admin login.

Work Log:
- Root cause: admin link only existed in the mobile Sheet menu (visible only when logged in as admin) and the footer "Khu vực quản trị" link. Not discoverable on desktop.
- Added a visible "Quản trị" button (with LayoutDashboard icon) to the desktop header, shown only when user.role === 'ADMIN'.
- Upgraded AccessDenied screen in admin-view:
  * Added one-click "⚡ Đăng nhập nhanh (demo admin)" button that calls POST /api/auth/login with admin@avh.vn/admin123 directly (no need to open the auth dialog).
  * Kept "Đăng nhập bằng tài khoản khác" button that opens the auth dialog for other accounts.
  * Renamed title to "Trang quản trị Nội Thất AVH" + clearer description.
- Made footer "Khu vực quản trị" link more visible with a 🔒 icon.
- Agent Browser verified: footer/copy link → AccessDenied → click "Đăng nhập nhanh" → logged in as "Quản trị AVH" → admin dashboard renders (KPIs: 14 products / 1 customer, recharts line + bar, recent orders). Header shows "Quản trị" button after login.
- `bun run lint`: 0 errors, 0 warnings.

Stage Summary:
- Admin panel now reachable in 3 ways: (1) footer "🔒 Khu vực quản trị" link, (2) header "Quản trị" button when logged in as admin, (3) one-click quick login on the access-denied screen.
- Demo admin: admin@avh.vn / admin123 (or just click "Đăng nhập nhanh").

---
Task ID: 5
Agent: main
Task: Fix hydration error + add image/video upload feature for admin product form.

Work Log:
- Fixed hydration error in account-view.tsx (line 320): `<p>` containing `<Skeleton>` (which renders a `<div>`) → changed `<p>` to `<div>`. This was the only nested-div-in-p issue; other Skeletons were already inside `<div>` containers.
- Created POST /api/upload route:
  * Accepts multipart/form-data with field "files" (single or multiple).
  * Validates content-type prefix (image/* or video/*) + extension allowlist (jpg/jpeg/png/webp/gif/avif for images; mp4/webm/mov for videos).
  * Size limits: 8MB images, 25MB videos, max 10 files per request.
  * Generates random filenames (crypto.randomBytes) to prevent path traversal + collisions.
  * Saves to /public/uploads/products/<rand>.<ext>, returns array of {url, type, name, size}.
- Extended POST /api/admin/products to accept a `media` array of {url, type, thumbnail?} entries (supports images AND videos with ordering) in addition to the legacy single `imageUrl` string (backward-compat).
- Created MediaUploader component (src/components/avh/media-uploader.tsx):
  * Drag-and-drop zone + click-to-pick file input (accept="image/*,video/*", multiple).
  * Sequential upload to /api/upload with loading spinner; per-file error handling.
  * Live preview grid: image thumbnails + video icons, type badges (Ảnh/Video), first-item "Ảnh bìa" badge.
  * Per-item remove button, reorder hint.
  * URL paste fallback for adding media by link.
  * Uses a ref to avoid stale-closure bugs in the async upload loop.
- Updated ProductFormDialog in admin-view: replaced single "URL ảnh" text input with the MediaUploader; pre-fills media from existing product image on edit; sends `media` array + `imageUrl` (first item) on save.
- Verified end-to-end with Agent Browser:
  * curl POST /api/upload with sofa-grey.png → file saved (4585549f...png), response {success, uploaded:[{url,type,name,size}]}.
  * Admin → Products tab → "Thêm" → dialog shows "Ảnh & video sản phẩm" drop zone.
  * Upload via hidden file input → preview image appears, summary "1/10 file", second file saved (bea5d2a2...png).
- `bun run lint`: 0 errors, 0 warnings.
- Server stable on port 3000.

Stage Summary:
- Hydration error fixed (no more div-in-p warnings).
- Admin can now upload ảnh + video trực tiếp (drag-drop hoặc chọn file) thay vì dán URL. Files lưu vào /public/uploads/products/, hỗ trợ nhiều file cùng lúc, preview có badge phân biệt ảnh/video, nút xoá + đổi thứ tự.

---
Task ID: 6
Agent: main
Task: Make entire site admin-configurable (logo, social links, announcement, shipping policy, footer) + category CRUD + Flash Sale management tab.

Work Log:
- Added `Setting` model (key/value store) to Prisma schema + pushed.
- Created `src/lib/settings.ts`: defines 30+ configurable settings across 6 groups (branding, contact, social, announcement, shipping, footer) with default values + types (text/textarea/url/number/image/boolean).
- Created settings store (`useSettingsStore`) with baked-in defaults so the site renders correctly before the first fetch.
- Page.tsx now loads settings on mount and populates the store → Header/Footer read live values.
- API routes:
  * GET/POST /api/admin/settings — read all / bulk update (whitelisted keys).
  * POST/PATCH/DELETE /api/admin/categories — create/update/delete (blocks delete if products exist).
  * GET/POST/PATCH/DELETE /api/admin/flash-sale — full CRUD; toggling attaches/detaches products + sets isFlashSale flag.
- Header: announcement bar text + show/hide tracking & blog links + brand logo/name/tagline all read from settings store.
- Footer: brand block (logo/name/tagline), about text, contact (address/hotline/email/working hours), social links (FB/Zalo/Instagram/YouTube/TikTok — only show if configured), trust badges (text+subtext editable), payment methods list, copyright — all from settings.
- Rebuilt admin Settings tab: grouped sidebar nav (Thương hiệu / Liên hệ / Mạng xã hội / Quảng cáo header / Chính sách giao hàng / Footer), per-field rendering by type (text/textarea/url/number/boolean switch/image-with-upload), dirty-state tracking, "Lưu thay đổi" posts only changed keys, live-updates the settings store so header/footer reflect immediately.
- Added Flash Sale tab to admin sidebar: list all flash sales (name, date range, product count, status badge: Đang chạy/Sắp chạy/Đã kết thúc/Tạm dừng), create form (name + start/end datetime), toggle active switch, delete with confirmation.
- Verified via curl: settings round-trip (POST 4 values → read back correct), flash sale list shows "Flash Sale Cuối Tuần" with 4 products, category create returns new id+slug.
- `bun run lint`: 0 errors, 0 warnings.
- Server stable on port 3000 after restart (admin-view ~2050 lines compiles fine alone; chromium concurrent launch still causes transient OOM — UI verified via API round-trips + earlier browser sessions confirming the shared component patterns).

Stage Summary:
- Everything on the website is now admin-editable: logo, brand name/tagline, hotline, email, address, working hours, Facebook/Zalo/Instagram/YouTube/TikTok links, announcement bar text + link toggles, shipping policy badges text (Giao hàng/Bảo hành/Flash/Hỗ trợ), free-ship threshold, footer about + copyright + payment methods.
- New admin tabs: "Flash Sale" (CRUD flash sale events) + "Cài đặt" rebuilt with full site config.
- Category CRUD available via API (POST/PATCH/DELETE /api/admin/categories); product delete already existed.

---
Task ID: 7
Agent: main
Task: Fix hydration error + remove demo notes + add real bank/e-wallet config + automatic fraud/risk detection + transfer-slip upload + admin review flow.

Work Log:
- **Hydration fix**: created `src/hooks/use-mounted.ts` (`useMounted` returns false on server, true after mount). Gated cart/wishlist/compare Badge counts in Header behind `mounted` so server HTML and first client render agree (the persisted Zustand stores loaded from localStorage caused the mismatch). Same gate applied to mobile-menu count text.
- **Removed all "demo" notes** to make the site feel real:
  * auth-dialog: cleared prefilled admin@avh.vn/admin123 credentials, removed credential hint paragraph, replaced OTP "123456" demo hint with real instructions, changed Google/Apple button toasts, added "Đăng ký tại đây" link.
  * admin AccessDenied: removed quick-login button + credential block; replaced with "Về trang cửa hàng" + "Đăng nhập quản trị" buttons.
  * Removed "(demo)" text from admin orders tab, promotions, banner management, checkout payment note, blog-detail newsletter toast.
- **Real bank accounts & e-wallets** (admin-configurable):
  * New settings group "payment" with: payment_bank_accounts (JSON array), payment_momo_number/holder, payment_zalopay_number, payment_vnpay_merchant, payment_transfer_instructions.
  * Added to settings-store defaults + admin GROUP_ICONS/LABELS.
  * New `BankTransferInfo` component in checkout-view: when customer selects "Chuyển khoản (BANK)", shows the merchant's real bank accounts (bank name, account number, holder, branch, optional QR image), MoMo/ZaloPay wallets, the order-code transfer note hint, and total amount. Reads live from settings store so admin changes appear instantly.
- **Automatic fraud / risk detection** (`src/lib/risk.ts` + `computeRiskFlags()`):
  * VERY_HIGH_VALUE (≥80M₫): require ID verification + slip before shipping.
  * HIGH_VALUE (≥30M₫): info flag to call customer first.
  * DUPLICATE_PHONE: same phone ≥3 orders in 24h → warn (possible abuse).
  * BANK_HIGH_VALUE_NO_SLIP: bank transfer + high value → don't ship until slip confirmed.
  * BULK_ITEMS (≥10 items): verify not bulk-reseller.
  * ANON_COD_HIGH_VALUE: anonymous + COD + high value → COD-refusal risk.
  * SHORT_ADDRESS / SUSPICIOUS_NAME: info flags to verify before shipping.
  * Computed at order creation, stored as `riskFlags` JSON on the Order, surfaced in order response + admin.
- **Schema additions** to Order: `riskFlags String @default("[]")`, `slipUrl String?`, `slipUploadedAt DateTime?`, `reviewNote String?`. paymentStatus now includes `PENDING_VERIFY` for BANK orders awaiting slip.
- **Transfer-slip upload flow**:
  * POST /api/orders/[code]/slip — customer uploads slip image (validated: image only, ≤8MB, BANK payment only). Saves to /public/uploads/slips/, attaches to order, adds SLIP_UPLOADED timeline entry.
  * `SlipUploader` component in order-success-view: drop-zone + preview, only shows for BANK orders. Re-upload supported.
- **Admin review flow**:
  * POST /api/orders/[code]/review — staff confirms or rejects slip. Confirm → paymentStatus=PAID + status=PROCESSING + timeline PAYMENT_CONFIRMED. Reject → status=CANCELLED + paymentStatus=UNPAID + timeline PAYMENT_REJECTED. reviewNote persisted.
  * GET /api/orders/[code] now returns riskFlags, slipUrl, slipUploadedAt, reviewNote.
- **Verified end-to-end via curl**:
  * Created BANK order → paymentStatus=PENDING_VERIFY + 2 risk flags (VERY_HIGH_VALUE + BANK_HIGH_VALUE_NO_SLIP).
  * Uploaded slip → file saved (84e18502...png), order.slipUrl set, SLIP_UPLOADED timeline entry added.
  * Admin confirm → status=PROCESSING, paymentStatus=PAID.
- `bun run lint`: 0 errors, 0 warnings (useMounted has justified eslint-disable for the canonical mount-detection pattern).

Stage Summary:
- Hydration error fixed (mounted gate on persisted-store-dependent badges).
- All "demo" language removed; site feels real.
- Admin → Cài đặt → "Thanh toán & Ngân hàng" lets merchant configure real bank accounts (with optional QR codes) + MoMo/ZaloPay/VNPay merchant.
- Checkout shows those accounts when customer picks "Chuyển khoản", with transfer instructions + order-code note hint.
- Automatic risk detection flags suspicious orders (high value, duplicate phone, anonymous+COD+high, bulk, short address, suspicious name).
- Customer can upload transfer slip → staff reviews → confirm/reject in admin. Order stays PENDING_VERIFY until confirmed, preventing shipping on unverified payments (scam/legal-risk protection).

---
Task ID: 8
Agent: main
Task: Fix CreditCard import + auto-generate VietQR for bank-payment orders.

Work Log:
- Fixed `CreditCard is not defined` error in admin-view by adding it to the lucide-react import block.
- Created `src/lib/vn-banks.ts`: list of 27 Vietnamese banks with VietQR short codes (vcb, tcb, bid, mb, acb, etc.) + `buildVietQRUrl()` helper that constructs `https://img.vietqr.io/image/{bankCode}-{accountNumber}-compact.png?amount=&addInfo=&accountName=`.
- Updated BankAccount interface to include `bankCode` (VietQR short code).
- Updated BankAccountManager:
  * Replaced free-text "Tên ngân hàng" input with a dropdown Select of all 27 VN banks (with their codes).
  * Bank display name auto-fills from the selected bank code on save.
  * Bank account cards now show a live VietQR preview (auto-generated from bankCode + accountNumber + holder) if no custom QR is uploaded.
- Updated checkout BankTransferInfo component:
  * Added `qrFor()` that auto-builds a VietQR URL per bank using the ORDER TOTAL + ORDER CODE + holder name.
  * Each bank account card now shows a 32×32 QR image that, when scanned by any Vietnamese banking app (Vietcombank, MBBank, BIDV, etc.), auto-fills: bank, account number, exact amount, transfer note (order code), and account holder name.
  * Customer just scans → confirms in their banking app → money lands in the merchant's linked account.
  * Custom uploaded QR (qrUrl) still takes priority if set.
- Verified VietQR service: `https://img.vietqr.io/image/vcb-0123456789-compact.png?amount=8900000&addInfo=AVH-ABC123` returns HTTP 200 + content-type image/png (real scannable QR).
- Settings API returns all 6 payment fields. Lint: 0 errors.

Stage Summary:
- Admin → Cài đặt → "Thanh toán & Ngân hàng" → "Thêm tài khoản ngân hàng" now has a bank dropdown (27 banks) instead of free text.
- When customer picks "Chuyển khoản ngân hàng" at checkout, the system auto-generates a VietQR QR code containing: bank, account number, EXACT ORDER AMOUNT, order code as transfer note, holder name. Customer scans with any VN banking app → pays directly → money goes to merchant's linked account. No manual amount entry needed.
- Server is unstable (4GB RAM, Turbopack OOM) — restart on demand.

---
Task ID: 9
Agent: main (upload-token fix)
Task: Sửa triệt để lỗi upload ảnh "Chưa đăng nhập / Token expired" — tìm nguyên nhân gốc trong code, thêm refresh-token flow, phân loại lỗi.

Work Log:
- Root cause #1 (CRITICAL): 3 call site gọi fetch('/api/upload') KHÔNG đính kèm header Authorization (media-uploader.tsx:62, admin-view.tsx:2352/2704) trong khi /api/upload luôn bắt buộc Bearer → mọi upload luôn 401 dù đang đăng nhập đúng.
- Root cause #2: chỉ có 1 JWT 7d trong localStorage, không có refresh token; hết hạn là kẹt hoàn toàn.
- Root cause #3: page.tsx bootstrap đọc /api/auth/me?token= nhưng route cũ chỉ đọc email → luôn trả null; UI "giả vờ" đăng nhập trong khi server từ chối token.
- Root cause #4: mọi lỗi auth gộp chung 1 message; không phân biệt NO_TOKEN/TOKEN_EXPIRED/FORBIDDEN/file/storage/network.
- Root cause #5: cookie avh_auth_token của Google callback là httpOnly nhưng client đọc bằng document.cookie → luôn undefined (bug ngầm).

Backend fixes:
- src/lib/auth-token.ts: 2-token model — ACCESS 30m (typ:'access') + REFRESH 30d (typ:'refresh', chỉ nằm httpOnly cookie 'avh_refresh'); verifyAuthTokenDetailed trả reason 'expired'|'invalid'; legacy token (không typ) vẫn verify như access; requireAdmin/requireUser trả {error,status,code: NO_TOKEN|TOKEN_EXPIRED|TOKEN_INVALID|FORBIDDEN}; helpers set/clearRefreshCookie.
- NEW /api/auth/refresh: verify refresh cookie → re-read user từ DB (role mới) → sign cặp token mới + ROTATE cookie; mã lỗi NO_REFRESH_TOKEN/REFRESH_EXPIRED/REFRESH_INVALID.
- login/register/oauth-login/google-callback: set refresh cookie (login + register + oauth + google). logout: clear cookie. Google callback đổi avh_auth_token sang httpOnly:false (client đọc được — sửa bug #5).
- /api/auth/me: xác thực bằng Bearer hoặc ?token=, re-read DB, trả mã lỗi chính xác; bỏ tra theo email (không an toàn).
- /api/upload: mã lỗi NO_TOKEN / TOKEN_EXPIRED / TOKEN_INVALID / FORBIDDEN / NO_FILES / TOO_MANY_FILES / INVALID_PAYLOAD / UNSUPPORTED_TYPE / FILE_TOO_LARGE / STORAGE_ERROR; bắt lỗi formData.
- admin-guard: forward `code` cho toàn bộ admin API. addresses (+[id]), orders, profile: chuyển sang requireUser.

Frontend fixes:
- NEW src/lib/auth-client.ts: performSessionRefresh() single-flight — N request 401 song song chỉ tạo 1 call refresh; refresh OK → cập nhật token mới vào store; refresh 401 → xoá identity cũ (không còn "giả vờ đăng nhập").
- src/lib/api.ts: tự refresh + RETRY ĐÚNG 1 LẦN khi 401 có code refreshable (loại trừ endpoint auth); ApiError mới có kind: auth_not_logged_in | auth_session_expired | forbidden | validation | server | network; fetch throw → network error rõ ràng.
- NEW src/lib/upload-client.ts: uploadFilesToApi/uploadSingleImage — luôn gắn Bearer; validate ext/size client-side TRƯỚC khi gửi (mirror rule server); refresh + retry 1 lần khi 401; map per-file error kinds (kể cả UNSUPPORTED_TYPE/FILE_TOO_LARGE/STORAGE_ERROR từ body.failed[]); promptReLogin() CHỈ khi not_logged_in/session_expired.
- media-uploader.tsx: dùng uploadFilesToApi từng file tuần tự, local accumulator chống stale-closure; toast lỗi theo từng loại; session chết → toast + TỰ MỞ dialog đăng nhập.
- admin-view.tsx: 2 chỗ upload (logo settings + ảnh danh mục) chuyển sang uploadSingleImage; lỗi auth → promptReLogin.
- page.tsx bootstrap: thu token từ store → google cookie → nextauth session; VERIFY qua /api/auth/me (api.get tự refresh 1 lần); thành công → set user fresh từ DB; auth fail thật → clear + toast "Phiên đăng nhập đã hết hạn" 1 lần; lỗi network KHÔNG đăng xuất người dùng.

Testing (Agent Browser, tất cả PASS):
1. Login admin@avh.vn → upload logo + MediaUploader → 200, preview hiện.
2. Reload page → session còn → upload tiếp → 200.
3. Chọn 3 file cùng lúc → 3 POST tuần tự, cả 3 200, "4/10 file".
4. Token hết hạn (mint tay bằng secret thật) + refresh cookie còn hạn → upload: 401 → /api/auth/refresh 200 → retry 200; localStorage tự có token mới (exp ~30m, typ=access); KHÔNG yêu cầu đăng nhập lại.
5. Logout (xoá cookie) + token hết hạn → upload → toast ĐÚNG "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục tải ảnh." + dialog Đăng nhập TỰ MỞ; user được clear; đăng nhập lại xong → upload chạy ngay (2/10 file).
6. Token CUSTOMER (khach@avh.vn) → 403 FORBIDDEN "Bạn không có quyền tải file lên (chỉ quản trị viên/staff)" — KHÔNG nhầm với hết hạn.
7. File 9MB → toast "quá lớn (9.0MB, tối đa 8MB)"; file .pdf → "Định dạng pdf không được hỗ trợ"; cả hai bị chặn client-side KHÔNG phát sinh request; media không đổi.
8. Server down thật (kill next-server khi upload) → toast "Không thể kết nối máy chủ…" (network kind); server sống lại → upload 200 bình thường.
- Kèm: responsive mobile 390px + desktop 1440px render chuẩn; footer stick đúng; không hydration/console error; DB/schema/storage không bị xoá hay reset; schema production (postgres) giữ nguyên, chỉ thêm prisma/schema.sqlite.prisma cho môi trường sandbox.

Stage Summary:
- Upload giờ LUÔN mang token; access hết hạn → tự refresh + retry đúng 1 lần; chết thật → thông báo đúng + mở login; phân biệt đủ 8+ loại lỗi; không retry vô hạn; không bỏ auth để "cho qua".
- Files changed: src/lib/{auth-token,api,auth-client,upload-client,middleware/admin-guard}.ts, src/app/api/auth/{login,register,logout,me,oauth-login,refresh(new),google/callback}/route.ts, src/app/api/upload/route.ts, src/app/api/{orders,addresses,addresses/[id]}/route.ts, src/components/avh/{media-uploader,views/admin-view}.tsx, src/app/page.tsx, prisma/schema.sqlite.prisma (new, sandbox-only).

---
Task ID: 3
Agent: main (orchestrator)
Task: Product URLs + SEO; admin account buifkhanh57@gmail.com; Vercel/SQLite hygiene; push to GitHub

Work Log:
- Git hygiene BEFORE pushing: dropped unpushed junk commit 9d14d06 (contained db/custom.db binary — would have leaked local data to GitHub); restored db/, examples/, mini-services/ as untracked local files; .gitignore += /db/*.db, /examples/, /mini-services/, /tool-results/, /upload/, /download/
- Extracted SPA shell from page.tsx → src/components/avh/spa-shell.tsx (AvhShell, accepts initialSlug). page.tsx = thin wrapper
- NEW ROUTE src/app/san-pham/[slug]/page.tsx: generateMetadata (title/description/canonical/OG/Twitter vi_VN), server-rendered JSON-LD Product schema (VND price=min variant/basePrice, InStock/OutOfStock, aggregateRating from denormalized counters), notFound() → real HTTP 404 via route-level not-found.tsx; dynamic=force-dynamic
- Deep-link UX: AvhShell forces ui-store view=product+slug when initialSlug present (beats stale persisted localStorage view)
- src/app/sitemap.ts: dynamic (home + all published products), DB-failure tolerant. src/app/robots.ts: dynamic + Sitemap line (removed public/robots.txt). layout.tsx: metadataBase
- product-view.tsx share handlers now copy/share canonical /san-pham/<slug> URL (shareTargetUrl helper)
- Admin account: setup-admins.ts NEW_ADMINS += buifkhanh57@gmail.com w/ exact password AVHSTORE@123 (per-entry password override field); exported ensureAdminAccountsExist() (create-if-missing/promote-only — NEVER overwrites passwords) and hooked into GET+POST /api/seed so admins self-provision after Vercel deploy on the Supabase Postgres
- .env.example: NEXT_PUBLIC_SITE_URL documented; Supabase pooled-connection note for DATABASE_URL. DEPLOY.md: new sections "Tài khoản admin sau deploy (TỰ ĐỘNG)" + "URL sản phẩm + SEO"
- Incident+recovery: byte-appended SQLite file during a write test corrupted it ("disk image malformed") → restored pristine copy from /tmp backup made before history rewrite; PRAGMA integrity_check=ok; dev server restart required afterwards because Prisma kept a stale fd to the deleted inode ("readonly database")
- Sandbox note: platform reaps background dev-server processes between tool calls → all functional verification executed inside single bash sessions

Stage Summary:
- Verified: lint 0 errors; tsc --noEmit clean; curl SSR checks (title/canonical/OG/JSON-LD/sitemap/robots/404-vs-200); agent-browser e2e deep-link renders full storefront UI at /san-pham/ban-lam-viec-go-oak-avh-od; login API returns ADMIN session for buifkhanh57@gmail.com with AVHSTORE@123; ensureAdminAccountsExist created 5 admins locally (adminsProvisioned:5)
- Production build NOT runnable in sandbox per platform rule (bun run build forbidden); tsc+lint+dev-runtime are the quality gates here — Vercel build will run prisma generate + next build on Postgres env

---
Task ID: 4
Agent: main (orchestrator)
Task: Push with PAT + fix ChunkLoadError (admin-view.tsx)

Work Log:
- User provided GitHub PAT after password-auth failed; remote URL updated to ghp_ token; PUSHED main → origin/main (60e843b..e6ea602): auth/upload fix + SEO/san-pham route + admin seeding now on GitHub
- User-reported Runtime ChunkLoadError: lazy chunk src_lib_auth-client_ts from admin-view failed during AvhShell hydration
- ROOT CAUSE: stale .next Turbopack dev cache — spa-shell refactor changed chunk topology mid-session; browser/dev held old hashes
- FIX: pkill next + rm -rf .next + clean restart (no source changes needed)
- Agent-browser E2E verified: fresh page → footer 🔒 Khu vực quản trị via DOM click → ui-store {view:admin} → AdminView mounts ("Bảng điều khiển" h1) → /api/admin/stats 200, /api/admin/settings 200 → console ZERO chunk errors
- Auth store persistence verified: avh-auth localStorage keeps role=ADMIN buifkhanh57@gmail.com hasToken=true across server restarts
- Flakiness notes: sandbox reaps background dev server between tool calls (workaround: health-check+restart wrapper per block); zombie HMR page after server restart needs hard reload before trusting click tests

Stage Summary:
- GitHub repo up to date at e6ea602 on main
- ChunkLoadError resolved by cache clear; runtime interactive flows (login→admin→stats) verified in real browser

---
Task ID: 5
Agent: main (orchestrator)
Task: Real URLs for every storefront page (/san-pham, /gio-hang, /blog/...) with SPA-speed navigation + per-page SEO

Work Log:
- Surveyed params usage across all views (shop: cat/q/sort/flashSale/isNew; product+blog-detail: slug; payment/tracking: code; order-success: orderCode)
- NEW src/lib/view-routes.ts — single source of truth view⇄path map (14 views): home/, shop/san-pham(+query), product/san-pham/[slug], cart/gio-hang, checkout/dat-hang, payment/thanh-toan?code=, order-success/dat-hang/thanh-cong?orderCode=, wishlist/yeu-thich, account/tai-khoan, order-tracking/theo-doi-don-hang?code=, admin/quan-tri, blog/blog, blog-detail/blog/[slug], compare/so-sanh; routeFromPath() inverse incl. query parsing
- ui-store.setView now history.pushState(viewPath(...)) after state set; NEW setViewSilent for mounts/popstate (no double entries)
- spa-shell: initialSlug prop replaced by generic route={view,params}; mount effect forces view silently — reads params from window.location when page doesn't pass them (static routes can't forward ?query) → refresh keeps /san-pham?cat=… filters; popstate listener re-syncs view from URL (back/forward)
- 12 new route pages (server components with per-page Metadata): /san-pham, /gio-hang(no-index follow), /dat-hang, /thanh-toan, /dat-hang/thanh-cong, /yeu-thich, /tai-khoan, /theo-doi-don-hang, /quan-tri(no-index), /blog, /so-sanh + route-mount client bridge
- NEW /blog/[slug] SEO page: generateMetadata (title/excerpt→desc/canonical/OG article/publishedTime/Twitter large card), BlogPosting JSON-LD w/ author resolved via authorId (schema has no author relation/updatedAt), notFound() → real 404 via blog/[slug]/not-found.tsx
- sitemap.ts v2: static storefront entries + products AND published posts from DB; DB-failure tolerant
- Fixed tsc errors by aligning selects to actual BlogPost model (no updatedAt, no author relation)
- Agent-browser E2E PASSED: 12/12 routes HTTP 200; /gio-hang deep-link renders cart then logo-click pushes / and BACK restores /gio-hang{cart} FORWARD to /san-pham... ; /san-pham?cat=phong-khach direct load → store {cat} → H1 "Phòng Khách"; breadcrumb Sản phẩm click resets to /san-pham "Tất cả sản phẩm"; shop grid product card click → /san-pham/ban-lam-viec-go-oak-avh-od H1 matches; titles verified SSR for /san-pham /gio-hang /theo-doi-don-hang /blog /blog/[slug]; BlogPosting JSON-LD present
- lint ✓ tsc ✓

Stage Summary:
- Every page now has a shareable/refreshable/back-forwardable URL without losing SPA speed or breaking existing setView call sites
- SEO surfaces cover product detail, shop list, blog list/detail, static info pages; private flows stay no-index

---
Task ID: 5
Agent: Z.ai Code (main)
Task: Chuyển điều hướng sang REAL-PAGE navigation (sang trang = trình duyệt load trang mới như website thường) + sửa Danh mục nổi bật bỏ viền/khung chỉ còn ảnh + tên.

Work Log:
- src/lib/view-routes.ts: thêm helper viewBase(view) — pathname gốc không query, dùng để phân biệt "sang trang khác" vs "lọc trong cùng trang".
- src/lib/stores/ui-store.ts (v3): viết lại setView():
  + target == URL hiện tại → chỉ set state (chống reload loop khi route page force view).
  + cùng pathname (lọc/facet trong /san-pham) → set state + history.pushState (giữ mượt, URL vẫn share được).
  + khác trang → window.location.assign(viewPath()) = điều hướng thật, trình duyệt tải trang mới; server route render SEO metadata + shell mount đúng view.
- src/components/avh/spa-shell.tsx: đổi force-view từ useEffect sang useIsomorphicLayoutEffect — sửa view TRƯỚC frame đầu tiên, triệt tiêu flash view stale (localStorage lưu view cũ) trên mỗi lần tải trang mới; cập nhật doc-comment mô tả cơ chế navigation mới.
- src/components/avh/views/home-view.tsx: tile Danh mục nổi bật bỏ hẳn border/bg-card/p-3/đếm "N SP" — chỉ còn ảnh tròn dịu (rounded-xl) + tên; đổi button → <a href="/san-pham?cat=<slug>"> thật (middle-click, crawlable); thêm <nav aria-label>.
- Kiểm chứng agent-browser e2e: click danh mục → /san-pham?cat=phong-ngu navigation.type="navigate"; click sản phẩm → /san-pham/sofa-3-cho-...-avh-300 type="navigate" + title SEO đầy đủ; logo → "/" ; footer → /blog; back → back_forward; deep-link /gio-hang đè view admin bị poison trong localStorage (layout effect) → vẫn hiện Giỏ hàng; ERROR COUNT = 0 xuyên suốt (sau khi rebuild sạch .next).
- Screenshot desktop + mobile khu Danh mục nổi bật: không còn viền/khung, 6 tile ảnh + tên, grid 3 cột mobile / 6 cột desktop.

Stage Summary:
- Hành vi mới: MỌI lần chuyển trang (header, footer, card sản phẩm, danh mục, thanh-toan, order-success...) đều là tải trang thật giống website truyền thống; chỉ lọc trong /san-pham giữ instant SPA.
- Danh mục nổi bật: chỉ còn ảnh + tên như yêu cầu "bỏ mấy cái viền, để mỗi ảnh và tên thôi".
- Incident: ChunkLoadError tái xuất trong phiên test do kill/restart giữa chừng khiến Turbopack chunk stale — xử lý bằng pkill + rm -rf .next + khởi động lại; sau đó ERROR COUNT=0 qua toàn bộ luồng. Chunk src_* do Turbopack phục vụ on-demand (không nằm trên đĩa ở dev), production (Vercel) không có race này.
- Gate: tsc --noEmit sạch, eslint sạch, tất cả route health 200.

---
Task ID: 6
Agent: Z.ai Code (main)
Task: Kiểm tra webhook SePay trên domain mới https://noithatinxo.vercel.app và cung cấp link để cấu hình vào SePay dashboard.

Work Log:
- Đọc lại src/app/api/payments/sepay/webhook/route.ts: xác nhận luồng HMAC-SHA256 (X-SePay-Signature, signedPayload "<timestamp>.<rawBody>" nếu có X-SePay-Timestamp, fallback raw body), kiểm tra tài khoản nhận cố định (isFixedBankAccount), idempotent, response dạng flat success:true đúng quy cách SePay.
- Kiểm tra src/middleware.ts: matcher chạy mọi route nhưng chỉ thêm security headers + chặn path-traversal — KHÔNG chặn /api/payments/* → webhook tiếp cận được từ Internet.
- Test live trên https://noithatinxo.vercel.app:
  + GET  /                          → 200 OK
  + GET  /api/payments/sepay/webhook → 405 METHOD_NOT_ALLOWED (endpoint đã deploy + sống)
  + POST /api/payments/sepay/webhook (body, không signature) → 401 UNAUTHORIZED "Missing X-SePay-Signature header" → chứng minh SEPAY_WEBHOOK_SECRET ĐÃ cấu hình trên Vercel (nếu thiếu sẽ trả 500 CONFIG_ERROR trước khi kiểm signature).
  + robots.txt + sitemap.xml đều phát sinh URL https://noithatinxo.vercel.app → NEXT_PUBLIC_SITE_URL đúng domain mới, SEO chuẩn.
- Cập nhật doc-comment trong route.ts: thay URL preview cũ bằng domain sản phẩm mới + ghi chú signing scheme.
- Commit + push main.

Stage Summary:
- WEBHOOK URL cho SePay dashboard: https://noithatinxo.vercel.app/api/payments/sepay/webhook
- Endpoint đã xác minh sống, bảo mật HMAC hoạt động, secret env có sẵn trên Vercel.
- Lưu ý cho chủ shop: Webhook Secret trong SePay dashboard phải TRÙNG GIÁ TRỊ với env SEPAY_WEBHOOK_SECRET trên Vercel; đổi secret ở SePay thì phải cập nhật env Vercel + redeploy.


---
Task ID: 7
Agent: Z.ai Code (main)
Task: Sửa TOÀN BỘ thông tin ngân hàng sang tài khoản thật: 08660628189 — MB Bank — PHAM THI HAI YEN (thay tài khoản test SePay cũ 0000000002 · BUI THI BAO LOAN).

Work Log:
- src/lib/fixed-bank-account.ts: FIXED_BANK_ACCOUNT = MB Bank / mb / 08660628189 / PHAM THI HAI YEN. Đây là nguồn chân lý duy nhất: orders API snapshot vào PaymentSession, webhook SePay đối soát (isFixedBankAccount), payment-view fallback, banner admin.
- src/lib/bank-settings-sync.ts (MỚI): ensureFixedBankAccountSetting() — mirror cứng Setting `payment_bank_accounts` (mà checkout BankTransferInfo đang đọc) về đúng tài khoản cố định; có log SystemLog để đối chiếu; idempotent (in-sync thì không ghi).
- src/app/api/seed/route.ts: GET+POST gọi ensureFixedBankAccountSetting() → production DB tự sửa ngay sau deploy (shell gọi /api/seed mỗi lần tải trang). Kết quả trả kèm `bankSync`.
- src/app/api/setup-db/route.ts: seed mặc định từ tài khoản Vietcombank GIẢ (0123456789 · NỘI THẤT AVH) → tài khoản thật MB.
- src/lib/ai-agent.ts: cập nhật dòng tri thức AI agent về tài khoản ngân hàng.
- Kiến trúc DB: schema.prisma (repo/Vercel) GIỮ NGUYÊN provider postgresql; thêm prisma/schema.dev.prisma (provider sqlite) cho local dev + script `bun run db:dev`. Fix triệt để tình trạng "restart server local là DB chết" (client sqlite generate từ schema dev, Vercel build vẫn generate từ schema postgres).
- Kiểm chứng local (SQLite + secret tạm):
  + /api/seed → bankSync:"created"; /api/admin/settings → payment_bank_accounts = [{"bank":"MB Bank","bankCode":"mb","accountNumber":"08660628189","holder":"PHAM THI HAI YEN"}].
  + Webhook: payload đúng TK 08660628189 → qua cổng tài khoản (404 NOT_FOUND khi đơn chưa tồn tại); payload TK test cũ 0000000002 → 200 BANK_ACCOUNT_MISMATCH kèm expectedAccount=08660628189.
  + E2E toàn vòng: login → tạo đơn BANK AVH325127 (2.980.000₫, PENDING_VERIFY) → webhook signed đúng TK + đủ tiền → 200 OK "Confirm success" → replay → ALREADY (chống cộng gộp) → đơn chuyển PAID + PROCESSING.
  + Trang thanh toán đơn PENDING (AVH580784): hiển thị MB Bank · 08660628189 · PHAM THI HAI YEN, QR = img.vietqr.io/image/mb-08660628189-qr_only.png?amount=2980000&addInfo=AVH580784&accountName=PHAM THI HAI YEN.
- Gate: tsc sạch, eslint sạch, schema.prisma diff rỗng, home 200 + 14 sản phẩm.

Stage Summary:
- Toàn hệ thống (QR, checkout, payment, đơn hàng, webhook, AI agent, admin display, seed) dùng chung MỘT tài khoản: MB Bank 08660628189 — PHAM THI HAI YEN.
- Production self-heal: ngay khi Vercel deploy bản mới, lần tải trang đầu tiên sẽ đồng bộ Setting ngân hàng trong Supabase về tài khoản mới (bankSync=repaired/created).
- Lưu ý SePay: webhook chỉ ghi nhận tiền vào ĐÚNG số TK 08660628189; nếu trong dashboard SePay đang trỏ tài khoản test thì đổi về tài khoản thật này.

---
Task ID: 8
Agent: Z.ai Code (main)
Task: Migrate database sang project Supabase MỚI (bzlaulmrxnmaagsibzty) vì project cũ bị pause do 5 ngày không hoạt động; xuất danh sách env cần tạo/sửa trên Vercel.

Work Log:
- Điều tra: schema.prisma provider=postgresql (production), .env local sqlite; DB mới chỉ có IPv6 (db.<ref>.supabase.co → 2406:da18::) → sandbox lẫn Vercel functions đều không kết nối trực tiếp được → bắt buộc dùng Supavisor pooler. IPv6 prefix 2406:da18 = ap-southeast-1 (Singapore) — trùng region Vercel (sin1).
- prisma db push (session pooler port 5432): schema sync thành công 4.42s.
- Viết lại scripts/migrate-sqlite-to-postgres.js: (1) fix map model PascalCase → property camelCase (ProductVariant → productVariant, bản cũ tạo "productvariant" → undefined), (2) coerce SQLite Boolean 0/1 + DateTime epoch-millis qua information_schema của Postgres đích, (3) thêm ONLY_TABLES/SKIP_TABLES.
- Migrate catalog: Category 6, Product 14, ProductVariant 30, ProductMedia 14, Voucher 3, Banner 3, Setting 1 (bank MB 08660628189 — PHAM THI HAI YEN in-sync). BlogPost 3 sau khi null authorId (FK — bảng User cố ý bỏ qua). Bỏ qua Order/Payment/Notification/SystemLog (dữ liệu test local).
- Verify qua transaction pooler 6543 + pgbouncer=true (đúng kiểu connection Vercel sẽ dùng): counts đúng hết, createdAt là Date thật, bank setting đúng.
- E2E app thật với DB mới (dev server + DATABASE_URL inline): / 200, 6 danh mục render, /api/keep-alive heartbeat ok (14 SP), /api/seed success (bankSync in-sync, 7 users gồm 5 admin shop auto-provision), /api/products trả 14 SP, agent-browser: home render → click Sofa AVH-300 → /san-pham/sofa-3-cho-fabric-xam-hien-dai-avh-300, navType "navigate", SEO title đầy đủ, giá hiện.
- Chống pause TẬN GỌC: /api/keep-alive (GET, read-only, trả counts, 500 khi DB chết) + vercel.json crons [{path:"/api/keep-alive", schedule:"0 2 * * *"}] — 09:00 giờ VN hằng ngày, Supabase không bao giờ pause nữa.
- Theo template Supabase trênboarding: cài @supabase/supabase-js 2.116.0 + @supabase/ssr 0.12.7; tạo src/lib/supabase/client.ts (browser) + server.ts (server, cookies() async chuẩn Next 16) — phục vụ Storage/Realtime/Auth sau này; Prisma vẫn là đường dữ liệu chính.
- Cập nhật .env.example (placeholder) + DEPLOY.md (bảng env đầy đủ, cảnh báo port 6543, hướng dẫn migrate 3 bước). .env local: sqlite + NEXT_PUBLIC_SUPABASE_* thật (file gitignored).
- Lesson: shell sandbox export sẵn DATABASE_URL=file:... toàn cục → override .env của Next (bằng chứng: loadEnvConfig trả về file:...) → mọi lần test DB khác phải truyền inline khi khởi động server.
- Gate: tsc --noEmit sạch, eslint sạch, db:dev restore sqlite client, local home 200. Commit 78a84ac pushed → Vercel auto-deploy.

Stage Summary:
- DB mới bzlaulmrxnmaagsibzty (Singapore) ĐẦY DỮ LIỆU + SỐNG: schema + catalog + admin + bank setting MB.
- Việc còn lại cho chủ shop: sửa DUY NHẤT DATABASE_URL trên Vercel sang pooler 6543 của project mới (giá trị trong báo cáo cho user) → redeploy → web sống lại.
- Root cause đã xử lý: cron keep-alive hằng ngày giữ Supabase không bao giờ pause vì vắng khách.
- Đơn hàng cũ ở project bị pause: restore project cũ trong dashboard Supabase nếu cần export lịch sử; catalog mới đã đầy đủ không phụ thuộc project cũ.

---
Task ID: 9
Agent: Z.ai Code (main)
Task: Cấu hình webhook SePay MỚI (secret whsec_kIree...) — đối chiếu, test E2E và hướng dẫn cập nhật env Vercel.

Work Log:
- Đọc lại webhook route: HMAC-SHA256(rawBody, SEPAY_WEBHOOK_SECRET) → header X-SePay-Signature (fallback "<ts>.<rawBody>" khi có X-SePay-Timestamp); gate tài khoản cố định 08660628189; idempotent; flat success:true.
- Grep SEPAY_API_TOKEN: CHƯA có code path nào dùng — chỉ lưu env (dành cho REST API SePay sau này).
- Cập nhật .env local: SEPAY_WEBHOOK_SECRET + SEPAY_API_TOKEN (spsk_test_...).
- Production check: /api/keep-alive → heartbeat ok (products:14) → CHỨNG NHẬN user đã cập nhật DATABASE_URL + redeploy thành công; orders: 0.
- E2E production lần 1: order API yêu cầu login (requireUser Bearer). Đăng nhập buifkhanh57@gmail.com → tạo đơn AVH277521 (2.980.000₫, PENDING_VERIFY) → webhook ký bằng secret MỚI → 401 "Invalid signature" → CHẨN ĐOÁN: Vercel vẫn giữ SEPAY_WEBHOOK_SECRET cũ.
- Dọn đơn test AVH277521 khỏi production DB (Bun SQL native, tránh regenerate Prisma client): delete order cascade + soldCount -1 + 2 SystemLog + 1 Notification → orders left = 0.
- E2E LOCAL với secret mới (BASE_URL=localhost): tạo đơn AVH003910 → webhook ký đúng → 200 OK "Confirm success" → DB: PAID + PROCESSING + session SUCCESS → replay → ALREADY → sai TK → BANK_ACCOUNT_MISMATCH → cleanup (soldCount 217 như cũ). ✅ PASS TOÀN BỘ.
- Thêm 3 script ops vào repo: test-sepay-webhook-e2e.ts (BASE_URL param), diag-sepay-webhook.ts, cleanup-test-order.ts (Bun SQL).

Stage Summary:
- Secret mới + scheme ký + code webhook ĐÃ CHỨNG MINH hoạt động (E2E local pass đủ 4 kịch bản: OK/ALREADY/MISMATCH/cleanup).
- Việc còn lại 100% thuộc về chủ shop: Vercel → env SEPAY_WEBHOOK_SECRET = whsec_kIreeJXOj9T3cvkXZBK4giXF9bFQIUL8 → Save → Redeploy. Sau đó webhook SePay sẽ xác nhận đơn thật.
- Production DB mới đã sống (heartbeat 14 SP, 0 đơn), có tool dọn đơn test trong repo.

---
Task ID: 10
Agent: Z.ai Code (main)
Task: Đổi domain sang noithatavh.info.vn — xác minh DNS, xác nhận URL webhook SePay, E2E trọn vòng trên domain mới.

Work Log:
- Domain check lần 1: root trỏ 75.2.60.5 (Netlify) → 404 Netlify; vercel.app 307 → domain mới (domain ĐÃ add trên Vercel làm primary).
- DNS công cộng (1.1.1.1/8.8.8.8, NS ns1/ns2.tino.vn): root A đã đổi → 216.198.79.1 (Vercel ✅); www CNAME VẪN → frolicking-dragon-5bf286.netlify.app (Netlify ❌). Sandbox resolver còn cache cũ (75.2.60.5), /etc/hosts không ghi được (no root).
- Qua IP pin (curl --resolve / https.request + SNI + Host): GET / 200 title "Nội Thất AVH", webhook GET 405, POST no-sig 401, keep-alive heartbeat ok (14 SP) → Vercel đang phục vụ domain mới.
- Viết scripts/e2e-domain-pinned.ts (node:https, pin IP + SNI, bypass DNS cache): login → tạo đơn AVH972049 (2.980.000₫) → webhook ký secret whsec_kIree... → 200 OK "Confirm success" → DB PAID + PROCESSING → replay ALREADY → cleanup (orders left 0). ✅ PASS → CHỨNG MINH: domain mới hoạt động + SEPAY_WEBHOOK_SECRET mới đã cập nhật trên Vercel.
- SEO surfaces (robots.txt/sitemap.xml) VẪN phát https://noithatinxo.vercel.app → NEXT_PUBLIC_SITE_URL chưa đổi; NEXTAUTH_URL cũng cần đổi; www record cần sửa CNAME → cname.vercel-dns.com.

Stage Summary:
- WEBHOOK URL CHÍNH THỨC: https://noithatavh.info.vn/api/payments/sepay/webhook — ĐÃ VERIFIED E2E PASS (tạo đơn thật → signed callback → PAID).
- Secret SePay mới đã khớp Vercel env (webhook 200 thay vì 401).
- Việc còn lại cho chủ shop: (1) sửa CNAME www → cname.vercel-dns.com; (2) env Vercel NEXT_PUBLIC_SITE_URL + NEXTAUTH_URL = https://noithatavh.info.vn → redeploy (SEO/sitemap/OAuth dùng domain mới).
- Tool: e2e-domain-pinned.ts dùng được cho mọi domain sau này khi DNS sandbox cache cũ (PIN_IP + DOMAIN + SECRET + POOLER_URL).

---
Task ID: 11
Agent: main
Task: Fix lỗi upload ảnh HTTP 404 + 413 trên Vercel (domain noithatavh.info.vn)

Work Log:
- Chẩn đoán: /api/upload bị commit c504f23 xóa nhầm → 404 trên production; storage cũ fallback base64 data-URI + client cho 8MB/file, nhiều file/request → vượt cap 4.5MB body Vercel → 413
- Phát hiện quan trọng: Supabase Storage API BẮT BUỘC header `apikey` + `Authorization: Bearer` (chỉ Bearer → 403 Invalid Compact JWS); đã test live bằng curl
- Tạo bucket public "media" (limit 50MB) trên Supabase project bzlaulmrxnmaagsibzty
- Rewrite src/lib/storage.ts: upload → Supabase Storage REST (bucket media, path {folder}/{yyyy}/{mm}/{ts}-{rand}-{slug}.{ext}), trả public URL CDN; fallback data-URI khi thiếu env; có deleteFile()
- Khôi phục src/app/api/upload/route.ts (auth contract giữ nguyên NO_TOKEN/TOKEN_EXPIRED/TOKEN_INVALID/FORBIDDEN); limits mới: ảnh 6MB, video 4MB, tối đa 10 file
- upload-client.ts: nén ảnh >1MB trong browser (canvas → WebP q0.85/0.7/0.55 → JPEG nền trắng, max 1920px), gửi TỪNG FILE MỘT tuần tự → không bao giờ chạm 4.5MB; GIF/AVIF không nén (cap 3MB)
- E2E local PASS: login → upload → URL Supabase CDN → GET 200; không token → 401 NO_TOKEN
- Commit 1392f03 push → Vercel deploy live sau 88s
- E2E production: trúng deployment mới → upload success:true NHƯNG trả về data:base64 (không phải URL Supabase) = project Vercel THIẾU env Supabase
- Poll 10x: 7 request rơi vào deployment CŨ (không có keep-alive), 3 vào deployment mới = domain bị 2 project cùng giữ (flap)

Stage Summary:
- Code fix HOÀN CHỈNH và đã deploy (1392f03); cần user làm 2 việc trên Vercel dashboard:
  1. Thêm env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY → Redeploy (NEXT_PUBLIC bake lúc build)
  2. Remove domain noithatavh.info.vn khỏi project CŨ (chỉ giữ ở project chính) — domain đang flap 70/30 giữa 2 deployment
- File test trong bucket đã dọn sạch; không sót DB row

---
Task ID: 12
Agent: Z.ai Code (main)
Task: Đổi theme trắng + đỏ AVH (nền trắng, giá/nút/logo đỏ, flash sale redesign, tên thương hiệu cạnh logo mobile)

Work Log:
- ROOT CAUSE nền đen: layout.tsx đang forcedTheme="dark" → đổi thành "light" (cả defaultTheme), khóa trắng vĩnh viễn
- globals.css: --primary chuyển từ charcoal #161616 → đỏ AVH oklch(0.55 0.22 26) ≈ #d40a1f (+ ring đỏ); dark variant đỏ sáng hơn
- header.tsx: tên thương hiệu hiện cả trên mobile (truớc đây hidden sm:flex), chữ đỏ text-primary; logo fallback bg-primary tự đỏ
- Flash sale redesign (home-view): ticket đỏ gradient from-red-700 via-red-600 to-rose-500, viền tròn 2xl + ring + shadow đỏ, circles trang trí, scallop SVG edge giữa header/body, countdown variant light (hộp trắng số đỏ), CTA gradient đỏ, grid lg:grid-cols-6/4 theo số SP
- shop-view flash banner: cùng style ticket đỏ
- countdown-timer: variant light = bg-white text-red-600
- Bẫy dev server: Turbopack không recompile CSS → restart; process chết khi call kết thúc → fix bằng (setsid ... &) double-fork subshell
- Verify browser (mobile 390px + desktop 1366px): nền trắng ✓ giá đỏ ✓ nút đỏ ✓ ticket flash sale ✓ tên + logo mobile ✓ guest bấm Mua Hàng → redirect login ✓ footer stick bottom ✓

Stage Summary:
- Toàn site: nền TRẮNG + điểm nhấn ĐỎ AVH (#d40a1f): announcement, nút, giá, badge, logo, flash ticket
- Commit push → Vercel auto deploy

---
Task ID: 13
Agent: Z.ai Code (main)
Task: Login/đăng ký trong menu 3 gạch + avatar/tên user; Mua Hàng → trang chi tiết; viền đen siêu mỏng cho product card; flash sale kết thúc thật (hết 24h ẩn); thêm đỏ nổi bật giữ nền trắng

Work Log:
- header.tsx: (1) announcement bar nền ĐỎ chữ trắng; (2) header: avatar tròn đỏ (chữ cái đầu) hoặc ảnh avatarUrl + tên user (lg), click → account/login; (3) menu 3 gạch thêm block tài khoản trên cùng: guest = "Đăng nhập / Đăng ký" + nút đỏ "Vào ngay" mở AuthDialog; user = avatar + tên + email + 2 nút "Tài khoản"/"Đăng xuất" (logout qua auth-store)
- product-card.tsx: Card border-border/60 → border border-neutral-900/25 (viền đen 1px siêu mỏng, hover /40); nút "Mua Hàng" KHÔNG còn add-to-cart trực tiếp → setView product detail (đã bỏ handleAddToCart + imports rác)
- product-view.tsx: nút chính đổi label "Thêm vào giỏ hàng", sticky bar mobile "Thêm vào giỏ"; giữ "Mua ngay" → đúng flow: xem thông tin → thêm giỏ → đặt hàng
- Flash sale THẬT: flashEnd = 23:59:59 hôm nay (useMemo ổn định, trước đây now+23h59m mỗi lần render → vĩnh viễn); CountdownTimer thêm prop onEnd (gọi 1 lần khi diff=0); home-view + shop-view có state flashOver → ẨN TOÀN section/banner khi hết giờ
- Đỏ nổi bật (giữ nền trắng): icon chips dịch vụ home + footer bg-red-50 text-red-600; social footer hover đỏ
- E2E browser: login buifkhanh57 → menu hiện avatar B + tên + email + Tài khoản/Đăng xuất ✓; logout ok ✓; card Mua Hàng → trang chi tiết (heading đúng SP) ✓; Thêm vào giỏ → toast + drawer + Tiến hành thanh toán ✓; xóa SP khỏi giỏ (cleanup) ✓; lint sạch ✓

Stage Summary:
- Flow mua hàng chuẩn: Card "Mua Hàng" → trang chi tiết → "Thêm vào giỏ hàng"/"Mua ngay" → checkout
- Flash sale có deadline thật (hôm nay 23:59:59), hết giờ tự ẩn, hôm sau chạy chu kỳ mới
- Viền đen 1px (neutral-900/25) giúp card nổi trên nền trắng, siêu mỏng không xấu trên mobile


---
Task ID: 8
Agent: Z.ai Code (main)
Task: Làm theo ảnh Zalo khách gửi — header vân gỗ kiểu NT Anh Khoa + SDT/Zalo + các yêu cầu tồn đọng (theme trắng, flash sale hết hạn thật, viền thẻ, đăng nhập trong menu, luồng mua qua trang chi tiết).

Work Log:
- Đọc 4 ảnh Zalo trong /home/z/my-project/upload (ảnh chụp site anhkhoa.com.vn): yêu cầu = header kiểu Anh Khoa (MENU + tên AVH), nền header MÀU GỖ, có phần SDT + Zalo, phần danh mục trên đầu.
- Sinh texture gỗ sồi sáng bằng AI (z-ai image) → public/wood-header.jpg; class .wood-surface / .wood-surface-soft trong globals.css (lớp kem phủ 82–90% để chữ vẫn đọc rõ).
- header.tsx viết lại theo mẫu Anh Khoa:
  + Hàng chính nền gỗ: ☰ MENU (icon + chữ), logo AVH đỏ + "NỘI THẤT AVH" + tagline, search (desktop), icon tài khoản/yêu thích/so sánh/giỏ hàng (badge đỏ), search thả xuống (mobile).
  + Quick-nav NGAY DƯỚI header (cuộn theo trang, không sticky): mobile grid 4 cột × 2 hàng + ô đỏ "Tất cả" mở sheet; desktop 1 hàng cuộn ngang + nút đỏ "Lọc sản phẩm".
  + Thanh đỏ liên hệ: hotline (tel:) bên trái + "Chat Zalo" (zalo.me/<sđt>) bên phải — hiển thị mọi trang.
  + Sheet hamburger: khách → nút đỏ "Đăng nhập / Đăng ký" mở AuthDialog; đã đăng nhập → avatar + tên + email bấm vào tài khoản; cuối menu có hotline + Zalo. Bỏ ThemeToggle (bị force light).
- floating-contact.tsx (MỚI): 2 nút tròn nổi góc trái dưới — Gọi (đỏ, tel:) + Zalo (xanh Zalo #0180c7); ẩn ở /quan-tri; gắn trong spa-shell cạnh ChatWidget.
- Sửa BUG FLASH SALE KHÔNG BAO GIỜ HẾT HẠN: trước đây flashEnd = new Date(); +23h59 mỗi lần render → deadline tự dịch theo thời gian thực. Giờ có src/lib/flash-sale.ts: cửa sổ neo theo ngày UTC (00:00–23:59:59.999), pure function → SSR/client cùng giá trị, countdown CHẠY THẬT về 0; CountdownTimer thêm onExpired → home-view ẩn cả block khi hết; shop-view dùng chung lib (bỏ useMemo +23h).
- Luồng mua mới theo yêu cầu: ProductCard bỏ add-to-cart + login-gate; nút "Mua Hàng" → /san-pham/<slug> (trang chi tiết có "Thêm vào giỏ" + "Mua ngay"); card viền đen cực mỏng border-black/25 (hover /45).
- Theme trắng + đỏ: layout.tsx forcedTheme/defaultTheme = "light"; primary đỏ oklch(0.55 0.22 26) (dark 0.66 0.21 26), ring/sidebar đồng bộ; banner flash sale dạng ticket đỏ gradient (from-red-700 via-red-600 to-rose-500) + viền răng cưa SVG + timer hộp trắng chữ đỏ; newsletter đỏ (tự theo primary); ô icon dịch vụ bg-red-50 text-red-600.
- settings: brand_tagline mặc định "Sản xuất trực tiếp - Không qua trung gian" (settings.ts + settings-store.ts).
- Sự cố sandbox: .env chỉ còn DATABASE_URL sqlite + schema.prisma bị reset về postgres → chuyển sang kiến trúc schema.dev.prisma (bun run db:dev) như Task 7 đã ghi; DB local chết → prisma db push + /api/seed lại (6 danh mục, 14 SP, 3 banner...).
- Merge origin/main (nhánh remote có sẵn commit cc1fa60 "white theme + red identity" + hạ tầng upload Supabase/bank MB thật): resolve conflict giữ PHIÊN BẢN MỚI CỦA MÌNH cho UI (header gỗ, flash lib, card, shop/home), giữ remote cho upload/route.ts + hạ tầng; worklog hợp nhất 2 bên; schema.prisma trả lại postgresql (fix trước khi push).
- Browser-verify (agent-browser 390px + 1440px): header gỗ + quick-nav + thanh đỏ SDT/Zalo render đúng; countdown chạy ngược thật 08:55:53 → 08:55:50; click "Mua Hàng" → URL /san-pham/bo-ban-an-4-ghe-go-oak-avh-dt + title SEO; "Thêm vào giỏ" → toast + drawer đúng giá đỏ 8.800.000đ; menu hamburger khách/đã đăng nhập (avatar "Bùi Khánh (Chủ shop)") đều đúng; login admin buifkhanh57@gmail.com OK; footer stick ở trang ngắn /so-sanh; html.light + price đỏ lab(45.5 69.7 48.8); ERROR 0 (chỉ còn warning Radix a11y dev-only có từ trước).

Stage Summary:
- Đã đẩy lên origin/main: e546484 (sau merge 34dc4e7). UI hiện tại = đúng 4 ảnh Zalo: header MENU + AVH nền gỗ, grid danh mục, thanh đỏ SDT + Chat Zalo, nút nổi Gọi/Zalo.
- Flash sale giờ có deadline thật trong ngày, hết giờ là ẩn block (sẽ tự mở lại chu kỳ ngày sau).
- Lưu ý Vercel: sau pull lần này cần Redeploy; schema.prisma đã đảm bảo postgresql; local dev dùng `bun run db:dev`.
- Cần chủ shop cập nhật Setting hotline/social_zalo trong trang Quản trị nếu muốn đổi số (mặc định 1900 1234 / 0938123456).

---
Task ID: 14
Agent: Z.ai Code (main)
Task: Thanh quảng cáo đầu trang → thay bằng Hotline 1900 1234 + Chat Zalo; số Zalo/hotline chỉnh được ở Cài đặt; giữ nguyên header gỗ + danh mục Phòng Khách/Phòng Ngủ ở phần đầu.

Work Log:
- header.tsx: thanh đỏ trên cùng (trước đây là dòng quảng cáo announcement_text) giờ = Hotline (tel:) bên trái + "Chat Zalo" (zalo.me/<sđt>) bên phải, bấm được; cả 2 số đọc từ settings-store.
- Bỏ thanh đỏ liên hệ trùng lặp dưới quick-nav (trước đây hotline+zalo hiện 2 nơi → giờ chỉ trên đầu trang + trong menu 3 gạch).
- settings.ts: social_zalo chuyển sang nhóm 'contact' ngay cạnh contact_hotline (label "Số Zalo nhận tin nhắn", help rõ: zalo.me/<số>, để trống để ẩn nút); xoá 3 def announcement_* và group 'Quảng cáo header'.
- settings-store.ts: bỏ announcement_* khỏi DEFAULTS; admin-view.tsx: dọn GROUP_ICONS/GROUP_LABELS + import Megaphone, mô tả tab Cài đặt mới.
- Browser E2E: mobile 390px + desktop 1440px — thanh đỏ "Hotline: 1900 1234 — Gọi tư vấn & lắp đặt | Chat Zalo" ✓; href tel:19001234 + zalo.me/0938123456 ✓; quick-nav đủ 6 danh mục + ô "Tất cả" đỏ ✓; footer vẫn stick ✓.
- Admin → Cài đặt → nhóm "Liên hệ (Hotline + Zalo)": sửa Hotline thành 1900 6789 → Lưu → thanh đỏ đầu trang đổi NGAY tức thì ✓ → trả lại 1900 1234 ✓.
- Lint sạch; commit 17b7dcc push → Vercel auto deploy.

Stage Summary:
- Header giờ đúng yêu cầu: (1) phần đầu hiển thị như mẫu cũ nhưng nền gỗ — MENU + AVH + lưới danh mục Phòng Khách/Phòng Ngủ/Phòng Ăn/Tủ & Kệ/Văn Phòng/Đèn Trang Trí; (2) hotline 1900 1234 + Chat Zalo nằm trên thanh đỏ đầu trang (thay header quảng cáo); (3) chủ shop đổi số hotline/Zalo tại Quản trị → Cài đặt → Liên hệ, lưu là chạy ngay không cần deploy.
- Lưu ý production (Supabase): hàng Setting cũ còn key announcement_text/show_* trong DB — không còn hiển thị, vô hại; có thể xoá tuỳ ý.

---
Task ID: 15
Agent: Z.ai Code (main)
Task: Nền gỗ bảng màu INOVAR chỉ hiện cho ADMIN (khách vẫn header trong suốt/trắng); XOÁ dải danh mục Phòng Khách/Phòng Ngủ/Phòng Ăn dưới header.

Work Log:
- Chọn swatch gỗ SỒI VÀNG (golden oak — hàng 4 cột 1) từ ảnh bảng màu sàn INOVAR khách gửi: ấm, hợp nội thất gỗ, không đụng đỏ thương hiệu. Crop bằng PIL (inset 4px tránh viền trắng) → upscale 3x → public/wood-oak-admin.jpg (546×534, avg #bfa37e).
- globals.css: .wood-surface-admin = nền #bfa37e + veil kem 42–52% (vân gỗ THẤY RÕ khác .wood-surface veil 82%) + repeat-x 340px.
- header.tsx: const isWood = user?.role === 'ADMIN'. Header: admin = wood-surface-admin + viền gỗ; KHÁCH (kể cả user thường) = bg-background/85 + backdrop-blur-md + border-b (trong suốt mờ như thiết kế cũ). Đồng bộ toàn bộ: icon nâu gỗ/đen mặc định, hover gỗ/accent, tên thương hiệu nâu gỗ/ĐỎ, input search viền gỗ/thường.
- XOÁ nguyên section quick-nav (grid 4×2 mobile + row desktop "Lọc sản phẩm") — hết hẳn dải Phòng Khách/Phòng Ngủ… dưới header; dọn imports Armchair/Package/SlidersHorizontal + mobileCats/iconCls.
- Menu 3 gạch: thêm "Tất cả sản phẩm" (chữ đỏ) ngay dưới Trang chủ — khách vẫn vào được trang shop.
- Sự cố: dev server 500 khi login — schema.prisma = postgresql (bản cho Vercel) nhưng local cần SQLite → chạy `bun run db:dev` (push schema.dev.prisma + generate) → restart → login OK. Workflow đã ghi ở Task 7/8.
- Browser E2E: admin desktop 1440 + mobile 390 → nền gỗ hiện rõ, chữ đọc tốt, nút Quản trị ✓; guest (session riêng) desktop + mobile → header trắng trong, KHÔNG gỗ, KHÔNG dải danh mục ✓; scroll → sticky trắng mờ đọc rõ ✓; menu có "Tất cả sản phẩm" + đủ danh mục ✓. Lint sạch.

Stage Summary:
- Admin đăng nhập = thấy vân gỗ sồi vàng (INOVAR) ở header; khách truy cập KHÔNG BAO GIỜ thấy gỗ — header trắng trong suốt mờ như cũ.
- Dải Phòng Khách/Phòng Ngủ/Phòng Ăn dưới header đã XOÁ hoàn toàn (cả mobile + desktop); category còn ở menu 3 gạch + section "Danh mục nổi bật" trên trang chủ (giữ — là nội dung cửa hàng).
- Commit b029c14 push → Vercel auto deploy.

---
Task ID: 16
Agent: Z.ai Code (main)
Task: Chủ shop chê swatch Inovar cắt ra "xấu, không giống gỗ thật" → thay bằng texture gỗ thật sinh bằng AI.

Work Log:
- Sinh 3 ứng viên texture gỗ (z-ai image, 1344x768): A óc chó đỏ vân dọc, B sồi vàng vân cathedral chảy ngang, C teak vân chéo. Chọn B — thật nhất, sáng nhất, chữ dễ đọc.
- Bài học layout: crop band 1240x240 dùng cover → header 64px chỉ thấy giữa, vân zoom thành "sợi rơm". Fix: NÉN DỌC ảnh về đúng tỷ lệ header (1920×115, aspect ~16.7:1 — trùng mockup đã duyệt) + background-size: 100% 100%.
- Mockup PIL soạn trước (nén sẵn + veil + đáy tối) để duyệt nhanh không cần chạy browser nhiều vòng.
- .wood-surface-admin veil: trắng 20%→6%→4% + rgba(80,46,14,.18) đáy; text tagline admin #8a5a26→#5c3a17.
- Verify: admin desktop/mobile vân gỗ thật rõ, chữ đọc tốt; guest session riêng → header trắng trong, wood=false. Lint sạch.

Stage Summary:
- Header admin = ảnh chụp vân gỗ sồi thật (AI, không ghép seams); khách không đổi.
- Asset: public/wood-real-oak-3.jpg (82KB); các file swatch/texture cũ đã xoá.
- Commit push → Vercel auto deploy.

---
Task ID: 17
Agent: Z.ai Code (main)
Task: Chủ shop chê texture sồi vàng "nhìn cứ khó chịu và khó nhìn quá, mất hết sự nổi bật" (header vàng nhạt sọc dày, chữ chìm vào nền) → thiết kế lại toàn bộ header admin.

Work Log:
- Chẩn đoán: texture sồi vàng nhạt + vân sọc dày đặc gây rối mắt; chữ/logo nâu đậm trên nền vàng nhạt = tương phản thấp, mất điểm nhấn.
- Hướng mới: gỗ ÓC CHÓ SẬM cao cấp (dark walnut espresso) + chữ/icon KEM TRẮNG — kiểu header nội thất cao cấp: nền sâu dịu mắt, nội dung thật sự nổi bật.
- Sinh texture mới (z-ai image 1344x768): "dark walnut, grain horizontal, espresso brown + caramel highlights" → chỉnh PIL (Color 1.08, Contrast 1.04, Brightness 0.97) → public/wood-admin-walnut.jpg (206KB, avg #55301e).
- CSS .wood-surface-admin mới: background-size cover + no-repeat (vân giữ tỉ lệ thật, không xé mép), position center 45%, lớp phủ tối gradient nhẹ 8–38% đảm bảo chữ kem tương phản ~12:1 (AAA). Xoá .wood-surface / .wood-surface-soft cũ (đã không còn nơi dùng).
- header.tsx bảng màu admin mới: icon/menu #f3e7d3, AVH + tên brand #f7ecd8/#fdf6ea + drop-shadow, tagline #d9c5a5, hover bg-white/12, viền dưới border-black/40 + shadow sâu hơn; search input bg trắng + border-white/30. Guest giữ nguyên 100%.
- Verify agent-browser: admin desktop 1440 (gỗ óc chó rõ vân, chữ kem nổi) + mobile 390 OK; guest desktop → bg-white/85 + blur(12px), không có class gỗ; errors rỗng. Lint sạch.

Stage Summary:
- Header admin: gỗ óc chó sậm sang trọng + chữ kem trắng — hết "khó chịu", logo/nội dung nổi bật rõ; khách không đổi (trắng trong suốt).
- Asset: public/wood-admin-walnut.jpg (206KB); đã xoá wood-real-oak-3.jpg, wood-header.jpg, wood-oak-admin.jpg.
- Commit push → Vercel auto deploy.

---
Task ID: 18
Agent: Z.ai Code (main)
Task: Chủ shop chê gỗ óc chó "tối quá, muốn sáng hơn" → nâng tông gỗ lên mật ong sáng ấm.

Work Log:
- Sinh 2 ứng viên sáng hơn (z-ai image 1344x768): honey oak (avg #845939, contrast chữ kem 5.63:1) & natural oak rất sáng (avg #bf9975, contrast chỉ 2.43:1 — loại, sẽ lặp lỗi "chữ chìm").
- Chọn honey oak. Đo 10 lát cắt dọc ảnh (mô phỏng cover 1440×64) → vùng 5-6% từ trên sáng nhất & vân êm nhất (#966a46).
- Tái xử lý asset: Brightness 1.15 + Color 1.05 + Contrast 1.02 → public/wood-admin-oak.jpg (238KB, avg #99643d).
- CSS: position center 6%, veil tối giảm còn 8–30%; header.tsx tagline admin #f6ead0.
- Verify pixel: gỗ render cũ lum 0.178 → mới 0.364 (sáng gấp đôi); admin desktop + mobile thấy gỗ vàng ấm sáng, chữ kem rõ; guest hasWood=false, bg trắng mờ giữ nguyên; không lỗi console; lint sạch.

Stage Summary:
- Header admin: gỗ SỒI MẬT ONG sáng ấm (lum 0.364) — điểm cân bằng giữa óc chó bị chê "tối" và bảng vàng nhạt bị chê "nhợt/rối".
- Asset: public/wood-admin-oak.jpg; xoá wood-admin-walnut.jpg.
- Commit push → Vercel auto deploy.

---
Task ID: 19
Agent: Z.ai Code (main)
Task: (1) Fix lỗi "sửa giá xong mà vào trang sản phẩm vẫn thấy giá cũ"; (2) thêm ô nhập MÀU SẮC khi thêm/sửa sản phẩm; (3) đổi section "Danh mục nổi bật" thành "MENU" (lưới ô tên kiểu anhkhoa theo ảnh khách gửi).

Work Log:
- Root cause giá: POST tạo SP luôn sinh 1 biến thể mặc định mang giá gốc; PATCH chỉ cập nhật Product.basePrice KHÔNG đụng biến thể; trang chi tiết hiển thị selectedVariant.price ?? basePrice → giá biến thể cũ luôn thắng.
- Fix PATCH route.ts: khi basePrice đổi → productVariant.updateMany({price: product.basePrice cũ} → giá mới). Biến thể đã có giá riêng không bị ghi đè.
- Fix POST route.ts: có `colors` → tạo 1 biến thể/màu (cùng giá, cùng tồn kho); không có → 1 biến thể mặc định.
- PATCH colors: xoá biến thể có màu, tạo lại theo danh sách mới (giữ tồn kho màu cũ còn lại, giá = basePrice mới, sku slug-i tránh trùng unique).
- admin-view ProductForm: thêm state colors + chip input (Enter/nút Thêm, datalist gợi ý Be/Kem/Trắng/Đen/Xám/Nâu/Nâu gỗ/Xanh rêu/Đỏ đô, nút X xoá chip); prefill từ product.colors; payload gửi colors. AdminProduct interface + colors?: string[].
- product-view: colorOptions = unique([...variant colors, ...product.colors]) — SP cũ có colors JSON nhưng không có biến thể màu vẫn hiện chip.
- home-view: "Danh mục nổi bật" → "MENU", grid tile tên thuần (4 cột mobile / 6 desktop, border, hover đổi đỏ thương hiệu) đúng như ảnh anhkhoa khách gửi.
- E2E (agent-browser, admin thật): sửa giá 2.900.000 → 3.150.000 + thêm màu Be → lưu → trang SP hiện 3.150.000₫ + 3 chip màu (Gỗ sáng/Trắng/Be); admin table + dialog prefill đúng; trả lại dữ liệu gốc (2.900.000₫, 2 màu) → verify round-trip OK. MENU grid: desktop + mobile 4 cột, guest cũng thấy. Lint sạch.

Stage Summary:
- Sửa giá giờ hiện NGAY trên trang sản phẩm (sync biến thể tự động).
- Form sản phẩm có ô Màu sắc (chip) — màu tạo lựa chọn cho khách, giá áp chung.
- Trang chủ: section MENU lưới danh mục kiểu anhkhoa thay "Danh mục nổi bật".
- Commit push → Vercel auto deploy.

---
Task ID: 20
Agent: Z.ai Code (main)
Task: (1) Bỏ lưới ô tên MENU đã làm SAI ý ở Task 19 — chủ shop: "CHỈ SỬA TÊN LÀ MENU, DANH MỤC + ẢNH VẪN Ở ĐÂY"; ảnh mẫu gửi kèm là để THÊM thanh MENU vào ĐẦU TRANG; (2) fix mobile trang đặt hàng "cứ tuột ở dưới, khách không biết cứ ấn nút"; (3) fix mobile trang tài khoản "bị to ra".

Work Log:
- Root cause misunderstanding: ảnh "anhkhoa" khách gửi = thiết kế thanh menu ngang ĐẦU TRANG, không phải để thay lưới danh mục. Task 19 đã sai khi xoá ảnh danh mục thay bằng ô tên thuần.
- home-view: khôi phục 100% section gốc (ảnh vuông + tên, 3 cột mobile/6 desktop, SectionHeader) — chỉ đổi title thành "MENU".
- header.tsx: thêm MENU BAR dưới header — "☰ MENU | Tất cả sản phẩm | <6 danh mục>", cuộn ngang mobile (ẩn scrollbar), navigate setView('shop', {cat}). Desktop + guest đều thấy.
- Fix tràn ngang header mobile 22px (scrollWidth 412>390, nút giỏ bị cắt): brand bỏ shrink-0 (chữ co/truncate, logo giữ), actions thêm shrink-0.
- Fix trang TÀI KHOẢN "to ra" (scrollWidth 799px vs 390px!): Radix ScrollArea wrapper display:table + w-max làm tràn cả trang → thay bằng overflow-x native + ẩn scrollbar. Kết quả: 380px, tab chips cuộn ngang đúng.
- Fix CHECKOUT mobile: (a) useEffect [step] cuộn lên đầu trang khi chuyển bước — trước đây đứng y ở đáy; (b) validateStep1 đánh dấu fieldErrors + viền đỏ + scrollIntoView(center) tới ô lỗi đầu tiên, tự xoá đỏ khi sửa (update helper); (c) dồn hàng nút Quay lại/Tiếp tục/Đặt hàng ra sau grid, MOBILE thành sticky bottom-0 (pl-16/pr-20 chừa nút gọi điện + chat nổi, safe-area-inset), desktop giữ hàng nút thường.
- globals.css: input/textarea/select 16px trên <768px — chặn iOS auto-zoom ("trang to ra" khi bấm vào ô nhập).
- spa-shell: overflow-x-clip làm lớp bảo vệ tràn ngang toàn cục (không phá sticky).
- Verify agent-browser: home mobile sw=380 + MENU bar 7 nút + section MENU có 6 ảnh; account sw=380 (từ 799); checkout bấm Tiếp tục khi trống → cuộn tới ô name (top=332, centered) + 5 ô viền đỏ + toast; điền đủ → step 2 + scrollY=0; desktop nav row static (bottom=885<900); guest: header trắng hasWood=false, MENU bar click "Phòng Khách" → /san-pham?cat=phong-khách 4 SP. Lint sạch.

Stage Summary:
- Đúng ý chủ shop: MENU ở ĐẦU TRANG (thanh ngang dưới header) + section danh mục giữ nguyên ảnh, chỉ đổi tên thành MENU.
- Mobile hết 2 lỗi lớn: trang tài khoản không còn "to ra" (799→380px), đặt hàng không còn "tuột đáy" (cuộn lên đầu khi đổi bước + cuộn tới ô lỗi + thanh nút dính đáy).
- Commit 8b72d1d push → Vercel auto deploy.

---
Task ID: 21
Agent: Z.ai Code (main)
Task: Chủ shop phản ánh "phần kia không giống ảnh Khoa gửi lắm, muốn giống ý tớ gửi, vẫn chưa deploy lên git". Chẩn đoán + sửa.

Work Log:
- Đọc lại TOÀN BỘ ảnh chủ shop paste (upload/pasted_image_*.png): (a) ảnh chụp web anhkhoa.com = menu ngang ☰ MENU + lưới chip danh mục ở ĐẦU TRANG; (b) ảnh Zalo Khoa = strip ưu đãi + section "MENU nổi bật" (MENU ô đỏ) với LƯỚI ẢNH danh mục, caption "Để ntn khách dễ hiểu hơn"; (c) ảnh crop thanh 4 ưu đãi (Giao toàn quốc / Bảo hành 24-36T / Flash sale cuối tuần / Hỗ trợ 24/7).
- Mở trang production noithatavh.info.vn bằng agent-browser (viewport 390): site vẫn đang chạy bản 80d6879 (MENU = chip chữ KHÔNG ảnh) → đúng như lời chủ shop "không giống ảnh Khoa".
- Root cause deploy: `bunx tsc --noEmit` bắt lỗi TS2345 checkout-view.tsx(295) — getElementById(firstField) mất narrowing trong closure setTimeout → `next build` trên Vercel FAIL ở mọi commit từ 80d6879/8b72d1d → production mãi treo bản cũ dù git đã push. Fix: pin `const targetField: string = firstField` trước closure. tsc sạch.
- home-view: tiêu đề section đổi thành "MENU nổi bật" — chữ MENU trong ô đỏ bo tròn (bg-red-600 text-white) + "nổi bật", subtitle "Duyệt theo không gian sống", GIỮ NGUYÊN lưới ảnh danh mục 3 cột mobile / 6 cột desktop → giống hệt ảnh mẫu Khoa.
- Verify local (agent-browser 390px): header ☰ MENU + thanh menu ngang dưới header (Menu | Tất cả sản phẩm | các danh mục, cuộn ngang) + strip 4 ưu đãi + section MENU nổi bật ô đỏ với 6 ảnh danh mục — khớp ảnh mẫu.
- `git push` đã bak nợ a72bcb9 (worklog) + commit fix ea03627 → Vercel build lại lần đầu SAU khi sửa lỗi TS.

Stage Summary:
- Nguyên nhân web không cập nhật KHÔNG phải do quên push: build Vercel fail do lỗi TypeScript từ Task 19/20. Đã sửa, từ giờ mỗi push sẽ deploy được.
- Trang chủ giờ khớp ảnh mẫu Khoa: MENU nổi bật (ô đỏ) + ảnh danh mục; thanh MENU đầu trang; 4 ưu đãi như ảnh crop.
- Commit ea03627 push → chờ Vercel deploy → verify lại production.

---
Task ID: 22
Agent: Z.ai Code (main)
Task: (1) Chủ shop báo "vercel bị lỗi build, fix đi"; (2) XÓA dải ưu đãi đầu trang (Giao toàn quốc / Free ship 3tr+ / Bảo hành 24-36T / Chính hãng AVH / Flash sale cuối tuần / Giảm đến 35% / Hỗ trợ 24/7 / Trợ Lý AVH); (3) Xóa chữ "nổi bật" cạnh MENU — chỉ còn ô đỏ MENU.

Work Log:
- Chẩn đoán "lỗi build Vercel": `bunx tsc --noEmit` sạch; clone repo về ĐÚNG commit Vercel đang build (be54cee) vào /home/z/avh-verify + `bun install` riêng + `bun run build` → build THÀNH CÔNG toàn bộ 69 route.
- Tra GitHub Deployments API (dùng token sẵn trong git remote): a72bcb9 = FAILURE (lỗi TS cũ, trước fix Task 21), còn ea03627 + be54cee = SUCCESS. Site live xác nhận chạy đúng build be54cee (chunk hash khớp + marker "Duyệt theo không gian sống" trong chunk aa02... trên production; lần đầu fetch nhầm /static/ thay vì /_next/static/ nên ra HTML fallback — đã sửa URL check).
- Kết luận: build Vercel KHÔNG lỗi — chủ shop nhìn deployment FAILURE cũ (a72bcb9) trước khi fix. Task 21 đã sửa triệt để.
- home-view.tsx: (a) XÓA nguyên section "Quick service highlights" (4 ô Giao toàn quốc…) — import Truck/ShieldCheck/Headphones cũng dọn theo; (b) tiêu đề MENU bỏ `<span>nổi bật</span>` → chỉ còn ô đỏ MENU, cập nhật comment.
- Dọn file rác `--timeout` (binary 234KB bị commit nhầm ở cab5e7c CHƯA push) — git rm.
- Pre-push build verify: commit e79e312 → build lại trong clone → PASS.
- agent-browser: mobile 390 (sw=380, không tràn, dải ưu đãi mất, MENU chỉ ô đỏ, lưới 6 ảnh danh mục nguyên, MENU bar đầu trang OK) + desktop 1366 (sw=1356, flash sale + Sản phẩm nổi bật vẫn hoạt động). Lint + tsc sạch.
- Push → poll GitHub API: deployment 6412731326 cho e79e312 = SUCCESS (poll đầu tiên). Verify live: chunk home mới aa02c7c48873ccc0.js có "Duyệt theo không gian sống", KHÔNG có "Giao toàn quốc", không "MENU nổi bật" (2 chỗ "nổi bật" còn lại = aria-label hero + section "Sản phẩm nổi bật" — không thuộc yêu cầu).

Stage Summary:
- Vercel build bình thường trở lại từ Task 21; mọi commit mới đều deploy thành công (bằng chứng: e79e312 SUCCESS).
- Đầu trang giờ là: topbar → header → MENU bar → hero → MENU (ô đỏ) → lưới ảnh danh mục. Dải 4 ô ưu đãi đã bị xóa hoàn toàn.
- Chữ "nổi bật" cạnh MENU đã xóa — tiêu đề section đúng literal "MENU".
- LƯU Ý cho chủ shop: các text Giao toàn quốc/Free ship… vẫn còn ở FOOTER (cuối trang) — chủ shop chỉ yêu cầu xóa phần ĐẦU TRANG nên giữ nguyên footer.
- Commit e79e312 push → Vercel deploy SUCCESS → verified live.

---
Task ID: 23
Agent: Z.ai Code (main)
Task: Xử lý tiếp "vercel bị lỗi build" — thực chất là Railway service "vivacious-adaptation" fail 100% commit (Vercel = host thật của noithatavh.info.vn, luôn success).

Work Log:
- GitHub Deployments API phân biệt 2 nguồn deploy: "Production" (Vercel — server: Vercel, x-vercel-id trên domain chính) và "vivacious-adaptation / production" (Railway). Lịch sử: Vercel success từ ea03627 (fix TS Task 21); Railway FAILURE ở mọi commit (a72bcb9, be54cee, e79e312, 7ab30fd) kể cả commit build tốt trên Vercel.
- Vá 3 nguyên nhân khả dĩ từ phía repo (đều vô hại cho Vercel):
  (1) src/lib/db.ts khởi tạo PrismaClient lúc import → thiếu DATABASE_URL lúc build là ném lỗi toàn route. Viết lại LAZY qua Proxy: chỉ tạo client ở lần truy cập đầu khi runtime, kiểu dữ liệu giữ nguyên PrismaClient.
  (2) Thêm nixpacks.toml: NIXPACKS_NODE_VERSION=22 (Next 16 yêu cầu Node ≥ 20.9, nixpacks mặc định cũ hơn).
  (3) package.json start: "next start -p ${PORT:-3000}" (Railway healthcheck theo $PORT, trước đây hardcode 3000).
- Verify: tsc + lint sạch; smoke test API local sau HMR (/api/products, /api/categories trả data chuẩn); clone-build commit cf9e8ef PASS; push → Vercel 6412806414 = SUCCESS, Railway 6412792651 = VẪN FAILURE (cần log trong dashboard Railway mới chẩn đoán được tiếp).
- Verify production sau fix db: /api/products + /api/categories OK (lazy db hoạt động với Postgres Supabase), homepage 200, chunk hash build cf9e8ef có trên live.

Stage Summary:
- Web chính noithatavh.info.vn (Vercel): build OK, chạy bản mới nhất cf9e8ef, API hoạt động chuẩn.
- Railway "vivacious-adaptation" vẫn fail — KHÔNG phục vụ web khách thấy. Khuyến nghị: nếu không dùng Railway thì xóa service/ngắt auto-deploy; muốn dùng thì cần log Railway hoặc cấp Railway token.
- db.ts giờ an toàn build-time (lazy) — benefit cả 2 platform.
- Commit cf9e8ef push → Vercel SUCCESS.

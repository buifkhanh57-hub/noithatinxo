/**
 * fly-to-cart — hiệu ứng "ảnh sản phẩm bay vào giỏ hàng" ✨
 *
 * Yêu cầu chủ shop: bấm "Thêm vào giỏ hàng" phải có 1 ánh sáng CỰC ĐẸP
 * bay từ ảnh sản phẩm → nút giỏ hàng (header), chớp sáng khi rơi vào giỏ,
 * giỏ nhún nhẹ, XONG MỚI mở menu giỏ hàng để đặt mua.
 *
 * Kỹ thuật:
 *  - Flyer: thẻ <img> bo tròn + quầng sáng (box-shadow), bay theo đường
 *    cong bezier (WAAPI, 60 keyframe sample → mượt 60fps, GPU transform).
 *  - Trail: các hạt sáng nhỏ rơi ra sau flyer theo đúng cung bay.
 *  - Landing: vòng sáng nở ra tại nút giỏ + giỏ bounce (CSS class).
 *  - prefers-reduced-motion hoặc không tìm thấy nút giỏ → trả false,
 *    caller mở giỏ luôn (không animation).
 */

let flying = false

interface FlyOptions {
  sourceEl: HTMLElement | null
  imageUrl?: string
  /** gọi khi flyer đã đáp vào giỏ → mở giỏ hàng tại đây */
  onLanded?: () => void
}

export function flyToCart({ sourceEl, imageUrl, onLanded }: FlyOptions): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false

  const cartBtn = document.querySelector<HTMLElement>('header button[aria-label="Giỏ hàng"]')
  if (!sourceEl || !cartBtn) return false
  if (flying) return true // đang bay — chuyến đang chạy sẽ mở giỏ, khỏi thêm

  const s = sourceEl.getBoundingClientRect()
  const e = cartBtn.getBoundingClientRect()
  if (!s.width || !e.width) return false

  flying = true

  // Ảnh chính có thể đã cuộn khuất khỏi màn hình (mobile dùng sticky bar
  // "Thêm vào giỏ") → kẹp điểm xuất phát vào trong viewport cho đẹp.
  const vw = window.innerWidth
  const vh = window.innerHeight
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
  const sx = clamp(s.left + s.width / 2, 60, vw - 60)
  const sy = clamp(s.top + s.height / 2, 70, vh - 60)
  const ex = e.left + e.width / 2
  const ey = e.top + e.height / 2

  const DURATION = 780
  const FLYER_SIZE = Math.max(56, Math.min(88, Math.round(s.width * 0.35)))

  // ---------- flyer (ảnh sản phẩm + quầng sáng) ----------
  const flyer = document.createElement('div')
  flyer.setAttribute('aria-hidden', 'true')
  flyer.style.cssText = [
    'position:fixed', 'z-index:9999', 'pointer-events:none',
    `left:${sx - FLYER_SIZE / 2}px`, `top:${sy - FLYER_SIZE / 2}px`,
    `width:${FLYER_SIZE}px`, `height:${FLYER_SIZE}px`,
    'border-radius:18px', 'overflow:hidden',
    'box-shadow:0 0 0 2.5px rgba(255,255,255,.9), 0 0 22px 6px rgba(234,179,8,.55), 0 0 44px 14px rgba(239,68,68,.35)',
    'will-change:transform,opacity',
  ].join(';')

  if (imageUrl) {
    const img = document.createElement('img')
    img.src = imageUrl
    img.alt = ''
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block'
    flyer.appendChild(img)
  } else {
    flyer.style.background = 'radial-gradient(circle at 35% 30%, #fff7d6, #f59e0b 65%, #dc2626)'
  }
  document.body.appendChild(flyer)

  // ---------- cung bezier: control point nâng lên trên giữa 2 điểm ----------
  const cx = (sx + ex) / 2
  const cy = Math.min(sy, ey) - Math.max(110, Math.min(180, Math.abs(ex - sx) * 0.35))
  const bezier = (t: number) => {
    const u = 1 - t
    return {
      x: u * u * sx + 2 * u * t * cx + t * t * ex,
      y: u * u * sy + 2 * u * t * cy + t * t * ey,
    }
  }
  // smoothstep → xuất phát nhanh, lượn chậm dần rồi "rơi" đúng vào giỏ
  const ease = (t: number) => t * t * (3 - 2 * t)

  const frames: Keyframe[] = []
  const N = 60
  for (let i = 0; i <= N; i++) {
    const t = ease(i / N)
    const p = bezier(t)
    const scale = 1 - 0.72 * ease(i / N)
    frames.push({
      transform: `translate3d(${p.x - (sx - FLYER_SIZE / 2)}px, ${p.y - (sy - FLYER_SIZE / 2)}px, 0) scale(${scale}) rotate(${t * 120}deg)`,
      opacity: i / N > 0.92 ? 0 : 1,
      offset: i / N,
    })
  }

  const anim = flyer.animate(frames, { duration: DURATION, easing: 'linear', fill: 'forwards' })

  // ---------- trail: hạt sáng bắn ra sau flyer ----------
  const trailTimer = window.setInterval(() => {
    const box = flyer.getBoundingClientRect()
    spawnSparkle(box.left + box.width / 2, box.top + box.height / 2)
  }, 46)
  window.setTimeout(() => window.clearInterval(trailTimer), DURATION - 80)

  anim.onfinish = () => {
    flyer.remove()
    landingBurst(ex, ey)
    bounceCart(cartBtn)
    flying = false
    onLanded?.()
  }
  // hủy an toàn (tab blur, WAAPI hủy…) — vẫn mở giỏ cho kịp flow mua hàng
  anim.oncancel = () => {
    flyer.remove()
    flying = false
    onLanded?.()
  }

  return true
}

/** hạt sáng nhỏ (trail) — tự hủy sau 0.5s */
function spawnSparkle(x: number, y: number) {
  const dot = document.createElement('div')
  dot.setAttribute('aria-hidden', 'true')
  const size = 5 + Math.random() * 6
  dot.style.cssText = [
    'position:fixed', 'z-index:9998', 'pointer-events:none', 'border-radius:9999px',
    `left:${x - size / 2}px`, `top:${y - size / 2}px`,
    `width:${size}px`, `height:${size}px`,
    'background:radial-gradient(circle, #fffbeb 0%, #fbbf24 55%, transparent 75%)',
    'filter:blur(0.5px)', 'will-change:transform,opacity',
  ].join(';')
  document.body.appendChild(dot)
  const a = dot.animate(
    [
      { transform: 'scale(1)', opacity: 0.95 },
      { transform: `translate(${(Math.random() - 0.5) * 26}px, ${(Math.random() - 0.5) * 26 + 14}px) scale(0.1)`, opacity: 0 },
    ],
    { duration: 500, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)', fill: 'forwards' },
  )
  a.onfinish = () => dot.remove()
}

/** vòng sáng nở ra tại nút giỏ khi flyer đáp xuống */
function landingBurst(x: number, y: number) {
  const ring = document.createElement('div')
  ring.setAttribute('aria-hidden', 'true')
  ring.style.cssText = [
    'position:fixed', 'z-index:9998', 'pointer-events:none', 'border-radius:9999px',
    `left:${x - 14}px`, `top:${y - 14}px`, 'width:28px', 'height:28px',
    'border:2.5px solid rgba(234,179,8,.9)',
    'box-shadow:0 0 18px 6px rgba(234,179,8,.5), inset 0 0 10px 3px rgba(255,255,255,.6)',
    'will-change:transform,opacity',
  ].join(';')
  document.body.appendChild(ring)
  const a = ring.animate(
    [
      { transform: 'scale(0.6)', opacity: 1 },
      { transform: 'scale(3.4)', opacity: 0 },
    ],
    { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' },
  )
  a.onfinish = () => ring.remove()
}

/** giỏ hàng nhún nhẹ khi nhận hàng */
function bounceCart(cartBtn: HTMLElement) {
  cartBtn.classList.remove('avh-cart-bounce')
  // force reflow để restart animation nếu đang dính class cũ
  void cartBtn.offsetWidth
  cartBtn.classList.add('avh-cart-bounce')
  window.setTimeout(() => cartBtn.classList.remove('avh-cart-bounce'), 700)
}

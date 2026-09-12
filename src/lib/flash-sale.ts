/**
 * Flash Sale timing — deterministic, truly expiring windows.
 *
 * BEFORE: every render did `new Date(); setHours(+23,59,59)` → the deadline
 * was recomputed on every request/render, so the countdown NEVER reached zero
 * and the sale "never ended" (bug reported by the shop owner).
 *
 * NOW: the window is anchored to UTC-day boundaries via a pure function, so:
 *   - every render within the same day computes the SAME end time
 *   - the countdown genuinely counts down to 00:00:00
 *   - `remaining()` hits 0 → views hide the flash-sale block (truly expired)
 *   - when a new UTC day begins, a fresh 24h window opens automatically
 *     (classic periodic flash-sale behaviour, no manual admin toggling)
 */

/** One flash-sale window = 24h (UTC-day aligned). */
export const FLASH_SALE_CYCLE_MS = 24 * 60 * 60 * 1000

export interface FlashSaleWindow {
  start: Date
  end: Date
  /** ms left in the current window (0 when expired) */
  remainingMs: number
  /** true when now is past `end` */
  expired: boolean
}

/** Pure: same `now` → same window. Day-quantized so SSR/client agree. */
export function flashSaleWindow(now: number = Date.now()): FlashSaleWindow {
  const cycleStart = Math.floor(now / FLASH_SALE_CYCLE_MS) * FLASH_SALE_CYCLE_MS
  const cycleEnd = cycleStart + FLASH_SALE_CYCLE_MS - 1 // 23:59:59.999 UTC
  return {
    start: new Date(cycleStart),
    end: new Date(cycleEnd),
    remainingMs: Math.max(0, cycleEnd - now),
    expired: now > cycleEnd,
  }
}

/** Stable per-day end Date for countdown targets. */
export function flashSaleEnd(now: number = Date.now()): Date {
  return flashSaleWindow(now).end
}

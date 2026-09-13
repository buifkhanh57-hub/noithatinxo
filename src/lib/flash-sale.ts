/**
 * Flash Sale timing — DB-driven, REAL program windows.
 *
 * HISTORY:
 *  v1 (bug): `setHours(23,59,59)` recomputed every render → never ended.
 *  v2 (bug): UTC-day-anchored 24h cycle → countdown "restarted from 24h"
 *            every new day and the block NEVER truly disappeared
 *            (chủ shop: "hết giờ nó tự quay về 24, hết hạn rồi vẫn hiện").
 *  v3 (NOW): the window comes from the admin-managed `FlashSale` table
 *            (Quản trị → Flash Sale: name, startAt, endAt, active).
 *    - countdown targets the REAL `endAt` chosen by the shop owner
 *    - when `endAt` passes (or admin toggles off) → `getActiveFlashSale()`
 *      returns null → APIs return no flash items & the UI hides every
 *      flash block + badge. Nothing restarts by itself.
 */

import { db } from '@/lib/db'

export interface ActiveFlashSale {
  id: string
  name: string
  startAt: string // ISO
  endAt: string   // ISO
}

/**
 * The flash-sale program to display RIGHT NOW. ĐƠN GIẢN CHO CHỦ SHOP:
 * chỉ cần `active` và CHƯA QUÁ `endAt` là tính ĐANG CHẠY — kể cả khi
 * `startAt` còn ở tương lai (tránh cảnh "vừa tạo xong mà trang chủ
 * không hiện gì"). Chương trình sớm kết thúc nhất được ưu tiên.
 * Returns null khi KHÔNG còn chương trình nào hợp lệ — callers ẩn UI.
 */
export async function getActiveFlashSale(now: Date = new Date()): Promise<ActiveFlashSale | null> {
  const fs = await db.flashSale.findFirst({
    where: { active: true, endAt: { gte: now } },
    orderBy: { endAt: 'asc' },
    select: { id: true, name: true, startAt: true, endAt: true },
  })
  if (!fs) return null
  return { id: fs.id, name: fs.name, startAt: fs.startAt.toISOString(), endAt: fs.endAt.toISOString() }
}

/** Shared JSON payload for list APIs: state of the flash window. */
export interface FlashSaleState {
  flashActive: boolean
  flashName: string | null
  flashStart: string | null // ISO startAt (for progress %)
  flashEnd: string | null   // ISO endAt for the countdown target
}

export function toFlashSaleState(fs: ActiveFlashSale | null): FlashSaleState {
  return fs
    ? { flashActive: true, flashName: fs.name, flashStart: fs.startAt, flashEnd: fs.endAt }
    : { flashActive: false, flashName: null, flashStart: null, flashEnd: null }
}

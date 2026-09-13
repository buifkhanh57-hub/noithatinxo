/**
 * Thứ tự danh mục CHUẨN — theo ảnh mẫu chủ shop (anhkhoa) gửi:
 *   ☰ MENU | Tất cả sản phẩm | Đèn Trang Trí | Phòng Ăn | Phòng Khách |
 *   Phòng Ngủ | Tủ & Kệ | Văn Phòng
 *
 * Dùng CHUNG cho: thanh menu ngang dưới header, lưới ô MENU, và các section
 * sản phẩm theo danh mục trên trang chủ — để mọi nơi đều cùng một thứ tự,
 * khách cứ đọc từ trái sang phải là mua được hàng.
 *
 * Danh mục mới (slug lạ) tự xếp SAU cùng, giữ nguyên thứ tự API trả về.
 */

const CANONICAL_SLUG_ORDER = [
  'den-trang-tri', // Đèn Trang Trí
  'phong-an', //     Phòng Ăn
  'phong-khach', //  Phòng Khách
  'phong-ngu', //    Phòng Ngủ
  'tu-ke', //        Tủ & Kệ
  'van-phong', //    Văn Phòng
] as const

export function orderCategories<T extends { slug: string }>(categories: T[]): T[] {
  if (!categories?.length) return categories
  return [...categories].sort((a, b) => {
    const ia = CANONICAL_SLUG_ORDER.indexOf(a.slug as (typeof CANONICAL_SLUG_ORDER)[number])
    const ib = CANONICAL_SLUG_ORDER.indexOf(b.slug as (typeof CANONICAL_SLUG_ORDER)[number])
    // slug lạ (danh mục mới tạo) → đẩy xuống cuối, giữ ổn định theo thứ tự vào
    if (ia === -1 && ib === -1) return 0
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

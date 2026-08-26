import type { Metadata } from 'next'
import { AppShellForRoute } from '@/components/avh/route-mount'

export const metadata: Metadata = {
  title: 'Cửa hàng nội thất — Sofa, Bàn ghế, Giường, Đèn | Nội Thất AVH',
  description:
    'Duyệt toàn bộ sản phẩm Nội Thất AVH: sofa, bàn ăn, giường ngủ, tủ, bàn làm việc, đèn trang trí. Lọc theo danh mục, giá, chất liệu. Giao hàng toàn quốc.',
  alternates: { canonical: '/san-pham' },
  openGraph: {
    title: 'Cửa hàng nội thất | Nội Thất AVH',
    description:
      'Duyệt toàn bộ sản phẩm Nội Thất AVH — lọc theo danh mục, giá, chất liệu.',
  },
}

export default function ShopPage() {
  return <AppShellForRoute view="shop" />
}

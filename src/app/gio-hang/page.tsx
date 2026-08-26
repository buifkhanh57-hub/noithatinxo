import type { Metadata } from 'next'
import { AppShellForRoute } from '@/components/avh/route-mount'

export const metadata: Metadata = {
  title: 'Giỏ hàng | Nội Thất AVH',
  description: 'Giỏ hàng của bạn tại Nội Thất AVH — kiểm tra sản phẩm trước khi đặt hàng.',
  robots: { index: false, follow: true },
}

export default function CartPage() {
  return <AppShellForRoute view="cart" />
}

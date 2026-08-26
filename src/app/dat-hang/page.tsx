import type { Metadata } from 'next'
import { AppShellForRoute } from '@/components/avh/route-mount'

export const metadata: Metadata = {
  title: 'Đặt hàng | Nội Thất AVH',
  description: 'Nhập thông tin giao hàng và hoàn tất đơn hàng tại Nội Thất AVH.',
  robots: { index: false, follow: false },
}

export default function CheckoutPage() {
  return <AppShellForRoute view="checkout" />
}

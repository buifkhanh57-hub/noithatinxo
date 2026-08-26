import type { Metadata } from 'next'
import { AppShellForRoute } from '@/components/avh/route-mount'

export const metadata: Metadata = {
  title: 'Đặt hàng thành công | Nội Thất AVH',
  description: 'Đơn hàng của bạn đã được ghi nhận. Cảm ơn bạn đã mua sắm tại Nội Thất AVH.',
  robots: { index: false, follow: false },
}

export default function OrderSuccessPage() {
  return <AppShellForRoute view="order-success" />
}

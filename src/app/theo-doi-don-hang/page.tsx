import type { Metadata } from 'next'
import { AppShellForRoute } from '@/components/avh/route-mount'

export const metadata: Metadata = {
  title: 'Theo dõi đơn hàng | Nội Thất AVH',
  description: 'Tra cứu trạng thái đơn hàng theo mã đơn tại Nội Thất AVH.',
}

export default function OrderTrackingPage() {
  return <AppShellForRoute view="order-tracking" />
}

import type { Metadata } from 'next'
import { AppShellForRoute } from '@/components/avh/route-mount'

export const metadata: Metadata = {
  title: 'Thanh toán | Nội Thất AVH',
  description: 'Chọn phương thức thanh toán cho đơn hàng của bạn tại Nội Thất AVH.',
  robots: { index: false, follow: false },
}

export default function PaymentPage() {
  return <AppShellForRoute view="payment" />
}

import type { Metadata } from 'next'
import { AppShellForRoute } from '@/components/avh/route-mount'

export const metadata: Metadata = {
  title: 'Tài khoản của tôi | Nội Thất AVH',
  description: 'Quản lý thông tin, đơn hàng và địa chỉ giao hàng tại Nội Thất AVH.',
  robots: { index: false, follow: false },
}

export default function AccountPage() {
  return <AppShellForRoute view="account" />
}

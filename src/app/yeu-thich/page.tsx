import type { Metadata } from 'next'
import { AppShellForRoute } from '@/components/avh/route-mount'

export const metadata: Metadata = {
  title: 'Sản phẩm yêu thích | Nội Thất AVH',
  description: 'Danh sách sản phẩm bạn đã lưu yêu thích tại Nội Thất AVH.',
  robots: { index: false, follow: true },
}

export default function WishlistPage() {
  return <AppShellForRoute view="wishlist" />
}

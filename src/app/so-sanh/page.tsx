import type { Metadata } from 'next'
import { AppShellForRoute } from '@/components/avh/route-mount'

export const metadata: Metadata = {
  title: 'So sánh sản phẩm | Nội Thất AVH',
  description: 'So sánh chi tiết các sản phẩm nội thất bạn đang quan tâm tại AVH.',
  robots: { index: false, follow: true },
}

export default function ComparePage() {
  return <AppShellForRoute view="compare" />
}

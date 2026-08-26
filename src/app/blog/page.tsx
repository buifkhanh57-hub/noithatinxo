import type { Metadata } from 'next'
import { AppShellForRoute } from '@/components/avh/route-mount'

export const metadata: Metadata = {
  title: 'Cẩm nang nội thất | Nội Thất AVH',
  description:
    'Blog Nội Thất AVH — kinh nghiệm chọn sofa, bố trí phòng ngủ, phong thủy, chăm sóc đồ gỗ và xu hướng nội thất mới nhất.',
  alternates: { canonical: '/blog' },
}

export default function BlogPage() {
  return <AppShellForRoute view="blog" />
}

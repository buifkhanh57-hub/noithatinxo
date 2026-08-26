import type { Metadata } from 'next'
import { AppShellForRoute } from '@/components/avh/route-mount'

export const metadata: Metadata = {
  title: 'Khu vực quản trị | Nội Thất AVH',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return <AppShellForRoute view="admin" />
}

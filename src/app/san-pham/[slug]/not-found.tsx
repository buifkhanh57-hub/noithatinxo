import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Route-specific 404 for /san-pham/<slug> — triggered by notFound() in
 * page.tsx. Returns a real HTTP 404 status so search engines de-index dead
 * product links instead of treating them as soft-404 duplicates of "/".
 */
export default function ProductNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="mb-2 text-6xl font-bold text-primary">404</p>
      <h1 className="mb-2 text-xl font-semibold">Không tìm thấy sản phẩm</h1>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        Sản phẩm bạn tìm không tồn tại hoặc đã bị ẩn khỏi gian hàng.
      </p>
      <Link href="/">
        <Button>Về trang chủ</Button>
      </Link>
    </div>
  )
}

import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Route-specific 404 for /blog/<slug> — triggered by notFound().
 * Returns a real HTTP 404 so search engines drop dead links.
 */
export default function BlogNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="mb-2 text-6xl font-bold text-primary">404</p>
      <h1 className="mb-2 text-xl font-semibold">Không tìm thấy bài viết</h1>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        Bài viết bạn tìm không tồn tại hoặc đã bị gỡ.
      </p>
      <Link href="/blog">
        <Button>Xem tất cả bài viết</Button>
      </Link>
    </div>
  )
}

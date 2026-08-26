import Link from 'next/link'
import { Button } from '@/components/ui/button'

/** Global 404 page — used when no route matches (e.g. a mistyped product link). */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="mb-2 text-6xl font-bold text-primary">404</p>
      <h1 className="mb-2 text-xl font-semibold">Không tìm thấy trang</h1>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.
      </p>
      <Link href="/">
        <Button>Về trang chủ</Button>
      </Link>
    </div>
  )
}

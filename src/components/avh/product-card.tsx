'use client'

import Image from 'next/image'
import { Heart, ShoppingCart, GitCompareArrows } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUIStore } from '@/lib/stores/ui-store'
import { useWishlistStore } from '@/lib/stores/wishlist-store'
import { useCompareStore } from '@/lib/stores/compare-store'
import { formatVND, discountPct } from '@/lib/format'
import { StarRating } from './star-rating'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface ProductListItem {
  id: string
  name: string
  slug: string
  brand?: string
  basePrice: number
  comparePrice?: number | null
  discountPct: number
  rating: number
  reviewCount: number
  soldCount?: number
  isFeatured?: boolean
  isNew?: boolean
  isFlashSale?: boolean
  image: string
  colors?: string[]
  materials?: string[]
  inStock?: boolean
  category?: { id: string; slug: string; name: string }
}

/**
 * Product card — new purchase flow (per client request):
 *   click "Mua Hàng" (or the card) → product DETAIL page, where the
 *   "Thêm vào giỏ" + "Đặt hàng" actions live. No direct add-to-cart here.
 * Visual: ultra-thin hairline border so cards read clearly on the white page
 * without looking heavy (client: "viền đen cực mỏng").
 */
export function ProductCard({ product }: { product: ProductListItem }) {
  const setView = useUIStore((s) => s.setView)
  const wishlist = useWishlistStore()
  const compare = useCompareStore()
  const disc = product.discountPct || discountPct(product.basePrice, product.comparePrice)

  const goDetail = () => setView('product', { slug: product.slug })

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    goDetail()
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    wishlist.toggle(product.id)
    toast.success(
      wishlist.has(product.id) ? 'Đã bỏ khỏi yêu thích' : 'Đã thêm vào yêu thích'
    )
  }

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (compare.productIds.includes(product.id)) {
      compare.remove(product.id)
      toast.success('Đã bỏ khỏi so sánh')
    } else {
      if (compare.productIds.length >= compare.max) {
        toast.error(`Chỉ so sánh tối đa ${compare.max} sản phẩm`)
        return
      }
      compare.toggle(product.id)
      toast.success('Đã thêm vào khay so sánh')
    }
  }

  return (
    <Card
      role="article"
      aria-label={product.name}
      onClick={goDetail}
      className="group relative flex flex-col cursor-pointer overflow-hidden border border-black/25 bg-card shadow-none transition-all duration-300 hover:border-black/45 hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted/40">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 280px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {disc > 0 && (
            <Badge className="bg-red-600 text-white shadow">-{disc}%</Badge>
          )}
          {product.isNew && (
            <Badge className="bg-emerald-600 text-white shadow">Mới</Badge>
          )}
          {product.isFlashSale && (
            <Badge className="bg-amber-500 text-white shadow">Flash Sale</Badge>
          )}
        </div>
        {/* hover actions */}
        <div className="absolute right-2 top-2 flex flex-col gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full shadow"
            onClick={handleWishlist}
            aria-label="Thêm vào yêu thích"
          >
            <Heart className={cn('h-4 w-4', wishlist.has(product.id) && 'fill-red-500 text-red-500')} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full shadow"
            onClick={handleCompare}
            aria-label="Thêm vào so sánh"
          >
            <GitCompareArrows className="h-4 w-4" />
          </Button>
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="rounded bg-foreground/90 px-3 py-1 text-xs font-medium text-background">
              Hết hàng
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        {product.category?.name && (
          <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {product.category.name}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {product.name}
        </h3>
        <div className="mt-1.5">
          <StarRating value={product.rating} count={product.reviewCount} size={12} />
        </div>

        <div className="mt-auto pt-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-primary">
              {formatVND(product.basePrice)}
            </span>
            {product.comparePrice && product.comparePrice > product.basePrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatVND(product.comparePrice)}
              </span>
            )}
          </div>
          {product.soldCount != null && product.soldCount > 0 && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Đã bán {product.soldCount.toLocaleString('vi-VN')}
            </p>
          )}
        </div>

        {/* Mua Hàng → trang chi tiết sản phẩm (thêm giỏ hàng + đặt hàng ở đó) */}
        <Button
          size="sm"
          className="mt-2.5 w-full gap-1 font-semibold"
          onClick={handleBuy}
          aria-label={`Xem chi tiết ${product.name}`}
        >
          <ShoppingCart className="h-4 w-4" />
          Mua Hàng
        </Button>
      </div>
    </Card>
  )
}

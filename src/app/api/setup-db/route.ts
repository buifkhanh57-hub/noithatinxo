import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'

export async function GET() { return POST(new NextRequest('http://localhost/api/setup-db')) }

export async function POST(req: NextRequest) {
  const results: string[] = []
  try {
    // All accounts to create/promote
    const accounts = [
      { email: 'admin@avh.vn', name: 'Quản trị AVH', role: 'ADMIN', password: 'admin123' },
      { email: 'buifkhanh57@gmail.com', name: 'Bùi Khánh', role: 'ADMIN', password: 'AVHSTORE@123' },
      { email: 'nguyenanh2406@gmail.com', name: 'Nguyễn Anh', role: 'ADMIN', password: 'AVHSTORE@123' },
      { email: 'duongyenavh@gmail.com', name: 'Dương Yến', role: 'ADMIN', password: 'AVHSTORE@123' },
      { email: 'buithimai11021987@gmail.com', name: 'Bùi Thị Mai', role: 'ADMIN', password: 'AVHSTORE@123' },
    ]

    for (const acc of accounts) {
      const user = await db.user.findUnique({ where: { email: acc.email } }).catch(() => null)
      if (!user) {
        await db.user.create({
          data: { email: acc.email, name: acc.name, role: acc.role, passwordHash: hashPassword(acc.password), authProviders: 'email', memberTier: 'PLATINUM' },
        }).catch(e => results.push(`${acc.email} err: ${e.message}`))
        results.push(`✓ Created ${acc.email} (${acc.role})`)
      } else {
        await db.user.update({
          where: { id: user.id },
          data: { role: acc.role, passwordHash: hashPassword(acc.password) },
        }).catch(() => {})
        results.push(`✓ Updated ${acc.email} → ${acc.role}`)
      }
    }

    // Categories
    const catCount = await db.category.count().catch(() => 0)
    if (catCount === 0) {
      const cats = [
        { name: 'Phòng Khách', slug: 'phong-khach', icon: 'sofa', imageUrl: '/categories/cat-living.png', filterKeys: '["material","color","size"]' },
        { name: 'Phòng Ngủ', slug: 'phong-ngu', icon: 'bed', imageUrl: '/categories/cat-bedroom.png', filterKeys: '["material","color","size"]' },
        { name: 'Phòng Ăn', slug: 'phong-an', icon: 'utensils', imageUrl: '/categories/cat-dining.png', filterKeys: '["material","color","size"]' },
        { name: 'Đèn Trang Trí', slug: 'den-trang-tri', icon: 'lamp', imageUrl: '/categories/cat-lighting.png', filterKeys: '["material","color","style"]' },
        { name: 'Tủ & Kệ', slug: 'tu-ke', icon: 'shelf', imageUrl: '/products/bookshelf.png', filterKeys: '["material","color","size"]' },
        { name: 'Văn Phòng', slug: 'van-phong', icon: 'desk', imageUrl: '/products/office-desk.png', filterKeys: '["material","color","size"]' },
      ]
      for (const c of cats) await db.category.create({ data: c }).catch(() => {})
      results.push('✓ Created 6 categories')
    }

    // Settings
    const settingCount = await db.setting.count().catch(() => 0)
    if (settingCount === 0) {
      await db.setting.create({ data: { key: 'payment_bank_accounts', value: JSON.stringify([{ bank: 'Vietcombank', bankCode: 'vcb', accountNumber: '0123456789', holder: 'NỘI THẤT AVH', branch: 'CN TP.HCM' }]), label: 'Tài khoản ngân hàng', group: 'payment' } }).catch(() => {})
      results.push('✓ Created default settings')
    }

    const users = await db.user.count().catch(() => 0)
    const products = await db.product.count().catch(() => 0)
    const categories = await db.category.count().catch(() => 0)
    return NextResponse.json({ success: true, data: { message: 'DB setup complete!', actions: results, stats: { users, products, categories } } })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Setup failed', actions: results }, { status: 500 })
  }
}

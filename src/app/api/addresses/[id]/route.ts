import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-token'

/**
 * PATCH /api/addresses/[id] — update an address (rename, fix typo, set default).
 *   Body: { fullName?, phone?, province?, district?, ward?, detail?, isDefault? }
 * DELETE /api/addresses/[id] — delete an address.
 *
 * Auth: customer must own the address (userId matches JWT user).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req.headers.get('authorization'))
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error, code: auth.code }, { status: auth.status })
  }
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ success: false, error: 'Thiếu dữ liệu' }, { status: 400 })
  }

  // Verify ownership
  const existing = await db.address.findUnique({ where: { id } })
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ success: false, error: 'Không tìm thấy địa chỉ' }, { status: 404 })
  }

  const update: any = {}
  for (const k of ['fullName', 'phone', 'province', 'district', 'ward', 'detail']) {
    if (body[k] !== undefined) update[k] = String(body[k]).trim()
  }
  if (body.isDefault !== undefined) update.isDefault = !!body.isDefault

  return await db.$transaction(async (tx) => {
    // If setting as default, unset previous default first
    if (update.isDefault) {
      await tx.address.updateMany({
        where: { userId: auth.userId, id: { not: id } },
        data: { isDefault: false },
      })
    }
    return await tx.address.update({ where: { id }, data: update })
  }).then((addr) => NextResponse.json({ success: true, data: addr }))
    .catch((err) => {
      console.error('update address failed:', err)
      return NextResponse.json({ success: false, error: 'Cập nhật thất bại' }, { status: 500 })
    })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req.headers.get('authorization'))
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error, code: auth.code }, { status: auth.status })
  }
  const { id } = await params

  // Verify ownership
  const existing = await db.address.findUnique({ where: { id } })
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ success: false, error: 'Không tìm thấy địa chỉ' }, { status: 404 })
  }

  await db.address.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

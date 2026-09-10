/**
 * E2E verification of SePay webhook on PRODUCTION with the NEW secret.
 * Creates a real order via API → signs webhook → confirms → replays → cleans up.
 * Run: bun scripts/test-sepay-webhook-e2e.ts
 */
const BASE = process.env.BASE_URL || 'https://noithatinxo.vercel.app'
const SECRET = process.env.SEPAY_WEBHOOK_SECRET!
const POOLER = process.env.POOLER_URL! // for direct DB verification + cleanup

const { PrismaClient } = require('@prisma/client')

async function main() {
  // ── 1. Pick a product from production ──
  const pRes = await fetch(`${BASE}/api/products?limit=1`)
  const pJson = await pRes.json()
  const prod = pJson.data?.items?.[0]
  if (!prod) throw new Error('No product found: ' + JSON.stringify(pJson).slice(0, 200))
  console.log('[1] product:', prod.name, '| price:', prod.basePrice)

  // ── 1b. Login (orders API requires auth) ──
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buifkhanh57@gmail.com', password: 'AVHSTORE@123' }),
  })
  const loginJson = await loginRes.json()
  const token = loginJson.data?.token || loginJson.token
  if (!token) throw new Error('Login failed: ' + JSON.stringify(loginJson).slice(0, 200))
  console.log('[1b] logged in as buifkhanh57@gmail.com')

  // ── 2. Create a BANK order (authenticated) ──
  const orderRes = await fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: [{
        productId: prod.id,
        name: prod.name,
        slug: prod.slug,
        image: prod.media?.[0]?.url || prod.image || '',
        unitPrice: prod.basePrice,
        quantity: 1,
      }],
      shippingName: 'TEST WEBHOOK E2E',
      shippingPhone: '0900000000',
      province: 'Hà Nội',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng',
      detail: 'Số 1 Đường Test',
      paymentMethod: 'BANK',
      note: 'Đơn test webhook SePay — sẽ bị xoá sau khi verify',
    }),
  })
  const orderJson = await orderRes.json()
  const order = orderJson.data?.order || orderJson.order || orderJson.data
  const code = order?.code
  const total = Number(order?.total)
  if (!code || !total) {
    console.log('ORDER RESPONSE:', JSON.stringify(orderJson).slice(0, 600))
    throw new Error('Cannot parse order code/total')
  }
  console.log('[2] order created:', code, '| total:', total, '| paymentStatus:', order.paymentStatus)

  // ── 3. Build SePay-style payload + sign with NEW secret ──
  const payload = JSON.stringify({
    id: Math.floor(Date.now() / 1000),
    gateway: 'MBBank',
    transactionDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
    accountNumber: '08660628189',
    subAccount: '',
    code,
    content: `TEST CHUYEN TIEN DON ${code}`,
    transferType: 'in',
    description: `TEST ${code}`,
    transferAmount: total,
    referenceCode: `MBTEST${Date.now()}`,
    accumulated: total,
  })
  const crypto = require('crypto')
  const sig = crypto.createHmac('sha256', SECRET).update(payload, 'utf8').digest('hex')
  console.log('[3] payload signed (rawBody scheme), sig:', sig.slice(0, 24) + '...')

  // ── 4. Send signed webhook to PRODUCTION ──
  const whRes = await fetch(`${BASE}/api/payments/sepay/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-SePay-Signature': sig },
    body: payload,
  })
  const whJson = await whRes.json()
  console.log('[4] webhook response:', whRes.status, JSON.stringify(whJson))
  if (whRes.status !== 200 || whJson.code !== 'OK') {
    throw new Error('Webhook did NOT confirm the order — STOPPING (order ' + code + ' left for inspection)')
  }

  // ── 5. Verify in DB (direct) ──
  const prisma = POOLER
    ? new PrismaClient({ datasources: { db: { url: POOLER } } })
    : new PrismaClient()
  const dbOrder = await prisma.order.findUnique({
    where: { code },
    include: { paymentSessions: true, payments: true },
  })
  console.log('[5] DB: order.paymentStatus =', dbOrder?.paymentStatus, '| order.status =', dbOrder?.status,
    '| session =', dbOrder?.paymentSessions?.[0]?.status, '| payment =', dbOrder?.payments?.[0]?.status)
  const paidOk = dbOrder?.paymentStatus === 'PAID'

  // ── 6. Replay (idempotency) ──
  const replayRes = await fetch(`${BASE}/api/payments/sepay/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-SePay-Signature': sig },
    body: payload,
  })
  const replayJson = await replayRes.json()
  console.log('[6] replay response:', replayRes.status, JSON.stringify(replayJson))

  // ── 7. Negative test: WRONG account (must NOT mark paid) ──
  const wrongPayload = JSON.stringify({ ...JSON.parse(payload), id: Math.floor(Date.now() / 1000) + 7, accountNumber: '99999999999', code: code + 'X' })
  const wrongSig = crypto.createHmac('sha256', SECRET).update(wrongPayload, 'utf8').digest('hex')
  const wrongRes = await fetch(`${BASE}/api/payments/sepay/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-SePay-Signature': wrongSig },
    body: wrongPayload,
  })
  const wrongJson = await wrongRes.json()
  console.log('[7] wrong-account response:', wrongRes.status, JSON.stringify(wrongJson).slice(0, 220))

  // ── 8. Cleanup: logs + order + soldCount revert ──
  await prisma.systemLog.deleteMany({ where: { message: { contains: code } } })
  await prisma.systemLog.deleteMany({ where: { detail: { contains: code } } })
  await prisma.order.delete({ where: { code } }).catch(() => {})
  await prisma.product.update({ where: { id: prod.id }, data: { soldCount: { decrement: 1 } } })
  const after = await prisma.order.count()
  const prodAfter = await prisma.product.findUnique({ where: { id: prod.id }, select: { soldCount: true } })
  console.log('[8] cleanup: orders left =', after, '| soldCount now =', prodAfter?.soldCount)
  await prisma.$disconnect()

  console.log('')
  console.log('RESULT:', paidOk && replayJson.code === 'ALREADY' ? '✅ E2E PASS — webhook secret mới hoạt động trên production' : '❌ E2E FAIL')
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1) })

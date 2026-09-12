/**
 * E2E SePay webhook against a domain whose DNS may be stale in the local
 * resolver — connects to a pinned IP with correct SNI + Host header.
 * Run: PIN_IP=216.198.79.1 DOMAIN=noithatavh.info.vn SEPAY_WEBHOOK_SECRET=... POOLER_URL=... bun scripts/e2e-domain-pinned.ts
 */
const https = require('https')
const crypto = require('crypto')
const { SQL } = require('bun')

const DOMAIN = process.env.DOMAIN || 'noithatavh.info.vn'
const PIN = process.env.PIN_IP || '216.198.79.1'
const SECRET = process.env.SEPAY_WEBHOOK_SECRET!
const BASE = `https://${DOMAIN}`

function req(method: string, path: string, body?: any, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
    const r = https.request(
      {
        host: PIN,
        servername: DOMAIN, // SNI — Vercel routes by this
        headers: { Host: DOMAIN, ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}), ...headers },
        path,
        method,
      },
      (res: any) => {
        let d = ''
        res.on('data', (c: any) => (d += c))
        res.on('end', () => resolve({ status: res.statusCode, body: d }))
      }
    )
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

const j = (s: string) => JSON.parse(s)

async function main() {
  // 1. product
  const p = j((await req('GET', '/api/products?limit=1')).body)
  const prod = p.data?.items?.[0]
  console.log('[1] product:', prod?.name, prod?.basePrice)

  // 2. login
  const l = j((await req('POST', '/api/auth/login', { email: 'buifkhanh57@gmail.com', password: 'AVHSTORE@123' })).body)
  const token = l.data?.token || l.token
  if (!token) throw new Error('login failed: ' + JSON.stringify(l).slice(0, 150))
  console.log('[2] logged in')

  // 3. order
  const o = j((await req('POST', '/api/orders', {
    items: [{ productId: prod.id, name: prod.name, slug: prod.slug, image: prod.image || '', unitPrice: prod.basePrice, quantity: 1 }],
    shippingName: 'TEST WEBHOOK DOMAIN',
    shippingPhone: '0900000000',
    province: 'Hà Nội', district: 'Cầu Giấy', ward: 'Dịch Vọng', detail: 'Số 1 Test',
    paymentMethod: 'BANK',
    note: 'Đơn test — sẽ xoá',
  }, { Authorization: `Bearer ${token}` })).body)
  const order = o.data?.order || o.order || o.data
  console.log('[3] order:', order?.code, 'total:', order?.total, 'paymentStatus:', order?.paymentStatus)
  const code: string = order.code
  const total: number = Number(order.total)

  // 4. signed webhook
  const payload = JSON.stringify({
    id: Date.now() % 1000000000, gateway: 'MBBank', transactionDate: '2026-09-10 23:50:00',
    accountNumber: '08660628189', subAccount: '', code,
    content: `TEST ${code}`, transferType: 'in', description: `TEST ${code}`,
    transferAmount: total, referenceCode: `MBDOM${Date.now()}`, accumulated: total,
  })
  const sig = crypto.createHmac('sha256', SECRET).update(payload, 'utf8').digest('hex')
  const w = await req('POST', '/api/payments/sepay/webhook', payload, { 'X-SePay-Signature': sig })
  console.log('[4] webhook:', w.status, w.body.slice(0, 200))

  // 5. verify + replay + wrong-account
  const sql = new SQL(process.env.POOLER_URL!)
  const st = await sql`SELECT "paymentStatus", status FROM "Order" WHERE code = ${code}`
  console.log('[5] DB:', JSON.stringify(st[0]))
  const ok = st[0]?.paymentStatus === 'PAID'

  const replay = await req('POST', '/api/payments/sepay/webhook', payload, { 'X-SePay-Signature': sig })
  console.log('[6] replay:', replay.status, replay.body.slice(0, 120))

  // 6. cleanup
  await sql`DELETE FROM "SystemLog" WHERE message LIKE ${'%' + code + '%'} OR detail LIKE ${'%' + code + '%'}`
  await sql`DELETE FROM "Notification" WHERE title LIKE ${'%' + code + '%'} OR body LIKE ${'%' + code + '%'} OR link LIKE ${'%' + code + '%'}`
  const items = await sql`SELECT oi."productId", oi.quantity FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" WHERE o.code = ${code}`
  await sql`DELETE FROM "Order" WHERE code = ${code}`
  for (const it of items) await sql`UPDATE "Product" SET "soldCount" = GREATEST(0, "soldCount" - ${it.quantity}) WHERE id = ${it.productId}`
  const left = await sql`SELECT COUNT(*)::int AS n FROM "Order"`
  console.log('[7] cleanup: orders left =', left[0].n)
  await sql.end()

  console.log('')
  console.log('RESULT:', ok && replay.body.includes('ALREADY') ? '✅ DOMAIN MỚI + SECRET MỚI: E2E PASS' : '❌ FAIL')
  if (!ok || !replay.body.includes('ALREADY')) process.exit(1)
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1) })

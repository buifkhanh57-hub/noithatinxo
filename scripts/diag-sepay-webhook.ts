/**
 * Diagnose + cleanup for the webhook E2E test.
 * Uses Bun's native SQL client (no Prisma client regen needed).
 * Run: POOLER_URL='...' bun scripts/diag-sepay-webhook.ts
 */
import { SQL } from 'bun'

const SECRET = process.env.SEPAY_WEBHOOK_SECRET!
const sql = new SQL(process.env.POOLER_URL!)
const CODE = process.argv[2] || 'AVH277521'

const orders = await sql`SELECT code, total, "paymentStatus", status FROM "Order" WHERE code = ${CODE}`
const o = orders[0]
if (!o) {
  console.log(`ORDER ${CODE}: not found (already cleaned?)`)
  process.exit(0)
}
console.log(`ORDER ${o.code}: total=${o.total} paymentStatus=${o.paymentStatus} status=${o.status}`)

const sessions = await sql`SELECT "paymentReference", amount, status, provider FROM "PaymentSession" WHERE "orderId" = (SELECT id FROM "Order" WHERE code = ${CODE})`
console.log('SESSION:', JSON.stringify(sessions[0]))

// Signed webhook diagnostic (rawBody scheme — no timestamp header)
const payload = JSON.stringify({
  id: Date.now() % 1000000000,
  gateway: 'MBBank',
  transactionDate: '2026-09-10 23:45:00',
  accountNumber: '08660628289'.replace('2', '1'), // 08660628189
  subAccount: '',
  code: o.code,
  content: `TEST CHUYEN TIEN DON ${o.code}`,
  transferType: 'in',
  description: `TEST ${o.code}`,
  transferAmount: o.total,
  referenceCode: `MBDIAG${Date.now()}`,
  accumulated: o.total,
})
const sig = new Bun.CryptoHasher('sha256', SECRET).update(payload, 'utf8').digest('hex')
const r = await fetch('https://noithatinxo.vercel.app/api/payments/sepay/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-SePay-Signature': sig },
  body: payload,
})
console.log('WEBHOOK HTTP', r.status, JSON.stringify(await r.json()).slice(0, 400))

// Re-check order state
const after = await sql`SELECT "paymentStatus", status FROM "Order" WHERE code = ${CODE}`
console.log('AFTER WEBHOOK:', JSON.stringify(after[0]))
await sql.end()

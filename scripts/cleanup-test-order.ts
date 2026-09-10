/**
 * Cleanup test order + side-effects from production DB (Bun SQL).
 * Run: POOLER_URL='...' bun scripts/cleanup-test-order.ts <ORDER_CODE>
 */
import { SQL } from 'bun'

const sql = new SQL(process.env.POOLER_URL!)
const CODE = process.argv[2]
if (!CODE) { console.error('Usage: bun scripts/cleanup-test-order.ts <CODE>'); process.exit(1) }

const items = await sql`
  SELECT oi."productId", oi.quantity FROM "OrderItem" oi
  JOIN "Order" o ON o.id = oi."orderId" WHERE o.code = ${CODE}`
console.log('order items:', JSON.stringify(items))

const del = await sql`DELETE FROM "Order" WHERE code = ${CODE} RETURNING code`
console.log('deleted order:', JSON.stringify(del))

for (const it of items) {
  await sql`UPDATE "Product" SET "soldCount" = GREATEST(0, "soldCount" - ${it.quantity}) WHERE id = ${it.productId}`
}
const logs = await sql`DELETE FROM "SystemLog" WHERE message LIKE ${'%' + CODE + '%'} OR detail LIKE ${'%' + CODE + '%'} RETURNING id`
const notis = await sql`DELETE FROM "Notification" WHERE title LIKE ${'%' + CODE + '%'} OR body LIKE ${'%' + CODE + '%'} OR link LIKE ${'%' + CODE + '%'} RETURNING id`
console.log('deleted logs:', logs.length, '| notifications:', notis.length)

const ordersLeft = await sql`SELECT COUNT(*)::int AS n FROM "Order"`
console.log('orders left in DB:', ordersLeft[0].n)
await sql.end()

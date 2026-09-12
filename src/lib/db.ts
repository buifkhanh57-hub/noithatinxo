import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// LAZY Prisma client — KHÔNG khởi tạo khi import.
//
// Vì sao: `new PrismaClient()` lúc import sẽ đọc env DATABASE_URL ngay; môi
// trường build thiếu biến này (vd Railway chưa cấu hình env) thì MỌI route
// import `db` đều ném "Environment variable not found: DATABASE_URL" khi
// `next build` thu thập page data → deploy fail 100% commit. Với Proxy bên
// dưới, client chỉ được tạo ở lần TRUY CẬP ĐẦU TIÊN khi chạy thật (env đã
// sẵn sàng). Kiểu dữ liệu vẫn là PrismaClient nên toàn bộ `db.x` dùng như cũ.
function createClient(): PrismaClient {
  // Supabase pooler (port 6543) cần pgbouncer params để tắt prepared
  // statements; kết nối trực tiếp (port 5432) thì không. Tự thêm nếu thiếu.
  let url = process.env.DATABASE_URL || ''
  if (url && url.includes(':6543') && !url.includes('pgbouncer=')) {
    const sep = url.includes('?') ? '&' : '?'
    url = `${url}${sep}pgbouncer=true&statement_cache_size=0`
    process.env.DATABASE_URL = url
  }
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  })
  // Dev (HMR) tái dùng 1 client toàn cục để không cạn connection; prod mỗi
  // process 1 client (module cache giữ singleton).
  globalForPrisma.prisma = client
  return client
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = globalForPrisma.prisma ?? createClient()
    const value = Reflect.get(client as object, prop, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// For Supabase pooler (port 6543), we need pgbouncer params to disable
// prepared statements. For direct connection (port 5432), we don't.
// This auto-appends pgbouncer params if using port 6543.

let url = process.env.DATABASE_URL || ''
if (url && url.includes(':6543') && !url.includes('pgbouncer=')) {
  const sep = url.includes('?') ? '&' : '?'
  url = `${url}${sep}pgbouncer=true&statement_cache_size=0`
  process.env.DATABASE_URL = url
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

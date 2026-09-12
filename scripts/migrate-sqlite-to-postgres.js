#!/usr/bin/env node
/**
 * scripts/migrate-sqlite-to-postgres.js
 *
 * Copies data from the local SQLite database (db/custom.db) to a PostgreSQL
 * database (DATABASE_URL env var) — used when switching providers (e.g. to a
 * new Supabase project) or first deploying to a serverless platform.
 *
 * USAGE:
 *   1. Apply the Prisma schema to PostgreSQL (creates tables):
 *        DATABASE_URL="postgresql://..." bunx prisma db push
 *   2. Run this migration script:
 *        DATABASE_URL="postgresql://..." bun run migrate:sqlite-to-postgres
 *
 *   Optional filters (comma-separated model names):
 *        ONLY_TABLES="Category,Product,Setting"      # migrate only these
 *        SKIP_TABLES="Order,SystemLog"               # migrate everything but
 *
 * SAFETY:
 *   - NEVER deletes data from the source SQLite file.
 *   - NEVER drops tables in PostgreSQL — only INSERTs (skipDuplicates).
 *   - Per-table try/catch: one failing table doesn't block the others.
 *
 * TYPE COERCION (the important bit):
 *   SQLite stores Boolean as 0/1 and DateTime as epoch-millis INTEGER (or ISO
 *   string). Raw rows can't be passed to Prisma createMany directly — they are
 *   coerced using the TARGET database's information_schema, so timestamps and
 *   booleans arrive as real Date/boolean values regardless of how they were
 *   stored in SQLite.
 */

const path = require('path')
const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL || !DATABASE_URL.startsWith('postgresql://') && !DATABASE_URL.startsWith('postgres://')) {
  console.error(
    '[migrate] ERROR: DATABASE_URL must be a postgresql:// connection string.\n' +
      'Got: ' + (DATABASE_URL ? DATABASE_URL.replace(/:[^:@]+@/, ':***@') : '(unset)')
  )
  process.exit(1)
}

// Resolve the source SQLite file path. Default to db/custom.db relative
// to the project root (matches the original .env config).
const SQLITE_FILE = process.env.SQLITE_FILE || path.join(process.cwd(), 'db', 'custom.db')

// PascalCase model name -> Prisma client property (camelCase first letter).
// "ProductVariant" -> "productVariant" (NOT "productvariant").
const toClientProp = (name) => name.charAt(0).toLowerCase() + name.slice(1)

const onlyTables = (process.env.ONLY_TABLES || '').split(',').map((s) => s.trim()).filter(Boolean)
const skipTables = (process.env.SKIP_TABLES || '').split(',').map((s) => s.trim()).filter(Boolean)

console.log('[migrate] Starting SQLite → PostgreSQL migration')
console.log('[migrate] Source SQLite:', SQLITE_FILE)
console.log('[migrate] Target PostgreSQL:', DATABASE_URL.replace(/:[^:@]+@/, ':***@'))
if (onlyTables.length) console.log('[migrate] ONLY_TABLES:', onlyTables.join(', '))
if (skipTables.length) console.log('[migrate] SKIP_TABLES:', skipTables.join(', '))
console.log('')

async function main() {
  let Database
  try {
    Database = require('better-sqlite3')
  } catch {
    console.error(
      '[migrate] ERROR: better-sqlite3 not installed.\n' +
        'Install with: bun add -D better-sqlite3 @types/better-sqlite3'
    )
    process.exit(1)
  }

  const fs = require('fs')
  if (!fs.existsSync(SQLITE_FILE)) {
    console.error('[migrate] ERROR: SQLite file not found:', SQLITE_FILE)
    process.exit(1)
  }

  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  const sqlite = new Database(SQLITE_FILE, { readonly: true })

  // ---- Build column type map from the TARGET Postgres (information_schema).
  // Maps: tableName -> { columnName -> "datetime" | "boolean" | null }
  const pgColumns = await prisma.$queryRawUnsafe(
    `SELECT table_name, column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public'`
  )
  const columnTypes = {}
  for (const row of pgColumns) {
    const table = row.table_name
    const col = row.column_name
    const t = String(row.data_type)
    if (!columnTypes[table]) columnTypes[table] = {}
    if (t.includes('timestamp') || t === 'date' || t === 'time') {
      columnTypes[table][col] = 'datetime'
    } else if (t === 'boolean') {
      columnTypes[table][col] = 'boolean'
    }
  }

  // Coerce a raw SQLite value to the type Postgres/Prisma expects.
  const coerce = (table, col, value) => {
    if (value === null || value === undefined) return value
    const kind = columnTypes[table]?.[col]
    if (kind === 'datetime') {
      if (typeof value === 'number') return new Date(value) // epoch millis
      if (typeof value === 'string') {
        const d = new Date(value)
        if (!isNaN(d.getTime())) return d
      }
      return value
    }
    if (kind === 'boolean') {
      if (typeof value === 'number') return value !== 0
      if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true'
    }
    return value
  }

  // Discover all tables in the SQLite file (skip Prisma's internal tables).
  const tables = sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_prisma%' AND name NOT LIKE 'sqlite_%'`)
    .all()
    .map((r) => r.name)

  // Only keep tables that actually exist in Postgres (same names by default).
  const knownTables = tables.filter((t) => columnTypes[t])
  const unknown = tables.filter((t) => !columnTypes[t] && !t.startsWith('_'))
  if (unknown.length) console.log('[migrate] (skipping tables with no Postgres counterpart:', unknown.join(', ') + ')')

  console.log('[migrate] SQLite tables found:', knownTables.join(', '))
  console.log('')

  // Count rows per table.
  for (const table of knownTables) {
    const { count } = sqlite.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get()
    console.log(`  ${table}: ${count} rows`)
  }
  console.log('')

  // Insertion order — parents before children (FK dependencies).
  const insertionOrder = [
    'User',
    'Category',
    'Product',
    'Address',
    'ProductVariant',
    'ProductMedia',
    'Voucher',
    'Banner',
    'FlashSale',
    'BlogPost',
    'Setting',
    'Review',
    'Question',
    'Cart',
    'CartItem',
    'Wishlist',
    'Order',
    'OrderItem',
    'PaymentSession',
    'Payment',
    'Notification',
    'ChatSession',
    'ChatMessage',
    'SystemLog',
    'FileBackup',
  ]
  for (const t of knownTables) {
    if (!insertionOrder.includes(t)) insertionOrder.push(t)
  }

  let totalInserted = 0
  let totalSkipped = 0
  for (const table of insertionOrder) {
    if (!knownTables.includes(table)) continue
    if (onlyTables.length && !onlyTables.includes(table)) continue
    if (skipTables.includes(table)) continue

    const rawRows = sqlite.prepare(`SELECT * FROM "${table}"`).all()
    if (rawRows.length === 0) {
      console.log(`[migrate] ${table}: 0 rows — skipped`)
      continue
    }

    // Coerce every row to Prisma-friendly types (Boolean/DateTime fix).
    const rows = rawRows.map((row) => {
      const out = {}
      for (const [col, value] of Object.entries(row)) out[col] = coerce(table, col, value)
      return out
    })

    try {
      const result = await prisma[toClientProp(table)].createMany({
        data: rows,
        skipDuplicates: true,
      })
      totalInserted += result.count
      totalSkipped += rows.length - result.count
      console.log(`[migrate] ${table}: inserted ${result.count}/${rows.length}`)
    } catch (err) {
      console.error(`[migrate] ${table}: FAILED — ${err.message}`)
      console.error('  (continuing with other tables; this table needs manual review)')
    }
  }

  console.log('')
  console.log(`[migrate] Done. Total inserted: ${totalInserted}, skipped (already existed): ${totalSkipped}`)
  await prisma.$disconnect()
  sqlite.close()
}

main().catch((err) => {
  console.error('[migrate] Fatal error:', err)
  process.exit(1)
})

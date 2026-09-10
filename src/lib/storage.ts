// Server-side file storage — Supabase Storage (persistent, CDN, serverless-safe).
//
// On serverless (Vercel), the filesystem is read-only/ephemeral → can't write
// files to disk. This module uploads bytes to the Supabase Storage bucket
// "media" (public) using the project's secret key, and returns the permanent
// public CDN URL which we store in the database (ProductMedia.url, banners…).
//
// Fallback: when Supabase env vars are absent (e.g. offline dev), files are
// returned as base64 data URIs so the app keeps working everywhere.
//
// IMPORTANT (verified live 2026): Supabase's API gateway REQUIRES the
// `apikey` header IN ADDITION to `Authorization: Bearer <secret>` on the
// Storage endpoints — sending only the Bearer header yields 403
// "Invalid Compact JWS" even with a perfectly valid secret key.

import crypto from 'crypto'

const BUCKET = 'media'

export interface UploadOptions {
  folder: string
  filename: string
  mimetype: string
}

export interface UploadResult {
  url: string
  backend: 'supabase-storage' | 'data-uri'
  publicId?: string
}

function supabaseConfig(): { base: string; key: string } | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')
  const key = process.env.SUPABASE_SECRET_KEY
  if (!base || !key) return null
  return { base, key }
}

function authHeaders(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}` }
}

// ── Bucket provisioning (idempotent, cached per lambda instance) ─────────
let bucketReady: Promise<void> | null = null

async function ensureBucket(base: string, key: string): Promise<void> {
  const check = await fetch(`${base}/storage/v1/bucket/${BUCKET}`, {
    headers: authHeaders(key),
    cache: 'no-store',
  })
  if (check.ok) return // bucket exists
  // Bucket missing → create it (public, 50MB per object)
  const create = await fetch(`${base}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...authHeaders(key), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: BUCKET, public: true, file_size_limit: 52428800 }),
    cache: 'no-store',
  })
  // 200/201 = created; "already exists" (duplicate) is also fine (race)
  if (!create.ok) {
    const text = await create.text().catch(() => '')
    if (!/exist|duplicate/i.test(text)) {
      throw new Error(`Không tạo được bucket "${BUCKET}" (${create.status}): ${text.slice(0, 200)}`)
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function slugifyFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '')
  return (
    base
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip Vietnamese diacritics
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'file'
  )
}

function buildPath(opts: UploadOptions, ext: string): string {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const rand = crypto.randomBytes(6).toString('hex')
  return `${opts.folder}/${yyyy}/${mm}/${Date.now()}-${rand}-${slugifyFilename(opts.filename)}.${ext}`
}

// ── Main entry (same contract the old Cloudinary version had) ─────────────
export async function uploadFile(buffer: Buffer, opts: UploadOptions): Promise<UploadResult> {
  const cfg = supabaseConfig()

  // No Supabase configured (e.g. bare local dev) → base64 data URI fallback
  if (!cfg) {
    return {
      url: `data:${opts.mimetype || 'application/octet-stream'};base64,${buffer.toString('base64')}`,
      backend: 'data-uri',
    }
  }

  const ext = (opts.filename.split('.').pop() || 'bin').toLowerCase()
  const path = buildPath(opts, ext)

  if (!bucketReady) {
    bucketReady = ensureBucket(cfg.base, cfg.key).catch((err) => {
      bucketReady = null // allow retry on next request
      throw err
    })
  }
  await bucketReady

  const res = await fetch(`${cfg.base}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      ...authHeaders(cfg.key),
      'Content-Type': opts.mimetype || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'x-upsert': 'false',
    },
    body: new Uint8Array(buffer),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Supabase Storage upload thất bại (${res.status}): ${text.slice(0, 200)}`)
  }

  return {
    url: `${cfg.base}/storage/v1/object/public/${BUCKET}/${path}`,
    backend: 'supabase-storage',
    publicId: path,
  }
}

/** Delete an object previously uploaded to the bucket (by publicId/path). */
export async function deleteFile(publicId: string): Promise<boolean> {
  const cfg = supabaseConfig()
  if (!cfg) return false
  const res = await fetch(`${cfg.base}/storage/v1/object/${BUCKET}/${publicId.replace(/^\/+/, '')}`, {
    method: 'DELETE',
    headers: authHeaders(cfg.key),
    cache: 'no-store',
  })
  return res.ok
}

// File upload storage for serverless (Vercel, Netlify, Railway).
//
// On serverless, filesystem is read-only/ephemeral → can't write files.
// This module stores uploaded files as base64 data URIs in the database.
// Not ideal for large files, but works everywhere without external services.
//
// If CLOUDINARY_URL is set → uses Cloudinary (production recommended).
// Otherwise → returns data URI (base64) — works on any serverless host.

let cloudinary: typeof import('cloudinary').v2 | null = null
let cloudinaryInitialized = false

async function getCloudinary() {
  if (cloudinaryInitialized) return cloudinary
  cloudinaryInitialized = true
  const url = process.env.CLOUDINARY_URL
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!url && !(cloudName && apiKey && apiSecret)) return null
  const mod = await import('cloudinary')
  cloudinary = mod.v2
  cloudinary.config(
    url ? { secure: true } : { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true }
  )
  return cloudinary
}

export interface UploadOptions {
  folder: string
  filename: string
  mimetype: string
}

export interface UploadResult {
  url: string
  backend: 'cloudinary' | 'data-uri'
  publicId?: string
}

export async function uploadFile(buffer: Buffer, opts: UploadOptions): Promise<UploadResult> {
  // Try Cloudinary first
  if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      const cld = await getCloudinary()
      if (!cld) throw new Error('Cloudinary not configured')
      const crypto = await import('crypto')
      const publicId = `${opts.folder}/${crypto.randomBytes(8).toString('hex')}`
      const dataUri = `data:${opts.mimetype};base64,${buffer.toString('base64')}`
      const result = await cld.uploader.upload(dataUri, {
        public_id: publicId,
        resource_type: opts.mimetype.startsWith('video/') ? 'video' : 'image',
        overwrite: false,
      })
      return { url: result.secure_url, backend: 'cloudinary', publicId: result.public_id }
    } catch (err) {
      console.error('[storage] Cloudinary upload failed, using data URI:', err)
    }
  }

  // Fallback: return base64 data URI — works everywhere (serverless-safe)
  // Limit: 8MB images only (Vercel function body limit is 4.5MB, so base64
  // adds ~33% overhead → max ~3.4MB raw file before hitting the limit).
  const base64 = buffer.toString('base64')
  return {
    url: `data:${opts.mimetype};base64,${base64}`,
    backend: 'data-uri',
  }
}

export function isCloudStorageConfigured(): boolean {
  return !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME)
}

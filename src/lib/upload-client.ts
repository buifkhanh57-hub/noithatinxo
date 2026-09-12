'use client'

// Central upload client — EVERY image/video upload in the app goes through
// here (admin product media, category images, settings logo/QR…).
//
// Guarantees (per merchant requirement):
//   1. Session được kiểm tra & token được đính kèm (Authorization: Bearer)
//      → không còn request "quên mang theo token" như bug cũ.
//   2. Nếu access token hết hạn mà refresh cookie còn hạn
//      → tự refresh rồi retry ĐÚNG MỘT LẦN.
//   3. Lỗi được phân loại CHÍNH XÁC: chưa đăng nhập / phiên hết hạn /
//      không đủ quyền / định dạng sai / file quá lớn / lỗi storage /
//      lỗi server / lỗi mạng — thay vì gộp chung "chưa đăng nhập".
//   4. KHÔNG retry vô hạn.
//
// Vercel 413 fix: serverless request body is hard-capped at ~4.5MB.
//   → Images > 1MB are compressed IN THE BROWSER (canvas → WebP/JPEG,
//     max 1920px) before leaving the device.
//   → Files are sent ONE PER REQUEST (sequential) so combined payloads
//     can never exceed the cap.

export interface MediaUploadItem {
  url: string
  type: 'image' | 'video'
  name?: string
  size?: number
}

export type UploadErrorKind =
  | 'not_logged_in'     // chưa đăng nhập
  | 'session_expired'   // hết hạn thật sự (refresh cũng thất bại)
  | 'forbidden'         // không có quyền upload (customer)
  | 'unsupported_type'  // định dạng file không được hỗ trợ
  | 'file_too_large'    // file vượt giới hạn kích thước
  | 'too_many'          // quá số lượng file cho phép
  | 'invalid_payload'   // body hỏng
  | 'storage_error'     // backend lưu trữ từ chối
  | 'server_error'      // lỗi máy chủ khác
  | 'network_error'     // không kết nối được

export interface UploadFileError {
  name: string
  kind: UploadErrorKind
  message: string // message tiếng Việt sẵn sàng hiển thị cho user
}

export interface UploadOutcome {
  uploaded: MediaUploadItem[]
  errors: UploadFileError[]
  /** true nếu có ít nhất một lỗi thuộc nhóm authentication/permission */
  hasAuthIssue: boolean
}

// Must mirror the limits enforced by /api/upload/route.ts
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']
const COMPRESSIBLE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov']

const SERVER_IMAGE_MAX = 4 * 1024 * 1024        // hard gate after compression
const UNCOMPRESSIBLE_IMAGE_MAX = 3 * 1024 * 1024 // gif/avif — cannot re-encode
const RAW_IMAGE_MAX = 15 * 1024 * 1024          // accepted BEFORE compression
const MAX_VIDEO_SIZE = 4 * 1024 * 1024          // Vercel body cap leaves margin

const COMPRESS_THRESHOLD = 1 * 1024 * 1024      // only compress files > 1MB
const MAX_DIMENSION = 1920

function extOf(name: string): string {
  return (name.split('.').pop() || '').toLowerCase()
}

function isAuthLike(kind: UploadErrorKind): boolean {
  return kind === 'not_logged_in' || kind === 'session_expired' || kind === 'forbidden'
}

function mb(size: number): string {
  return (size / 1024 / 1024).toFixed(1)
}

/** Local pre-flight validation — instant feedback, mirrors server rules exactly. */
function localValidationError(file: File): UploadFileError | null {
  const ext = extOf(file.name)
  const isImage = IMAGE_EXTENSIONS.includes(ext) && file.type.startsWith('image/')
  const isVideo = VIDEO_EXTENSIONS.includes(ext) && file.type.startsWith('video/')
  if (!isImage && !isVideo) {
    return {
      name: file.name,
      kind: 'unsupported_type',
      message: `Định dạng "${ext || file.type || 'không rõ'}" không được hỗ trợ (chỉ nhận JPG, PNG, WebP, GIF, MP4, WebM)`,
    }
  }
  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    return {
      name: file.name,
      kind: 'file_too_large',
      message: `Video "${file.name}" quá lớn (${mb(file.size)}MB, tối đa ${mb(MAX_VIDEO_SIZE)}MB do giới hạn request của Vercel)`,
    }
  }
  if (isImage && !COMPRESSIBLE_EXTENSIONS.includes(ext) && file.size > UNCOMPRESSIBLE_IMAGE_MAX) {
    return {
      name: file.name,
      kind: 'file_too_large',
      message: `Ảnh "${file.name}" quá lớn (${mb(file.size)}MB, tối đa ${mb(UNCOMPRESSIBLE_IMAGE_MAX)}MB với định dạng ${ext.toUpperCase()})`,
    }
  }
  if (isImage && file.size > RAW_IMAGE_MAX) {
    return {
      name: file.name,
      kind: 'file_too_large',
      message: `Ảnh "${file.name}" quá lớn (${mb(file.size)}MB, tối đa ${mb(RAW_IMAGE_MAX)}MB)`,
    }
  }
  return null
}

// ── Client-side image compression (the real 413 killer) ───────────────────

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

function renameExt(name: string, type: string): string {
  const base = name.replace(/\.[^.]+$/, '')
  const ext = type === 'image/webp' ? 'webp' : 'jpg'
  return `${base}.${ext}`
}

/**
 * Compress large raster images in the browser before upload.
 * GIF/AVIF (may be animated) and files ≤ 1MB pass through untouched.
 * Falls back to the original file on any failure — never blocks an upload
 * that would have succeeded without compression.
 */
async function compressImage(file: File): Promise<File> {
  const ext = extOf(file.name)
  if (!COMPRESSIBLE_EXTENSIONS.includes(ext) || file.size <= COMPRESS_THRESHOLD) return file
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file // not decodable (rare) — let the server decide
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))

    // Pass 1 — WebP (best ratio, keeps transparency)
    {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, w, h)
        for (const quality of [0.85, 0.7, 0.55]) {
          const blob = await canvasToBlob(canvas, 'image/webp', quality)
          if (blob && blob.size < file.size && blob.size <= SERVER_IMAGE_MAX) {
            return new File([blob], renameExt(file.name, 'image/webp'), { type: 'image/webp' })
          }
        }
      }
    }

    // Pass 2 — JPEG on white background (when WebP came out bigger)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(bitmap, 0, 0, w, h)
      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.85)
      if (blob && blob.size < file.size && blob.size <= SERVER_IMAGE_MAX) {
        return new File([blob], renameExt(file.name, 'image/jpeg'), { type: 'image/jpeg' })
      }
    }

    return file // compression didn't help — send original (server may accept)
  } catch {
    return file
  } finally {
    bitmap.close()
  }
}

/** Get the current access token from the persisted auth store. */
function currentToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('avh-auth')
    if (!raw) return null
    return JSON.parse(raw)?.state?.user?.token || null
  } catch {
    return null
  }
}

interface UploadApiBody {
  success: boolean
  error?: string
  code?: string
  data?: { uploaded?: Array<{ url: string; type: 'image' | 'video'; name: string; size: number }>; failed?: Array<{ name: string; error: string; code?: string }> }
}

function pushError(outcome: UploadOutcome, name: string, kind: UploadErrorKind, message: string): void {
  outcome.errors.push({ name, kind, message })
  if (isAuthLike(kind)) outcome.hasAuthIssue = true
}

/**
 * Upload files to /api/upload with a valid session, ONE automatic
 * refresh+retry on auth failure, and precise per-file error reporting.
 * Files are compressed client-side and uploaded ONE PER REQUEST.
 */
export async function uploadFilesToApi(files: File[]): Promise<UploadOutcome> {
  const outcome: UploadOutcome = { uploaded: [], errors: [], hasAuthIssue: false }

  if (!files.length) return outcome

  // ── Step 1: local pre-flight checks (no network needed) ──────────────
  const sendable: File[] = []
  for (const f of files) {
    const localErr = localValidationError(f)
    if (localErr) outcome.errors.push(localErr)
    else sendable.push(f)
  }
  if (!sendable.length) return outcome

  // ── Step 2: compress in the browser, then hard-gate sizes ─────────────
  const toSend: File[] = []
  for (const f of sendable) {
    let prepared = f
    try {
      prepared = await compressImage(f)
    } catch {
      prepared = f
    }
    const isVideo = prepared.type.startsWith('video/')
    const ext = extOf(prepared.name)
    const limit = isVideo
      ? MAX_VIDEO_SIZE
      : COMPRESSIBLE_EXTENSIONS.includes(ext)
        ? SERVER_IMAGE_MAX
        : UNCOMPRESSIBLE_IMAGE_MAX
    if (prepared.size > limit) {
      outcome.errors.push({
        name: f.name,
        kind: 'file_too_large',
        message: `File "${f.name}" quá lớn (${mb(prepared.size)}MB sau khi nén, tối đa ${mb(limit)}MB)`,
      })
    } else {
      toSend.push(prepared)
    }
  }
  if (!toSend.length) return outcome

  // ── Step 3: upload ONE FILE PER REQUEST (Vercel body cap) ─────────────
  async function attempt(f: File): Promise<Response> {
    const fd = new FormData()
    fd.append('files', f)
    const token = currentToken()
    return fetch('/api/upload', {
      method: 'POST',
      body: fd,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    })
  }

  let refreshed = false // session refresh is attempted at most ONCE overall

  for (const f of toSend) {
    let res: Response
    try {
      res = await attempt(f)
    } catch {
      pushError(outcome, f.name, 'network_error', `Không thể kết nối máy chủ để tải lên "${f.name}". Kiểm tra mạng và thử lại.`)
      continue
    }

    let body: UploadApiBody | null = null
    try {
      body = await res.json()
    } catch {
      body = null
    }

    // Access-token failed → silent refresh session once, retry the upload once.
    if (
      res.status === 401 &&
      !refreshed &&
      body?.code !== undefined &&
      ['NO_TOKEN', 'TOKEN_EXPIRED', 'TOKEN_INVALID'].includes(body.code)
    ) {
      const { performSessionRefresh } = await import('@/lib/auth-client')
      if (await performSessionRefresh()) {
        refreshed = true
        try {
          res = await attempt(f)
          body = await res.json().catch(() => null)
        } catch {
          pushError(outcome, f.name, 'network_error', 'Không thể kết nối máy chủ khi thử lại sau khi làm mới phiên đăng nhập.')
          continue
        }
      }
    }

    // Classify the response for THIS file.
    if (!res.ok || !body?.success) {
      const code = body?.code
      switch (code ?? (res.status === 401 ? 'TOKEN_INVALID' : res.status)) {
        case 'NO_TOKEN':
          pushError(outcome, f.name, 'not_logged_in', 'Bạn cần đăng nhập để tải ảnh lên.')
          break
        case 'TOKEN_EXPIRED':
          pushError(outcome, f.name, 'session_expired', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục tải ảnh.')
          break
        case 'TOKEN_INVALID':
          pushError(outcome, f.name, 'session_expired', 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.')
          break
        case 'FORBIDDEN':
          pushError(outcome, f.name, 'forbidden', body?.error || 'Bạn không có quyền tải file lên (chỉ quản trị viên/staff).')
          break
        case 'NO_FILES':
        case 'TOO_MANY_FILES':
        case 'INVALID_PAYLOAD':
          pushError(outcome, f.name, 'invalid_payload', body?.error || 'Dữ liệu upload không hợp lệ.')
          break
        default:
          if (res.status >= 500) {
            pushError(outcome, f.name, 'server_error', body?.error || `Lỗi máy chủ khi tải file lên (HTTP ${res.status}).`)
          } else {
            pushError(outcome, f.name, 'server_error', body?.error || `Không thể tải file lên (HTTP ${res.status}).`)
          }
      }
      continue
    }

    for (const up of body.data?.uploaded ?? []) {
      outcome.uploaded.push({ url: up.url, type: up.type, name: up.name, size: up.size })
    }
    for (const fail of body.data?.failed ?? []) {
      let kind: UploadErrorKind = 'server_error'
      if (fail.code === 'UNSUPPORTED_TYPE') kind = 'unsupported_type'
      else if (fail.code === 'FILE_TOO_LARGE') kind = 'file_too_large'
      else if (fail.code === 'STORAGE_ERROR') kind = 'storage_error'
      else if ((fail.error || '').toLowerCase().includes('lỗi lưu trữ')) kind = 'storage_error'
      pushError(outcome, f.name, kind, `${f.name}: ${fail.error}`)
    }
  }

  return outcome
}

/**
 * Convenience helper for single-image fields (settings logo, category image…).
 * Returns the uploaded URL or throws an Error whose message is user-facing.
 */
export async function uploadSingleImage(file: File): Promise<string> {
  const outcome = await uploadFilesToApi([file])
  if (outcome.uploaded[0]) return outcome.uploaded[0].url
  const err = outcome.errors[0]
  throw Object.assign(new Error(err?.message || 'Upload thất bại'), {
    kind: err?.kind ?? ('unknown' as UploadErrorKind),
  })
}

/**
 * Open the login dialog when an auth issue blocks an action.
 * Uses the same aria-label hook as the rest of the codebase (header button).
 * Callers show their own precise error toast first.
 */
export function promptReLogin(): void {
  if (typeof document === 'undefined') return
  document.querySelector<HTMLButtonElement>('[aria-label="Tài khoản"]')?.click()
}

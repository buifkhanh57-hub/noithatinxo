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
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov']
const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const MAX_VIDEO_SIZE = 25 * 1024 * 1024

function extOf(name: string): string {
  return (name.split('.').pop() || '').toLowerCase()
}

function isAuthLike(kind: UploadErrorKind): boolean {
  return kind === 'not_logged_in' || kind === 'session_expired' || kind === 'forbidden'
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
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
  if (file.size > maxSize) {
    return {
      name: file.name,
      kind: 'file_too_large',
      message: `File "${file.name}" quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB, tối đa ${maxSize / 1024 / 1024}MB)`,
    }
  }
  return null
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

/**
 * Upload files to /api/upload with a valid session, ONE automatic
 * refresh+retry on auth failure, and precise per-file error reporting.
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

  // ── Step 2: send with Bearer token; refresh ONCE and retry ONCE on 401 ──
  const names = () => sendable.map((f) => f.name)

  async function attempt(): Promise<Response> {
    const fd = new FormData()
    for (const f of sendable) fd.append('files', f)
    const token = currentToken()
    return fetch('/api/upload', {
      method: 'POST',
      body: fd,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    })
  }

  function pushAllErrors(kind: UploadErrorKind, message: string): void {
    for (const name of names()) {
      outcome.errors.push({ name, kind, message })
    }
    if (isAuthLike(kind)) outcome.hasAuthIssue = true
  }

  let res: Response
  try {
    res = await attempt()
  } catch {
    pushAllErrors('network_error', `Không thể kết nối máy chủ để tải lên "${names().join(', ')}". Kiểm tra mạng và thử lại.`)
    return outcome
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
    body?.code !== undefined &&
    ['NO_TOKEN', 'TOKEN_EXPIRED', 'TOKEN_INVALID'].includes(body.code)
  ) {
    const { performSessionRefresh } = await import('@/lib/auth-client')
    const refreshed = await performSessionRefresh()
    if (refreshed) {
      try {
        res = await attempt()
        body = await res.json().catch(() => null)
      } catch {
        pushAllErrors('network_error', 'Không thể kết nối máy chủ khi thử lại sau khi làm mới phiên đăng nhập.')
        return outcome
      }
    }
  }

  // ── Step 3: classify the FINAL response precisely ────────────────────
  if (!res.ok || !body?.success) {
    const code = body?.code
    switch (code ?? (res.status === 401 ? 'TOKEN_INVALID' : res.status)) {
      case 'NO_TOKEN':
        pushAllErrors('not_logged_in', 'Bạn cần đăng nhập để tải ảnh lên.')
        break
      case 'TOKEN_EXPIRED':
        pushAllErrors('session_expired', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục tải ảnh.')
        break
      case 'TOKEN_INVALID':
        pushAllErrors('session_expired', 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.')
        break
      case 'FORBIDDEN':
        pushAllErrors('forbidden', body?.error || 'Bạn không có quyền tải file lên (chỉ quản trị viên/staff).')
        break
      case 'NO_FILES':
      case 'TOO_MANY_FILES':
      case 'INVALID_PAYLOAD':
        pushAllErrors('invalid_payload', body?.error || 'Dữ liệu upload không hợp lệ.')
        break
      default:
        if (res.status >= 500) {
          pushAllErrors('server_error', body?.error || `Lỗi máy chủ khi tải file lên (HTTP ${res.status}).`)
        } else {
          pushAllErrors('server_error', body?.error || `Không thể tải file lên (HTTP ${res.status}).`)
        }
    }
    return outcome
  }

  // Per-file results from the server.
  for (const up of body.data?.uploaded ?? []) {
    outcome.uploaded.push({ url: up.url, type: up.type, name: up.name, size: up.size })
  }
  for (const fail of body.data?.failed ?? []) {
    let kind: UploadErrorKind = 'server_error'
    if (fail.code === 'UNSUPPORTED_TYPE') kind = 'unsupported_type'
    else if (fail.code === 'FILE_TOO_LARGE') kind = 'file_too_large'
    else if (fail.code === 'STORAGE_ERROR') kind = 'storage_error'
    else if ((fail.error || '').toLowerCase().includes('lỗi lưu trữ')) kind = 'storage_error'
    outcome.errors.push({ name: fail.name, kind, message: `${fail.name}: ${fail.error}` })
    if (isAuthLike(kind)) outcome.hasAuthIssue = true
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

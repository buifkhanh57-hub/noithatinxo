import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/storage'
import { verifyAuthTokenDetailed } from '@/lib/auth-token'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov']
const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const MAX_VIDEO_SIZE = 25 * 1024 * 1024
const MAX_FILES = 10

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')

  // PRECISE auth classification — the old version collapsed "no header",
  // "expired token" and "invalid token" into one message, which made every
  // upload failure look like a login problem. Now each case gets its own code:
  //   NO_TOKEN / TOKEN_EXPIRED / TOKEN_INVALID (401)
  //   FORBIDDEN (403 — logged in but no permission)
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bạn cần đăng nhập để tải file lên',
        code: 'NO_TOKEN',
      },
      { status: 401 }
    )
  }
  const auth = await verifyAuthTokenDetailed(authHeader.slice(7), 'access')
  if (!auth.ok) {
    return NextResponse.json(
      {
        success: false,
        error:
          auth.reason === 'expired'
            ? 'Phiên đăng nhập đã hết hạn. Vui lòng thử lại hoặc đăng nhập lần nữa.'
            : 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
        code: auth.reason === 'expired' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      },
      { status: 401 }
    )
  }
  if (auth.payload.role !== 'ADMIN' && auth.payload.role !== 'STAFF') {
    return NextResponse.json(
      {
        success: false,
        error: 'Bạn không có quyền tải file lên (chỉ quản trị viên/staff)',
        code: 'FORBIDDEN',
      },
      { status: 403 }
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Dữ liệu upload không hợp lệ', code: 'INVALID_PAYLOAD' },
      { status: 400 }
    )
  }

  const rawFiles = formData.getAll('files')
  const files: File[] = rawFiles.filter((f): f is File => f instanceof File)
  if (files.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Không có file nào được gửi', code: 'NO_FILES' },
      { status: 400 }
    )
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { success: false, error: `Tối đa ${MAX_FILES} file mỗi lần`, code: 'TOO_MANY_FILES' },
      { status: 400 }
    )
  }

  const uploaded: Array<{ url: string; type: 'image' | 'video'; name: string; size: number }> = []
  const failed: Array<{ name: string; error: string; code?: string }> = []

  for (const file of files) {
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const isImage = IMAGE_EXTENSIONS.includes(ext) && file.type.startsWith('image/')
    const isVideo = VIDEO_EXTENSIONS.includes(ext) && file.type.startsWith('video/')
    if (!isImage && !isVideo) {
      failed.push({
        name: file.name,
        error: `Định dạng "${ext || file.type || 'không rõ'}" không được hỗ trợ`,
        code: 'UNSUPPORTED_TYPE',
      })
      continue
    }
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE
    if (file.size > maxSize) {
      failed.push({
        name: file.name,
        error: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB, tối đa ${maxSize / 1024 / 1024}MB)`,
        code: 'FILE_TOO_LARGE',
      })
      continue
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await uploadFile(buffer, { folder: 'products', filename: file.name, mimetype: file.type })
      uploaded.push({ url: result.url, type: isImage ? 'image' : 'video', name: file.name, size: file.size })
    } catch (err) {
      // Storage-level failure — reported AS storage failure, not an auth problem.
      failed.push({
        name: file.name,
        error: err instanceof Error ? `Lỗi lưu trữ: ${err.message}` : 'Lỗi lưu trữ khi upload',
        code: 'STORAGE_ERROR',
      })
    }
  }

  return NextResponse.json({ success: true, data: { uploaded, failed } })
}

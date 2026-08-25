import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/storage'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov']
const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const MAX_VIDEO_SIZE = 25 * 1024 * 1024
const MAX_FILES = 10

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const { getAuthFromHeader } = await import('@/lib/auth-token')
  const auth = await getAuthFromHeader(authHeader)
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Chưa đăng nhập hoặc token hết hạn' }, { status: 401 })
  }
  if (auth.role !== 'ADMIN' && auth.role !== 'STAFF') {
    return NextResponse.json({ success: false, error: 'Không có quyền tải file lên' }, { status: 403 })
  }

  const formData = await req.formData()
  const rawFiles = formData.getAll('files')
  const files: File[] = rawFiles.filter((f): f is File => f instanceof File)
  if (files.length === 0) {
    return NextResponse.json({ success: false, error: 'Không có file nào được gửi' }, { status: 400 })
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ success: false, error: `Tối đa ${MAX_FILES} file mỗi lần` }, { status: 400 })
  }

  const uploaded: Array<{ url: string; type: 'image' | 'video'; name: string; size: number }> = []
  const failed: Array<{ name: string; error: string }> = []

  for (const file of files) {
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const isImage = IMAGE_EXTENSIONS.includes(ext) && file.type.startsWith('image/')
    const isVideo = VIDEO_EXTENSIONS.includes(ext) && file.type.startsWith('video/')
    if (!isImage && !isVideo) {
      failed.push({ name: file.name, error: `Định dạng không được hỗ trợ` })
      continue
    }
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE
    if (file.size > maxSize) {
      failed.push({ name: file.name, error: `File quá lớn` })
      continue
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await uploadFile(buffer, { folder: 'products', filename: file.name, mimetype: file.type })
      uploaded.push({ url: result.url, type: isImage ? 'image' : 'video', name: file.name, size: file.size })
    } catch (err) {
      failed.push({ name: file.name, error: err instanceof Error ? err.message : 'Upload failed' })
    }
  }

  return NextResponse.json({ success: true, data: { uploaded, failed } })
}

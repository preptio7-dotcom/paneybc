export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { getCurrentUser } from '@/lib/auth'
import { uploadBufferToR2 } from '@/lib/r2-storage'

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

function getFileExtension(name: string) {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] || 'jpg'
}

function detectContentTypeFromExt(ext: string) {
  const contentTypeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
  }
  return contentTypeMap[String(ext || '').toLowerCase()] || 'image/jpeg'
}

function sanitizeFilename(name: string) {
  return String(name || 'image')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Please log in to upload images' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    const isImage =
      file.type?.startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(getFileExtension(file.name))
    if (!isImage) {
      return NextResponse.json({ error: 'Only images (JPG, PNG, WebP) are allowed' }, { status: 400 })
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Image too large. Maximum allowed size is 5MB.' },
        { status: 400 }
      )
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const sourceExt = getFileExtension(file.name)
    let bodyToUpload: Buffer | Uint8Array = fileBuffer
    let finalExt = sourceExt
    let finalContentType = detectContentTypeFromExt(sourceExt)

    // Optimize and auto-orient images using Sharp
    try {
      bodyToUpload = await sharp(fileBuffer)
        .rotate() // auto-orient mobile camera shots based on EXIF
        .resize({ width: 1400, withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer()
      finalExt = 'webp'
      finalContentType = 'image/webp'
    } catch {
      // Fallback to original bytes if sharp fails
      bodyToUpload = fileBuffer
      finalExt = sourceExt
      finalContentType = detectContentTypeFromExt(sourceExt)
    }

    const now = new Date()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const key = `community/uploads/${now.getUTCFullYear()}/${month}/${Date.now()}-${sanitizeFilename(file.name)}.${finalExt}`

    const publicUrl = await uploadBufferToR2({
      key,
      body: bodyToUpload,
      contentType: finalContentType,
      cacheControl: 'public, max-age=31536000, immutable',
    })

    return NextResponse.json({
      url: publicUrl,
      markdown: `![Image](${publicUrl})`,
    })
  } catch (error: any) {
    console.error('[Community Image Upload Error]:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to upload image' },
      { status: 500 }
    )
  }
}

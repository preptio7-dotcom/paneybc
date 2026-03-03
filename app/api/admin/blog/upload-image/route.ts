export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { requireAdminUser } from '@/lib/admin-auth'
import { uploadBufferToR2 } from '@/lib/r2-storage'

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024

function getFileExtension(name: string) {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] || 'jpg'
}

function sanitizeFilename(name: string) {
  return String(name || 'image')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export async function POST(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    const isImage =
      file.type?.startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(getFileExtension(file.name))
    if (!isImage) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Cover image too large. Maximum allowed size is 2MB.' },
        { status: 400 }
      )
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const optimized = await sharp(fileBuffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer()

    const now = new Date()
    const key = `blog/covers/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(
      2,
      '0'
    )}/${Date.now()}-${sanitizeFilename(file.name)}.webp`

    const publicUrl = await uploadBufferToR2({
      key,
      body: optimized,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    })

    return NextResponse.json({
      publicUrl,
      key,
      extractedFromWord: false,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to upload cover image' },
      { status: 500 }
    )
  }
}


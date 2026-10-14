export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await context.params
    if (!imageId || imageId.length > 100) {
      return new NextResponse('Invalid image ID', { status: 400 })
    }

    const image = await prisma.communityImage.findUnique({
      where: { id: imageId },
      select: { data: true, mimeType: true },
    })

    if (!image) {
      return new NextResponse('Image not found', { status: 404 })
    }

    return new Response(image.data, {
      headers: {
        'Content-Type': image.mimeType || 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Community image serve error:', error)
    return new NextResponse('Failed to load image', { status: 500 })
  }
}

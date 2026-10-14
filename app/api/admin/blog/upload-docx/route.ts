export const runtime = 'nodejs'

import mammoth from 'mammoth'
import sharp from 'sharp'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { buildExcerpt, calculateReadingTime, ensureUniqueSlug, slugify, stripHtml } from '@/lib/blog'
import { revalidateBlogPaths } from '@/lib/blog-cache'
import { uploadBufferToR2 } from '@/lib/r2-storage'

const MAX_DOCX_SIZE_BYTES = 10 * 1024 * 1024

const DOCX_STYLE_MAP = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Code'] => pre:fresh",
  'b => strong',
  'i => em',
  'u => u',
  'strike => del',
]

function sanitizeFileBaseName(fileName: string) {
  return String(fileName || 'blog-post')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function generateImageKey(baseName: string) {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `blog/images/${year}/${month}/${Date.now()}-${baseName}-${Math.random()
    .toString(36)
    .slice(2, 9)}.webp`
}

function stripFirstH1(html: string) {
  return String(html || '').replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, '').trim()
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export async function POST(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('docx')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const lowerName = String(file.name || '').toLowerCase()
    if (!lowerName.endsWith('.docx')) {
      return NextResponse.json(
        {
          error:
            'Only .docx files are supported. Please save your document as .docx format.',
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_DOCX_SIZE_BYTES) {
      return NextResponse.json(
        {
          error:
            'File too large (max 10MB). Try compressing images in your Word document and try again.',
        },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const extractedImages: Array<{ url: string; index: number; failed?: boolean }> = []
    const warnings: string[] = []
    let imageIndex = 0
    const safeBaseName = sanitizeFileBaseName(file.name)

    let conversion
    try {
      conversion = await mammoth.convertToHtml(
        { buffer },
        {
          styleMap: DOCX_STYLE_MAP,
          convertImage: mammoth.images.imgElement(async (image) => {
            imageIndex += 1
            try {
              const imageBuffer = Buffer.from(await image.read())
              const optimized = await sharp(imageBuffer)
                .rotate()
                .resize({ width: 1200, withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer()

              const key = generateImageKey(safeBaseName)
              const imageUrl = await uploadBufferToR2({
                key,
                body: optimized,
                contentType: 'image/webp',
                cacheControl: 'public, max-age=31536000, immutable',
              })

              extractedImages.push({ url: imageUrl, index: imageIndex })
              return { src: imageUrl }
            } catch (imageError: any) {
              extractedImages.push({ url: '', index: imageIndex, failed: true })
              warnings.push(`Image ${imageIndex} failed to upload`)
              return {
                src: '',
                altText: image.altText || '',
              }
            }
          }),
        }
      )
    } catch (error) {
      return NextResponse.json(
        {
          error:
            'Could not read this file. The file may be corrupted. Try saving the document again in Word and re-uploading.',
        },
        { status: 400 }
      )
    }

    const html = String(conversion?.value || '').trim()
    if (!html || stripHtml(html).length === 0) {
      return NextResponse.json(
        {
          error:
            'Document appears empty. No content was found in this file. Make sure your document has text content and try again.',
        },
        { status: 400 }
      )
    }

    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    const rawTitle = decodeHtmlEntities(
      titleMatch
        ? titleMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        : file.name.replace(/\.docx$/i, '').replace(/[-_]+/g, ' ').trim()
    )
    const title = rawTitle || 'Untitled Blog Post'
    const content = stripFirstH1(html)
    const excerpt = buildExcerpt(content, 300)
    const readingTime = calculateReadingTime(content)
    const wordCount = stripHtml(content)
      .split(/\s+/)
      .filter(Boolean).length
    const uniqueSlug = await ensureUniqueSlug(slugify(title))
    const coverImageUrl = extractedImages.find((item) => item.url)?.url || null
    const failedImages = extractedImages.filter((item) => item.failed || !item.url).length

    const shouldRevalidate =
      String(formData.get('autoPublish') || '').toLowerCase() === 'true'
    if (shouldRevalidate) {
      revalidateBlogPaths()
    }

    for (const message of conversion?.messages || []) {
      if (message.type === 'warning') {
        warnings.push(message.message)
      }
    }

    return NextResponse.json({
      title,
      slug: uniqueSlug,
      content,
      excerpt,
      coverImageUrl,
      readingTime,
      wordCount,
      imagesExtracted: extractedImages.filter((item) => Boolean(item.url)).length,
      imagesFailed: failedImages,
      warnings,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to process document' },
      { status: 500 }
    )
  }
}

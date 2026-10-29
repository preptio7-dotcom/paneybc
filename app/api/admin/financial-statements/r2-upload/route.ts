export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { uploadBufferToR2 } from '@/lib/r2-storage'

const sanitizeFilename = (name: string) =>
  name
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 80)

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const safeName = sanitizeFilename(file.name || 'trial-balance.pdf')
    const key = `financial-statements/${Date.now()}-${safeName}`
    const arrayBuffer = await file.arrayBuffer()

    const { publicUrl } = await uploadBufferToR2({
      key,
      body: Buffer.from(arrayBuffer),
      contentType: file.type || 'application/pdf',
    })

    return NextResponse.json({ publicUrl, key })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to upload PDF' }, { status: 500 })
  }
}


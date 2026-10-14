export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getCurrentUser } from '@/lib/auth'

const isAdmin = (request: NextRequest) => {
  const decoded = getCurrentUser(request)
  return Boolean(decoded && (decoded.role === 'admin' || decoded.role === 'super_admin'))
}

const getConfig = () => {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET
  const publicBase = process.env.R2_PUBLIC_BASE_URL

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('R2 configuration is missing')
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase }
}

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

    const { accountId, accessKeyId, secretAccessKey, bucket, publicBase } = getConfig()
    const safeName = sanitizeFilename(file.name || 'trial-balance.pdf')
    const key = `financial-statements/${Date.now()}-${safeName}`

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    })

    const arrayBuffer = await file.arrayBuffer()
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(arrayBuffer),
        ContentType: file.type || 'application/pdf',
      })
    )

    const fallbackPublicBase = `https://${bucket}.${accountId}.r2.dev`
    const publicUrlBase = publicBase && publicBase.trim().length > 0 ? publicBase.replace(/\/$/, '') : fallbackPublicBase
    const publicUrl = `${publicUrlBase}/${key}`

    return NextResponse.json({ publicUrl, key })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to upload PDF' }, { status: 500 })
  }
}

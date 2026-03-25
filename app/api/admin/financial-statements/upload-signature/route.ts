export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getCurrentUser } from '@/lib/auth'

const isAdmin = (request: NextRequest) => {
  const decoded = getCurrentUser(request)
  return Boolean(decoded && (decoded.role === 'admin' || decoded.role === 'super_admin'))
}

const parseCloudinary = () => {
  const url = process.env.CLOUDINARY_URL
  if (!url) {
    throw new Error('CLOUDINARY_URL is not set')
  }
  const parsed = new URL(url)
  const apiKey = parsed.username
  const apiSecret = parsed.password
  const cloudName = parsed.hostname
  if (!apiKey || !apiSecret || !cloudName) {
    throw new Error('Invalid CLOUDINARY_URL')
  }
  return { apiKey, apiSecret, cloudName }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { apiKey, apiSecret, cloudName } = parseCloudinary()
    const timestamp = Math.floor(Date.now() / 1000)
    const folder = 'financial-statements'

    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`
    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign + apiSecret)
      .digest('hex')

    return NextResponse.json({ signature, timestamp, apiKey, cloudName, folder })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to sign upload' }, { status: 500 })
  }
}

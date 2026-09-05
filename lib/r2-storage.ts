import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

type R2Config = {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrlBase: string
}

function normalizePublicBaseUrl(value: string) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return withScheme.replace(/\/+$/, '')
}

function readR2Env() {
  const endpoint =
    process.env.R2_ENDPOINT ||
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : '')
  const accessKeyId = process.env.R2_ACCESS_KEY || process.env.R2_ACCESS_KEY_ID || ''
  const secretAccessKey = process.env.R2_SECRET_KEY || process.env.R2_SECRET_ACCESS_KEY || ''
  const bucketName = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || ''
  const rawPublicUrlBase = (
    process.env.R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_BASE_URL ||
    (process.env.R2_ACCOUNT_ID && bucketName
      ? `https://${bucketName}.${process.env.R2_ACCOUNT_ID}.r2.dev`
      : '')
  )

  return {
    endpoint: endpoint.replace(/\/$/, ''),
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrlBase: normalizePublicBaseUrl(rawPublicUrlBase),
  }
}

export function getR2Config(): R2Config {
  const config = readR2Env()
  if (
    !config.endpoint ||
    !config.accessKeyId ||
    !config.secretAccessKey ||
    !config.bucketName ||
    !config.publicUrlBase
  ) {
    throw new Error(
      'R2 configuration is incomplete. Required: endpoint/access key/secret key/bucket/public URL.'
    )
  }
  return config
}

export function createR2Client() {
  const config = getR2Config()
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

export async function uploadBufferToR2(params: {
  key: string
  body: Buffer
  contentType: string
  cacheControl?: string
}) {
  const config = getR2Config()
  const client = createR2Client()

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: params.cacheControl,
    })
  )

  const sanitizedKey = String(params.key || '').replace(/^\/+/, '')
  return `${config.publicUrlBase}/${sanitizedKey}`
}

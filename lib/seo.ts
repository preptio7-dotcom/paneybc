import type { Metadata } from 'next'

export const PREPTIO_SITE_URL = 'https://www.preptio.com'
export const PREPTIO_SITE_NAME = 'Preptio'
export const PREPTIO_DEFAULT_OG_IMAGE_URL = `${PREPTIO_SITE_URL}/og-image.png`
export const PREPTIO_TWITTER_SITE = '@PreptioOfficial'

type OpenGraphType = 'website' | 'article'

type BuildPublicMetadataInput = {
  title: string
  description: string
  path: string
  type?: OpenGraphType
  imageUrl?: string
  publishedTime?: string
  authors?: string[]
}

function normalizePath(path: string) {
  if (!path || path === '/') return '/'
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`
  return withLeadingSlash.replace(/\/+$/, '')
}

export function preptioUrl(path: string) {
  const normalizedPath = normalizePath(path)
  if (normalizedPath === '/') return PREPTIO_SITE_URL
  return `${PREPTIO_SITE_URL}${normalizedPath}`
}

export function toAbsolutePreptioUrl(url: string | null | undefined) {
  const raw = String(url || '').trim()
  if (!raw) return PREPTIO_DEFAULT_OG_IMAGE_URL
  if (/^https?:\/\//i.test(raw)) return raw
  return preptioUrl(raw)
}

export function buildPublicMetadata({
  title,
  description,
  path,
  type = 'website',
  imageUrl,
  publishedTime,
  authors,
}: BuildPublicMetadataInput): Metadata {
  const canonicalUrl = preptioUrl(path)
  const resolvedImageUrl = toAbsolutePreptioUrl(imageUrl)

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type,
      title,
      description,
      url: canonicalUrl,
      siteName: PREPTIO_SITE_NAME,
      images: [
        {
          url: resolvedImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime ? { publishedTime } : {}),
      ...(authors?.length ? { authors } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      site: PREPTIO_TWITTER_SITE,
      title,
      description,
      images: [resolvedImageUrl],
    },
  }
}

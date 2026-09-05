const DEFAULT_APP_URL = 'https://www.preptio.com'

function normalizeBaseUrl(raw?: string | null) {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(withProtocol)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return null
  }
}

export function resolveAppBaseUrl(preferred?: string | null) {
  const candidates = [
    preferred,
    process.env.APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    DEFAULT_APP_URL,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeBaseUrl(candidate)
    if (normalized) return normalized
  }

  return DEFAULT_APP_URL
}

const FALLBACK_SECRETS = new Set([
  'your-secret-key',
  'your-secret-key-123',
])

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret || FALLBACK_SECRETS.has(secret)) {
    throw new Error('JWT_SECRET must be configured with a non-default value')
  }
  return secret
}

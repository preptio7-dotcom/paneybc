import { NextRequest } from 'next/server'

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function normalizeOrigin(value: string) {
  try {
    const origin = new URL(value)
    return `${origin.protocol}//${origin.host}`
  } catch {
    return ''
  }
}

export function isStateChangingMethod(method: string) {
  return STATE_CHANGING_METHODS.has(String(method || '').toUpperCase())
}

export function hasValidSameOrigin(request: NextRequest) {
  if (!isStateChangingMethod(request.method)) return true

  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return false

  const normalizedOrigin = normalizeOrigin(origin)
  if (!normalizedOrigin) return false

  const expectedHttp = `http://${host}`
  const expectedHttps = `https://${host}`
  return normalizedOrigin === expectedHttp || normalizedOrigin === expectedHttps
}

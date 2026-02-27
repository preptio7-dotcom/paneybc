import { NextResponse } from 'next/server'

type RequestLike = { headers: Headers }

const COUNTRY_HEADER_CANDIDATES = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'x-country-code',
  'x-geo-country',
  'cloudfront-viewer-country',
]

const isLocalhostHost = (host: string) =>
  host.includes('localhost') || host.startsWith('127.') || host === '::1'

export function getRequestCountry(request: RequestLike) {
  for (const headerName of COUNTRY_HEADER_CANDIDATES) {
    const value = request.headers.get(headerName)
    if (value && value.trim()) {
      return value.trim().toUpperCase()
    }
  }
  return null
}

export function isPakistanRequest(request: RequestLike) {
  const host = request.headers.get('host') || ''
  if (process.env.NODE_ENV !== 'production' || isLocalhostHost(host)) {
    return { allowed: true, country: getRequestCountry(request) }
  }

  const country = getRequestCountry(request)
  if (!country) {
    const allowUnknown = process.env.ALLOW_UNKNOWN_COUNTRY === '1'
    return { allowed: allowUnknown, country: null }
  }

  return { allowed: country === 'PK', country }
}

export function blockedCountryResponse(country: string | null) {
  return NextResponse.json(
    {
      error: 'This service is currently available only in Pakistan.',
      country: country || 'UNKNOWN',
    },
    { status: 403 }
  )
}


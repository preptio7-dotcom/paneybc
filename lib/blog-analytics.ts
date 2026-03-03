import { BlogReferrerSource, type Prisma } from '@prisma/client'

const REFERRER_VALUES: BlogReferrerSource[] = ['google', 'whatsapp', 'facebook', 'direct', 'other']

export type DateRange = {
  from: Date
  to: Date
  previousFrom: Date
  previousTo: Date
}

export function detectReferrerSource(raw: string | null | undefined): BlogReferrerSource {
  const ref = String(raw || '').toLowerCase()
  if (!ref) return 'direct'
  if (ref.includes('google')) return 'google'
  if (ref.includes('whatsapp') || ref.includes('wa.me')) return 'whatsapp'
  if (ref.includes('facebook') || ref.includes('fb.com')) return 'facebook'
  return 'other'
}

export function normalizeReferrerSource(input: unknown): BlogReferrerSource {
  const raw = String(input || '').toLowerCase() as BlogReferrerSource
  if (REFERRER_VALUES.includes(raw)) return raw
  return 'other'
}

export function parseAnalyticsDateRange(searchParams: URLSearchParams): DateRange {
  const now = new Date()
  const rawFrom = searchParams.get('from')
  const rawTo = searchParams.get('to')

  const fallbackFrom = new Date(now)
  fallbackFrom.setUTCDate(fallbackFrom.getUTCDate() - 6)
  fallbackFrom.setUTCHours(0, 0, 0, 0)

  const from = rawFrom ? new Date(rawFrom) : fallbackFrom
  const to = rawTo ? new Date(rawTo) : now

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return parseAnalyticsDateRange(new URLSearchParams())
  }

  if (from.getTime() > to.getTime()) {
    return {
      from: to,
      to: from,
      previousFrom: new Date(to.getTime() - (from.getTime() - to.getTime() + 1)),
      previousTo: new Date(to.getTime() - 1),
    }
  }

  const spanMs = Math.max(1, to.getTime() - from.getTime())
  const previousTo = new Date(from.getTime() - 1)
  const previousFrom = new Date(previousTo.getTime() - spanMs)

  return { from, to, previousFrom, previousTo }
}

export function buildCreatedAtRange(from: Date, to: Date): Prisma.DateTimeFilter {
  return {
    gte: from,
    lte: to,
  }
}

export function formatDayKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function percent(part: number, total: number) {
  if (!total || total <= 0) return 0
  return (part / total) * 100
}

export type BlogSubjectCode = 'BAEIVI' | 'BAEIV2E' | 'FOA' | 'QAFB'

export const BLOG_SUBJECT_KEYWORDS: Record<BlogSubjectCode, string[]> = {
  BAEIVI: [
    'baeivi',
    'bae',
    'business and economic insights',
    'business insights',
    'economic insights',
    'itb',
    'vol 1',
    'volume 1',
    'business economics',
    'enterprise',
  ],
  BAEIV2E: [
    'baeiv2e',
    'vol 2',
    'volume 2',
    'eco',
    'economics',
    'bae vol 2',
    'economic environment',
  ],
  FOA: [
    'foa',
    'fundamentals of accounting',
    'accounting',
    'financial accounting',
    'double entry',
    'ledger',
    'trial balance',
    'balance sheet',
    'income statement',
  ],
  QAFB: [
    'qafb',
    'quantitative analysis',
    'quantitative methods',
    'statistics',
    'probability',
    'regression',
    'business mathematics',
    'quant',
  ],
}

export const BLOG_SUBJECT_META: Record<
  BlogSubjectCode,
  { code: BlogSubjectCode; name: string; emoji: string; route: string }
> = {
  BAEIVI: {
    code: 'BAEIVI',
    name: 'Business & Economic Insights Vol I',
    emoji: '📘',
    route: '/subjects/BAEIVI',
  },
  BAEIV2E: {
    code: 'BAEIV2E',
    name: 'Business & Economic Insights Vol II',
    emoji: '📙',
    route: '/subjects/BAEIV2E',
  },
  FOA: {
    code: 'FOA',
    name: 'Fundamentals of Accounting',
    emoji: '📗',
    route: '/subjects/FOA',
  },
  QAFB: {
    code: 'QAFB',
    name: 'Quantitative Analysis for Business',
    emoji: '📕',
    route: '/subjects/QAFB',
  },
}

const SUBJECT_CODES = Object.keys(BLOG_SUBJECT_KEYWORDS) as BlogSubjectCode[]

function stripHtml(value: string) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectRelevantSubjects(input: {
  title?: string | null
  excerpt?: string | null
  content?: string | null
  tags?: string[] | null
}) {
  const tags = Array.isArray(input.tags) ? input.tags.join(' ') : ''
  const plainContent = stripHtml(String(input.content || '')).slice(0, 2000)
  const searchText = `${input.title || ''} ${input.excerpt || ''} ${tags} ${plainContent}`.toLowerCase()

  const detected: BlogSubjectCode[] = []
  for (const code of SUBJECT_CODES) {
    const found = BLOG_SUBJECT_KEYWORDS[code].some((keyword) => searchText.includes(keyword))
    if (found) {
      detected.push(code)
    }
  }

  return detected
}

export function normalizeRelatedSubjects(input: unknown): BlogSubjectCode[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<BlogSubjectCode>()
  const normalized: BlogSubjectCode[] = []
  for (const value of input) {
    const code = String(value || '').toUpperCase() as BlogSubjectCode
    if (!SUBJECT_CODES.includes(code) || seen.has(code)) continue
    seen.add(code)
    normalized.push(code)
  }
  return normalized
}

export function formatDateTimeInPKT(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function pktDateTimeToUtcIso(localDateTime: string) {
  const [datePart, timePart] = String(localDateTime || '').split('T')
  if (!datePart || !timePart) return null

  const [year, month, day] = datePart.split('-').map((part) => Number(part))
  const [hour, minute] = timePart.split(':').map((part) => Number(part))

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null
  }

  // PKT is UTC+5. Convert local PKT wall-clock to UTC timestamp.
  const utcMs = Date.UTC(year, month - 1, day, hour - 5, minute, 0, 0)
  const utcDate = new Date(utcMs)
  if (Number.isNaN(utcDate.getTime())) return null
  return utcDate.toISOString()
}

export function utcToPktDateTimeLocalInput(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`
}

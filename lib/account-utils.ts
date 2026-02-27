export const DEFAULT_DEGREES = ['CA']
export const DEFAULT_LEVELS = ['PRC', 'CAF']
export const STUDENT_ROLE_OPTIONS = ['user', 'ambassador', 'paid', 'unpaid'] as const

export type StudentRoleValue = (typeof STUDENT_ROLE_OPTIONS)[number]

export function normalizeEmail(value: string) {
  return String(value || '').trim().toLowerCase()
}

export function sanitizeText(value: string, max = 120) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max)
}

export function parseOptionList(values: unknown, fallback: string[]) {
  if (!Array.isArray(values)) return fallback
  const normalized = values
    .map((item) => sanitizeText(String(item || ''), 40))
    .filter(Boolean)
  return Array.from(new Set(normalized))
}

export function extractRegistrationSettings(testSettings: any) {
  const degrees = parseOptionList(testSettings?.registrationDegrees, DEFAULT_DEGREES)
  const levels = parseOptionList(testSettings?.registrationLevels, DEFAULT_LEVELS)
  return {
    degrees: degrees.length ? degrees : DEFAULT_DEGREES,
    levels: levels.length ? levels : DEFAULT_LEVELS,
  }
}

// Accepts Pakistani mobile numbers like:
// +923001234567, 923001234567, 03001234567
export function normalizePkPhone(value: string) {
  const raw = String(value || '').trim().replace(/[^\d+]/g, '')
  const local = raw.replace(/\s+/g, '')

  if (/^03\d{9}$/.test(local)) {
    return `+92${local.slice(1)}`
  }
  if (/^92\d{10}$/.test(local)) {
    return `+${local}`
  }
  if (/^\+92\d{10}$/.test(local)) {
    return local
  }
  return null
}

export function isValidStudentRole(value: unknown): value is StudentRoleValue {
  return typeof value === 'string' && STUDENT_ROLE_OPTIONS.includes(value as StudentRoleValue)
}


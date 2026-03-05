export const DEFAULT_DEGREES = ['CA']
export const DEFAULT_LEVELS = ['PRC', 'CAF']
export const DEFAULT_REGISTRATION_INSTITUTES = [
  'AL-HAMD ACADEMY',
  'ARTT BUSINESS SCHOOL',
  'CATSRISE COLLEGE',
  'CENTER FOR PROFESSIONAL EXCELLENCE',
  'CFE COLLEGE OF ACCOUNTANCY AND FINANCE',
  'COLLEGE OF ACCOUNTANCY AND PROFESSIONAL STUDIES (CAPS)',
  'COLLEGE OF ACCOUNTING AND MANAGEMENT SCIENCES',
  'COLLEGE OF CERTIFIED ACCOUNTANCY',
  'CRESCENT COLLEGE OF ACCOUNTANCY',
  'ESCRIBIR COLLEGE OF ADVANCED STUDIES',
  'IQ SCHOOL OF FINANCE',
  'KNS SCHOOL OF BUSINESS STUDIES',
  'Mannabi Business School',
  'RISE PREMIER SCHOOL OF ACCOUNTANCY',
  'SAYLANI SCHOOL OF BUSINESS AND ISLAMIC LEADERSHIP',
  'SCHOOL OF BUSINESS AND MANAGEMENT',
  'SCHOOL OF BUSINESS INTELLIGENCE',
  'SKANS SCHOOL OF ACCOUNTANCY',
  'STT SOLUTIONS',
  'TABANIS SCHOOL OF ACCOUNTANCY',
  'THE MILLENIUM UNIVERSAL COLLEGE',
  "THE PROFESSIONALS' ACADEMY OF COMMERCE (PAC)",
  'THE TIPS COLLEGE OF ACCOUNTANCY (TCA)',
  'WAH COLLEGE OF ACCOUNTANCY',
] as const
export const STUDENT_ROLE_OPTIONS = ['user', 'ambassador', 'paid', 'unpaid'] as const

export type StudentRoleValue = (typeof STUDENT_ROLE_OPTIONS)[number]

export function normalizeEmail(value: string) {
  return String(value || '').trim().toLowerCase()
}

export function sanitizeText(value: string, max = 120) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max)
}

export function parseOptionList(
  values: unknown,
  fallback: readonly string[],
  maxLength = 40
): string[] {
  if (!Array.isArray(values)) return [...fallback]
  const normalized = values
    .map((item) => sanitizeText(String(item || ''), maxLength))
    .filter(Boolean)
  return Array.from(new Set(normalized))
}

export function extractRegistrationSettings(testSettings: any) {
  const degrees = parseOptionList(testSettings?.registrationDegrees, DEFAULT_DEGREES)
  const levels = parseOptionList(testSettings?.registrationLevels, DEFAULT_LEVELS)
  const institutes = parseOptionList(
    testSettings?.registrationInstitutes,
    DEFAULT_REGISTRATION_INSTITUTES,
    140
  )
  return {
    degrees: degrees.length ? degrees : DEFAULT_DEGREES,
    levels: levels.length ? levels : DEFAULT_LEVELS,
    institutes: institutes.length ? institutes : DEFAULT_REGISTRATION_INSTITUTES,
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

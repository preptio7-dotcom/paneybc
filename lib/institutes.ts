import {
  DEFAULT_REGISTRATION_INSTITUTES,
  parseOptionList,
  sanitizeText,
} from '@/lib/account-utils'

export type RegistrationInstitutesState = {
  settings: Record<string, unknown>
  institutes: string[]
}

export function normalizeInstituteName(value: unknown) {
  return sanitizeText(String(value || ''), 140)
}

export function getInstituteKey(value: unknown) {
  return normalizeInstituteName(value).toLowerCase()
}

export function getRegistrationInstitutesState(testSettings: unknown): RegistrationInstitutesState {
  const settings =
    testSettings && typeof testSettings === 'object' && !Array.isArray(testSettings)
      ? (testSettings as Record<string, unknown>)
      : {}
  const institutes = parseOptionList(
    settings.registrationInstitutes,
    DEFAULT_REGISTRATION_INSTITUTES,
    140
  )
  return {
    settings,
    institutes: institutes.length ? institutes : [...DEFAULT_REGISTRATION_INSTITUTES],
  }
}

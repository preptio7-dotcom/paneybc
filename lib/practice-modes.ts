export const PRACTICE_LABELS = {
  mockTest: 'Mock Test',
  chapterWise: 'Chapter Wise',
  quickStart: 'Quick Start',
} as const

export const SUBJECT_TEST_MODES = {
  mock: 'mock',
  fullLegacy: 'full',
  chapter: 'chapter',
} as const

export type SubjectTestMode = (typeof SUBJECT_TEST_MODES)[keyof typeof SUBJECT_TEST_MODES]
export type NormalizedSubjectTestMode = typeof SUBJECT_TEST_MODES.mock | typeof SUBJECT_TEST_MODES.chapter

export function normalizeSubjectTestMode(mode: string | null | undefined): NormalizedSubjectTestMode {
  if (mode === SUBJECT_TEST_MODES.chapter) {
    return SUBJECT_TEST_MODES.chapter
  }

  // Legacy compatibility: both `mode=full` and `mode=mock` map to the same flow.
  if (!mode || mode === SUBJECT_TEST_MODES.mock || mode === SUBJECT_TEST_MODES.fullLegacy) {
    return SUBJECT_TEST_MODES.mock
  }

  return SUBJECT_TEST_MODES.mock
}

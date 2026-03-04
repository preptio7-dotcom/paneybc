import {
  BAE_VOL1_CODE,
  BAE_VOL1_CODES,
  BAE_VOL1_NAME,
  BAE_VOL2_CODE,
  BAE_VOL2_NAME,
} from '@/lib/bae-mock'

export type MockTestRouteKey = 'bae-mock' | 'foa-mock' | 'qafb-mock'
export type MockTestType = 'bae_mock' | 'foa_mock' | 'qafb_mock'
export type MockThemeIcon = 'BookOpen' | 'Calculator' | 'BarChart2'

export type MockSubjectDefinition = {
  code: string
  name: string
  accentColor: string
  lightBg: string
  lightBorder: string
}

export type MockTestDefinition = {
  routeKey: MockTestRouteKey
  testType: MockTestType
  testName: string
  fullName: string
  badgeText: string
  icon: MockThemeIcon
  gradientFrom: string
  gradientTo: string
  isCombined: boolean
  defaultQuestions: number
  minQuestions: number
  maxQuestions: number
  questionStep: number
  timerPerQuestionSeconds: number
  subjects: MockSubjectDefinition[]
  questionSourceCodes: string[]
  infoTitle: string
  infoDescription: string
  rules: string[]
  statsText: string
  comingSoonMessage?: {
    title: string
    description: string
    ctaLabel: string
  }
}

export const MOCK_TEST_DEFINITIONS: Record<MockTestRouteKey, MockTestDefinition> = {
  'bae-mock': {
    routeKey: 'bae-mock',
    testType: 'bae_mock',
    testName: 'BAE Mock Test',
    fullName: 'Business & Economic Insights Vol I + Vol II',
    badgeText: 'ICAP EXAM PATTERN',
    icon: 'BookOpen',
    gradientFrom: '#16a34a',
    gradientTo: '#2563eb',
    isCombined: true,
    defaultQuestions: 50,
    minQuestions: 10,
    maxQuestions: 100,
    questionStep: 5,
    timerPerQuestionSeconds: 90,
    subjects: [
      {
        code: BAE_VOL1_CODE,
        name: BAE_VOL1_NAME,
        accentColor: '#16a34a',
        lightBg: '#f0fdf4',
        lightBorder: '#86efac',
      },
      {
        code: BAE_VOL2_CODE,
        name: BAE_VOL2_NAME,
        accentColor: '#2563eb',
        lightBg: '#eff6ff',
        lightBorder: '#bfdbfe',
      },
    ],
    questionSourceCodes: [...BAE_VOL1_CODES, BAE_VOL2_CODE],
    infoTitle: 'Based on Real ICAP Exam Data',
    infoDescription:
      'Student reports show Vol II questions are always equal to or more than Vol I. This mock test follows that pattern.',
    rules: [
      'Timer starts immediately and cannot be paused.',
      'All questions are MCQ and shuffled.',
      'Mix of Vol I (ITB) and Vol II (ECO) in every attempt.',
      'Vol II always matches or exceeds Vol I based on historical data.',
      'Results are shown right after submission.',
    ],
    statsText: '50 Questions · 75 Minutes · Mixed Ratio',
  },
  'foa-mock': {
    routeKey: 'foa-mock',
    testType: 'foa_mock',
    testName: 'FOA Mock Test',
    fullName: 'Fundamentals of Accounting',
    badgeText: 'ICAP EXAM PATTERN',
    icon: 'Calculator',
    gradientFrom: '#7c3aed',
    gradientTo: '#6d28d9',
    isCombined: false,
    defaultQuestions: 50,
    minQuestions: 10,
    maxQuestions: 100,
    questionStep: 5,
    timerPerQuestionSeconds: 144,
    subjects: [
      {
        code: 'FOA',
        name: 'Fundamentals of Accounting',
        accentColor: '#7c3aed',
        lightBg: '#f5f3ff',
        lightBorder: '#ddd6fe',
      },
    ],
    questionSourceCodes: ['FOA'],
    infoTitle: 'About This Mock Test',
    infoDescription:
      'A fully timed mock test covering all chapters of Fundamentals of Accounting with randomized chapter-weighted selection.',
    rules: [
      'Timer starts immediately and cannot be paused.',
      'All questions are MCQ.',
      'Questions are selected from all FOA chapters.',
      'Results are shown right after submission.',
      '2.4 minutes per question.',
    ],
    statsText: '50 Questions · 120 Minutes · All Chapters',
  },
  'qafb-mock': {
    routeKey: 'qafb-mock',
    testType: 'qafb_mock',
    testName: 'QAFB Mock Test',
    fullName: 'Quantitative Analysis for Business',
    badgeText: 'ICAP EXAM PATTERN',
    icon: 'BarChart2',
    gradientFrom: '#ea580c',
    gradientTo: '#c2410c',
    isCombined: false,
    defaultQuestions: 50,
    minQuestions: 10,
    maxQuestions: 100,
    questionStep: 5,
    timerPerQuestionSeconds: 144,
    subjects: [
      {
        code: 'QAFB',
        name: 'Quantitative Analysis for Business',
        accentColor: '#ea580c',
        lightBg: '#fff7ed',
        lightBorder: '#fed7aa',
      },
    ],
    questionSourceCodes: ['QAFB'],
    infoTitle: 'About This Mock Test',
    infoDescription:
      'A fully timed mock test covering all chapters of Quantitative Analysis for Business using randomized chapter-weighted selection.',
    rules: [
      'Timer starts immediately and cannot be paused.',
      'All questions are MCQ.',
      'Questions are selected from all QAFB chapters.',
      'Results are shown right after submission.',
      '2.4 minutes per question.',
    ],
    statsText: '50 Questions · 120 Minutes · All Chapters',
    comingSoonMessage: {
      title: 'Questions Coming Soon',
      description:
        'QAFB questions are being added to Preptio. This mock test unlocks automatically once questions are uploaded.',
      ctaLabel: 'Notify Me When Ready',
    },
  },
}

export function getMockDefinitionByRouteKey(routeKey: string) {
  return MOCK_TEST_DEFINITIONS[routeKey as MockTestRouteKey] || null
}

export function getMockDefinitionByType(testType: string) {
  return (
    Object.values(MOCK_TEST_DEFINITIONS).find((definition) => definition.testType === testType) ||
    null
  )
}

export function clampMockQuestionCount(definition: MockTestDefinition, value: number | undefined) {
  const parsed = Number.isFinite(Number(value)) ? Number(value) : definition.defaultQuestions
  const stepped =
    Math.round(parsed / Math.max(1, definition.questionStep)) *
    Math.max(1, definition.questionStep)
  return Math.max(definition.minQuestions, Math.min(definition.maxQuestions, stepped))
}

export function calculateMockTimeAllowedMinutes(
  totalQuestions: number,
  timerPerQuestionSeconds: number
) {
  const safeTotal = Math.max(1, Math.floor(Number(totalQuestions) || 1))
  const safeSeconds = Math.max(1, Math.floor(Number(timerPerQuestionSeconds) || 60))
  return Math.ceil((safeTotal * safeSeconds) / 60)
}

export function formatMockStatsText(totalQuestions: number, timerMinutes: number, suffix: string) {
  return `${totalQuestions} Questions · ${timerMinutes} Minutes · ${suffix}`
}

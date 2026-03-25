import type { BetaFeatureKey } from '@/lib/beta-features'

export type BetaFeatureDefinition = {
  key: BetaFeatureKey
  label: string
  description: string
  href: string
}

export const betaFeatureDefinitions: BetaFeatureDefinition[] = [
  {
    key: 'homepageFeatureShowcase',
    label: 'Homepage Feature Showcase',
    description: 'Animated product showcase section on the homepage.',
    href: '/#platform-features-showcase',
  },
  {
    key: 'performanceAnalytics',
    label: 'Performance Analytics',
    description: 'Deep student analytics with readiness score, heatmap, and platform comparison.',
    href: '/dashboard/analytics',
  },
  {
    key: 'aiRecommendations',
    label: 'Study Recommendations',
    description: 'Rule-based personalized study recommendations for dashboard and analytics page.',
    href: '/dashboard/analytics#study-recommendations',
  },
  {
    key: 'blog',
    label: 'Blog',
    description: 'Public blog pages and latest article previews.',
    href: '/blog',
  },
  {
    key: 'faq',
    label: 'Homepage FAQ',
    description: 'Frequently asked questions shown on the home page.',
    href: '/#frequently-asked-questions',
  },
  {
    key: 'studentFeedback',
    label: 'Student Feedback',
    description: 'Student review carousel shown above the FAQ section on the home page.',
    href: '/#student-feedback',
  },
]

import type { BetaFeatureKey } from '@/lib/beta-features'

export type BetaFeatureDefinition = {
  key: BetaFeatureKey
  label: string
  description: string
  href: string
}

export const betaFeatureDefinitions: BetaFeatureDefinition[] = [
  {
    key: 'faq',
    label: 'Homepage FAQ',
    description: 'Frequently asked questions shown on the home page.',
    href: '/#frequently-asked-questions',
  },
]


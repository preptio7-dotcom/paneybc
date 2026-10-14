export type StreakBadgeType =
  | 'week_warrior'
  | 'fortnight_fighter'
  | 'monthly_master'
  | 'centurion'

export type StreakBadgeDefinition = {
  badgeType: StreakBadgeType
  milestoneDays: number
  name: string
  description: string
  icon: string
  colorClass: string
}

export const STREAK_BADGE_DEFINITIONS: StreakBadgeDefinition[] = [
  {
    badgeType: 'week_warrior',
    milestoneDays: 7,
    name: 'Week Warrior',
    description: 'Reached a 7 day streak.',
    icon: '🔥',
    colorClass: 'from-orange-500 to-orange-600',
  },
  {
    badgeType: 'fortnight_fighter',
    milestoneDays: 14,
    name: 'Fortnight Fighter',
    description: 'Reached a 14 day streak.',
    icon: '⚡',
    colorClass: 'from-blue-500 to-blue-600',
  },
  {
    badgeType: 'monthly_master',
    milestoneDays: 30,
    name: 'Monthly Master',
    description: 'Reached a 30 day streak.',
    icon: '🏆',
    colorClass: 'from-amber-500 to-amber-600',
  },
  {
    badgeType: 'centurion',
    milestoneDays: 100,
    name: 'Centurion',
    description: 'Reached a 100 day streak.',
    icon: '💎',
    colorClass: 'from-purple-500 to-purple-600',
  },
]

const badgeByType = new Map(STREAK_BADGE_DEFINITIONS.map((badge) => [badge.badgeType, badge]))

export function getBadgeDefinition(type: StreakBadgeType) {
  return badgeByType.get(type) || null
}

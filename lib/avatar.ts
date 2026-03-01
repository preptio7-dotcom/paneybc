export const DEFAULT_DICEBEAR_STYLE = 'avataaars'
const DICEBEAR_BASE_URL = 'https://api.dicebear.com/7.x'
const FALLBACK_SEED_PREFIX = 'Pack'
export const LEGACY_AVATAR_PACK_ID = 'legacy'
export const LEGACY_AVATAR_STYLE = 'legacy'

export const PREDEFINED_AVATAR_SEEDS = [
  'Alpha',
  'Beta',
  'Gamma',
  'Delta',
  'Echo',
  'Foxtrot',
  'Golf',
  'Hotel',
  'India',
  'Juliet',
  'Kilo',
  'Lima',
  'Mike',
  'Nova',
  'Oscar',
  'Papa',
  'Quebec',
  'Romeo',
  'Sierra',
  'Tango',
] as const

export const PRELOAD_AVATAR_COUNT = 4
export const LEGACY_AVATAR_SEEDS = [
  'boy_1',
  'boy_2',
  'boy_3',
  'girl_1',
  'girl_2',
  'girl_3',
] as const

const LEGACY_AVATAR_MAP: Record<string, string> = {
  '/avatars/boy_1.png': 'boy_1',
  '/avatars/boy_2.png': 'boy_2',
  '/avatars/boy_3.png': 'boy_3',
  '/avatars/girl_1.png': 'girl_1',
  '/avatars/girl_2.png': 'girl_2',
  '/avatars/girl_3.png': 'girl_3',
}

const DEFAULT_SEED_SET = new Set<string>(PREDEFINED_AVATAR_SEEDS)
const LEGACY_SEED_SET = new Set<string>(LEGACY_AVATAR_SEEDS)

export type AvatarPackSummary = {
  id: string
  name: string
  dicebearStyle: string
  variantsCount: number
  seeds: string[]
  isActive: boolean
}

export type ResolvedAvatar = {
  avatarId: string
  avatarSeed: string
  avatarPackId: string | null
  avatar: string
}

export function buildAvatarUrl(style: string, seed: string) {
  const safeStyle = String(style || DEFAULT_DICEBEAR_STYLE).trim() || DEFAULT_DICEBEAR_STYLE
  const safeSeed = String(seed || 'Preptio').trim() || 'Preptio'
  if (safeStyle === LEGACY_AVATAR_STYLE && LEGACY_SEED_SET.has(safeSeed)) {
    return `/avatars/${safeSeed}.png`
  }
  return `${DICEBEAR_BASE_URL}/${encodeURIComponent(safeStyle)}/svg?seed=${encodeURIComponent(safeSeed)}`
}

export function packAvatarId(packId: string, seed: string) {
  return `${String(packId)}:${String(seed)}`
}

export function parsePackedAvatarId(value: string | null | undefined) {
  const input = String(value || '').trim()
  if (!input.includes(':')) {
    return null
  }
  const [packId, ...rest] = input.split(':')
  const seed = rest.join(':').trim()
  if (!packId || !seed) {
    return null
  }
  return { packId: packId.trim(), seed }
}

function hashIdentifier(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

export function getDeterministicAvatarIndex(identifier: string, variantsCount: number) {
  const normalized = String(identifier || '').trim() || 'Preptio'
  const divisor = Math.max(1, Number(variantsCount) || 1)
  return hashIdentifier(normalized) % divisor
}

export function normalizeAvatarSeeds(rawSeeds: unknown, variantsCount = PREDEFINED_AVATAR_SEEDS.length) {
  const sanitized = Array.isArray(rawSeeds)
    ? rawSeeds
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    : []

  const deduped: string[] = []
  for (const seed of sanitized) {
    if (!deduped.includes(seed)) {
      deduped.push(seed)
    }
  }

  const targetCount = Math.min(50, Math.max(5, Number(variantsCount) || PREDEFINED_AVATAR_SEEDS.length))
  if (deduped.length >= targetCount) {
    return deduped.slice(0, targetCount)
  }

  const baseSeeds = deduped.length ? deduped : [...PREDEFINED_AVATAR_SEEDS]
  const result = [...baseSeeds]
  let index = 0
  while (result.length < targetCount) {
    const fallbackSeed = `${FALLBACK_SEED_PREFIX}${index}`
    if (!result.includes(fallbackSeed)) {
      result.push(fallbackSeed)
    }
    index += 1
  }

  return result.slice(0, targetCount)
}

export function isLegacySeedAvatarId(
  value: unknown
): value is (typeof PREDEFINED_AVATAR_SEEDS)[number] {
  return typeof value === 'string' && DEFAULT_SEED_SET.has(value)
}

export function isLegacyAvatarSeed(
  value: unknown
): value is (typeof LEGACY_AVATAR_SEEDS)[number] {
  return typeof value === 'string' && LEGACY_SEED_SET.has(value)
}

export function getLegacyAvatarSeedFromPath(avatarUrl: string | null | undefined) {
  if (!avatarUrl) return null
  const direct = LEGACY_AVATAR_MAP[avatarUrl]
  if (direct) return direct

  if (!avatarUrl.startsWith('https://api.dicebear.com/')) {
    return null
  }

  try {
    const parsed = new URL(avatarUrl)
    const seed = parsed.searchParams.get('seed')
    if (!seed) return null
    return decodeURIComponent(seed)
  } catch {
    return null
  }
}

export function getDeterministicSeedFromPool(identifier: string, seeds: string[]) {
  const normalizedSeeds = normalizeAvatarSeeds(seeds, seeds.length || PREDEFINED_AVATAR_SEEDS.length)
  const index = getDeterministicAvatarIndex(identifier, normalizedSeeds.length)
  return normalizedSeeds[index]
}

export function resolveAvatarForKnownPack(
  user: {
    id?: string | null
    name?: string | null
    avatarId?: string | null
    avatar?: string | null
  },
  pack: {
    id: string
    dicebearStyle: string
    seeds: string[]
  }
): ResolvedAvatar {
  if (pack.id === LEGACY_AVATAR_PACK_ID) {
    const packed = parsePackedAvatarId(user.avatarId)
    if (packed && packed.packId === LEGACY_AVATAR_PACK_ID && isLegacyAvatarSeed(packed.seed)) {
      return {
        avatarId: user.avatarId || packAvatarId(LEGACY_AVATAR_PACK_ID, packed.seed),
        avatarSeed: packed.seed,
        avatarPackId: LEGACY_AVATAR_PACK_ID,
        avatar: buildAvatarUrl(LEGACY_AVATAR_STYLE, packed.seed),
      }
    }
    const legacySeed = getLegacyAvatarSeedFromPath(user.avatar)
    const nextSeed = isLegacyAvatarSeed(legacySeed) ? legacySeed : LEGACY_AVATAR_SEEDS[0]
    return {
      avatarId: packAvatarId(LEGACY_AVATAR_PACK_ID, nextSeed),
      avatarSeed: nextSeed,
      avatarPackId: LEGACY_AVATAR_PACK_ID,
      avatar: buildAvatarUrl(LEGACY_AVATAR_STYLE, nextSeed),
    }
  }

  const packed = parsePackedAvatarId(user.avatarId)
  if (packed && packed.packId === pack.id && pack.seeds.includes(packed.seed)) {
    return {
      avatarId: user.avatarId || packAvatarId(pack.id, packed.seed),
      avatarSeed: packed.seed,
      avatarPackId: pack.id,
      avatar: buildAvatarUrl(pack.dicebearStyle, packed.seed),
    }
  }

  const legacySeed = isLegacySeedAvatarId(user.avatarId)
    ? String(user.avatarId)
    : getLegacyAvatarSeedFromPath(user.avatar)
  const seed =
    legacySeed && pack.seeds.includes(legacySeed)
      ? legacySeed
      : getDeterministicSeedFromPool(user.id || user.name || 'Preptio', pack.seeds)

  return {
    avatarId: packAvatarId(pack.id, seed),
    avatarSeed: seed,
    avatarPackId: pack.id,
    avatar: buildAvatarUrl(pack.dicebearStyle, seed),
  }
}

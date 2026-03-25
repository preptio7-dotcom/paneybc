export const DEFAULT_DICEBEAR_STYLE = 'avataaars'
const DICEBEAR_BASE_URL = 'https://api.dicebear.com/7.x'
const MULTIAVATAR_BASE_URL = 'https://api.multiavatar.com'
const READY_PLAYER_ME_BASE_URL = 'https://models.readyplayer.me'
const AVATAR_PROXY_PATH = '/api/avatar/proxy'
const FALLBACK_SEED_PREFIX = 'Pack'
export const LEGACY_AVATAR_PACK_ID = 'legacy'
export const LEGACY_AVATAR_STYLE = 'legacy'

export const PUBLIC_AVATAR_SOURCES = ['dicebear', 'multiavatar', 'readyplayerme'] as const
export type AvatarSource = (typeof PUBLIC_AVATAR_SOURCES)[number] | 'legacy'

export const DICEBEAR_STYLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'avataaars', label: 'Avataaars Pack' },
  { value: 'adventurer', label: 'Adventurer Pack' },
  { value: 'adventurer-neutral', label: 'Adventurer Neutral Pack' },
  { value: 'big-smile', label: 'Big Smile Pack' },
  { value: 'notionists', label: 'Notionists Pack' },
  { value: 'lorelei', label: 'Lorelei Pack' },
  { value: 'pixel-art', label: 'Pixel Art Pack' },
  { value: 'fun-emoji', label: 'Fun Emoji Pack' },
  { value: 'croodles', label: 'Croodles Pack' },
  { value: 'thumbs', label: 'Thumbs Pack' },
  { value: 'micah', label: 'Micah Pack' },
]

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

export const MULTIAVATAR_PRESET_SEEDS = [
  'Zara2024',
  'Nova3D',
  'Cyber7',
  'Pixel9',
  'Neon5',
  'Apex2',
  'Flux8',
  'Orion4',
  'Zen6',
  'Blaze3',
  'Echo7',
  'Storm2',
  'Drift9',
  'Lunar5',
  'Prism8',
  'Vega4',
  'Atlas6',
  'Sol9',
  'Cruz3',
  'Ryu7',
] as const

export const READY_PLAYER_ME_STARTER_AVATAR_IDS = [
  'https://models.readyplayer.me/64e3055495439dfcf3f0b665.png?scene=fullbody-portrait-v1',
  'https://models.readyplayer.me/64e3055495439dfcf3f0b665.png?scene=fullbody-portrait-v1&expression=happy',
  'https://models.readyplayer.me/64e3055495439dfcf3f0b665.png?scene=fullbody-portrait-v1&pose=power-stance',
  'https://models.readyplayer.me/64e3055495439dfcf3f0b665.png?scene=fullbody-portrait-v1&size=128',
  'https://models.readyplayer.me/64e3055495439dfcf3f0b665.png?scene=fullbody-portrait-v1&quality=80',
  'https://models.readyplayer.me/64e3055495439dfcf3f0b665.png?scene=fullbody-portrait-v1&expression=happy&pose=power-stance',
  'https://models.readyplayer.me/64e3055495439dfcf3f0b665.png?scene=fullbody-portrait-v1&expression=happy&size=128',
  'https://models.readyplayer.me/64e3055495439dfcf3f0b665.png?scene=fullbody-portrait-v1&pose=power-stance&size=128',
  'https://models.readyplayer.me/64e3055495439dfcf3f0b665.png?scene=fullbody-portrait-v1&quality=90&size=128',
  'https://models.readyplayer.me/64e3055495439dfcf3f0b665.png?scene=fullbody-portrait-v1&quality=70&size=128',
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
const PUBLIC_SOURCE_SET = new Set<string>(PUBLIC_AVATAR_SOURCES)

export type AvatarPackSummary = {
  id: string
  name: string
  source: AvatarSource
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

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function encodeReadyPlayerSeed(seed: string) {
  const normalized = seed.replace(/^https?:\/\/models\.readyplayer\.me\//i, '').trim()
  const withoutQuery = normalized.split('?')[0].trim()
  const withoutExtension = withoutQuery.replace(/\.png$/i, '').trim()
  return encodeURIComponent(withoutExtension || seed)
}

function buildReadyPlayerMeRawUrl(seed: string) {
  const safeSeed = String(seed || '').trim()
  if (!safeSeed) {
    return `${READY_PLAYER_ME_BASE_URL}/${encodeReadyPlayerSeed('default')}.png?scene=fullbody-portrait-v1&size=128`
  }

  if (isHttpUrl(safeSeed)) {
    return safeSeed
  }

  return `${READY_PLAYER_ME_BASE_URL}/${encodeReadyPlayerSeed(safeSeed)}.png?scene=fullbody-portrait-v1&size=128`
}

export function normalizeAvatarSource(value: unknown): AvatarSource {
  const source = String(value || '').trim().toLowerCase()
  if (source === 'legacy') return 'legacy'
  if (PUBLIC_SOURCE_SET.has(source)) return source as AvatarSource
  return 'dicebear'
}

export function buildAvatarProxyUrl(rawUrl: string) {
  return `${AVATAR_PROXY_PATH}?url=${encodeURIComponent(rawUrl)}`
}

export function buildAvatarRawUrl(style: string, seed: string, source: AvatarSource = 'dicebear') {
  const safeSource = normalizeAvatarSource(source)
  const safeStyle = String(style || DEFAULT_DICEBEAR_STYLE).trim() || DEFAULT_DICEBEAR_STYLE
  const safeSeed = String(seed || 'Preptio').trim() || 'Preptio'

  if (safeSource === 'legacy') {
    return LEGACY_SEED_SET.has(safeSeed) ? `/avatars/${safeSeed}.png` : '/avatars/boy_1.png'
  }

  if (safeSource === 'multiavatar') {
    return `${MULTIAVATAR_BASE_URL}/${encodeURIComponent(safeSeed)}.svg`
  }

  if (safeSource === 'readyplayerme') {
    return buildReadyPlayerMeRawUrl(safeSeed)
  }

  return `${DICEBEAR_BASE_URL}/${encodeURIComponent(safeStyle)}/svg?seed=${encodeURIComponent(safeSeed)}`
}

export function buildAvatarUrl(style: string, seed: string, source: AvatarSource = 'dicebear') {
  const rawUrl = buildAvatarRawUrl(style, seed, source)
  if (!isHttpUrl(rawUrl)) {
    return rawUrl
  }
  return buildAvatarProxyUrl(rawUrl)
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

function getProxiedUrlTarget(avatarUrl: string) {
  try {
    const parsed = avatarUrl.startsWith('http')
      ? new URL(avatarUrl)
      : new URL(avatarUrl, 'https://preptio.local')
    if (!parsed.pathname.startsWith(AVATAR_PROXY_PATH)) {
      return null
    }
    const target = parsed.searchParams.get('url')
    return target ? decodeURIComponent(target) : null
  } catch {
    return null
  }
}

export function getLegacyAvatarSeedFromPath(avatarUrl: string | null | undefined) {
  if (!avatarUrl) return null

  const proxiedTarget = getProxiedUrlTarget(avatarUrl)
  const normalizedUrl = proxiedTarget || avatarUrl

  const direct = LEGACY_AVATAR_MAP[normalizedUrl]
  if (direct) return direct

  if (!normalizedUrl.startsWith('https://api.dicebear.com/')) {
    return null
  }

  try {
    const parsed = new URL(normalizedUrl)
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
    source?: AvatarSource
    dicebearStyle: string
    seeds: string[]
  }
): ResolvedAvatar {
  const source = normalizeAvatarSource(pack.source || 'dicebear')

  if (pack.id === LEGACY_AVATAR_PACK_ID || source === 'legacy') {
    const packed = parsePackedAvatarId(user.avatarId)
    if (packed && packed.packId === LEGACY_AVATAR_PACK_ID && isLegacyAvatarSeed(packed.seed)) {
      return {
        avatarId: user.avatarId || packAvatarId(LEGACY_AVATAR_PACK_ID, packed.seed),
        avatarSeed: packed.seed,
        avatarPackId: LEGACY_AVATAR_PACK_ID,
        avatar: buildAvatarUrl(LEGACY_AVATAR_STYLE, packed.seed, 'legacy'),
      }
    }
    const legacySeed = getLegacyAvatarSeedFromPath(user.avatar)
    const nextSeed = isLegacyAvatarSeed(legacySeed) ? legacySeed : LEGACY_AVATAR_SEEDS[0]
    return {
      avatarId: packAvatarId(LEGACY_AVATAR_PACK_ID, nextSeed),
      avatarSeed: nextSeed,
      avatarPackId: LEGACY_AVATAR_PACK_ID,
      avatar: buildAvatarUrl(LEGACY_AVATAR_STYLE, nextSeed, 'legacy'),
    }
  }

  const packed = parsePackedAvatarId(user.avatarId)
  if (packed && packed.packId === pack.id && pack.seeds.includes(packed.seed)) {
    return {
      avatarId: user.avatarId || packAvatarId(pack.id, packed.seed),
      avatarSeed: packed.seed,
      avatarPackId: pack.id,
      avatar: buildAvatarUrl(pack.dicebearStyle, packed.seed, source),
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
    avatar: buildAvatarUrl(pack.dicebearStyle, seed, source),
  }
}

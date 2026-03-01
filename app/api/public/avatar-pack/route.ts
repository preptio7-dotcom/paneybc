export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import {
  LEGACY_AVATAR_PACK_ID,
  LEGACY_AVATAR_SEEDS,
  LEGACY_AVATAR_STYLE,
  buildAvatarUrl,
  packAvatarId,
} from '@/lib/avatar'
import { getActiveAvatarPack } from '@/lib/avatar-pack-service'

export async function GET() {
  try {
    const activePack = await getActiveAvatarPack()
    const activeOptions = activePack.seeds.map((seed) => ({
      seed,
      avatarId: packAvatarId(activePack.id, seed),
      url: buildAvatarUrl(activePack.dicebearStyle, seed),
    }))
    const legacyOptions = LEGACY_AVATAR_SEEDS.map((seed) => ({
      seed,
      avatarId: packAvatarId(LEGACY_AVATAR_PACK_ID, seed),
      url: buildAvatarUrl(LEGACY_AVATAR_STYLE, seed),
    }))
    const options = [...activeOptions, ...legacyOptions]

    return NextResponse.json(
      {
        pack: {
          id: activePack.id,
          name: activePack.name,
          dicebearStyle: activePack.dicebearStyle,
          variantsCount: activePack.variantsCount,
          isActive: activePack.isActive,
        },
        options,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=120, stale-while-revalidate=600',
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load avatar pack' }, { status: 500 })
  }
}

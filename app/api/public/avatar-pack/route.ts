export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { buildAvatarUrl, packAvatarId } from '@/lib/avatar'
import { getActiveAvatarPack } from '@/lib/avatar-pack-service'

export async function GET() {
  try {
    const activePack = await getActiveAvatarPack()
    const options = activePack.seeds.map((seed) => ({
      seed,
      avatarId: packAvatarId(activePack.id, seed),
      url: buildAvatarUrl(activePack.dicebearStyle, seed),
    }))

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


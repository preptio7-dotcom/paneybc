export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; revId: string }> }
) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, revId } = await context.params
  const revision = await prisma.blogRevision.findFirst({
    where: {
      id: revId,
      postId: id,
    },
    select: {
      id: true,
      postId: true,
      title: true,
      content: true,
      excerpt: true,
      coverImageUrl: true,
      saveType: true,
      revisionNumber: true,
      wordCount: true,
      createdAt: true,
    },
  })

  if (!revision) {
    return NextResponse.json({ error: 'Revision not found' }, { status: 404 })
  }

  return NextResponse.json({ revision })
}


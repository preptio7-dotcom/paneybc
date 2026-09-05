export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = requireAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const revisions = await prisma.blogRevision.findMany({
    where: { postId: id },
    orderBy: [{ revisionNumber: 'desc' }],
    select: {
      id: true,
      revisionNumber: true,
      saveType: true,
      wordCount: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    revisions: revisions.map((revision, index) => ({
      ...revision,
      isCurrent: index === 0,
    })),
    count: revisions.length,
  })
}


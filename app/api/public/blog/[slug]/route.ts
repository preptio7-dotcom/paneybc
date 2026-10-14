export const runtime = 'nodejs'

import { BlogPostStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mapBlogPost } from '@/lib/blog'
import { getCurrentUser } from '@/lib/auth'
import { extractBetaFeatureSettings } from '@/lib/beta-features'
import { buildBlogPostVisibilityFilter, canViewBlogFeature, type BlogViewer } from '@/lib/blog-visibility'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const currentUser = getCurrentUser(request)
    const settings = await prisma.systemSettings.findFirst({
      select: { testSettings: true },
    })
    const savedTestSettings =
      settings?.testSettings &&
      typeof settings.testSettings === 'object' &&
      !Array.isArray(settings.testSettings)
        ? (settings.testSettings as Record<string, unknown>)
        : {}
    const betaFeatures = extractBetaFeatureSettings(savedTestSettings)

    let viewer: BlogViewer | null = null
    if (currentUser) {
      if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
        viewer = { role: currentUser.role, studentRole: null }
      } else {
        const user = await prisma.user.findUnique({
          where: { id: currentUser.userId },
          select: { studentRole: true },
        })
        viewer = { role: currentUser.role, studentRole: user?.studentRole || null }
      }
    }

    if (!canViewBlogFeature(betaFeatures.blog, viewer)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const { slug } = await context.params
    const post = await prisma.blogPost.findFirst({
      where: {
        slug,
        status: BlogPostStatus.published,
        publishedAt: { lte: new Date() },
        ...buildBlogPostVisibilityFilter(viewer),
      },
      include: {
        author: true,
        category: true,
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(
      { post: mapBlogPost(post) },
      {
        headers: {
          'Cache-Control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=1200',
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load post' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { invalidateCache } from '@/lib/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { subject, chapter, deleteAll } = await request.json()

    let query: any = {}
    if (subject && subject !== 'all') {
      query.subject = subject
    }
    if (chapter && chapter !== 'all') {
      if (!subject || subject === 'all') {
        return NextResponse.json(
          { error: 'Subject is required for chapter deletion' },
          { status: 400 }
        )
      }
      query.chapter = { equals: chapter, mode: 'insensitive' }
    }

    if (deleteAll === true) {
      const result = await prisma.question.deleteMany({ where: query })

      // ── Cache invalidation ──────────────────────────────────────────────────
      // Bulk delete — could have wiped an entire subject or chapter
      // Clear everything that holds question data or counts
      invalidateCache('questions:pool:')            // chapter question pools
      invalidateCache('questions:page:')            // paginated results
      invalidateCache('subjects:chapter-counts:')   // counts now wrong
      invalidateCache('mock:config:')               // canStart may have changed
      // Note: subjects:all cache kept — bulk delete doesn't remove subjects

      return NextResponse.json({ message: `Deleted ${result.count} questions` })
    }

    return NextResponse.json({ error: 'Deletion not confirmed' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
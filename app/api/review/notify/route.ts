export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { sendReviewDueEmail } from '@/lib/email'
import { sendReviewDuePush } from '@/lib/push-notifications'
import { NextResponse } from 'next/server'

const MIN_HOURS_BETWEEN_NOTIFICATIONS = 20

export async function POST(request: Request) {
  try {
    const secret = process.env.REVIEW_NOTIFY_SECRET
    if (secret) {
      const header = request.headers.get('x-cron-secret')
      if (header !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const now = new Date()
    const cutoff = new Date(now.getTime() - MIN_HOURS_BETWEEN_NOTIFICATIONS * 60 * 60 * 1000)

    const dueCounts = await prisma.reviewSchedule.groupBy({
      by: ['userId'],
      where: { nextReviewAt: { lte: now } },
      _count: { _all: true },
    })

    if (dueCounts.length === 0) {
      return NextResponse.json({ message: 'No due reviews' })
    }

    const logs = await prisma.reviewNotificationLog.findMany()
    const logMap = new Map<string, Date>()
    logs.forEach(log => {
      logMap.set(log.userId, log.lastSentAt)
    })

    const results: { userId: string; status: string }[] = []

    for (const item of dueCounts) {
      const userId = item.userId
      const dueCount = item._count?._all || 0
      const lastSentAt = logMap.get(userId)

      if (lastSentAt && lastSentAt > cutoff) {
        results.push({ userId, status: 'skipped_recent' })
        continue
      }

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user || !user.email) {
        results.push({ userId, status: 'missing_user' })
        continue
      }

      try {
        await Promise.all([
          sendReviewDueEmail(user.email, user.name, dueCount),
          sendReviewDuePush({ userId, dueCount }),
        ])

        await prisma.reviewNotificationLog.upsert({
          where: { userId },
          update: { lastSentAt: now },
          create: { userId, lastSentAt: now },
        })

        results.push({ userId, status: 'sent' })
      } catch (error) {
        console.error('Notification send error:', error)
        results.push({ userId, status: 'failed' })
      }
    }

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error('Review notify error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


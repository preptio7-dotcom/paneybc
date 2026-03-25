export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateUserPracticeStreak } from '@/lib/practice-streak'
import { getConfiguredStreakResetTimezone, getDateKeyInTimezone, type StreakResetTimezone } from '@/lib/streak-settings'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [sessions, timezone] = await Promise.all([
      prisma.studySession.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      getConfiguredStreakResetTimezone(prisma),
    ])

    const totalMinutes = sessions.reduce((sum: number, s: any) => sum + (s.minutes || 0), 0)
    const uniqueDays = new Set(sessions.map((s: any) => getDateKeyInTimezone(new Date(s.createdAt), timezone)))
    const streak = calculateStreak(sessions, timezone)

    return NextResponse.json({ sessions, totalMinutes, daysStudied: uniqueDays.size, streak })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { minutes, focusMode } = await request.json()
    if (!minutes || minutes <= 0) {
      return NextResponse.json({ error: 'Minutes are required' }, { status: 400 })
    }

    const session = await prisma.studySession.create({
      data: {
        userId: user.userId,
        minutes,
        focusMode: focusMode || 'pomodoro',
      },
    })

    void updateUserPracticeStreak(prisma, user.userId, new Date(), { endpoint: '/api/study-sessions' }).catch((error: any) => {
      console.error('Study session streak update failed:', error)
    })

    return NextResponse.json({ session }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function calculateStreak(sessions: any[], timezone: StreakResetTimezone) {
  const dates = new Set(sessions.map((s) => getDateKeyInTimezone(new Date(s.createdAt), timezone)))
  let streak = 0
  let day = new Date(Date.now())
  for (let i = 0; i < 365; i++) {
    if (dates.has(getDateKeyInTimezone(day, timezone))) {
      streak += 1
    } else {
      break
    }
    day = new Date(day.getTime() - 86400000)
  }
  return streak
}


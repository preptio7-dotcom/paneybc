export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await prisma.studySession.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const totalMinutes = sessions.reduce((sum: number, s: any) => sum + (s.minutes || 0), 0)
    const uniqueDays = new Set(sessions.map((s: any) => new Date(s.createdAt).toDateString()))
    const streak = calculateStreak(sessions)

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

    return NextResponse.json({ session }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function calculateStreak(sessions: any[]) {
  const dates = new Set(sessions.map((s) => new Date(s.createdAt).toDateString()))
  let streak = 0
  let day = new Date()
  for (let i = 0; i < 365; i++) {
    if (dates.has(day.toDateString())) {
      streak += 1
    } else {
      break
    }
    day.setDate(day.getDate() - 1)
  }
  return streak
}


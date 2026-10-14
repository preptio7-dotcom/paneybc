export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  BAE_VOL1_CODE,
  BAE_VOL1_CODES,
  BAE_VOL2_CODE,
  calculateBaeTimeAllowedMinutes,
  resolveBaeDistributionWithAvailability,
  sampleWeightedQuestionsByChapter,
  shuffleArray,
  type BaeSessionQuestionRef,
} from '@/lib/bae-mock'

type StartPayload = {
  totalQuestions?: number
}

function clampRequestedTotal(value: number | undefined) {
  const parsed = Math.floor(Number(value) || 50)
  return Math.max(10, Math.min(100, parsed))
}

function sampleQuestionIdsByChapterWeight(
  questions: Array<{ id: string; chapter: string | null }>,
  count: number,
  chapterSources: Array<unknown>
) {
  return sampleWeightedQuestionsByChapter(questions, count, chapterSources)
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as StartPayload
    const requestedTotal = clampRequestedTotal(body.totalQuestions)

    const [vol1Questions, vol2Questions, vol1Subjects, vol2Subject] = await Promise.all([
      prisma.question.findMany({
        where: { subject: { in: [...BAE_VOL1_CODES] } },
        select: { id: true, chapter: true },
      }),
      prisma.question.findMany({
        where: { subject: BAE_VOL2_CODE },
        select: { id: true, chapter: true },
      }),
      prisma.subject.findMany({
        where: { code: { in: [...BAE_VOL1_CODES] } },
        select: { chapters: true },
      }),
      prisma.subject.findUnique({
        where: { code: BAE_VOL2_CODE },
        select: { chapters: true },
      }),
    ])

    const availableVol1 = vol1Questions.length
    const availableVol2 = vol2Questions.length

    if (availableVol1 === 0 || availableVol2 === 0) {
      return NextResponse.json(
        {
          error: `Cannot start BAE Mock Test. ${
            availableVol1 === 0
              ? `${BAE_VOL1_CODE} has no questions yet.`
              : `${BAE_VOL2_CODE} has no questions yet.`
          }`,
        },
        { status: 400 }
      )
    }

    const distribution = resolveBaeDistributionWithAvailability(
      requestedTotal,
      availableVol1,
      availableVol2
    )

    if (distribution.totalQuestions < 2) {
      return NextResponse.json(
        { error: 'Not enough questions available to generate a meaningful BAE mock test.' },
        { status: 400 }
      )
    }

    const vol1Ids = sampleQuestionIdsByChapterWeight(
      vol1Questions,
      distribution.vol1Count,
      vol1Subjects.map((subject) => subject.chapters)
    )
    const vol2Ids = sampleQuestionIdsByChapterWeight(vol2Questions, distribution.vol2Count, [
      vol2Subject?.chapters,
    ])

    const mergedSet = shuffleArray<BaeSessionQuestionRef>([
      ...vol1Ids.map((questionId) => ({ questionId, volume: 'VOL1' as const })),
      ...vol2Ids.map((questionId) => ({ questionId, volume: 'VOL2' as const })),
    ])

    const timeAllowedMinutes = calculateBaeTimeAllowedMinutes(distribution.totalQuestions)

    const session = await prisma.baeMockSession.create({
      data: {
        userId: currentUser.userId,
        testType: 'bae_mock',
        subjectIds: [BAE_VOL1_CODE, BAE_VOL2_CODE],
        totalQuestions: distribution.totalQuestions,
        timeAllowed: timeAllowedMinutes,
        vol1Count: distribution.vol1Count,
        vol2Count: distribution.vol2Count,
        questionSet: mergedSet,
      },
      select: {
        id: true,
      },
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      totalQuestions: distribution.totalQuestions,
      vol1Count: distribution.vol1Count,
      vol2Count: distribution.vol2Count,
      timeAllowedMinutes,
      warning: distribution.warning || null,
      requestedTotalQuestions: requestedTotal,
    })
  } catch (error: any) {
    console.error('BAE mock start error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}

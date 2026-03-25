export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  BAE_VOL1_CODE,
  BAE_VOL1_CODES,
  BAE_VOL2_CODE,
  calculateBaeTimeAllowedMinutes,
} from '@/lib/bae-mock'

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [vol1Available, vol2Available] = await Promise.all([
      prisma.question.count({ where: { subject: { in: [...BAE_VOL1_CODES] } } }),
      prisma.question.count({ where: { subject: BAE_VOL2_CODE } }),
    ])

    const canStart = vol1Available > 0 && vol2Available > 0
    const defaultQuestions = 50

    return NextResponse.json({
      success: true,
      canStart,
      availability: {
        vol1: vol1Available,
        vol2: vol2Available,
        total: vol1Available + vol2Available,
      },
      defaults: {
        totalQuestions: defaultQuestions,
        timeAllowedMinutes: calculateBaeTimeAllowedMinutes(defaultQuestions),
      },
      errorMessage: !canStart
        ? `Cannot start BAE Mock Test. ${
            vol1Available === 0 ? `${BAE_VOL1_CODE} has no questions yet.` : `${BAE_VOL2_CODE} has no questions yet.`
          }`
        : null,
    })
  } catch (error: any) {
    console.error('BAE mock config error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}

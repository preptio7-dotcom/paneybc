export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BLOG_SUBJECT_META } from '@/lib/blog-related-subjects'

export async function GET(request: NextRequest) {
  try {
    const rawCodes = String(request.nextUrl.searchParams.get('codes') || '')
    const codes = rawCodes
      .split(',')
      .map((code) => code.trim().toUpperCase())
      .filter((code) => code in BLOG_SUBJECT_META)
      .slice(0, 8)

    if (!codes.length) {
      return NextResponse.json({ subjects: [] })
    }

    const subjects = await prisma.subject.findMany({
      where: {
        code: { in: codes },
      },
      select: {
        code: true,
        name: true,
        totalQuestions: true,
      },
    })

    return NextResponse.json({
      subjects: subjects.map((subject) => ({
        code: subject.code,
        name: subject.name,
        totalQuestions: subject.totalQuestions,
      })),
    })
  } catch {
    return NextResponse.json({ subjects: [] }, { status: 200 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const [baeivii, baeiv2e, foa, qafb] = await Promise.all([
            prisma.$queryRawUnsafe(`
        SELECT id, question, options, subject, "correctAnswer" as correct_answer
        FROM "Question"
        WHERE subject = 'BAEIVII'
        ORDER BY RANDOM()
        LIMIT 60
      `),
            prisma.$queryRawUnsafe(`
        SELECT id, question, options, subject, "correctAnswer" as correct_answer
        FROM "Question"
        WHERE subject = 'BAEIV2E'
        ORDER BY RANDOM()
        LIMIT 55
      `),
            prisma.$queryRawUnsafe(`
        SELECT id, question, options, subject, "correctAnswer" as correct_answer
        FROM "Question"
        WHERE subject = 'FOA'
        ORDER BY RANDOM()
        LIMIT 50
      `),
            prisma.$queryRawUnsafe(`
        SELECT id, question, options, subject, "correctAnswer" as correct_answer
        FROM "Question"
        WHERE subject = 'QAFB'
        ORDER BY RANDOM()
        LIMIT 40
      `)
        ])

        const questions = [
            ...(baeivii as any[]),
            ...(baeiv2e as any[]),
            ...(foa as any[]),
            ...(qafb as any[])
        ]

        // Randomize the order of the combined questions
        const shuffled = questions.sort(() => 0.5 - Math.random())

        return NextResponse.json(shuffled, {
            headers: {
                'Cache-Control': 'public, max-age=3600',
            },
        })
    } catch (error) {
        console.error('Failed to fetch practice MCQs:', error)
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }
}

export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { subjectId, subjectCode, name, code, order, weightage } = await request.json()
    if (!name || !code || (!subjectId && !subjectCode)) {
      return NextResponse.json({ error: 'Subject, name, and code are required' }, { status: 400 })
    }

    const subject = subjectId
      ? await prisma.subject.findUnique({ where: { id: subjectId } })
      : await prisma.subject.findUnique({ where: { code: subjectCode } })

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    const chapters = Array.isArray(subject.chapters) ? subject.chapters : []
    const existing = chapters.some((chapter: any) => chapter.code === code)
    if (existing) {
      return NextResponse.json({ error: 'Chapter code already exists' }, { status: 409 })
    }

    const updatedChapters = [
      ...chapters,
      {
      name,
      code,
      order: typeof order === 'number' ? order : chapters.length + 1,
      weightage: typeof weightage === 'number' && weightage > 0 ? weightage : 1,
      },
    ]

    const updated = await prisma.subject.update({
      where: { id: subject.id },
      data: { chapters: updatedChapters },
    })

    return NextResponse.json({ message: 'Chapter added', subject: updated }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')
    const code = searchParams.get('code')

    if (!subjectId || !code) {
      return NextResponse.json({ error: 'Subject ID and chapter code are required' }, { status: 400 })
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } })
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    const chapters = Array.isArray(subject.chapters) ? subject.chapters : []
    const updatedChapters = chapters.filter((chapter: any) => chapter.code !== code)
    await prisma.subject.update({
      where: { id: subject.id },
      data: { chapters: updatedChapters },
    })

    return NextResponse.json({ message: 'Chapter removed' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { subjectId, code, newCode, name, order, weightage } = await request.json()
    if (!subjectId || !code) {
      return NextResponse.json({ error: 'Subject ID and chapter code are required' }, { status: 400 })
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } })
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    const normalizedNewCode = typeof newCode === 'string' && newCode.trim()
      ? newCode.trim()
      : null

    const chapters = Array.isArray(subject.chapters) ? subject.chapters : []

    if (normalizedNewCode && normalizedNewCode !== code) {
      const exists = chapters.some((chapter: any) => chapter.code === normalizedNewCode)
      if (exists) {
        return NextResponse.json({ error: 'Chapter code already exists' }, { status: 409 })
      }
    }

    const updatedChapters = chapters.map((chapter: any) => {
      if (chapter.code !== code) return chapter
      return {
        ...chapter,
        name: typeof name === 'string' && name.trim() ? name.trim() : chapter.name,
        order: typeof order === 'number' && order > 0 ? order : chapter.order,
        weightage: typeof weightage === 'number' && weightage > 0 ? weightage : chapter.weightage,
        code: normalizedNewCode && normalizedNewCode !== code ? normalizedNewCode : chapter.code,
      }
    })

    const updated = await prisma.subject.update({
      where: { id: subject.id },
      data: { chapters: updatedChapters },
    })

    return NextResponse.json({ message: 'Chapter updated', subject: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


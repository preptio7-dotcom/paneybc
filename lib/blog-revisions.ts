import { BlogRevisionSaveType, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { stripHtml } from '@/lib/blog'

function calculateWordCount(content: string) {
  return stripHtml(content)
    .split(/\s+/)
    .filter(Boolean).length
}

type RevisionInput = {
  postId: string
  title: string
  content: string
  excerpt: string
  coverImageUrl?: string | null
  savedBy: string
  saveType: BlogRevisionSaveType
}

export async function createBlogRevision(
  input: RevisionInput,
  client: PrismaClient | typeof prisma = prisma
) {
  const wordCount = calculateWordCount(input.content)

  return client.$transaction(async (tx: any) => {
    const latest = await tx.blogRevision.findFirst({
      where: { postId: input.postId },
      orderBy: { revisionNumber: 'desc' },
      select: { revisionNumber: true },
    })

    const revision = await tx.blogRevision.create({
      data: {
        postId: input.postId,
        title: input.title,
        content: input.content,
        excerpt: input.excerpt.slice(0, 300),
        coverImageUrl: input.coverImageUrl || null,
        savedBy: input.savedBy,
        saveType: input.saveType,
        revisionNumber: Number(latest?.revisionNumber || 0) + 1,
        wordCount,
      },
    })

    const overflowRows = await tx.blogRevision.findMany({
      where: { postId: input.postId },
      orderBy: [{ createdAt: 'desc' }, { revisionNumber: 'desc' }],
      skip: 20,
      select: { id: true },
    })

    if (overflowRows.length) {
      await tx.blogRevision.deleteMany({
        where: { id: { in: overflowRows.map((row: { id: string }) => row.id) } },
      })
    }

    return revision
  })
}


export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { getMockDefinitionByType, type MockTestType } from '@/lib/mock-tests'

const ALLOWED_TEST_TYPES = new Set<MockTestType>(['bae_mock', 'foa_mock', 'qafb_mock'])

function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit')) || 25))
  return { page, limit, skip: (page - 1) * limit }
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = String(searchParams.get('q') || '').trim()
    const testTypeInput = String(searchParams.get('testType') || '').trim()
    const testType =
      testTypeInput && ALLOWED_TEST_TYPES.has(testTypeInput as MockTestType)
        ? (testTypeInput as MockTestType)
        : null

    const { page, limit, skip } = parsePagination(searchParams)

    let scopedUserIds: string[] | null = null
    if (q) {
      const matchedUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
        take: 2000,
      })

      scopedUserIds = matchedUsers.map((user) => user.id)
      if (!scopedUserIds.length) {
        return NextResponse.json({
          success: true,
          rows: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        })
      }
    }

    const where = {
      ...(testType ? { testType } : {}),
      ...(scopedUserIds ? { userId: { in: scopedUserIds } } : {}),
    }

    const [total, rows] = await Promise.all([
      prisma.mockTestNotifyRequest.count({ where }),
      prisma.mockTestNotifyRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          testType: true,
          createdAt: true,
        },
      }),
    ])

    const users = rows.length
      ? await prisma.user.findMany({
          where: {
            id: { in: rows.map((row) => row.userId) },
          },
          select: {
            id: true,
            name: true,
            email: true,
            studentRole: true,
            createdAt: true,
          },
        })
      : []

    const usersById = new Map(users.map((user) => [user.id, user]))

    const payloadRows = rows.map((row) => {
      const user = usersById.get(row.userId)
      const definition = getMockDefinitionByType(row.testType)
      return {
        id: row.id,
        createdAt: row.createdAt,
        testType: row.testType,
        testName: definition?.testName || row.testType,
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              studentRole: user.studentRole,
              joinedAt: user.createdAt,
            }
          : null,
      }
    })

    return NextResponse.json({
      success: true,
      rows: payloadRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('admin mock notify requests error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to load mock notify requests' },
      { status: 500 }
    )
  }
}

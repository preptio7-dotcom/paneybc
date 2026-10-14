import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { withCache } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await withCache('admin:referrals', 60, async () => {
      const ambassadors = await prisma.user.findMany({
        where: { studentRole: 'ambassador' },
        select: {
          id: true,
          name: true,
          email: true,
          referralCode: true,
          referralLink: true,
          referralsMade: {
            select: {
              id: true,
              newUserName: true,
              newUserEmail: true,
              signedUpAt: true,
              page: true,
            },
            orderBy: { signedUpAt: 'desc' }
          },
          _count: {
            select: { referralsMade: true }
          }
        },
        orderBy: { referralsMade: { _count: 'desc' } }
      })

      const totalReferrals = ambassadors.reduce(
        (sum, a) => sum + a._count.referralsMade, 0
      )

      return {
        ambassadors: ambassadors.map(a => ({
          id: a.id,
          name: a.name,
          email: a.email,
          referralCode: a.referralCode,
          referralLink: a.referralLink,
          totalReferrals: a._count.referralsMade,
          signups: a.referralsMade
        })),
        totalReferrals
      }
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Admin referrals fetch error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

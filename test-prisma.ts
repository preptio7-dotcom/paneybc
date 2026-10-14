import { prisma } from './lib/prisma'
import fs from 'fs'

async function main() {
  try {
    const res = await prisma.user.findMany({
      where: { studentRole: 'ambassador' },
      select: {
        id: true,
        _count: {
          select: { referralsMade: true }
        }
      },
      orderBy: { referralsMade: { _count: 'desc' } }
    })
    fs.writeFileSync('test-prisma-out2.json', JSON.stringify(res, null, 2))
    console.log("SUCCESS")
  } catch (e) {
    fs.writeFileSync('test-prisma-err.txt', String(e))
    console.error("FAIL")
  }
}

main()

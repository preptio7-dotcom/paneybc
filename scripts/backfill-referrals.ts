import { PrismaClient } from '@prisma/client'
import { assignReferralToAmbassador } from '../lib/referral'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting backfill for existing ambassadors...')

  const ambassadors = await prisma.user.findMany({
    where: {
      studentRole: 'ambassador',
      referralCode: null,
    },
    select: { id: true, name: true, email: true },
  })

  console.log(`Found ${ambassadors.length} ambassadors needing referral codes.`)

  let success = 0
  let failed = 0

  for (const ambassador of ambassadors) {
    try {
      const { code, link } = await assignReferralToAmbassador(
        ambassador.id,
        ambassador.name || ambassador.email
      )
      console.log(`Assigned ${code} to ${ambassador.email}`)
      success++
    } catch (error) {
      console.error(`Failed to assign code to ${ambassador.email}:`, error)
      failed++
    }
  }

  console.log('\nBackfill summary:')
  console.log(`Success: ${success}`)
  console.log(`Failed: ${failed}`)
}

main()
  .catch((e) => {
    console.error('Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

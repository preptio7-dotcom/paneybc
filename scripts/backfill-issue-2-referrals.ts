import { assignReferralToAmbassador } from '@/lib/referral'
import { prisma } from '@/lib/prisma'

async function main() {
  const ambassadors = await prisma.user.findMany({
    where: {
      studentRole: 'ambassador',
      referralCode: null
    },
    select: { id: true, name: true, email: true }
  })

  console.log(`Found ${ambassadors.length} ambassadors without codes`)

  for (const ambassador of ambassadors) {
    try {
      const nameForCode = ambassador.name || ambassador.email.split('@')[0]
      const result = await assignReferralToAmbassador(ambassador.id, nameForCode)
      console.log(`✅ Assigned ${result.code} to ${ambassador.name || ambassador.email}`)
    } catch (err) {
      console.error(`❌ Failed for ${ambassador.email}:`, err)
    }
  }

  console.log('Backfill complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

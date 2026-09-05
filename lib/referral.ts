import { prisma } from '@/lib/prisma'

/**
 * Generate a referral code from a user's name.
 * Format: FIRSTNAME-4DIGITS (e.g. MUDASIR-4821)
 */
export function generateReferralCode(name: string): string {
  const parts = String(name || '').trim().split(/\s+/)
  let firstName = (parts[0] || 'USER').toUpperCase().replace(/[^A-Z]/g, '')
  if (!firstName) firstName = 'USER'
  if (firstName.length > 10) firstName = firstName.slice(0, 10)
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `${firstName}-${suffix}`
}

/**
 * Generate a full referral link from a code.
 */
export function generateReferralLink(code: string): string {
  return `https://preptio.com/signup?ref=${code}`
}

/**
 * Assign a referral code and link to an ambassador user.
 * Retries up to 5 times if the generated code already exists.
 */
export async function assignReferralToAmbassador(
  userId: string,
  userName: string
): Promise<{ code: string; link: string }> {
  const MAX_RETRIES = 5
  let lastCode = ''

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateReferralCode(userName)
    lastCode = code

    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    })

    if (existing) {
      // Code already taken — retry with a new random suffix
      continue
    }

    const link = generateReferralLink(code)

    await prisma.user.update({
      where: { id: userId },
      data: { referralCode: code, referralLink: link },
    })

    return { code, link }
  }

  throw new Error(
    `[Referral] Failed to generate unique referral code after ${MAX_RETRIES} attempts. Last tried: ${lastCode}`
  )
}

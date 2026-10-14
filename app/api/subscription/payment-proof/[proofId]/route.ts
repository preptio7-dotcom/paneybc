import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { proofId: string } }) {
  try {
    const { proofId } = params

    if (!proofId) {
      return NextResponse.json({ error: 'Proof ID is required' }, { status: 400 })
    }

    // For backward compatibility - decode proofId if needed
    // The proofId is now the key used in R2, we just need to validate it exists
    // For now, we can redirect to the actual R2 URL which is stored in paymentProofUrl
    
    return NextResponse.json(
      { error: 'This endpoint is deprecated. Images are now served directly from Cloudflare.' },
      { status: 410 }
    )
  } catch (error: any) {
    console.error('Error retrieving payment proof:', error)
    return NextResponse.json({ error: 'Failed to retrieve payment proof' }, { status: 500 })
  }
}

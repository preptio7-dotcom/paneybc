import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { proofId: string } }) {
  try {
    const { proofId } = params

    if (!proofId) {
      return NextResponse.json({ error: 'Proof ID is required' }, { status: 400 })
    }

    // Find the subscription request with this proof ID
    const subscriptionRequest = await (prisma.subscriptionRequest.findFirst as any)({
      where: {
        paymentProofUrl: `/api/subscription/payment-proof/${proofId}`,
      },
    })

    if (!subscriptionRequest) {
      return NextResponse.json({ error: 'Payment proof not found' }, { status: 404 })
    }

    // Get the file data from additionalInfo
    // @ts-ignore - additionalInfo field added but Prisma client not updating
    const additionalInfo = subscriptionRequest.additionalInfo
    if (!additionalInfo || !additionalInfo.fileBase64) {
      return NextResponse.json({ error: 'File data not found' }, { status: 404 })
    }

    // Convert base64 back to buffer
    const buffer = Buffer.from(additionalInfo.fileBase64, 'base64')
    
    // Determine content type based on file extension
    const fileExtension = additionalInfo.fileExtension || 'bin'
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
    
    const contentType = contentTypes[fileExtension.toLowerCase()] || 'application/octet-stream'

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `inline; filename="${additionalInfo.fileName}"`,
        'Cache-Control': 'public, max-age=3600, immutable',
      },
    })
  } catch (error: any) {
    console.error('Error retrieving payment proof:', error)
    return NextResponse.json({ error: 'Failed to retrieve payment proof' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

/**
 * Build version API endpoint
 * Returns the current build version to detect new deployments
 * Uses build timestamp for version identification
 */
export async function GET() {
  try {
    // Use build timestamp as version
    // In production, this would be set during build process
    const buildVersion = process.env.NEXT_PUBLIC_BUILD_ID || 
                        process.env.VERCEL_GIT_COMMIT_SHA || 
                        new Date().toISOString().split('T')[0]

    return NextResponse.json({
      version: buildVersion,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
      }
    })
  } catch (error) {
    console.error('Error getting build version:', error)
    return NextResponse.json(
      { version: 'unknown' },
      { status: 200 }
    )
  }
}

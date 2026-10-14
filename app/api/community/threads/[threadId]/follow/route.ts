import { NextRequest } from 'next/server'
import { updateCollection } from '@/lib/community-collection'
export async function PUT(request: NextRequest, context: { params: Promise<{ threadId: string }> }) {
  return updateCollection(request, context, 'follow')
}

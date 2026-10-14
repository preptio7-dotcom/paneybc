export type Category = { id: string; name: string; slug: string; description: string | null }
export type Author = { id: string; name: string; avatar: string | null }
export type Thread = {
  postType: import('@/lib/community-options').PostType; solvedAt: string | null; acceptedCommentId: string | null; pinnedAt: string | null; editedAt: string | null; saved: boolean; following: boolean
  id: string; title: string; body: string; createdAt: string; locked: boolean
  score: number; viewerVote: number; commentCount: number; category: Category; author: Author
  isAnonymous: boolean; realAuthor?: Author | null; isOwner?: boolean
}
export type Comment = {
  editedAt?: string | null
  id: string; body: string; createdAt: string; parentCommentId: string | null
  deleted: boolean; score: number; viewerVote: number; author: Author | null
  isAnonymous?: boolean; realAuthor?: Author | null; isOwner?: boolean
}
export type Target = { targetType: 'thread' | 'comment'; targetId: string }

export async function communityRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...options })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data as T
}
export const jsonPost = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
export const jsonUpdate = (body: unknown, method = 'PATCH'): RequestInit => ({ ...jsonPost(body), method })

export function timeAgo(value: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

'use client'
import { useEffect, useRef, useState } from 'react'
import { LockKeyhole, MessageSquare, ArrowUpRight, Bookmark, Pin, CheckCircle2, EyeOff, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { postLabels } from '@/lib/community-options'
import { Comments } from './comments'
import { Markdown } from './markdown'
import { DeleteDialog } from './content-dialogs'
import { PostMenu, ShareButton, VoteControls } from './post-controls'
import { communityRequest, jsonUpdate, timeAgo, type Target, type Thread } from './types'

function getThreadPreview(body: string) {
  const imageRegex = /!\[([^\]]*)\]\(((?:https?:\/\/[^\s)]+|\/[^\s)]+))\)/i
  const match = body.match(imageRegex)
  let imageUrl: string | null = match ? match[2] : null

  if (!imageUrl) {
    const bareImageRegex = /(https?:\/\/[^\s]+(?:\.png|\.jpe?g|\.webp|\.gif|\.svg)|https?:\/\/pub-[a-z0-9]+\.r2\.dev\/[^\s]+)/i
    const bareMatch = body.match(bareImageRegex)
    if (bareMatch) imageUrl = bareMatch[1]
  }

  const cleanText = body
    .replace(/!\[([^\]]*)\]\((?:https?:\/\/[^\s)]+|\/[^\s)]+)\)/gi, '')
    .replace(/(?:https?:\/\/[^\s]+(?:\.png|\.jpe?g|\.webp|\.gif|\.svg)|https?:\/\/pub-[a-z0-9]+\.r2\.dev\/[^\s]+)/gi, '')
    .trim()

  return { cleanText, imageUrl }
}

export function ThreadCard({ thread, detail = false, href, openThread, onSubject, requireAuth, onReport, onUpdate, onEdit, onDeleted, focusComment }: {
  thread: Thread; detail?: boolean; href: string; openThread: () => void; onSubject: (slug: string) => void; requireAuth: () => void
  onReport: (target: Target) => void; onUpdate: (value: Partial<Thread>) => void; onEdit: () => void; onDeleted: () => void; focusComment?: string
}) {
  const { user } = useAuth()
  const isMod = user?.role === 'admin' || user?.role === 'super_admin'
  const [expanded, setExpanded] = useState(false)
  const [bodyExpanded, setBodyExpanded] = useState(false)
  const [isPreviewTruncated, setIsPreviewTruncated] = useState(false)
  const bodyRef = useRef<HTMLParagraphElement | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pending, setPending] = useState(false)
  const endpoint = `/api/community/threads/${encodeURIComponent(thread.id)}`
  async function change(body: unknown, path = '', method = 'PATCH') {
    if (!user) { requireAuth(); return }
    if (pending) return
    setPending(true)
    try {
      const data = await communityRequest<{ thread?: Thread; saved?: boolean; following?: boolean }>(endpoint + path, jsonUpdate(body, method))
      onUpdate(data.thread || data)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save changes.') }
    finally { setPending(false) }
  }
  // For anonymous threads: real owner is the actual author (shown to mods or self via realAuthor, or thread.isOwner)
  const owner = Boolean(thread.isOwner || (user?.id && (user.id === thread.author.id || (thread.realAuthor && user.id === thread.realAuthor.id))))
  const moderator = isMod
  const displayAuthor = thread.isAnonymous ? { name: 'Anonymous', avatar: null } : thread.author
  const revealAuthor = thread.isAnonymous && isMod ? thread.realAuthor : null
  const preview = getThreadPreview(thread.body)

  // Only show the expand/collapse toggle when the two-line preview actually overflows.
  useEffect(() => {
    if (detail || bodyExpanded) return
    const el = bodyRef.current
    if (!el) return
    const measure = () => {
      if (bodyRef.current) {
        setIsPreviewTruncated(bodyRef.current.scrollHeight - bodyRef.current.clientHeight > 4)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [preview.cleanText, detail, bodyExpanded])

  return <article className={`min-w-0 rounded-2xl border bg-white ${detail ? 'border-slate-200 p-4 sm:p-6' : 'border-slate-200/90 p-4 transition-colors hover:border-emerald-200 sm:p-5'}`}>
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
      <button type="button" onClick={() => onSubject(thread.category.slug)} className="min-h-8 rounded-full bg-emerald-50 px-2.5 font-semibold text-emerald-800 hover:bg-emerald-100">{thread.category.name}</button>
      <span aria-hidden="true">·</span>
      <img src={displayAuthor.avatar || '/avatars/boy_1.png'} alt="" className={`h-5 w-5 rounded-full bg-slate-100 ${thread.isAnonymous ? 'opacity-40 grayscale' : ''}`} />
      <span className="max-w-44 truncate">
        {displayAuthor.name}
        {thread.isAnonymous && <EyeOff size={11} className="inline ml-1 text-slate-400" aria-label="Anonymous" />}
      </span>
      {revealAuthor && (
        <span
          className="flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200/80"
          title={`Anonymous author email: ${revealAuthor.email || 'N/A'} (Name: ${revealAuthor.name})`}
        >
          <ShieldAlert size={10} className="shrink-0 text-amber-700" />
          <span className="max-w-[180px] truncate">{revealAuthor.email || revealAuthor.name}</span>
        </span>
      )}
      <span aria-hidden="true">·</span><time dateTime={thread.createdAt} title={new Date(thread.createdAt).toLocaleString()}>{timeAgo(thread.createdAt)}</time>
      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{postLabels[thread.postType] || 'Discussion'}</span>
      {thread.pinnedAt && <span className="flex items-center gap-1 font-semibold text-emerald-800"><Pin size={12} />Pinned</span>}
      {thread.solvedAt && <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-900"><CheckCircle2 size={12} />Solved</span>}
      {thread.editedAt && <span title={new Date(thread.editedAt).toLocaleString()}>· edited</span>}
      {thread.locked && <span className="flex items-center gap-1 text-amber-800"><LockKeyhole size={12} />Locked</span>}
    </div>
    {detail ? <h1 className="mb-4 break-words text-2xl font-bold leading-tight sm:text-3xl">{thread.title}</h1> : <h2 className="mb-2 break-words text-lg font-bold leading-snug"><a href={href} onClick={e => { if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); openThread() } }} className="hover:text-emerald-800">{thread.title}</a></h2>}
    {detail ? (
      <Markdown body={thread.body} />
    ) : (
      <div className="space-y-2.5">
        {preview.cleanText && (
          <p
            ref={bodyRef}
            className={`${bodyExpanded ? '' : 'line-clamp-2'} whitespace-pre-line break-words text-sm leading-relaxed text-slate-600`}
          >
            {preview.cleanText}
          </p>
        )}
        {preview.cleanText && isPreviewTruncated && (
          <button
            type="button"
            onClick={() => setBodyExpanded(!bodyExpanded)}
            className="block text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            {bodyExpanded ? 'View less' : 'View more'}
          </button>
        )}
        {preview.imageUrl && (
          <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50 max-w-sm max-h-52 flex items-center justify-center">
            <img
              src={preview.imageUrl}
              alt="Post image preview"
              loading="lazy"
              className="max-h-52 w-auto max-w-full object-contain rounded-lg hover:opacity-95 transition-opacity cursor-pointer"
              onClick={e => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault()
                  openThread()
                }
              }}
            />
          </div>
        )}
      </div>
    )}
    {detail && thread.following && <p className="mt-3 text-xs text-emerald-800">Following this discussion. Manage reply alerts in Community notifications.</p>}
    <div className="mt-4 flex flex-wrap items-center gap-1">
      <VoteControls target={{ targetType: 'thread', targetId: thread.id }} score={thread.score} viewerVote={thread.viewerVote} authenticated={!!user} requireAuth={requireAuth} onChange={onUpdate} />
      <button type="button" className="community-action" aria-expanded={detail || expanded} onClick={() => detail ? document.getElementById('discussion-comments')?.scrollIntoView({ block: 'start' }) : setExpanded(!expanded)}><MessageSquare size={15} /><span>{thread.commentCount} {thread.commentCount === 1 ? 'comment' : 'comments'}</span></button>
      <ShareButton threadId={thread.id} />
      <button className="community-action" disabled={pending} aria-pressed={!!thread.saved} onClick={() => void change({ saved: !thread.saved }, '/bookmark', 'PUT')}><Bookmark size={15} fill={thread.saved ? 'currentColor' : 'none'} />{thread.saved ? 'Saved' : 'Save'}</button>
      <PostMenu onReport={() => onReport({ targetType: 'thread', targetId: thread.id })} actions={[
        { label: thread.following ? 'Unfollow discussion' : 'Follow discussion', run: () => void change({ following: !thread.following }, '/follow', 'PUT'), disabled: pending },
        ...(owner ? [
          { label: 'Edit discussion', run: onEdit, disabled: thread.locked || pending },
          ...(thread.postType === 'question' ? [{ label: thread.solvedAt ? 'Reopen question' : 'Mark as solved', run: () => void change({ action: 'solve', solved: !thread.solvedAt }), disabled: thread.locked || pending }] : []),
          { label: 'Delete discussion', run: () => setDeleting(true), disabled: pending },
        ] : []),
        ...(moderator ? [
          { label: thread.pinnedAt ? 'Unpin discussion' : 'Pin discussion', run: () => void change({ action: 'pin', pinned: !thread.pinnedAt }), disabled: pending },
          ...(!owner ? [{ label: 'Delete discussion', run: () => setDeleting(true), disabled: pending }] : []),
        ] : []),
      ]} />
    </div>
    {(detail || expanded) && <div id={detail ? 'discussion-comments' : undefined} className="mt-4">
      <Comments thread={thread} onThreadUpdate={onUpdate} focusComment={focusComment} threadId={thread.id} authorId={thread.author.id} locked={thread.locked} requireAuth={requireAuth} onReport={onReport} onCount={commentCount => onUpdate({ commentCount })} />
      {!detail && <a href={href} onClick={e => { if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); openThread() } }} className="community-action mt-3 text-emerald-800">Open full discussion<ArrowUpRight size={15} /></a>}
    </div>}
    <DeleteDialog open={deleting} onClose={() => setDeleting(false)} kind="discussion" onDelete={async () => { await communityRequest(endpoint, { method: 'DELETE' }); onDeleted() }} />
  </article>
}

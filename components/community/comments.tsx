'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ChevronDown, ChevronRight, EyeOff, Loader2, LockKeyhole, MessageSquare, Reply, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { DeleteDialog, EditCommentDialog } from './content-dialogs'
import { Markdown } from './markdown'
import { PostMenu, VoteControls } from './post-controls'
import { useDraft } from './use-draft'
import { communityRequest, jsonPost, jsonUpdate, timeAgo, type Thread, type Comment, type Target } from './types'

function CommentForm({ draftKey, label, onSubmit, onCancel, userRole }: { draftKey: string; label: string; onSubmit: (body: string, isAnonymous: boolean) => Promise<void>; onCancel?: () => void; userRole?: string }) {
  const [body, setBody] = useDraft(draftKey, '')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [pending, setPending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPEG, WebP, GIF, HEIC).')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB.')
      return
    }
    setUploadingImage(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/community/upload-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || (!data.success && !data.url)) {
        throw new Error(data.error || 'Failed to upload image.')
      }
      const imageSnippet = `\n\n${data.markdown}\n\n`
      setBody((body || '').trimEnd() + imageSnippet)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image.')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return <form className="my-3" onSubmit={async e => {
    e.preventDefault()
    if (busy.current) return
    busy.current = true; setPending(true); setError('')
    try { await onSubmit(body, isAnonymous); setBody(''); setIsAnonymous(false); onCancel?.() }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to post. Your draft has been kept.') }
    finally { busy.current = false; setPending(false) }
  }}>
    <div className="mb-2 flex items-center justify-between">
      <label htmlFor={draftKey} className="text-sm font-semibold">{label}</label>
      <div className="flex items-center gap-1.5">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={pending || uploadingImage} />
        <button
          type="button"
          disabled={pending || uploadingImage}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100/80 disabled:opacity-50"
          title="Upload screenshot from device or take photo with camera"
        >
          {uploadingImage ? <Loader2 className="animate-spin" size={13} /> : <Camera size={13} />}
          {uploadingImage ? 'Uploading…' : 'Add image'}
        </button>
      </div>
    </div>
    <textarea id={draftKey} value={body} onChange={e => setBody(e.target.value)} minLength={2} maxLength={8000} required rows={3} className="community-input resize-y" placeholder="Share an explanation or ask a follow-up…" disabled={pending} />
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 cursor-pointer select-none" title="Admins can still see your identity">
          <div className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${isAnonymous ? 'bg-emerald-600' : 'bg-slate-200'}`}>
            <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${isAnonymous ? 'translate-x-4' : 'translate-x-0'}`} />
            <input type="checkbox" className="sr-only" checked={isAnonymous} disabled={pending} onChange={e => setIsAnonymous(e.target.checked)} />
          </div>
          <EyeOff size={12} className={isAnonymous ? 'text-emerald-700' : 'text-slate-400'} />
          <span className="text-xs text-slate-500">Anonymous</span>
        </label>
        {!isAnonymous && <span className="text-xs text-slate-500">Markdown & images supported</span>}
        {isAnonymous && <span className="text-xs text-amber-700">Admins see your identity</span>}
      </div>
      <div className="flex shrink-0 gap-1">{onCancel && <button type="button" onClick={onCancel} className="community-action">Cancel</button>}<button type="submit" className="community-primary" disabled={pending || uploadingImage || body.trim().length < 2}>{pending ? 'Posting…' : 'Comment'}</button>
      </div>
    </div>
  </form>
}

function CommentBranch({ comment, childrenByParent, authorId, depth = 0, locked, requireAuth, onReport, onVote, submit, acceptedId, canAccept, onAccept, onEdit, onDelete }: {
  comment: Comment; childrenByParent: Map<string | null, Comment[]>; authorId: string; depth?: number; locked: boolean
  requireAuth: () => void; onReport: (target: Target) => void; onVote: (id: string, result: { score: number; viewerVote: number }) => void
  acceptedId: string | null; canAccept: boolean; onAccept: (id: string) => void; onEdit: (comment: Comment) => void; onDelete: (comment: Comment) => void
  submit: (body: string, parentId: string | null, isAnonymous?: boolean) => Promise<void>
}) {
  const { user } = useAuth()
  const isMod = user?.role === 'admin' || user?.role === 'super_admin'
  const [collapsed, setCollapsed] = useState(false)
  const [replying, setReplying] = useState(false)
  const children = childrenByParent.get(comment.id) || []
  const displayAuthor = comment.isAnonymous ? { name: 'Anonymous', avatar: null } : comment.author
  const revealAuthor = comment.isAnonymous && isMod ? comment.realAuthor : null
  return <article id={`comment-${comment.id}`} className={`min-w-0 ${depth > 0 && depth < 4 ? 'border-l border-slate-200 pl-3 sm:pl-4' : depth >= 4 ? 'border-t border-slate-100 pt-2' : ''}`}>
    <div className="flex min-w-0 items-center gap-2 text-xs">
      <button type="button" className="community-icon -ml-2" aria-label={collapsed ? 'Expand comment' : 'Collapse comment'} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</button>
      {!comment.deleted && <img src={displayAuthor?.avatar || '/avatars/boy_1.png'} alt="" className={`h-6 w-6 rounded-full bg-slate-100 ${comment.isAnonymous ? 'opacity-40 grayscale' : ''}`} />}
      <span className="min-w-0 truncate font-semibold">
        {comment.deleted ? '[removed]' : displayAuthor?.name || 'Member'}
        {comment.isAnonymous && !comment.deleted && <EyeOff size={11} className="inline ml-1 text-slate-400" aria-label="Anonymous" />}
      </span>
      {!comment.isAnonymous && comment.author?.id === authorId && <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-800">OP</span>}
      {revealAuthor && <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"><ShieldAlert size={10} />{revealAuthor.name}</span>}
      <time dateTime={comment.createdAt} title={new Date(comment.createdAt).toLocaleString()} className="shrink-0 text-slate-500">{timeAgo(comment.createdAt)}</time>
    </div>
    {!comment.deleted && acceptedId === comment.id && <p className="my-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Accepted answer · selected by the question author</p>}
    {!comment.deleted && comment.editedAt && <span className="ml-2 text-xs text-slate-500" title={new Date(comment.editedAt).toLocaleString()}>edited</span>}
    {!collapsed && <>
      <div className="pl-2">{comment.deleted ? <p className="py-2 text-sm italic text-slate-500">This comment was removed.</p> : <Markdown body={comment.body} />}</div>
      {!comment.deleted && <div className="mt-2 flex flex-wrap items-center gap-1">
        <VoteControls target={{ targetType: 'comment', targetId: comment.id }} score={comment.score} viewerVote={comment.viewerVote} authenticated={!!user} requireAuth={requireAuth} onChange={value => onVote(comment.id, value)} />
        {!locked && <button type="button" className="community-action" onClick={() => user ? setReplying(!replying) : requireAuth()}>
          <Reply size={15} />Reply</button>}
        {canAccept && !locked && <button className="community-action text-emerald-800" onClick={() => onAccept(comment.id)}>{acceptedId === comment.id ? 'Reopen question' : 'Accept answer'}</button>}
        <PostMenu onReport={() => onReport({ targetType: 'comment', targetId: comment.id })} actions={[
          ...(comment.isOwner || (user?.id && (user.id === comment.author?.id || (comment.realAuthor && user.id === comment.realAuthor.id))) ? [
            { label: 'Edit comment', run: () => onEdit(comment), disabled: locked },
            { label: 'Delete comment', run: () => onDelete(comment) },
          ] : isMod ? [
            { label: 'Delete comment', run: () => onDelete(comment) },
          ] : [])
        ]} />
      </div>}
      {replying && !locked && user && <CommentForm draftKey={`community:${user.id}:reply:${comment.id}`} label={`Reply to ${displayAuthor?.name || 'member'}`} onSubmit={(body, isAnon) => submit(body, comment.id, isAnon)} onCancel={() => setReplying(false)} />}
      {children.length > 0 && <div className={`mt-2 space-y-2 ${depth < 3 ? 'ml-2 sm:ml-4' : ''}`}>{children.map(child => <CommentBranch key={child.id} comment={child} childrenByParent={childrenByParent} authorId={authorId} depth={depth + 1} locked={locked} requireAuth={requireAuth} onReport={onReport} onVote={onVote} submit={submit} acceptedId={acceptedId} canAccept={canAccept} onAccept={onAccept} onEdit={onEdit} onDelete={onDelete} />)}</div>}
    </>}
  </article>
}

export function Comments({ threadId, authorId, locked, requireAuth, onReport, onCount, thread, onThreadUpdate, focusComment }: {
  thread: Thread; onThreadUpdate: (value: Partial<Thread>) => void; focusComment?: string
  threadId: string; authorId: string; locked: boolean; requireAuth: () => void; onReport: (target: Target) => void; onCount: (total: number) => void
}) {
  const { user } = useAuth()
  const [sort, setSort] = useState('oldest')
  const [editing, setEditing] = useState<Comment | null>(null)
  const [deleting, setDeleting] = useState<Comment | null>(null)
  const acceptBusy = useRef(false)
  const sectionRef = useRef<HTMLElement>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [pending, setPending] = useState(true)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [serverLocked, setServerLocked] = useState(locked)
  const requestId = useRef(0)
  const onCountRef = useRef(onCount)
  onCountRef.current = onCount
  const merge = (old: Comment[], next: Comment[]) => [...new Map([...old, ...next].map(c => [c.id, c])).values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  async function load(nextPage: number) {
    const id = ++requestId.current
    setPending(true); setError('')
    try {
      const data = await communityRequest<{ comments: Comment[]; hasMore: boolean; total: number; locked: boolean }>(`/api/community/threads/${encodeURIComponent(threadId)}/comments?page=${nextPage}&sort=${sort}${focusComment ? `&focus=${encodeURIComponent(focusComment)}` : ''}`)
      if (id !== requestId.current) return
      setComments(old => merge(nextPage === 1 ? [] : old, data.comments)); setPage(nextPage); setHasMore(data.hasMore); setTotal(data.total); setServerLocked(data.locked); onCountRef.current(data.total)
    } catch (err) { if (id === requestId.current) setError(err instanceof Error ? err.message : 'Unable to load comments.') }
    finally { if (id === requestId.current) setPending(false) }
  }
  useEffect(() => { setComments([]); setPage(0); void load(1); return () => { requestId.current++ } }, [threadId, user?.id, sort, focusComment])
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, Comment[]>()
    const ids = new Set(comments.map(c => c.id))
    for (const c of comments) {
      const parent = c.parentCommentId && ids.has(c.parentCommentId) ? c.parentCommentId : null
      map.set(parent, [...(map.get(parent) || []), c])
    }
    for (const siblings of map.values()) siblings.sort((a, b) => {
      if (a.id === thread.acceptedCommentId) return -1
      if (b.id === thread.acceptedCommentId) return 1
      if (sort === 'top' && a.score !== b.score) return b.score - a.score
      return (a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)) * (sort === 'new' ? -1 : 1)
    })
    return map
  }, [comments, sort, thread.acceptedCommentId])
  useEffect(() => {
    if (!focusComment || pending) return
    const target = sectionRef.current?.querySelector(`[id="comment-${CSS.escape(focusComment)}"]`)
    if (target) { target.scrollIntoView({ block: 'center' }); target.classList.add('ring-2', 'ring-emerald-300', 'rounded-lg') }
  }, [focusComment, pending])
  async function accept(id: string) {
    if (acceptBusy.current) return
    acceptBusy.current = true
    try {
      const data = await communityRequest<{ thread: Thread }>(`/api/community/threads/${encodeURIComponent(threadId)}`, jsonUpdate(thread.acceptedCommentId === id ? { action: 'solve', solved: false } : { action: 'accept', commentId: id }))
      onThreadUpdate(data.thread)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Unable to accept answer.') }
    finally { acceptBusy.current = false }
  }
  async function submit(body: string, parentCommentId: string | null, isAnonymous = false) {
    const data = await communityRequest<{ comment: Comment }>(`/api/community/threads/${encodeURIComponent(threadId)}/comments`, jsonPost({ body, parentCommentId, isAnonymous }))
    setComments(old => merge(old, [data.comment])); setTotal(total + 1); onCountRef.current(total + 1)
  }
  return <section ref={sectionRef} aria-label="Discussion comments" className="border-t border-slate-100 pt-4">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold">Comments <span className="ml-1 font-normal text-slate-500">({total})</span>
      </h2>
      <label><span className="sr-only">Sort comments</span><select className="community-input !w-auto !py-1 text-xs" value={sort} onChange={e => setSort(e.target.value)}><option value="oldest">Oldest first</option><option value="new">Newest first</option><option value="top">Top comments</option></select></label>
    </div>
    {serverLocked || locked ? <p className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
      <LockKeyhole size={16} />This discussion is locked. You can still read the conversation.</p> : user ? <CommentForm draftKey={`community:${user.id}:comment:${threadId}`} label="Join the conversation" onSubmit={(body, isAnon) => submit(body, null, isAnon)} /> : <button type="button" className="mb-4 w-full rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4 text-sm text-emerald-800" onClick={requireAuth}>Log in or sign up to join the conversation</button>}
    {error && <div role="alert" className="my-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}<button type="button" className="community-action ml-2" onClick={() => void load(page + 1)}>Retry</button>
    </div>}
    <div className="space-y-4">{(childrenByParent.get(null) || []).map(comment => <CommentBranch key={comment.id} comment={comment} childrenByParent={childrenByParent} authorId={authorId} locked={serverLocked || locked} requireAuth={requireAuth} onReport={onReport} onVote={(id, value) => setComments(old => old.map(c => c.id === id ? { ...c, ...value } : c))} submit={submit} acceptedId={thread.acceptedCommentId} canAccept={user?.id === authorId && thread.postType === 'question'} onAccept={id => void accept(id)} onEdit={setEditing} onDelete={setDeleting} />)}</div>
    {!pending && !error && !comments.length && <div className="py-8 text-center text-slate-500">
      <MessageSquare className="mx-auto mb-2" size={24} />
      <p className="text-sm">No comments yet. Share the first helpful answer.</p>
    </div>}
    {pending && <p role="status" className="py-4 text-sm text-slate-500">Loading comments…</p>}
    {hasMore && !pending && <button type="button" className="community-action mt-4 border border-slate-200" onClick={() => void load(page + 1)}>Load more comments</button>}
    {editing && user && <EditCommentDialog key={editing.id} draftKey={`community:${user.id}:edit-comment:${editing.id}:${editing.editedAt || editing.createdAt}`} body={editing.body} onClose={() => setEditing(null)} onSave={async body => {
      const data = await communityRequest<{ comment: Partial<Comment> }>(`/api/community/comments/${encodeURIComponent(editing.id)}`, jsonUpdate({ body }))
      setComments(old => old.map(c => c.id === editing.id ? { ...c, ...data.comment } : c))
    }} />}
    <DeleteDialog open={!!deleting} onClose={() => setDeleting(null)} kind="comment" onDelete={async () => {
      if (!deleting) return
      const data = await communityRequest<{ comment: Partial<Comment> }>(`/api/community/comments/${encodeURIComponent(deleting.id)}`, { method: 'DELETE' })
      setComments(old => old.map(c => c.id === deleting.id ? { ...c, ...data.comment } : c))
      setTotal(Math.max(0, total - 1)); onCountRef.current(Math.max(0, total - 1))
      if (thread.acceptedCommentId === deleting.id) onThreadUpdate({ acceptedCommentId: null, solvedAt: null })
    }} />
  </section>
}

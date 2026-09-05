'use client'
import { useEffect, useState } from 'react'
import {
  ArrowBigDown,
  ArrowBigUp,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  MinusCircle,
  Plus,
  PlusCircle,
  Share2,
  ShieldAlert,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth-context'
import { renderCommunityMarkdown } from '@/lib/community-markdown'

type Category = { id: string; name: string; slug: string; description: string | null }
type Author = { id: string; name: string; avatar: string }
type Thread = {
  id: string
  title: string
  body: string
  createdAt: string
  locked: boolean
  score: number
  commentCount: number
  category: Category
  author: Author
  previewComments?: Comment[]
}
type Comment = {
  id: string
  body: string
  createdAt: string
  parentCommentId: string | null
  score: number
  author: Author
}

function timeAgo(value: string) {
  const diffMs = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.max(1, Math.floor(diffMs / 60_000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(days / 365)
  return `${years}y ago`
}

function CommentNode({
  comment,
  threadAuthorId,
  allComments,
  onVote,
  onReport,
  userVotes,
  activeReplyId,
  setActiveReplyId,
  onSubmitReply,
  currentUser,
  onRequireAuth,
  isChild = false,
}: {
  comment: Comment
  threadAuthorId: string
  allComments: Comment[]
  onVote: (id: string, value: number) => void
  onReport: (id: string) => void
  userVotes: Record<string, number>
  activeReplyId: string | null
  setActiveReplyId: (id: string | null) => void
  onSubmitReply: (parentId: string, content: string) => Promise<void>
  currentUser: any
  onRequireAuth: () => void
  isChild?: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const childComments = allComments.filter((c) => c.parentCommentId === comment.id)
  const isOP = comment.author?.id === threadAuthorId
  const isReplying = activeReplyId === comment.id
  const userVote = userVotes[comment.id] || 0

  return (
    <div className="relative group/node">
      {/* Curved elbow connector branching from parent's vertical line into this child's avatar */}
      {isChild && (
        <div
          className="absolute -left-3 sm:-left-6 top-0 w-3 sm:w-6 h-[15px] border-b-2 border-l-2 border-slate-200 rounded-bl-xl pointer-events-none"
          aria-hidden="true"
        />
      )}

      <div className="flex items-start gap-2.5 sm:gap-3">
        {/* Left Column: Avatar + Collapse Line */}
        <div className="flex flex-col items-center flex-shrink-0 self-stretch">
          {/* Avatar */}
          <div className="relative h-7 w-7 flex-shrink-0">
            <img
              src={comment.author?.avatar || '/avatars/boy_1.png'}
              alt={comment.author?.name || 'User'}
              className="h-7 w-7 rounded-full object-cover border border-slate-200 bg-slate-100 shadow-xs"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const fb = e.currentTarget.nextElementSibling as HTMLElement
                if (fb) fb.style.display = 'flex'
              }}
            />
            <div
              style={{ display: 'none' }}
              className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs items-center justify-center border border-emerald-200 shadow-xs"
            >
              {comment.author?.name ? comment.author.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>

          {/* Collapse icon and vertical thread line */}
          {!collapsed && (
            <div className="flex flex-col items-center flex-1 w-full mt-1 group/line">
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                title="Collapse thread"
                className="p-0.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none mb-1"
                aria-label="Collapse thread"
              >
                <MinusCircle className="w-3.5 h-3.5" />
              </button>
              {/* Vertical line running down */}
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                title="Collapse thread"
                className="w-0.5 flex-1 bg-slate-200 group-hover/line:bg-primary-green/70 transition-colors cursor-pointer rounded-full min-h-[22px]"
                aria-label="Collapse comment branch"
              />
            </div>
          )}
        </div>

        {/* Right Column: Header, Body, Actions, Inline reply, Nested Children */}
        <div className="flex-1 min-w-0 pb-3">
          {/* Header Row */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
            <span className="font-bold text-slate-900">{comment.author?.name || 'Anonymous'}</span>
            {isOP && (
              <span className="rounded bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 tracking-wide">
                OP
              </span>
            )}
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">{timeAgo(comment.createdAt)}</span>

            {/* If collapsed: show expand button */}
            {collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="inline-flex items-center gap-1 ml-2 text-xs font-semibold text-primary-green hover:underline focus:outline-none"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>
                  {childComments.length > 0
                    ? `${childComments.length} ${childComments.length === 1 ? 'reply' : 'replies'} collapsed`
                    : 'Show comment'}
                </span>
              </button>
            )}
          </div>

          {/* Uncollapsed Content */}
          {!collapsed && (
            <>
              {/* Body */}
              <div
                className="prose prose-sm max-w-none text-slate-800 mt-1 leading-relaxed break-words"
                dangerouslySetInnerHTML={{ __html: renderCommunityMarkdown(comment.body) }}
              />

              {/* Actions Row */}
              <div className="mt-2 flex items-center gap-1 text-xs">
                {/* Collapse icon at bottom action bar */}
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors mr-0.5"
                  title="Collapse"
                  aria-label="Collapse"
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                </button>

                {/* Vote buttons */}
                <button
                  type="button"
                  aria-label="Upvote"
                  onClick={() => onVote(comment.id, 1)}
                  className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                    userVote === 1 ? 'text-primary-green font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ArrowBigUp className={`w-4 h-4 ${userVote === 1 ? 'fill-primary-green' : ''}`} />
                </button>
                <span
                  className={`min-w-[18px] text-center font-bold text-xs ${
                    userVote === 1
                      ? 'text-primary-green'
                      : userVote === -1
                      ? 'text-red-500'
                      : 'text-slate-700'
                  }`}
                >
                  {comment.score}
                </span>
                <button
                  type="button"
                  aria-label="Downvote"
                  onClick={() => onVote(comment.id, -1)}
                  className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                    userVote === -1 ? 'text-red-500 font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ArrowBigDown className={`w-4 h-4 ${userVote === -1 ? 'fill-red-500' : ''}`} />
                </button>

                {/* Reply */}
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      onRequireAuth()
                      return
                    }
                    setActiveReplyId(isReplying ? null : comment.id)
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded font-semibold transition-colors ml-1 ${
                    isReplying
                      ? 'bg-emerald-50 text-primary-green'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Reply
                </button>

                {/* Report */}
                <button
                  type="button"
                  onClick={() => onReport(comment.id)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Report
                </button>
              </div>

              {/* Inline Reply Box */}
              {isReplying && (
                <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Replying to <strong className="text-slate-900">{comment.author?.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveReplyId(null)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                      aria-label="Cancel reply"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    autoFocus
                    className="w-full min-h-[80px] p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent resize-y"
                    placeholder={`What are your thoughts on ${comment.author?.name}'s comment?`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setActiveReplyId(null)
                        setReplyText('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      disabled={!replyText.trim() || isSubmitting}
                      onClick={async () => {
                        setIsSubmitting(true)
                        await onSubmitReply(comment.id, replyText)
                        setIsSubmitting(false)
                        setReplyText('')
                        setActiveReplyId(null)
                      }}
                    >
                      {isSubmitting ? 'Posting...' : 'Post reply'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Child Replies */}
              {childComments.length > 0 && (
                <div className="mt-3 space-y-3 pl-3 sm:pl-6 relative">
                  {childComments.map((child) => (
                    <CommentNode
                      key={child.id}
                      comment={child}
                      threadAuthorId={threadAuthorId}
                      allComments={allComments}
                      onVote={onVote}
                      onReport={onReport}
                      userVotes={userVotes}
                      activeReplyId={activeReplyId}
                      setActiveReplyId={setActiveReplyId}
                      onSubmitReply={onSubmitReply}
                      currentUser={currentUser}
                      onRequireAuth={onRequireAuth}
                      isChild={true}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CommunityClient() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<Thread[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [sort, setSort] = useState('hot')
  const [category, setCategory] = useState('')
  const [selected, setSelected] = useState<Thread | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [commentBody, setCommentBody] = useState('')
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
  const [userVotes, setUserVotes] = useState<Record<string, number>>({})

  // Feed inline comments state
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({})
  const [feedComments, setFeedComments] = useState<Record<string, Comment[]>>({})
  const [feedLoadingComments, setFeedLoadingComments] = useState<Record<string, boolean>>({})
  const [feedCommentInputs, setFeedCommentInputs] = useState<Record<string, string>>({})
  const [feedSubmitting, setFeedSubmitting] = useState<Record<string, boolean>>({})

  const [isLoading, setIsLoading] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  async function loadThreads() {
    setIsLoading(true)
    setLoadError('')

    try {
      const params = new URLSearchParams({ sort })
      if (category) params.set('category', category)

      const [threadsResponse, categoriesResponse] = await Promise.all([
        fetch(`/api/community/threads?${params}`, { cache: 'no-store' }),
        fetch('/api/community/categories', { cache: 'no-store' }),
      ])

      const threadsData = await threadsResponse.json()
      const categoriesData = await categoriesResponse.json()

      if (!threadsResponse.ok) {
        throw new Error(threadsData.error || 'Unable to load community threads.')
      }

      if (!categoriesResponse.ok) {
        throw new Error(
          categoriesData.error ||
            'Unable to load categories. The community database migration may not be applied.'
        )
      }

      const fetchedThreads: Thread[] = threadsData.threads || []
      setThreads(fetchedThreads)
      setCategories(categoriesData.categories || [])

      if (!categoryId && categoriesData.categories?.length > 0) {
        setCategoryId(categoriesData.categories[0].id)
      }

      // Check if URL has ?thread= param on initial load
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const threadIdFromUrl = urlParams.get('thread')
        if (threadIdFromUrl) {
          const match = fetchedThreads.find((t: Thread) => t.id === threadIdFromUrl)
          if (match) {
            void openThread(match, false)
          }
        }
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load the community.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadThreads()
  }, [sort, category])

  // Handle browser Back / Forward buttons
  useEffect(() => {
    function handlePopState() {
      const urlParams = new URLSearchParams(window.location.search)
      const threadIdFromUrl = urlParams.get('thread')
      if (!threadIdFromUrl) {
        setSelected(null)
      } else if (threads.length > 0) {
        const match = threads.find((t) => t.id === threadIdFromUrl)
        if (match) {
          setSelected(match)
          void fetchCommentsForThread(match.id)
        }
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [threads])

  async function fetchCommentsForThread(threadId: string) {
    try {
      const response = await fetch(`/api/community/threads/${threadId}/comments`, { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (err) {
      console.error('Failed to load thread comments:', err)
    }
  }

  async function openThread(thread: Thread, updateUrl = true) {
    setSelected(thread)
    setActiveReplyId(null)
    setCommentBody('')
    if (updateUrl && typeof window !== 'undefined') {
      window.history.pushState({}, '', `/community?thread=${thread.id}`)
    }
    await fetchCommentsForThread(thread.id)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handleBackToFeed() {
    setSelected(null)
    setActiveReplyId(null)
    setCommentBody('')
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/community')
    }
  }

  // Toggle inline comments on the main feed
  async function toggleFeedComments(threadId: string) {
    const isExpanded = !!expandedThreads[threadId]
    if (isExpanded) {
      setExpandedThreads((prev) => ({ ...prev, [threadId]: false }))
      return
    }

    setExpandedThreads((prev) => ({ ...prev, [threadId]: true }))

    if (!feedComments[threadId]) {
      setFeedLoadingComments((prev) => ({ ...prev, [threadId]: true }))
      try {
        const res = await fetch(`/api/community/threads/${threadId}/comments`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setFeedComments((prev) => ({ ...prev, [threadId]: data.comments || [] }))
        }
      } catch {
        toast.error('Failed to load comments.')
      } finally {
        setFeedLoadingComments((prev) => ({ ...prev, [threadId]: false }))
      }
    }
  }

  async function submitFeedComment(threadId: string, parentCommentId: string | null = null, text?: string) {
    const content = text !== undefined ? text : (feedCommentInputs[threadId] || '')
    if (!content.trim()) return
    if (!user) {
      toast.warning('Please log in to comment.')
      return
    }

    setFeedSubmitting((prev) => ({ ...prev, [threadId]: true }))
    try {
      const res = await fetch(`/api/community/threads/${threadId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: content.trim(), parentCommentId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Unable to add comment.')
        return
      }

      toast.success('Comment posted.')
      if (!parentCommentId) {
        setFeedCommentInputs((prev) => ({ ...prev, [threadId]: '' }))
      }
      const commentsRes = await fetch(`/api/community/threads/${threadId}/comments`, { cache: 'no-store' })
      if (commentsRes.ok) {
        const cData = await commentsRes.json()
        setFeedComments((prev) => ({ ...prev, [threadId]: cData.comments || [] }))
      }
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, commentCount: t.commentCount + 1 } : t))
      )
    } catch {
      toast.error('Failed to post comment. Please try again.')
    } finally {
      setFeedSubmitting((prev) => ({ ...prev, [threadId]: false }))
    }
  }

  async function createThread() {
    setFormError('')

    if (!categoryId) {
      setFormError('Choose a subject before publishing your thread.')
      return
    }

    if (title.trim().length < 5) {
      setFormError('Your title must be at least 5 characters.')
      return
    }

    if (body.trim().length < 10) {
      setFormError('Your post must be at least 10 characters.')
      return
    }

    setIsPublishing(true)

    try {
      const response = await fetch('/api/community/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, categoryId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setFormError(data.error || 'Unable to publish thread.')
        return
      }

      toast.success('Thread published.')
      setTitle('')
      setBody('')
      await loadThreads()
      if (data.thread) {
        void openThread(data.thread)
      }
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setIsPublishing(false)
    }
  }

  async function submitComment(targetParentId: string | null, content: string) {
    if (!selected || !content.trim()) return
    if (!user) {
      toast.warning('Please log in to comment.')
      return
    }

    try {
      const response = await fetch(`/api/community/threads/${selected.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: content.trim(), parentCommentId: targetParentId }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Unable to add comment.')
        return
      }

      toast.success('Comment posted.')
      await fetchCommentsForThread(selected.id)
      setThreads((prev) =>
        prev.map((t) => (t.id === selected.id ? { ...t, commentCount: t.commentCount + 1 } : t))
      )
    } catch {
      toast.error('Failed to post comment. Please try again.')
    }
  }

  async function handlePostMainComment() {
    if (!selected || !commentBody.trim()) return
    setIsSubmittingComment(true)
    await submitComment(null, commentBody)
    setCommentBody('')
    setIsSubmittingComment(false)
  }

  async function vote(targetType: 'thread' | 'comment', targetId: string, value: number) {
    if (!user) {
      toast.warning('Please log in to vote.')
      return
    }

    try {
      const response = await fetch('/api/community/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, value }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Unable to vote.')
        return
      }

      setUserVotes((prev) => ({ ...prev, [targetId]: value }))

      if (targetType === 'thread') {
        if (selected && selected.id === targetId) {
          setSelected({ ...selected, score: data.score })
        }
        setThreads((prev) =>
          prev.map((t) => (t.id === targetId ? { ...t, score: data.score } : t))
        )
      } else {
        // Update in detail view comments
        setComments((prev) =>
          prev.map((c) => (c.id === targetId ? { ...c, score: data.score } : c))
        )
        // Update in feed expanded comments
        setFeedComments((prev) => {
          const updated = { ...prev }
          for (const tId in updated) {
            updated[tId] = updated[tId].map((c) =>
              c.id === targetId ? { ...c, score: data.score } : c
            )
          }
          return updated
        })
        // Update in feed preview comments
        setThreads((prev) =>
          prev.map((t) => ({
            ...t,
            previewComments: t.previewComments?.map((c) =>
              c.id === targetId ? { ...c, score: data.score } : c
            ),
          }))
        )
      }
    } catch {
      toast.error('Failed to submit vote.')
    }
  }

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ targetType: 'thread' | 'comment'; targetId: string } | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)

  function openReportModal(targetType: 'thread' | 'comment', targetId: string) {
    if (!user) {
      toast.warning('Please log in to report.')
      return
    }
    setReportTarget({ targetType, targetId })
    setReportReason('')
    setReportModalOpen(true)
  }

  async function submitReport() {
    if (!reportTarget || !reportReason.trim()) return

    setIsSubmittingReport(true)
    try {
      const response = await fetch('/api/community/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: reportTarget.targetType,
          targetId: reportTarget.targetId,
          reason: reportReason.trim(),
        }),
      })

      const data = await response.json()
      if (response.ok) {
        toast.success('Report sent to moderators.')
        setReportModalOpen(false)
        setReportReason('')
        setReportTarget(null)
      } else {
        toast.error(data.error || 'Unable to send report.')
      }
    } catch {
      toast.error('Failed to send report.')
    } finally {
      setIsSubmittingReport(false)
    }
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background-light pb-16">
        <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
          {/* Header Banner */}
          <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary-green">
                Preptio Community
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl md:text-4xl font-bold text-text-dark">
                {selected ? selected.category.name : 'Study together. Get exam-ready.'}
              </h1>
              <p className="mt-1 max-w-2xl text-text-light text-xs sm:text-base">
                {selected
                  ? selected.category.description || 'Discuss CA Foundation topics with fellow students across Pakistan.'
                  : 'Ask questions, compare approaches, and learn with CA Foundation students across Pakistan.'}
              </p>
            </div>

            {/* Filter controls only shown on feed */}
            {!selected && (
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <select
                  className="h-10 flex-1 sm:flex-none rounded-md border border-border bg-white px-3 text-xs sm:text-sm min-w-[100px]"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="hot">Hot</option>
                  <option value="new">New</option>
                  <option value="top">Top</option>
                </select>
                <select
                  className="h-10 flex-1 sm:flex-none rounded-md border border-border bg-white px-3 text-xs sm:text-sm min-w-[130px]"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="">All subjects</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </header>

          {loadError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>
                <strong>Community unavailable</strong>
              </p>
              <p className="mt-1">{loadError}</p>
            </div>
          )}

          {isLoading && !loadError && (
            <div className="mb-6 rounded-lg border border-border bg-white p-4 text-sm text-text-light">
              Loading community discussions...
            </div>
          )}

          {/* Main 2-Column Layout */}
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Left Column: Feed OR In-Page Thread Detail */}
            <div className="min-w-0">
              {selected ? (
                /* REDDIT-STYLE IN-PAGE THREAD & COMMENTS VIEW (NO MODAL) */
                <div className="space-y-4">
                  {/* Back Navigation Button */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handleBackToFeed}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-primary-green transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-200/60 bg-white border border-border shadow-xs"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to all discussions</span>
                    </button>
                    <span className="text-xs text-slate-400">
                      {selected.category.name}
                    </span>
                  </div>

                  {/* Thread Main Article Card */}
                  <article className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
                    {/* Top Row: Category badge & Author metadata */}
                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-primary-green border border-emerald-200">
                        {selected.category.name}
                      </span>
                      <span>•</span>
                      <div className="flex items-center gap-1.5">
                        <div className="relative h-5 w-5 rounded-full overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
                          <img
                            src={selected.author?.avatar || '/avatars/boy_1.png'}
                            alt={selected.author?.name || 'User'}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="font-semibold text-slate-800">{selected.author.name}</span>
                      </div>
                      <span>•</span>
                      <span>{timeAgo(selected.createdAt)}</span>
                    </div>

                    {/* Thread Title */}
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug mt-3">
                      {selected.title}
                    </h1>

                    {/* Thread Body / Discussion */}
                    <div
                      className="prose prose-slate max-w-none text-slate-800 text-base leading-relaxed mt-4"
                      dangerouslySetInnerHTML={{ __html: renderCommunityMarkdown(selected.body) }}
                    />

                    {/* Action Pills Bar (Reddit-style) */}
                    <div className="mt-6 flex flex-wrap items-center gap-2 border-y border-slate-100 py-3">
                      {/* Vote Pill */}
                      <div className="flex items-center rounded-full bg-slate-100 border border-slate-200/80 px-1 py-0.5">
                        <button
                          type="button"
                          aria-label="Upvote post"
                          onClick={() => void vote('thread', selected.id, 1)}
                          className={`p-1 rounded-full hover:bg-slate-200/70 transition-colors ${
                            userVotes[selected.id] === 1
                              ? 'text-primary-green'
                              : 'text-slate-600 hover:text-primary-green'
                          }`}
                        >
                          <ArrowBigUp
                            className={`w-5 h-5 ${userVotes[selected.id] === 1 ? 'fill-primary-green' : ''}`}
                          />
                        </button>
                        <span
                          className={`px-2 text-xs font-bold ${
                            userVotes[selected.id] === 1
                              ? 'text-primary-green'
                              : userVotes[selected.id] === -1
                              ? 'text-red-500'
                              : 'text-slate-800'
                          }`}
                        >
                          {selected.score}
                        </span>
                        <button
                          type="button"
                          aria-label="Downvote post"
                          onClick={() => void vote('thread', selected.id, -1)}
                          className={`p-1 rounded-full hover:bg-slate-200/70 transition-colors ${
                            userVotes[selected.id] === -1
                              ? 'text-red-500'
                              : 'text-slate-600 hover:text-red-500'
                          }`}
                        >
                          <ArrowBigDown
                            className={`w-5 h-5 ${userVotes[selected.id] === -1 ? 'fill-red-500' : ''}`}
                          />
                        </button>
                      </div>

                      {/* Comment Count Pill */}
                      <div className="flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200/80 px-3.5 py-1.5 text-xs font-semibold text-slate-700">
                        <MessageSquare className="w-4 h-4 text-slate-500" />
                        <span>
                          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                        </span>
                      </div>

                      {/* Share Pill */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            void navigator.clipboard.writeText(window.location.href)
                            toast.success('Thread link copied to clipboard!')
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200/80 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 hover:text-slate-800 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Share</span>
                      </button>

                      {/* Report Pill */}
                      <button
                        type="button"
                        onClick={() => openReportModal('thread', selected.id)}
                        className="flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200/80 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 hover:text-slate-800 transition-colors ml-auto"
                      >
                        <ShieldAlert className="w-4 h-4 text-slate-500" />
                        <span>Report</span>
                      </button>
                    </div>

                    {/* Main Comment Composer ("Join the conversation" box directly under discussion) */}
                    {user && !selected.locked ? (
                      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-slate-600">
                          <span>
                            Comment as <strong className="text-slate-900">{user.name || user.email}</strong>
                          </span>
                        </div>
                        <textarea
                          className="min-h-24 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent transition-all placeholder:text-slate-400 resize-y"
                          placeholder="What are your thoughts? Markdown supported (**bold**, *italic*, `code`)..."
                          value={commentBody}
                          onChange={(event) => setCommentBody(event.target.value)}
                        />
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-xs text-slate-400">Remember community guidelines</p>
                          <Button
                            disabled={!commentBody.trim() || isSubmittingComment}
                            onClick={() => void handlePostMainComment()}
                          >
                            {isSubmittingComment ? 'Posting...' : 'Comment'}
                          </Button>
                        </div>
                      </div>
                    ) : selected.locked ? (
                      <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-sm text-amber-800 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>This discussion is locked. New comments cannot be posted.</span>
                      </div>
                    ) : (
                      <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-4 text-center">
                        <p className="text-sm text-slate-600">
                          <a href="/auth/login?returnTo=/community" className="font-semibold text-primary-green hover:underline">
                            Log in
                          </a>{' '}
                          to join the conversation.
                        </p>
                      </div>
                    )}

                    {/* Reddit-style Nested Comments Feed directly under the discussion */}
                    <div className="mt-8">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900 text-lg">
                          Comments ({comments.length})
                        </h3>
                      </div>

                      {comments.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                          <p className="font-medium text-slate-600">No comments yet</p>
                          <p className="text-xs mt-1 text-slate-400">
                            Be the first to share your thoughts on this discussion!
                          </p>
                        </div>
                      ) : (
                        <div className="mt-6 space-y-6">
                          {comments
                            .filter((c) => !c.parentCommentId)
                            .map((topLevelComment) => (
                              <CommentNode
                                key={topLevelComment.id}
                                comment={topLevelComment}
                                threadAuthorId={selected.author.id}
                                allComments={comments}
                                onVote={(id, val) => void vote('comment', id, val)}
                                onReport={(id) => openReportModal('comment', id)}
                                userVotes={userVotes}
                                activeReplyId={activeReplyId}
                                setActiveReplyId={setActiveReplyId}
                                onSubmitReply={submitComment}
                                currentUser={user}
                                onRequireAuth={() => toast.warning('Please log in to reply.')}
                                isChild={false}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  </article>
                </div>
              ) : (
                /* THREADS FEED */
                <section className="space-y-4">
                  {threads.map((thread) => {
                    const isExpanded = !!expandedThreads[thread.id]
                    const threadCommentList = feedComments[thread.id] || []
                    const isLoadingThisThreadComments = !!feedLoadingComments[thread.id]

                    return (
                      <article
                        key={thread.id}
                        className="rounded-xl border border-border bg-white p-3.5 sm:p-5 shadow-sm hover:border-slate-300 transition-colors overflow-hidden"
                      >
                        <div className="flex gap-2.5 sm:gap-4">
                          {/* Left votes counter */}
                          <div className="flex w-9 sm:w-12 flex-col items-center text-xs sm:text-sm pt-1 flex-shrink-0">
                            <button
                              type="button"
                              aria-label="Upvote thread"
                              onClick={() => void vote('thread', thread.id, 1)}
                              className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                                userVotes[thread.id] === 1 ? 'text-primary-green' : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <ArrowBigUp
                                className={`w-5 h-5 ${userVotes[thread.id] === 1 ? 'fill-primary-green' : ''}`}
                              />
                            </button>
                            <span
                              className={`font-bold my-0.5 ${
                                userVotes[thread.id] === 1
                                  ? 'text-primary-green'
                                  : userVotes[thread.id] === -1
                                  ? 'text-red-500'
                                  : 'text-text-dark'
                              }`}
                            >
                              {thread.score}
                            </span>
                            <button
                              type="button"
                              aria-label="Downvote thread"
                              onClick={() => void vote('thread', thread.id, -1)}
                              className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                                userVotes[thread.id] === -1 ? 'text-red-500' : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <ArrowBigDown
                                className={`w-5 h-5 ${userVotes[thread.id] === -1 ? 'fill-red-500' : ''}`}
                              />
                            </button>
                            <span className="text-[11px] text-text-light mt-0.5">votes</span>
                          </div>

                          {/* Right Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap text-xs text-text-light mb-1">
                              <span className="inline-flex items-center font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-primary-green border border-emerald-200 text-[11px]">
                                {thread.category.name}
                              </span>
                              <span>•</span>
                              <div className="flex items-center gap-1.5">
                                <div className="relative h-4 w-4 rounded-full overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
                                  <img
                                    src={thread.author?.avatar || '/avatars/boy_1.png'}
                                    alt={thread.author?.name || 'User'}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <span className="font-semibold text-slate-700">{thread.author.name}</span>
                              </div>
                              <span>•</span>
                              <span>{timeAgo(thread.createdAt)}</span>
                            </div>

                            {/* Click title to open full thread view */}
                            <button
                              className="text-left text-lg font-semibold text-text-dark hover:text-primary-green transition-colors block"
                              onClick={() => void openThread(thread)}
                            >
                              {thread.title}
                            </button>

                            {/* Body snippet */}
                            <div
                              className="prose prose-sm mt-2 line-clamp-3 max-w-none text-text-light"
                              dangerouslySetInnerHTML={{ __html: renderCommunityMarkdown(thread.body) }}
                            />

                            {/* Card action row */}
                            <div className="mt-3 flex items-center gap-2 text-xs text-text-light flex-wrap">
                              {/* Inline comments toggle button */}
                              <Button
                                variant={isExpanded ? 'secondary' : 'ghost'}
                                size="sm"
                                type="button"
                                onClick={() => void toggleFeedComments(thread.id)}
                                className={`font-semibold ${isExpanded ? 'bg-slate-100 text-slate-900' : ''}`}
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>
                                  {isExpanded
                                    ? 'Hide comments'
                                    : `${thread.commentCount} comments`}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => openReportModal('thread', thread.id)}
                              >
                                <ShieldAlert className="w-3.5 h-3.5" /> Report
                              </Button>

                              <button
                                type="button"
                                onClick={() => void openThread(thread)}
                                className="ml-auto text-xs text-slate-400 hover:text-primary-green transition-colors font-medium"
                              >
                                Full view →
                              </button>
                            </div>

                            {/* Condensed preview of top 1-2 comments when NOT expanded */}
                            {!isExpanded && thread.previewComments && thread.previewComments.length > 0 && (
                              <div className="mt-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 p-3 space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                                  <span className="uppercase tracking-wider text-[10px] text-slate-400 font-bold">
                                    Top comment{thread.previewComments.length > 1 ? 's' : ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => void toggleFeedComments(thread.id)}
                                    className="inline-flex items-center gap-1 text-primary-green hover:underline font-semibold text-xs"
                                  >
                                    <span>View all {thread.commentCount} comments</span>
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>

                                <div className="space-y-1.5">
                                  {thread.previewComments.map((preview) => (
                                    <div
                                      key={preview.id}
                                      className="text-xs bg-white rounded-lg p-2.5 border border-slate-100 shadow-xs"
                                    >
                                      <div className="flex items-center justify-between gap-2 text-slate-500 mb-1">
                                        <div className="flex items-center gap-1.5">
                                          <div className="relative h-4 w-4 rounded-full overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
                                            <img
                                              src={preview.author?.avatar || '/avatars/boy_1.png'}
                                              alt={preview.author?.name || 'User'}
                                              className="h-full w-full object-cover"
                                            />
                                          </div>
                                          <strong className="text-slate-800 font-semibold">{preview.author?.name}</strong>
                                          {preview.author?.id === thread.author.id && (
                                            <span className="rounded bg-blue-100 text-blue-700 text-[9px] font-bold px-1 py-0.2">
                                              OP
                                            </span>
                                          )}
                                          <span>• {timeAgo(preview.createdAt)}</span>
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-600">
                                          {preview.score} {preview.score === 1 ? 'vote' : 'votes'}
                                        </span>
                                      </div>
                                      <p className="text-slate-700 line-clamp-2 leading-relaxed">
                                        {preview.body}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Full Inline Expanded Comments Section */}
                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
                                {/* Header */}
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span className="font-bold text-slate-900 text-sm">
                                    Discussion ({thread.commentCount})
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => void openThread(thread)}
                                      className="text-primary-green hover:underline font-semibold"
                                    >
                                      Open full thread →
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void toggleFeedComments(thread.id)}
                                      className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-semibold"
                                    >
                                      <span>Hide</span>
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Inline Comment Composer right on the feed card */}
                                {user && !thread.locked ? (
                                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                                    <textarea
                                      className="w-full min-h-[70px] p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent resize-y"
                                      placeholder="Write a comment..."
                                      value={feedCommentInputs[thread.id] || ''}
                                      onChange={(e) =>
                                        setFeedCommentInputs((prev) => ({
                                          ...prev,
                                          [thread.id]: e.target.value,
                                        }))
                                      }
                                    />
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] text-slate-400">Markdown supported</span>
                                      <Button
                                        size="sm"
                                        type="button"
                                        disabled={
                                          !(feedCommentInputs[thread.id] || '').trim() ||
                                          feedSubmitting[thread.id]
                                        }
                                        onClick={() => void submitFeedComment(thread.id)}
                                      >
                                        {feedSubmitting[thread.id] ? 'Posting...' : 'Post comment'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : thread.locked ? (
                                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                                    This thread is locked.
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                                    <a href="/auth/login?returnTo=/community" className="font-semibold text-primary-green hover:underline">
                                      Log in
                                    </a>{' '}
                                    to join the conversation.
                                  </p>
                                )}

                                {/* Inline Nested Comment Tree */}
                                {isLoadingThisThreadComments ? (
                                  <div className="py-6 text-center text-xs text-slate-400">
                                    Loading comments...
                                  </div>
                                ) : threadCommentList.length === 0 ? (
                                  <div className="py-6 text-center text-xs text-slate-400">
                                    No comments yet. Be the first to share your thoughts!
                                  </div>
                                ) : (
                                  <div className="space-y-4 pt-1">
                                    {threadCommentList
                                      .filter((c) => !c.parentCommentId)
                                      .map((topLevel) => (
                                        <CommentNode
                                          key={topLevel.id}
                                          comment={topLevel}
                                          threadAuthorId={thread.author.id}
                                          allComments={threadCommentList}
                                          onVote={(id, val) => void vote('comment', id, val)}
                                          onReport={(id) => openReportModal('comment', id)}
                                          userVotes={userVotes}
                                          activeReplyId={activeReplyId}
                                          setActiveReplyId={setActiveReplyId}
                                          onSubmitReply={async (parentId, text) => {
                                            await submitFeedComment(thread.id, parentId, text)
                                          }}
                                          currentUser={user}
                                          onRequireAuth={() => toast.warning('Please log in to reply.')}
                                          isChild={false}
                                        />
                                      ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  })}

                  {threads.length === 0 && !isLoading && (
                    <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-text-light">
                      No threads yet. Start the first subject discussion.
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Right Sidebar */}
            <aside className="space-y-4">
              {/* If on a selected thread, show About This Discussion box */}
              {selected && (
                <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-text-dark">About this subject</h2>
                  <p className="mt-2 text-sm text-text-light leading-relaxed">
                    {selected.category.description ||
                      'Join the discussion, ask questions, and share study techniques with other students.'}
                  </p>
                  <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Posted by:</span>
                      <strong className="text-slate-800">{selected.author.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>{timeAgo(selected.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Comments:</span>
                      <span>{comments.length}</span>
                    </div>
                  </div>
                </section>
              )}

              {/* Start a discussion box */}
              <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-text-dark">Start a discussion</h2>
                {user ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label
                        className="block text-sm font-medium text-text-dark"
                        htmlFor="community-category"
                      >
                        Subject
                      </label>
                      <select
                        id="community-category"
                        className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
                        value={categoryId}
                        onChange={(event) => setCategoryId(event.target.value)}
                        disabled={isLoading || categories.length === 0}
                      >
                        {categories.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      {categories.length === 0 && !isLoading && (
                        <p className="mt-1 text-xs text-amber-700">
                          No subjects are available. Apply the community database migration.
                        </p>
                      )}
                    </div>
                    <input
                      className="h-10 w-full rounded-md border border-border px-3 text-sm"
                      placeholder="Title of your question or idea"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                    <textarea
                      className="min-h-28 w-full rounded-md border border-border p-3 text-sm"
                      placeholder="Explain your question or idea... Markdown supported."
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                    />
                    {formError && <p className="text-xs text-red-600">{formError}</p>}
                    <Button
                      className="w-full"
                      onClick={() => void createThread()}
                      disabled={
                        isPublishing || isLoading || categories.length === 0 || !categoryId
                      }
                    >
                      <Plus />
                      {isPublishing ? 'Publishing...' : 'Publish thread'}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-text-light">
                      <a href="/auth/login?returnTo=/community" className="font-semibold text-primary-green hover:underline">
                        Log in
                      </a>{' '}
                      to create threads, comment, and vote.
                    </p>
                    <p className="text-xs text-text-light">
                      New here?{' '}
                      <a href="/auth/signup" className="font-semibold text-primary-green hover:underline">
                        Sign up for free
                      </a>
                    </p>
                  </div>
                )}
              </section>

              {/* Subjects List */}
              <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-text-dark">Subjects</h2>
                <div className="mt-3 space-y-2">
                  {categories.map((item) => (
                    <button
                      key={item.id}
                      className={`block text-left text-sm transition-colors ${
                        category === item.slug
                          ? 'font-bold text-primary-green'
                          : 'text-text-light hover:text-primary-green'
                      }`}
                      onClick={() => {
                        setCategory(item.slug)
                        if (selected) {
                          handleBackToFeed()
                        }
                      }}
                    >
                      {item.name}
                    </button>
                  ))}
                  {category && (
                    <button
                      className="block text-xs font-semibold text-slate-500 hover:text-slate-800 pt-2 border-t border-border"
                      onClick={() => setCategory('')}
                    >
                      Show all subjects
                    </button>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>

      {/* Custom Preptio Report Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Report {reportTarget?.targetType === 'thread' ? 'Discussion' : 'Comment'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Help keep Preptio safe and friendly. Please state why you are reporting this.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Reason for report <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full min-h-[110px] rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green focus:bg-white focus:border-transparent transition-all placeholder:text-slate-400 resize-y"
              placeholder="Provide details about why this content is inappropriate (e.g. spam, harassment, offensive language)..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter className="mt-5 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReportModalOpen(false)}
              disabled={isSubmittingReport}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!reportReason.trim() || isSubmittingReport}
              onClick={() => void submitReport()}
              className="bg-primary-green text-white hover:bg-emerald-600 font-semibold"
            >
              {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
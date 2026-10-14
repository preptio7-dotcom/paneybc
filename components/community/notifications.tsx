'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { communityRequest, jsonUpdate, timeAgo } from './types'

type Notice = { id: string; kind: string; readAt: string | null; createdAt: string; commentId: string; actor: { name: string }; thread: { id: string; title: string } }
type Preferences = { replies: boolean; followed: boolean }

export function CommunityNotifications({ onOpenThread }: { onOpenThread: (id: string, commentId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [notices, setNotices] = useState<Notice[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [saving, setSaving] = useState(false)
  const generation = useRef(0)
  const refresh = useCallback(async (nextPage = 1) => {
    const request = ++generation.current
    setPending(true); setError('')
    try {
      const data = await communityRequest<{ notifications: Notice[]; unread: number; hasMore: boolean }>(`/api/community/notifications?page=${nextPage}&unread=${onlyUnread}`)
      if (request !== generation.current) return
      setNotices(data.notifications); setUnread(data.unread); setHasMore(data.hasMore); setPage(nextPage)
    } catch (err) { if (request === generation.current) setError(err instanceof Error ? err.message : 'Unable to load notifications.') }
    finally { if (request === generation.current) setPending(false) }
  }, [onlyUnread])
  useEffect(() => {
    void refresh()
    const tick = () => { if (!document.hidden) void refresh() }
    // Keep pagination stable while the inbox is open.
    const timer = !open ? window.setInterval(tick, 60000) : undefined
    if (!open) window.addEventListener('focus', tick)
    return () => { generation.current++; window.clearInterval(timer); window.removeEventListener('focus', tick) }
  }, [refresh, open])
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    communityRequest<{ preferences: Preferences }>('/api/community/preferences', { signal: controller.signal })
      .then(data => setPreferences(data.preferences)).catch(err => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [open])
  async function markRead(notice?: Notice) {
    if (saving) return
    setSaving(true); setError('')
    try {
      await communityRequest('/api/community/notifications', jsonUpdate(notice ? { ids: [notice.id] } : { all: true }))
      if (notice) { setOpen(false); onOpenThread(notice.thread.id, notice.commentId) }
      else await refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update notifications.') }
    finally { setSaving(false) }
  }
  async function savePreferences(next: Preferences) {
    setSaving(true); setError('')
    try { await communityRequest('/api/community/preferences', jsonUpdate(next, 'PUT')); setPreferences(next) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to save preferences.') }
    finally { setSaving(false) }
  }
  return <>
    <button className="community-action border border-slate-200 bg-white" onClick={() => setOpen(true)} aria-label={`Community notifications${unread ? `, ${unread} unread` : ''}`}><Bell size={17} />Notifications{unread > 0 && <span className="rounded-full bg-emerald-700 px-1.5 text-xs text-white">{unread > 99 ? '99+' : unread}</span>}</button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent overlayClassName="z-[1100]" className="community-dialog sm:max-w-xl">
      <DialogHeader><DialogTitle>Community notifications</DialogTitle><DialogDescription>Replies, activity in followed discussions, and accepted answers.</DialogDescription></DialogHeader>
      <div className="flex flex-wrap justify-between gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyUnread} onChange={e => setOnlyUnread(e.target.checked)} />Unread only</label><button className="community-action" disabled={saving || !unread} onClick={() => void markRead()}>Mark all as read</button></div>
      {error && <div role="alert" className="text-sm text-red-700">{error}<button className="community-action" onClick={() => void refresh()}>Retry</button></div>}
      {pending ? <p role="status" className="py-6 text-center text-sm text-slate-500">Loading notifications…</p> : <div className="space-y-2">{notices.map(notice => <button key={notice.id} disabled={saving} onClick={() => void markRead(notice)} className={`w-full rounded-xl border p-3 text-left text-sm ${notice.readAt ? 'border-slate-100' : 'border-emerald-100 bg-emerald-50'}`}><span className="font-semibold">{notice.actor.name}</span>{notice.kind === 'accepted_answer' ? ' accepted your answer' : notice.kind === 'reply' ? ' replied to your comment' : ' commented on a discussion'}<span className="mt-1 block font-medium">{notice.thread.title}</span><span className="mt-1 block text-xs text-slate-500">{timeAgo(notice.createdAt)}{!notice.readAt && ' · Unread'}</span></button>)}{!notices.length && <p className="py-6 text-center text-sm text-slate-500">{onlyUnread ? 'You’re all caught up.' : 'No notifications yet. Follow a discussion to hear when someone comments.'}</p>}</div>}
      {(page > 1 || hasMore) && <div className="flex justify-between"><button className="community-action" disabled={pending || page === 1} onClick={() => void refresh(page - 1)}>Previous</button><span className="self-center text-xs">Page {page}</span><button className="community-action" disabled={pending || !hasMore} onClick={() => void refresh(page + 1)}>Next</button></div>}
      <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer text-sm font-semibold">Notification preferences</summary>{preferences && <div className="mt-3 space-y-3 text-sm"><label className="flex items-start gap-2"><input type="checkbox" checked={preferences.replies} disabled={saving} onChange={e => void savePreferences({ ...preferences, replies: e.target.checked })} />Replies to me, comments on my posts, and accepted answers</label><label className="flex items-start gap-2"><input type="checkbox" checked={preferences.followed} disabled={saving} onChange={e => void savePreferences({ ...preferences, followed: e.target.checked })} />New comments in discussions I follow</label><p className="text-xs text-slate-500">These settings affect future community notifications. Existing notifications remain in your inbox.</p></div>}</details>
    </DialogContent></Dialog>
  </>
}

'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { postTypes, postLabels, type PostType } from '@/lib/community-options'
import { authHref } from '@/lib/auth-redirect'
import { useDraft } from './use-draft'
import { Markdown } from './markdown'
import { communityRequest, jsonPost, jsonUpdate, type Category, type Target, type Thread } from './types'

export function AuthDialog({ open, onOpenChange, destination }: { open: boolean; onOpenChange: (value: boolean) => void; destination: string }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent overlayClassName="z-[1100]" className="community-dialog">
      <DialogHeader>
        <DialogTitle>Join the Preptio conversation</DialogTitle>
        <DialogDescription>Log in to create discussions, comment, and vote. We’ll bring you back to this page.</DialogDescription>
      </DialogHeader>
      <Link className="community-primary" href={authHref('login', destination)}>Log in</Link>
      <p className="text-center text-sm text-slate-600">New here? <Link className="font-semibold text-emerald-700 underline" href={authHref('signup', destination)}>Sign up for free</Link>
      </p>
    </DialogContent>
  </Dialog>
}

export function Composer({ open, onOpenChange, categories, defaultCategory, userId, onPublished, editing }: {
  editing?: Thread; open: boolean; onOpenChange: (value: boolean) => void; categories: Category[]; defaultCategory: string; userId: string; onPublished: (thread: Thread) => void
}) {
  const [draft, setDraft] = useDraft(`community:${userId}:${editing ? `edit:${editing.id}:${editing.editedAt || editing.createdAt}` : 'post'}`, { title: editing?.title || '', body: editing?.body || '', categoryId: editing?.category.id || '', postType: (editing?.postType || 'question') as PostType })
  const [preview, setPreview] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const categoryId = draft.categoryId || categories.find(c => c.slug === defaultCategory)?.id || ''
  return <Dialog open={open} onOpenChange={value => { if (!pending) onOpenChange(value) }}>
    <DialogContent overlayClassName="z-[1100]" className="community-dialog sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit discussion' : 'Start a discussion'}</DialogTitle>
        <DialogDescription>Ask a clear question, share your working, or help someone prepare.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={async e => {
        e.preventDefault(); if (busy.current) return
        busy.current = true; setPending(true); setError('')
        try {
          const data = await communityRequest<{ thread: Thread }>(editing ? `/api/community/threads/${encodeURIComponent(editing.id)}` : '/api/community/threads', (editing ? jsonUpdate : jsonPost)({ ...draft, postType: draft.postType || 'question', categoryId, ...(editing ? { action: 'edit' } : {}) }))
          if (!editing) setDraft({ title: '', body: '', categoryId: '', postType: 'question' }); setPreview(false); onPublished(data.thread); onOpenChange(false)
        } catch (err) { setError(err instanceof Error ? err.message : 'Unable to publish. Your draft has been kept.') }
        finally { busy.current = false; setPending(false) }
      }}>
        <div>
          <label htmlFor="post-subject" className="mb-1.5 block text-sm font-semibold">Subject</label>
          <select id="post-subject" required disabled={pending} className="community-input" value={categoryId} onChange={e => setDraft({ ...draft, categoryId: e.target.value })}>
            <option value="">Choose a subject</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>
        <div>
          <label htmlFor="post-type" className="mb-1.5 block text-sm font-semibold">Post label</label>
          <select id="post-type" className="community-input" value={draft.postType || 'question'} disabled={pending} onChange={e => setDraft({ ...draft, postType: e.target.value as PostType })}>{postTypes.map(type => <option key={type} value={type}>{postLabels[type]}</option>)}</select>
          {editing?.solvedAt && draft.postType !== 'question' && <p className="mt-1 text-xs text-amber-800">Changing the label clears the solved status and accepted answer.</p>}
        </div>
        <div>
          <label htmlFor="post-title" className="mb-1.5 block text-sm font-semibold">Title</label>
          <input id="post-title" className="community-input" placeholder="What would you like to discuss?" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} minLength={5} maxLength={160} required disabled={pending} />
          <p className="mt-1 text-right text-xs text-slate-500">{draft.title.length}/160</p>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="post-body" className="text-sm font-semibold">Your post</label>
            <button type="button" className="community-action" aria-pressed={preview} onClick={() => setPreview(!preview)}>{preview ? 'Edit' : 'Preview'}</button>
          </div>
          {preview ? <div className="min-h-40 rounded-xl border border-slate-200 p-3">
            <Markdown body={draft.body || 'Nothing to preview yet.'} />
          </div> : <textarea id="post-body" className="community-input min-h-44 resize-y" placeholder="Add context and explain what you’ve tried…" value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} minLength={10} maxLength={10000} required disabled={pending} />}
          <p className="mt-1 text-xs text-slate-500">Markdown: **bold**, *italic*, lists, links, and code. {draft.body.length.toLocaleString()}/10,000</p>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">Draft saved in this browser tab</p>
          <button type="submit" disabled={pending || !categoryId || draft.title.trim().length < 5 || draft.body.trim().length < 10} className="community-primary">{pending ? 'Publishing…' : 'Publish discussion'}</button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
}

export function ReportDialog({ target, onClose }: { target: Target | null; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  return <Dialog open={!!target} onOpenChange={value => { if (!value && !pending) { onClose(); setReason(''); setError(''); setSent(false) } }}>
    <DialogContent overlayClassName="z-[1100]" className="community-dialog">
      <DialogHeader>
        <DialogTitle>{sent ? 'Report received' : 'Report content'}</DialogTitle>
        <DialogDescription>{sent ? 'Thank you. A moderator can now review this content.' : 'Tell the moderators what needs attention. Reports are not shown publicly.'}</DialogDescription>
      </DialogHeader>
      {sent ? <button type="button" className="community-primary" onClick={() => { onClose(); setReason(''); setSent(false) }}>Done</button> : <form onSubmit={async e => { e.preventDefault(); if (!target || pending) return; setPending(true); setError(''); try { await communityRequest('/api/community/report', jsonPost({ ...target, reason })); setSent(true) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to submit report.') } finally { setPending(false) } }} className="space-y-3">
        <label htmlFor="report-reason" className="block text-sm font-semibold">Reason for reporting</label>
        <textarea id="report-reason" className="community-input" rows={4} value={reason} onChange={e => setReason(e.target.value)} required maxLength={1000} disabled={pending} placeholder="Spam, harassment, misleading content, or another concern…" />{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button type="submit" className="community-primary" disabled={pending || !reason.trim()}>{pending ? 'Submitting…' : 'Submit report'}</button>
      </form>}
    </DialogContent>
  </Dialog>
}

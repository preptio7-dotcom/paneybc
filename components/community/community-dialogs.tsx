'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { Camera, Loader2, EyeOff } from 'lucide-react'
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
  const [draft, setDraft] = useDraft(`community:${userId}:${editing ? `edit:${editing.id}:${editing.editedAt || editing.createdAt}` : 'post'}`, { title: editing?.title || '', body: editing?.body || '', categoryId: editing?.category.id || '', postType: (editing?.postType || 'question') as PostType, isAnonymous: false })
  const [preview, setPreview] = useState(false)
  const [pending, setPending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const categoryId = draft.categoryId || categories.find(c => c.slug === defaultCategory)?.id || ''

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
      setDraft({ ...draft, body: (draft.body || '').trimEnd() + imageSnippet })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image.')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

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
          const data = await communityRequest<{ thread: Thread }>(editing ? `/api/community/threads/${encodeURIComponent(editing.id)}` : '/api/community/threads', (editing ? jsonUpdate : jsonPost)({ ...draft, postType: draft.postType || 'question', categoryId, ...(editing ? { action: 'edit' } : { isAnonymous: draft.isAnonymous }) }))
          if (!editing) setDraft({ title: '', body: '', categoryId: '', postType: 'question', isAnonymous: false }); setPreview(false); onPublished(data.thread); onOpenChange(false)
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
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={pending || uploadingImage} />
              <button
                type="button"
                disabled={pending || uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100/80 disabled:opacity-50"
                title="Upload screenshot from device or take photo with camera"
              >
                {uploadingImage ? <Loader2 className="animate-spin" size={13} /> : <Camera size={13} />}
                {uploadingImage ? 'Uploading…' : 'Add image / photo'}
              </button>
              <button type="button" className="community-action" aria-pressed={preview} onClick={() => setPreview(!preview)}>{preview ? 'Edit' : 'Preview'}</button>
            </div>
          </div>
          {preview ? <div className="min-h-40 rounded-xl border border-slate-200 p-3">
            <Markdown body={draft.body || 'Nothing to preview yet.'} />
          </div> : <textarea id="post-body" className="community-input min-h-44 resize-y" placeholder="Add context and explain what you’ve tried…" value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} minLength={10} maxLength={10000} required disabled={pending} />}
          <p className="mt-1 text-xs text-slate-500">Markdown: **bold**, *italic*, lists, links, images, and code. {draft.body.length.toLocaleString()}/10,000</p>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-col gap-1">
            {!editing && (
              <label className="flex items-center gap-2 cursor-pointer select-none group" title="Your identity will still be visible to admins and moderators">
                <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${draft.isAnonymous ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${draft.isAnonymous ? 'translate-x-4' : 'translate-x-0'}`} />
                  <input type="checkbox" className="sr-only" checked={!!draft.isAnonymous} disabled={pending} onChange={e => setDraft({ ...draft, isAnonymous: e.target.checked })} />
                </div>
                <EyeOff size={13} className={draft.isAnonymous ? 'text-emerald-700' : 'text-slate-400'} />
                <span className="text-xs text-slate-600">Post anonymously</span>
              </label>
            )}
            {draft.isAnonymous && !editing && <p className="text-xs text-amber-700 ml-11">Admins can still see your identity.</p>}
            {(!draft.isAnonymous || editing) && <p className="text-xs text-slate-500">Draft saved in this browser tab</p>}
          </div>
          <button type="submit" disabled={pending || uploadingImage || !categoryId || draft.title.trim().length < 5 || draft.body.trim().length < 10} className="community-primary">{pending ? 'Publishing…' : 'Publish discussion'}</button>
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

'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Markdown } from './markdown'
import { useDraft } from './use-draft'

export function DeleteDialog({ open, onClose, onDelete, kind }: { open: boolean; onClose: () => void; onDelete: () => Promise<void>; kind: 'discussion' | 'comment' }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  return <Dialog open={open} onOpenChange={value => { if (!value && !pending) onClose() }}><DialogContent overlayClassName="z-[1100]" className="community-dialog"><DialogHeader><DialogTitle>Delete this {kind}?</DialogTitle><DialogDescription>{kind === 'comment' ? 'Your comment will be removed. Replies will remain, and an accepted answer will be cleared.' : 'This discussion and its comments will no longer be visible in the community.'}</DialogDescription></DialogHeader>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button className="community-action" disabled={pending} onClick={onClose}>Cancel</button><button className="community-primary !bg-red-700" disabled={pending} onClick={async () => { setPending(true); setError(''); try { await onDelete(); onClose() } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete.') } finally { setPending(false) } }}>{pending ? 'Deleting…' : `Delete ${kind}`}</button></div></DialogContent></Dialog>
}

export function EditCommentDialog({ body: initial, draftKey, onClose, onSave }: { body: string; draftKey: string; onClose: () => void; onSave: (body: string) => Promise<void> }) {
  const [body, setBody] = useDraft(draftKey, initial)
  const [pending, setPending] = useState(false)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  return <Dialog open onOpenChange={value => { if (!value && !pending) onClose() }}><DialogContent overlayClassName="z-[1100]" className="community-dialog"><DialogHeader><DialogTitle>Edit comment</DialogTitle><DialogDescription>Your changes will show an edited label.</DialogDescription></DialogHeader><form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (pending) return; setPending(true); setError(''); try { await onSave(body); onClose() } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save.') } finally { setPending(false) } }}><label htmlFor={draftKey} className="text-sm font-semibold">Comment</label>{preview ? <Markdown body={body} /> : <textarea id={draftKey} className="community-input min-h-40" value={body} onChange={e => setBody(e.target.value)} minLength={2} maxLength={8000} required disabled={pending} />}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" className="community-action" onClick={() => setPreview(!preview)}>{preview ? 'Edit' : 'Preview'}</button><button type="submit" className="community-primary" disabled={pending || body.trim().length < 2}>{pending ? 'Saving…' : 'Save comment'}</button></div></form></DialogContent></Dialog>
}

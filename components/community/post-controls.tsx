'use client'
import { useRef, useState } from 'react'
import { ArrowBigDown, ArrowBigUp, MoreHorizontal, Flag, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { communityRequest, jsonPost, type Target } from './types'

export function VoteControls({ target, score, viewerVote, authenticated, requireAuth, onChange }: {
  target: Target; score: number; viewerVote: number; authenticated: boolean; requireAuth: () => void
  onChange: (result: { score: number; viewerVote: number }) => void
}) {
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  async function vote(value: number) {
    if (!authenticated) { requireAuth(); return }
    if (busy.current) return
    busy.current = true; setPending(true)
    try { onChange(await communityRequest('/api/community/vote', jsonPost({ ...target, value: value === viewerVote ? 0 : value }))) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to vote.') }
    finally { busy.current = false; setPending(false) }
  }
  return <div className="inline-flex items-center rounded-full bg-slate-100" aria-label="Voting" aria-busy={pending}>
    <button type="button" className={`community-icon ${viewerVote === 1 ? 'text-emerald-700' : ''}`} aria-label="Upvote" aria-pressed={viewerVote === 1} disabled={pending} onClick={() => void vote(1)}>
      <ArrowBigUp size={20} fill={viewerVote === 1 ? 'currentColor' : 'none'} />
    </button>
    <span className="min-w-5 text-center text-xs font-bold tabular-nums" aria-live="polite">{score}</span>
    <button type="button" className={`community-icon ${viewerVote === -1 ? 'text-rose-700' : ''}`} aria-label="Downvote" aria-pressed={viewerVote === -1} disabled={pending} onClick={() => void vote(-1)}>
      <ArrowBigDown size={20} fill={viewerVote === -1 ? 'currentColor' : 'none'} />
    </button>
  </div>
}

export function PostMenu({ onReport, actions = [] }: { onReport: () => void; actions?: { label: string; run: () => void; disabled?: boolean }[] }) {
  return <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <button type="button" className="community-icon ml-auto" aria-label="More actions">
        <MoreHorizontal size={19} />
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content align="end" sideOffset={4} className="z-[1102] min-w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
        {actions.map(action => <DropdownMenu.Item key={action.label} disabled={action.disabled} className="flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm text-slate-700 outline-none focus:bg-emerald-50 data-[disabled]:opacity-40" onSelect={action.run}>{action.label}</DropdownMenu.Item>)}
        <DropdownMenu.Item className="flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm text-slate-700 outline-none focus:bg-emerald-50" onSelect={onReport}>
          <Flag size={15} className="mr-2" />Report</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
}

export function ShareButton({ threadId }: { threadId: string }) {
  const [fallback, setFallback] = useState('')
  async function share() {
    const url = `${window.location.origin}/community?thread=${encodeURIComponent(threadId)}`
    try { await navigator.clipboard.writeText(url); toast.success('Discussion link copied.') }
    catch { setFallback(url) }
  }
  return <>
    <button type="button" onClick={() => void share()} className="community-action">
      <Share2 size={15} />
      <span>Share</span>
    </button>
    {fallback && <label className="w-full text-xs">Copy discussion link<input className="community-input mt-1" readOnly value={fallback} onFocus={e => e.currentTarget.select()} aria-label="Discussion link" />
    </label>}</>
}

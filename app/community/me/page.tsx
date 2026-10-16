'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Loader2, MessageSquare, ThumbsUp, Pencil, Lock } from 'lucide-react'

type MyThread = {
  id: string
  title: string
  postType: string
  isAnonymous: boolean
  createdAt: string
  editedAt: string | null
  locked: boolean
  solvedAt: string | null
  category: { name: string; slug: string; isHidden: boolean }
  score: number
  commentCount: number
  href: string
}

export default function MyPostsPage() {
  const [threads, setThreads] = useState<MyThread[] | null>(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/community/me/threads?page=${page}&limit=20`, { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json()
        if (!r.ok) throw new Error(body.error || 'Could not load your posts')
        setThreads(body.threads)
        setPages(body.pages)
        setError(null)
      })
      .catch((e) => setError(e.message))
  }, [page])

  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-3xl space-y-6 px-4 pt-24 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">My posts</h1>
          <p className="text-sm text-text-light">Edit, read replies, and see how your posts are doing.</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {!threads && !error && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary-green" size={28} />
          </div>
        )}

        {threads && threads.length === 0 && (
          <p className="py-12 text-center text-sm text-text-light">You have not posted any discussions yet.</p>
        )}

        <ul className="space-y-3">
          {threads?.map((t) => (
            <li key={t.id} className="rounded-lg border border-border-light bg-white p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-light">
                <span className="rounded bg-slate-100 px-2 py-0.5">{t.category.name}</span>
                {t.category.isHidden && <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">Hidden subject</span>}
                {t.isAnonymous && <span>Posted anonymously</span>}
                {t.locked && (
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <Lock size={10} /> Locked
                  </span>
                )}
                <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                {t.editedAt && <span>· edited</span>}
              </div>

              <Link href={t.href} className="block font-semibold text-text-dark hover:underline">
                {t.title}
              </Link>

              <div className="flex flex-wrap items-center gap-4 text-sm text-text-light">
                <span className="inline-flex items-center gap-1">
                  <ThumbsUp size={14} /> {t.score}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare size={14} /> {t.commentCount} {t.commentCount === 1 ? 'reply' : 'replies'}
                </span>
                {t.postType === 'question' && (
                  <span>{t.solvedAt ? 'Solved' : 'Unanswered'}</span>
                )}
                <Link
                  href={t.href}
                  className="ml-auto inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-medium hover:bg-slate-50"
                >
                  <Pencil size={12} /> Open & edit
                </Link>
              </div>
            </li>
          ))}
        </ul>

        {pages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1 disabled:opacity-40">
              Previous
            </button>
            <span>
              Page {page} of {pages}
            </span>
            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1 disabled:opacity-40">
              Next
            </button>
          </div>
        )}
      </main>
    </>
  )
}

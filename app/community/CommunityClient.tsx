'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BookOpen, Flame, Clock3, TrendingUp, Plus, MessageSquare, ShieldCheck, Users } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { useAuth } from '@/lib/auth-context'
import { authHref } from '@/lib/auth-redirect'
import { FeedSearch, defaultFilters, type FeedFilters } from '@/components/community/feed-filters'
import { CommunityNotifications } from '@/components/community/notifications'
import { ThreadCard } from '@/components/community/thread-card'
import { AuthDialog, Composer, ReportDialog } from '@/components/community/community-dialogs'
import { communityRequest, type Category, type Target, type Thread } from '@/components/community/types'
import { HouseAdBanner } from '@/components/home-ad-banner'
import '@/components/community/community.css'

type Location = FeedFilters & { comment: string; sort: string; category: string; page: number; thread: string }
const initialLocation: Location = { ...defaultFilters, comment: '', sort: 'hot', category: '', page: 1, thread: '' }
function readLocation(): Location {
  const params = new URLSearchParams(window.location.search)
  const page = Number(params.get('page') || 1)
  return { ...Object.fromEntries(Object.entries(defaultFilters).map(([key, value]) => [key, params.get(key) || value])) as FeedFilters, comment: params.get('comment') || '', sort: ['hot', 'new', 'top'].includes(params.get('sort') || '') ? params.get('sort')! : 'hot', category: params.get('category') || '', page: Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1, thread: params.get('thread') || '' }
}
function locationHref(location: Location) {
  const params = new URLSearchParams()
  if (location.sort !== 'hot') params.set('sort', location.sort)
  if (location.category) params.set('category', location.category)
  if (location.page > 1) params.set('page', String(location.page))
  if (location.thread) params.set('thread', location.thread)
  for (const key of Object.keys(defaultFilters) as (keyof FeedFilters)[]) if (location[key] && location[key] !== defaultFilters[key]) params.set(key, location[key])
  if (location.thread && location.comment) params.set('comment', location.comment)
  return `/community${params.size ? `?${params}` : ''}`
}

export default function CommunityClient() {
  const { user, loading: authLoading } = useAuth()
  const [location, setLocation] = useState<Location>(initialLocation)
  const [ready, setReady] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryError, setCategoryError] = useState('')
  const [categoryRetry, setCategoryRetry] = useState(0)
  const [threads, setThreads] = useState<Thread[]>([])
  const [selected, setSelected] = useState<Thread | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [feedLoading, setFeedLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [feedError, setFeedError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [retry, setRetry] = useState(0)
  const [authOpen, setAuthOpen] = useState(false)
  const [editing, setEditing] = useState<Thread | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<Target | null>(null)
  const feedScroll = useRef(0)
  const restoreScroll = useRef<number | null>(null)
  const category = categories.find(c => c.slug === location.category)
  const subject = selected?.category || category
  const destination = locationHref(location)
  const Heading = location.thread ? 'p' : 'h1'

  useEffect(() => {
    const sync = () => {
      setLocation(readLocation()); setReady(true)
      restoreScroll.current = window.history.state?.communityScroll ?? 0
    }
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setCategoryError('')
    communityRequest<{ categories: Category[] }>('/api/community/categories', { signal: controller.signal })
      .then(data => setCategories(data.categories))
      .catch(error => { if (!controller.signal.aborted) setCategoryError(error.message) })
    return () => controller.abort()
  }, [categoryRetry])

  useEffect(() => {
    if (!ready || authLoading) return
    const controller = new AbortController()
    setFeedLoading(true); setFeedError('')
    const params = new URLSearchParams({ sort: location.sort, page: String(location.page) })
    if (location.category) params.set('category', location.category)
    for (const key of Object.keys(defaultFilters) as (keyof FeedFilters)[]) if (location[key]) params.set(key, location[key])
    communityRequest<{ threads: Thread[]; hasMore: boolean }>(`/api/community/threads?${params}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setThreads(data.threads); setHasMore(data.hasMore) } })
      .catch(error => { if (!controller.signal.aborted) setFeedError(error.message) })
      .finally(() => { if (!controller.signal.aborted) setFeedLoading(false) })
    return () => controller.abort()
  }, [ready, authLoading, user?.id, location.sort, location.category, location.page, location.q, location.type, location.status, location.view, location.range, retry])

  useEffect(() => {
    if (!ready || authLoading) return
    if (!location.thread) { setSelected(null); setDetailError(''); setDetailLoading(false); return }
    const controller = new AbortController()
    setDetailLoading(true); setDetailError(''); setSelected(null)
    communityRequest<{ thread: Thread }>(`/api/community/threads/${encodeURIComponent(location.thread)}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setSelected(data.thread) })
      .catch(error => { if (!controller.signal.aborted) setDetailError(error.message) })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    return () => controller.abort()
  }, [ready, authLoading, user?.id, location.thread, retry])

  useEffect(() => {
    if (!ready || (location.thread ? detailLoading : feedLoading) || restoreScroll.current === null) return
    const y = restoreScroll.current
    const frame = requestAnimationFrame(() => { window.scrollTo({ top: y, behavior: 'instant' }); restoreScroll.current = null })
    return () => cancelAnimationFrame(frame)
  }, [ready, location, feedLoading, detailLoading])

  useEffect(() => {
    document.title = selected ? `${selected.title} | Preptio Community` : 'Community | Preptio'
    return () => { document.title = 'Community | Preptio' }
  }, [selected?.title])

  function navigate(next: Location, scroll = 0) {
    if (!location.thread) feedScroll.current = window.scrollY
    window.history.replaceState({ ...window.history.state, communityScroll: window.scrollY }, '')
    window.history.pushState({ communityScroll: scroll }, '', locationHref(next))
    restoreScroll.current = scroll
    setLocation(next)
    window.dispatchEvent(new Event('community:navigate'))
  }
  function openThread(thread: Thread) { navigate({ ...location, thread: thread.id, comment: '' }) }
  function selectSubject(slug: string) { navigate({ ...location, category: slug, thread: '', comment: '', page: 1 }) }
  function updateThread(id: string, value: Partial<Thread>) {
    setThreads(old => old.map(t => t.id === id ? { ...t, ...value } : t).filter(t => location.view === 'saved' ? t.saved : location.view === 'following' ? t.following : true))
    setSelected(old => old?.id === id ? { ...old, ...value } : old)
  }
  function report(target: Target) { if (user) setReportTarget(target); else setAuthOpen(true) }
  function compose() { if (user) setComposeOpen(true); else setAuthOpen(true) }
  const cardProps = (thread: Thread) => ({ thread, focusComment: location.thread === thread.id ? location.comment : undefined, onEdit: () => setEditing(thread), onDeleted: () => { setThreads(old => old.filter(t => t.id !== thread.id)); if (location.thread === thread.id) navigate({ ...location, thread: '', comment: '' }); setRetry(v => v + 1) }, href: locationHref({ ...location, thread: thread.id }), openThread: () => openThread(thread), onSubject: selectSubject, requireAuth: () => setAuthOpen(true), onReport: report, onUpdate: (value: Partial<Thread>) => updateThread(thread.id, value) })

  return <><Navigation /><main className="community-surface pb-16">
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-emerald-700"><Users size={16} />Preptio Community</div><Heading className={location.thread ? 'text-xl font-bold' : 'text-2xl font-bold tracking-tight sm:text-3xl'}>{location.thread ? 'Learn together. Go further.' : category?.name || 'Your next breakthrough starts here.'}</Heading><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">{category?.description || 'Ask questions, share what you know, and get exam-ready with CA students across Pakistan.'}</p></div>
        <div className="flex flex-wrap items-center gap-2">{user && <CommunityNotifications key={user.id} onOpenThread={(id, commentId) => navigate({ ...location, thread: id, comment: commentId })} />}<button type="button" onClick={compose} className="community-primary shrink-0" disabled={authLoading}><Plus size={18} />Create post</button></div>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <div hidden={!location.thread}>
            <button type="button" onClick={() => navigate({ ...location, thread: '' }, feedScroll.current)} className="community-action mb-3 -ml-2"><ArrowLeft size={16} />Back to discussions</button>
            {detailLoading || authLoading ? <LoadingCards /> : detailError ? <ErrorBox message={detailError} retry={() => setRetry(v => v + 1)} /> : selected && <ThreadCard key={selected.id} {...cardProps(selected)} detail />}
          </div>
          <div hidden={!!location.thread}>
            <FeedSearch filters={location} sort={location.sort} authenticated={!!user} requireAuth={() => setAuthOpen(true)} onChange={filters => navigate({ ...location, ...filters, page: 1 })} />
            <section aria-label="Feed controls" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2 sm:p-3">
              <div role="group" aria-label="Sort discussions" className="flex gap-1">{[{ value: 'hot', label: 'Hot', Icon: Flame }, { value: 'new', label: 'New', Icon: Clock3 }, { value: 'top', label: 'Top', Icon: TrendingUp }].map(({ value, label, Icon }) => <button key={value} type="button" className={`community-action ${location.sort === value ? 'bg-emerald-50 text-emerald-800' : ''}`} aria-pressed={location.sort === value} onClick={() => navigate({ ...location, sort: value, page: 1 })}><Icon size={16} />{label}</button>)}</div>
              <label className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-56"><span className="sr-only">Filter by subject</span><select className="community-input !rounded-full !py-2 text-xs" value={location.category} onChange={e => selectSubject(e.target.value)}><option value="">All subjects</option>{categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></label>
            </section>
            {feedLoading || authLoading ? <LoadingCards /> : feedError ? <ErrorBox message={feedError} retry={() => setRetry(v => v + 1)} /> : <>
              <div className="space-y-3">{threads.map(thread => <ThreadCard key={thread.id} {...cardProps(thread)} />)}</div>
              {!threads.length && <section className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center"><MessageSquare size={32} className="mx-auto mb-4 text-emerald-700" /><h2 className="text-lg font-bold">{location.page > 1 ? 'You’ve reached the end' : (location.q || location.type || location.status || location.view !== 'all' ? 'No matching discussions' : 'Be the first to start a discussion')}</h2><p className="mx-auto mb-5 mt-2 max-w-sm text-sm text-slate-500">{location.page > 1 ? 'Go back a page to keep exploring.' : (location.q || location.type || location.status ? 'Try another search or clear the filters.' : location.view === 'saved' ? 'Save useful discussions to find them here.' : location.view === 'following' ? 'Follow a discussion from its actions menu to see it here.' : 'A question you ask could help another student too.')}</p>{location.page === 1 && <button type="button" className="community-primary" onClick={compose}>Start a discussion</button>}</section>}
              {(location.page > 1 || hasMore) && <nav aria-label="Feed pages" className="mt-5 flex items-center justify-between"><button type="button" className="community-action border border-slate-200 bg-white" disabled={location.page === 1} onClick={() => navigate({ ...location, page: location.page - 1 })}><ArrowLeft size={15} />Previous</button><span className="text-xs text-slate-500">Page {location.page}</span><button type="button" className="community-action border border-slate-200 bg-white" disabled={!hasMore} onClick={() => navigate({ ...location, page: location.page + 1 })}>Next<ArrowRight size={15} /></button></nav>}
            </>}
          </div>
        </div>
        <aside aria-label="Community information" className="space-y-4 lg:sticky lg:top-24">
          <HouseAdBanner placement="community" variant="card" className="w-full" />
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white"><BookOpen size={22} /></div><h2 className="text-base font-bold">{subject ? subject.name : 'A little help goes a long way.'}</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">{subject?.description || 'A space for questions, useful explanations, and the small wins that make studying together better.'}</p>
            {!authLoading && !user && <div className="mt-4 border-t border-emerald-200/70 pt-4"><h3 className="mb-2 text-sm font-bold">Start a discussion</h3><p className="text-sm leading-relaxed"><Link className="font-semibold text-emerald-800 underline" href={authHref('login', destination)}>Log in</Link> to create threads, comment, and vote.</p><p className="mt-2 text-xs">New here? <Link className="font-semibold text-emerald-800 underline" href={authHref('signup', destination)}>Sign up for free</Link></p></div>}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-3 text-sm font-bold">Explore subjects</h2><nav aria-label="Community subjects" className="space-y-1"><button type="button" className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm ${!location.category ? 'bg-emerald-50 font-semibold text-emerald-800' : 'hover:bg-slate-50'}`} onClick={() => selectSubject('')}><Users size={15} />All discussions</button>{categories.map(c => <button key={c.id} type="button" aria-current={location.category === c.slug ? 'page' : undefined} className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm ${location.category === c.slug ? 'bg-emerald-50 font-semibold text-emerald-800' : 'hover:bg-slate-50'}`} onClick={() => selectSubject(c.slug)}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">{c.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>{c.name}</button>)}</nav>{categoryError && <p role="alert" className="mt-2 text-xs text-red-700">{categoryError}<button type="button" className="community-action" onClick={() => setCategoryRetry(v => v + 1)}>Retry</button></p>}</section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><ShieldCheck size={17} className="text-emerald-700" />Make this a helpful space</h2><ol className="list-decimal space-y-3 pl-4 text-xs leading-relaxed text-slate-600"><li>Be kind. Everyone is learning.</li><li>Use a clear title and choose the right subject.</li><li>Explain your reasoning and show your working.</li><li>Keep personal details private. Report spam or abuse.</li></ol></section>
          <p className="px-1 text-xs text-slate-500">Study together. Get exam-ready.</p>
        </aside>
      </div>
    </div>
    <AuthDialog open={authOpen} onOpenChange={setAuthOpen} destination={destination} />
    {user && <Composer key={user.id} open={composeOpen} onOpenChange={setComposeOpen} categories={categories} defaultCategory={location.category || selected?.category.slug || ''} userId={user.id} onPublished={thread => { setRetry(v => v + 1); navigate({ ...location, thread: thread.id, comment: '' }) }} />}
    {user && editing && <Composer key={`edit:${user.id}:${editing.id}`} editing={editing} open onOpenChange={open => { if (!open) setEditing(null) }} categories={categories} defaultCategory={editing.category.slug} userId={user.id} onPublished={thread => { updateThread(thread.id, thread); setEditing(null); setRetry(v => v + 1) }} />}
    <ReportDialog target={reportTarget} onClose={() => setReportTarget(null)} />
  </main></>
}

function ErrorBox({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="rounded-2xl border border-red-100 bg-white p-6"><h2 className="font-bold">We couldn’t load this right now</h2><p className="my-3 text-sm text-slate-600">{message}</p><button type="button" className="community-action border border-slate-200" onClick={retry}>Try again</button></div>
}
function LoadingCards() {
  return <div role="status" className="space-y-3"><span className="sr-only">Loading discussions</span>{[0, 1, 2].map(i => <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 h-4 w-1/3 animate-pulse rounded bg-slate-100" /><div className="mb-3 h-6 w-3/4 animate-pulse rounded bg-slate-100" /><div className="h-4 w-full animate-pulse rounded bg-slate-100" /><div className="mt-5 h-8 w-40 animate-pulse rounded-full bg-slate-100" /></div>)}</div>
}

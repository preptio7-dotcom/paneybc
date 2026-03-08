'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BarChart2, Clock3, Eye, Loader2, Search, Star, Trash2 } from 'lucide-react'
import { AdminHeader } from '@/components/admin-header'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDateTimeInPKT, pktDateTimeToUtcIso, utcToPktDateTimeLocalInput } from '@/lib/blog-related-subjects'

type AdminPostRow = {
  id: string
  title: string
  slug: string
  coverImageUrl: string | null
  status: 'draft' | 'published' | 'archived'
  scheduledAt: string | null
  visibility: 'beta' | 'public'
  featured: boolean
  viewsCount: number
  publishedAt: string | null
  category: {
    id: string
    name: string
    color: string
  }
  author: {
    id: string
    name: string
  }
}

type CategoryOption = {
  id: string
  name: string
}

type AuthorOption = {
  id: string
  name: string
}

type PostStats = {
  id: string
  title: string
  views: number
  avgReadTimeSeconds: number
  avgScrollDepth: number
  readCompletionRate: number
  ctaClicks: number
  ctaCtr: number
  signups: number
  topSource: string
  timeline: Array<{ date: string; views: number }>
}

const PAGE_SIZE = 20

function formatDate(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function statusClass(status: string) {
  if (status === 'published') return 'bg-emerald-100 text-emerald-700'
  if (status === 'archived') return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-slate-600'
}

function isScheduled(post: Pick<AdminPostRow, 'status' | 'scheduledAt'>) {
  if (post.status !== 'draft' || !post.scheduledAt) return false
  const date = new Date(post.scheduledAt)
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() > Date.now()
}

function formatScheduledAt(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return formatDateTimeInPKT(date)
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0))
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${mins}m ${String(secs).padStart(2, '0')}s`
}

function visibilityClass(visibility: string) {
  if (visibility === 'public') return 'bg-emerald-100 text-emerald-700'
  return 'bg-amber-100 text-amber-700'
}

export default function AdminBlogPage() {
  const { toast } = useToast()
  const [posts, setPosts] = useState<AdminPostRow[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [authors, setAuthors] = useState<AuthorOption[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [authorFilter, setAuthorFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const [scheduledCount, setScheduledCount] = useState(0)
  const [scheduledThisWeek, setScheduledThisWeek] = useState(0)
  const [audienceUpdatingId, setAudienceUpdatingId] = useState<string | null>(null)
  const [statsModalOpen, setStatsModalOpen] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [selectedPostStats, setSelectedPostStats] = useState<PostStats | null>(null)

  const loadMetadata = useCallback(async () => {
    try {
      const [categoriesResponse, authorsResponse] = await Promise.all([
        fetch('/api/admin/blog/categories', { cache: 'no-store' }),
        fetch('/api/admin/blog/authors', { cache: 'no-store' }),
      ])
      if (categoriesResponse.ok) {
        const data = await categoriesResponse.json()
        setCategories(
          Array.isArray(data?.categories)
            ? data.categories.map((item: { id: string; name: string }) => ({
                id: String(item.id),
                name: String(item.name),
              }))
            : []
        )
      }
      if (authorsResponse.ok) {
        const data = await authorsResponse.json()
        setAuthors(
          Array.isArray(data?.authors)
            ? data.authors.map((item: { id: string; name: string }) => ({
                id: String(item.id),
                name: String(item.name),
              }))
            : []
        )
      }
    } catch {
      // keep existing metadata state
    }
  }, [])

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      })
      if (search.trim()) params.set('search', search.trim())
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (categoryFilter !== 'all') params.set('categoryId', categoryFilter)
      if (authorFilter !== 'all') params.set('authorId', authorFilter)

      const response = await fetch(`/api/admin/blog/posts?${params.toString()}`, {
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load posts')
      }

      setPosts(Array.isArray(data?.items) ? data.items : [])
      setTotalPages(Number(data?.totalPages || 1))
      setTotalRows(Number(data?.total || 0))
      setScheduledCount(Number(data?.scheduledCount || 0))
      setScheduledThisWeek(Number(data?.scheduledThisWeek || 0))
      setSelectedIds([])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load blog posts',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [authorFilter, categoryFilter, page, search, statusFilter, toast])

  useEffect(() => {
    void loadMetadata()
  }, [loadMetadata])

  useEffect(() => {
    void loadPosts()
  }, [loadPosts])

  const refresh = useCallback(async () => {
    await Promise.all([loadPosts(), loadMetadata()])
  }, [loadMetadata, loadPosts])

  const allSelected = posts.length > 0 && selectedIds.length === posts.length

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
      return
    }
    setSelectedIds(posts.map((post) => post.id))
  }

  const runBulkAction = async (action: 'publish' | 'archive' | 'delete') => {
    if (!selectedIds.length) return
    if (action === 'delete') {
      const confirmed = window.confirm(
        'Are you sure you want to permanently delete selected posts? This cannot be undone.'
      )
      if (!confirmed) return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/admin/blog/posts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Bulk action failed')
      }

      if (action === 'delete') {
        toast({
          title: 'Deleted',
          description: `${data.deletedCount || selectedIds.length} post(s) permanently deleted`,
        })
      } else {
        toast({
          title: 'Updated',
          description: `${data.updatedCount || selectedIds.length} post(s) updated`,
        })
      }
      await refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Bulk action failed',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const openPostStats = useCallback(
    async (post: AdminPostRow) => {
      try {
        setStatsModalOpen(true)
        setStatsLoading(true)
        const params = new URLSearchParams({ postId: post.id })
        const response = await fetch(`/api/admin/blog/analytics/posts?${params.toString()}`, {
          cache: 'no-store',
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load post stats')
        }

        const row = Array.isArray(data?.items) ? data.items[0] : null
        if (!row) {
          setSelectedPostStats({
            id: post.id,
            title: post.title,
            views: 0,
            avgReadTimeSeconds: 0,
            avgScrollDepth: 0,
            readCompletionRate: 0,
            ctaClicks: 0,
            ctaCtr: 0,
            signups: 0,
            topSource: 'direct',
            timeline: [],
          })
          return
        }

        setSelectedPostStats({
          id: String(row.id || post.id),
          title: String(row.title || post.title),
          views: Number(row.views || 0),
          avgReadTimeSeconds: Number(row.avgReadTimeSeconds || 0),
          avgScrollDepth: Number(row.avgScrollDepth || 0),
          readCompletionRate: Number(row.readCompletionRate || 0),
          ctaClicks: Number(row.ctaClicks || 0),
          ctaCtr: Number(row.ctaCtr || 0),
          signups: Number(row.signups || 0),
          topSource: String(row.topSource || 'direct'),
          timeline: Array.isArray(row.timeline)
            ? row.timeline.map((point: any) => ({
                date: String(point.date || ''),
                views: Number(point.views || 0),
              }))
            : [],
        })
      } catch (error: any) {
        toast({
          title: 'Stats unavailable',
          description: error?.message || 'Could not load post stats.',
          variant: 'destructive',
        })
        setStatsModalOpen(false)
      } finally {
        setStatsLoading(false)
      }
    },
    [toast]
  )

  const rowActions = useMemo(
    () => ({
      toggleVisibility: async (post: AdminPostRow) => {
        const nextVisibility = post.visibility === 'public' ? 'beta' : 'public'
        try {
          setAudienceUpdatingId(post.id)
          const response = await fetch(`/api/admin/blog/posts/${post.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visibility: nextVisibility }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data?.error || 'Failed to update audience')

          setPosts((prev) =>
            prev.map((item) =>
              item.id === post.id ? { ...item, visibility: nextVisibility } : item
            )
          )
          toast({
            title: 'Audience updated',
            description:
              nextVisibility === 'public'
                ? 'Post is now visible to all users.'
                : 'Post moved to beta-only visibility.',
          })
        } catch (error: any) {
          toast({
            title: 'Error',
            description: error?.message || 'Failed to update audience',
            variant: 'destructive',
          })
        } finally {
          setAudienceUpdatingId(null)
        }
      },
      publishNow: async (post: AdminPostRow) => {
        try {
          setSaving(true)
          const response = await fetch(`/api/admin/blog/posts/${post.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'published',
              scheduledAt: null,
            }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data?.error || 'Failed to publish now')
          toast({ title: 'Published', description: 'Scheduled post published immediately.' })
          await refresh()
        } catch (error: any) {
          toast({
            title: 'Error',
            description: error?.message || 'Failed to publish post',
            variant: 'destructive',
          })
        } finally {
          setSaving(false)
        }
      },
      cancelSchedule: async (post: AdminPostRow) => {
        try {
          setSaving(true)
          const response = await fetch(`/api/admin/blog/posts/${post.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'draft',
              scheduledAt: null,
            }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data?.error || 'Failed to cancel schedule')
          toast({ title: 'Schedule cancelled', description: 'Post returned to draft.' })
          await refresh()
        } catch (error: any) {
          toast({
            title: 'Error',
            description: error?.message || 'Failed to cancel schedule',
            variant: 'destructive',
          })
        } finally {
          setSaving(false)
        }
      },
      editSchedule: async (post: AdminPostRow) => {
        const initial = post.scheduledAt ? utcToPktDateTimeLocalInput(post.scheduledAt) : ''
        const value = window.prompt(
          'Enter new schedule in PKT (YYYY-MM-DDTHH:MM, 24h).\nExample: 2026-03-15T09:00',
          initial
        )
        if (!value) return
        const scheduleIso = pktDateTimeToUtcIso(value)
        if (!scheduleIso || new Date(scheduleIso).getTime() <= Date.now()) {
          toast({
            title: 'Invalid schedule',
            description: 'Please enter a future PKT date/time.',
            variant: 'destructive',
          })
          return
        }
        try {
          setSaving(true)
          const response = await fetch(`/api/admin/blog/posts/${post.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'draft',
              scheduledAt: scheduleIso,
            }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data?.error || 'Failed to update schedule')
          toast({ title: 'Schedule updated' })
          await refresh()
        } catch (error: any) {
          toast({
            title: 'Error',
            description: error?.message || 'Failed to update schedule',
            variant: 'destructive',
          })
        } finally {
          setSaving(false)
        }
      },
      archive: async (post: AdminPostRow) => {
        try {
          setSaving(true)
          const response = await fetch(`/api/admin/blog/posts/${post.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'archived', featured: false }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data?.error || 'Failed to archive post')
          toast({ title: 'Archived', description: 'Post moved to archived.' })
          await refresh()
        } catch (error: any) {
          toast({
            title: 'Error',
            description: error?.message || 'Failed to archive post',
            variant: 'destructive',
          })
        } finally {
          setSaving(false)
        }
      },
      delete: async (post: AdminPostRow) => {
        const confirmed = window.confirm(
          'Are you sure you want to permanently delete this post? This cannot be undone.'
        )
        if (!confirmed) return
        try {
          setSaving(true)
          const response = await fetch(`/api/admin/blog/posts/${post.id}`, {
            method: 'DELETE',
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data?.error || 'Failed to delete post')
          toast({ title: 'Deleted', description: 'Post permanently deleted.' })
          await refresh()
        } catch (error: any) {
          toast({
            title: 'Error',
            description: error?.message || 'Failed to delete post',
            variant: 'destructive',
          })
        } finally {
          setSaving(false)
        }
      },
    }),
    [refresh, toast]
  )

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pt-[72px] lg:pt-[80px] pb-10">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-3xl font-bold text-text-dark">Blog Posts</h1>
              <p className="text-sm text-slate-500">Manage publishing, featured content, and post visibility.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/blog/analytics">
                <Button variant="outline">Analytics</Button>
              </Link>
              <Link href="/admin/blog/categories">
                <Button variant="outline">Categories</Button>
              </Link>
              <Link href="/admin/blog/authors">
                <Button variant="outline">Authors</Button>
              </Link>
              <Link href="/admin/blog/new">
                <Button className="bg-primary-green hover:bg-green-700">+ New Post</Button>
              </Link>
            </div>
          </div>

          {scheduledCount > 0 ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm font-medium text-blue-700">
                📅 You have {scheduledThisWeek} post(s) scheduled this week ({scheduledCount} total upcoming)
              </p>
              <button
                type="button"
                className="text-sm font-semibold text-blue-700 hover:underline"
                onClick={() => {
                  setStatusFilter('scheduled')
                  setPage(1)
                }}
              >
                View Scheduled →
              </button>
            </div>
          ) : null}

          <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search posts..."
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={authorFilter}
              onValueChange={(value) => {
                setAuthorFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Author" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All authors</SelectItem>
                {authors.map((author) => (
                  <SelectItem key={author.id} value={author.id}>
                    {author.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedIds.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm text-slate-600">{selectedIds.length} posts selected</p>
              <Button variant="outline" onClick={() => void runBulkAction('publish')} disabled={saving}>
                Publish Selected
              </Button>
              <Button variant="outline" onClick={() => void runBulkAction('archive')} disabled={saving}>
                Archive Selected
              </Button>
              <Button variant="destructive" onClick={() => void runBulkAction('delete')} disabled={saving}>
                Delete Selected
              </Button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3 text-left">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                  <th className="p-3 text-left">Cover</th>
                  <th className="p-3 text-left">Title</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Author</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Audience</th>
                  <th className="p-3 text-left">Featured</th>
                  <th className="p-3 text-left">Views</th>
                  <th className="p-3 text-left">Published</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-t border-slate-100 align-middle">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(post.id)}
                        onChange={() => toggleRowSelection(post.id)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        {post.coverImageUrl ? (
                          <Image src={post.coverImageUrl} alt={post.title} fill className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs font-black text-slate-300">
                            P
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <Link href={`/admin/blog/edit/${post.id}`} className="font-semibold text-slate-800 hover:text-primary-green">
                        {post.title}
                      </Link>
                    </td>
                    <td className="p-3">
                      <span
                        className="inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: `${post.category.color}1A`,
                          borderColor: `${post.category.color}33`,
                          color: post.category.color,
                        }}
                      >
                        {post.category.name}
                      </span>
                    </td>
                    <td className="p-3">{post.author.name}</td>
                    <td className="p-3">
                      {isScheduled(post) ? (
                        <div className="space-y-1">
                          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            🕐 Scheduled
                          </span>
                          <p className="text-[11px] text-slate-500">{formatScheduledAt(post.scheduledAt)}</p>
                        </div>
                      ) : (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(post.status)}`}>
                          {post.status}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${visibilityClass(post.visibility)}`}
                        >
                          {post.visibility === 'public' ? 'Public' : 'Beta'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => void rowActions.toggleVisibility(post)}
                          disabled={saving || audienceUpdatingId === post.id}
                        >
                          {audienceUpdatingId === post.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : post.visibility === 'public' ? (
                            'Set Beta'
                          ) : (
                            'Set Public'
                          )}
                        </Button>
                      </div>
                    </td>
                    <td className="p-3">{post.featured ? <Star size={14} className="fill-amber-500 text-amber-500" /> : '-'}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Eye size={12} />
                        {post.viewsCount}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{formatDate(post.publishedAt)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/blog/edit/${post.id}`}>
                          <Button size="sm" variant="outline">Edit</Button>
                        </Link>
                        <Link href={`/blog/${post.slug}?preview=admin`} target="_blank">
                          <Button size="sm" variant="outline" className="border-blue-200 text-blue-600">
                            Preview
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-300 text-slate-700"
                          onClick={() => void openPostStats(post)}
                        >
                          📊 Stats
                        </Button>
                        {isScheduled(post) ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-200 text-blue-700"
                              onClick={() => void rowActions.editSchedule(post)}
                              disabled={saving}
                            >
                              Edit Schedule
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-200 text-emerald-700"
                              onClick={() => void rowActions.publishNow(post)}
                              disabled={saving}
                            >
                              Publish Now
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-200 text-amber-700"
                              onClick={() => void rowActions.cancelSchedule(post)}
                              disabled={saving}
                            >
                              Cancel Schedule
                            </Button>
                          </>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-200 text-amber-600"
                          onClick={() => void rowActions.archive(post)}
                          disabled={saving}
                        >
                          Archive
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600"
                          onClick={() => void rowActions.delete(post)}
                          disabled={saving}
                        >
                          <Trash2 size={14} className="mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!posts.length && !loading ? (
                  <tr>
                    <td colSpan={11} className="p-10 text-center text-slate-500">
                      No posts found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Showing page {page} of {totalPages} - {totalRows} total posts
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
                Previous
              </Button>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={statsModalOpen} onOpenChange={setStatsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Post Analytics</DialogTitle>
            <DialogDescription>
              {selectedPostStats ? selectedPostStats.title : 'Loading analytics...'}
            </DialogDescription>
          </DialogHeader>
          {statsLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading post stats...
            </div>
          ) : selectedPostStats ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">Total Views</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{selectedPostStats.views}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">Avg Time on Page</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{formatDuration(selectedPostStats.avgReadTimeSeconds)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">Avg Scroll Depth</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{selectedPostStats.avgScrollDepth.toFixed(1)}%</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">Read Completion</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{selectedPostStats.readCompletionRate.toFixed(1)}%</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">CTA Clicks / CTR</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {selectedPostStats.ctaClicks} / {selectedPostStats.ctaCtr.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">Signups Attributed</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{selectedPostStats.signups}</p>
                  <p className="mt-1 text-xs text-slate-500">Top source: {selectedPostStats.topSource}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                  <Clock3 size={12} />
                  Views Over Time
                </p>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedPostStats.timeline}>
                      <XAxis dataKey="date" hide />
                      <YAxis allowDecimals={false} width={28} />
                      <Tooltip />
                      <Line type="monotone" dataKey="views" stroke="#16a34a" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              No analytics available yet for this post.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}



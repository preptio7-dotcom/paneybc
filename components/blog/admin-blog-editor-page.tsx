'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Bold,
  CheckCircle2,
  ChevronDown,
  Code2,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  History,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  RotateCcw,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
  Unlink2,
  Upload,
} from 'lucide-react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import UnderlineExtension from '@tiptap/extension-underline'
import ImageExtension from '@tiptap/extension-image'
import { Table as TableExtension } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import { AdminHeader } from '@/components/admin-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  BLOG_SUBJECT_META,
  detectRelevantSubjects,
  formatDateTimeInPKT,
  pktDateTimeToUtcIso,
  utcToPktDateTimeLocalInput,
} from '@/lib/blog-related-subjects'

type BlogStatus = 'draft' | 'published' | 'archived'
type BlogAuthorType = 'admin' | 'guest' | 'student'
type BlogVisibility = 'beta' | 'public'
type BlogRevisionSaveType = 'manual_save' | 'publish' | 'status_change' | 'pre_restore_snapshot'

type CategoryOption = { id: string; name: string; slug: string; color: string }
type AuthorOption = { id: string; name: string; designation: string | null }

type PostFormState = {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImageUrl: string
  scheduledAt: string
  categoryId: string
  tags: string[]
  relatedSubjects: string[]
  status: BlogStatus
  featured: boolean
  publishedAt: string
  authorId: string
  authorType: BlogAuthorType
  visibility: BlogVisibility
  metaTitle: string
  metaDescription: string
}

type UploadStep = {
  key: 'reading' | 'extracting' | 'processing' | 'uploading' | 'generating'
  label: string
  status: 'pending' | 'active' | 'done'
}

const INITIAL_FORM_STATE: PostFormState = {
  title: '',
  slug: '',
  excerpt: '',
  content: '<p></p>',
  coverImageUrl: '',
  scheduledAt: '',
  categoryId: '',
  tags: [],
  relatedSubjects: [],
  status: 'draft',
  featured: false,
  publishedAt: '',
  authorId: '',
  authorType: 'admin',
  visibility: 'beta',
  metaTitle: '',
  metaDescription: '',
}

type AutosaveStatus = 'saved' | 'unsaved' | 'saving' | 'just-saved' | 'error'

type BlogRevisionMeta = {
  id: string
  revisionNumber: number
  saveType: BlogRevisionSaveType
  wordCount: number
  createdAt: string
  isCurrent: boolean
}

type BlogRevisionDetail = BlogRevisionMeta & {
  title: string
  content: string
  excerpt: string
  coverImageUrl: string | null
}

const AUTHOR_TYPE_OPTIONS: Array<{ value: BlogAuthorType; label: string }> = [
  { value: 'admin', label: 'Preptio Team' },
  { value: 'guest', label: 'Guest Writer' },
  { value: 'student', label: 'CA Student' },
]

const COLOR_PRESETS = ['#16a34a', '#2563eb', '#7c3aed', '#ea580c', '#0284c7', '#db2777']

const BASE_UPLOAD_STEPS: UploadStep[] = [
  { key: 'reading', label: 'Reading document...', status: 'pending' },
  { key: 'extracting', label: 'Extracting text and formatting...', status: 'pending' },
  { key: 'processing', label: 'Processing images...', status: 'pending' },
  { key: 'uploading', label: 'Uploading images to cloud...', status: 'pending' },
  { key: 'generating', label: 'Generating blog post...', status: 'pending' },
]

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function normalizeSlug(value: string) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function fromDateTimeLocal(value: string) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function getWordStats(content: string) {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length
  return { words, readingTime: Math.max(1, Math.ceil(words / 200)) }
}

function buildAutosaveSnapshot(values: Pick<PostFormState, 'title' | 'excerpt' | 'content'>) {
  return JSON.stringify({
    title: String(values.title || '').trim(),
    excerpt: String(values.excerpt || '').trim(),
    content: String(values.content || '').trim(),
  })
}

function formatRelativeSavedAt(savedAt: Date | null, nowMs: number) {
  if (!savedAt) return 'Last saved: never'

  const diffSeconds = Math.max(0, Math.floor((nowMs - savedAt.getTime()) / 1000))
  if (diffSeconds < 10) return 'Last saved: just now'
  if (diffSeconds < 60) return `Last saved: ${diffSeconds}s ago`
  if (diffSeconds < 3600) return `Last saved: ${Math.floor(diffSeconds / 60)}m ago`
  if (diffSeconds < 86400) return `Last saved: ${Math.floor(diffSeconds / 3600)}h ago`
  return `Last saved: ${Math.floor(diffSeconds / 86400)}d ago`
}

function formatRevisionDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function stripHtml(value: string) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildCoverPreviewSrc(rawUrl: string) {
  const source = String(rawUrl || '').trim()
  if (!source) return ''
  if (!/^https?:\/\//i.test(source)) return source
  return `/api/pdf-proxy?url=${encodeURIComponent(source)}`
}

function makeSteps() {
  return BASE_UPLOAD_STEPS.map((step, index) => ({ ...step, status: index === 0 ? 'active' : 'pending' as const }))
}

function advanceSteps(current: UploadStep[]) {
  const activeIndex = current.findIndex((item) => item.status === 'active')
  if (activeIndex < 0 || activeIndex === current.length - 1) return current
  return current.map((step, index) => {
    if (index <= activeIndex) return { ...step, status: 'done' as const }
    if (index === activeIndex + 1) return { ...step, status: 'active' as const }
    return { ...step, status: 'pending' as const }
  })
}

function ToolbarButton({
  editor,
  active,
  icon,
  label,
  onClick,
}: {
  editor: Editor | null
  active?: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!editor}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-slate-200 px-2 text-slate-600 transition-colors hover:border-primary-green hover:text-primary-green disabled:opacity-40',
        active ? 'border-primary-green bg-green-50 text-primary-green' : ''
      )}
    >
      {icon}
    </button>
  )
}

export function AdminBlogEditorPage({ mode, postId }: { mode: 'new' | 'edit'; postId?: string }) {
  const router = useRouter()
  const { toast } = useToast()

  const [form, setForm] = useState<PostFormState>(INITIAL_FORM_STATE)
  const [loadingPost, setLoadingPost] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadState, setUploadState] = useState<'idle' | 'running' | 'success' | 'warning' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([])
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>(makeSteps())
  const [uploadSummary, setUploadSummary] = useState<{ words: number; images: number; readingTime: number } | null>(null)

  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [authors, setAuthors] = useState<AuthorOption[]>([])
  const [tagInput, setTagInput] = useState('')
  const [manualSlug, setManualSlug] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showSeo, setShowSeo] = useState(true)
  const [publishMode, setPublishMode] = useState<'publish_now' | 'schedule' | 'draft'>('publish_now')
  const [scheduleError, setScheduleError] = useState('')
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>(mode === 'edit' ? 'saved' : 'unsaved')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [autosaveError, setAutosaveError] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [clockTick, setClockTick] = useState(() => Date.now())

  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyCount, setHistoryCount] = useState(0)
  const [revisions, setRevisions] = useState<BlogRevisionMeta[]>([])
  const [previewRevision, setPreviewRevision] = useState<BlogRevisionDetail | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [restoreBusyRevisionId, setRestoreBusyRevisionId] = useState<string | null>(null)

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [authorModalOpen, setAuthorModalOpen] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', color: COLOR_PRESETS[0], description: '' })
  const [newAuthor, setNewAuthor] = useState({ name: '', designation: '', bio: '', avatarUrl: '' })

  const docxInputRef = useRef<HTMLInputElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const editorImageInputRef = useRef<HTMLInputElement | null>(null)
  const syncingEditorRef = useRef(false)
  const autosaveSnapshotRef = useRef(buildAutosaveSnapshot(INITIAL_FORM_STATE))
  const autosavePromiseRef = useRef<Promise<boolean> | null>(null)
  const justSavedTimeoutRef = useRef<number | null>(null)
  const dirtyRef = useRef(false)
  const formRef = useRef(form)
  const editorFocusedRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      UnderlineExtension,
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      ImageExtension,
      TableExtension.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: 'Write your article from scratch below...' }),
    ],
    content: form.content,
    editorProps: {
      attributes: {
        class:
          'min-h-[500px] w-full rounded-b-xl border border-t-0 border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700 outline-none',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (syncingEditorRef.current) return
      setForm((prev) => ({ ...prev, content: currentEditor.getHTML() }))
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() === form.content) return
    syncingEditorRef.current = true
    editor.commands.setContent(form.content, { emitUpdate: false })
    syncingEditorRef.current = false
  }, [editor, form.content])

  useEffect(() => {
    formRef.current = form
  }, [form])

  useEffect(() => {
    dirtyRef.current = isDirty
  }, [isDirty])

  useEffect(() => {
    editorFocusedRef.current = isEditorFocused
  }, [isEditorFocused])

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    return () => {
      if (justSavedTimeoutRef.current) {
        window.clearTimeout(justSavedTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!editor) return

    const handleFocus = () => setIsEditorFocused(true)
    const handleBlur = () => setIsEditorFocused(false)

    editor.on('focus', handleFocus)
    editor.on('blur', handleBlur)

    return () => {
      editor.off('focus', handleFocus)
      editor.off('blur', handleBlur)
    }
  }, [editor])

  const loadMetadata = useCallback(async () => {
    const [categoryResponse, authorResponse] = await Promise.all([
      fetch('/api/admin/blog/categories', { cache: 'no-store' }),
      fetch('/api/admin/blog/authors', { cache: 'no-store' }),
    ])

    if (categoryResponse.ok) {
      const categoryData = await categoryResponse.json()
      const nextCategories = Array.isArray(categoryData?.categories)
        ? categoryData.categories.map((item: any) => ({
            id: String(item.id),
            name: String(item.name),
            slug: String(item.slug),
            color: String(item.color || '#16a34a'),
          }))
        : []
      setCategories(nextCategories)
      setForm((prev) => (prev.categoryId || !nextCategories.length ? prev : { ...prev, categoryId: nextCategories[0].id }))
    }

    if (authorResponse.ok) {
      const authorData = await authorResponse.json()
      const nextAuthors = Array.isArray(authorData?.authors)
        ? authorData.authors.map((item: any) => ({
            id: String(item.id),
            name: String(item.name),
            designation: item.designation ? String(item.designation) : null,
          }))
        : []
      setAuthors(nextAuthors)
      setForm((prev) => (prev.authorId || !nextAuthors.length ? prev : { ...prev, authorId: nextAuthors[0].id }))
    }
  }, [])

  useEffect(() => {
    void loadMetadata().catch((error: any) => {
      toast({ title: 'Error', description: error?.message || 'Failed to load metadata', variant: 'destructive' })
    })
  }, [loadMetadata, toast])

  useEffect(() => {
    if (mode !== 'edit' || !postId) return
    let mounted = true

    const loadPost = async () => {
      try {
        setLoadingPost(true)
        const response = await fetch(`/api/admin/blog/posts/${postId}`, { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Failed to load post')
        if (!mounted) return

        const post = data?.post
        const tags = Array.isArray(post?.tags)
          ? post.tags.map((tag: unknown) => String(tag || '').trim()).filter(Boolean)
          : []
        const relatedSubjects = Array.isArray(post?.relatedSubjects)
          ? post.relatedSubjects.map((item: unknown) => String(item || '').toUpperCase()).filter(Boolean)
          : []

        const nextForm: PostFormState = {
          title: String(post?.title || ''),
          slug: String(post?.slug || ''),
          excerpt: String(post?.excerpt || ''),
          content: String(post?.content || '<p></p>'),
          coverImageUrl: String(post?.coverImageUrl || ''),
          scheduledAt: utcToPktDateTimeLocalInput(post?.scheduledAt),
          categoryId: String(post?.categoryId || ''),
          tags,
          relatedSubjects,
          status: (post?.status as BlogStatus) || 'draft',
          featured: Boolean(post?.featured),
          publishedAt: toDateTimeLocal(post?.publishedAt),
          authorId: String(post?.authorId || ''),
          authorType: (post?.authorType as BlogAuthorType) || 'admin',
          visibility: (post?.visibility as BlogVisibility) === 'public' ? 'public' : 'beta',
          metaTitle: String(post?.metaTitle || post?.title || ''),
          metaDescription: String(post?.metaDescription || post?.excerpt || ''),
        }
        setForm(nextForm)
        autosaveSnapshotRef.current = buildAutosaveSnapshot(nextForm)
        setLastSavedAt(post?.updatedAt ? new Date(post.updatedAt) : new Date())
        setIsDirty(false)
        setAutosaveStatus('saved')
        setAutosaveError('')
        setManualSlug(true)
        const hasFutureSchedule =
          nextForm.status === 'draft' &&
          Boolean(nextForm.scheduledAt) &&
          (() => {
            const iso = pktDateTimeToUtcIso(nextForm.scheduledAt)
            return Boolean(iso && new Date(iso).getTime() > Date.now())
          })()
        setPublishMode(
          hasFutureSchedule ? 'schedule' : nextForm.status === 'published' ? 'publish_now' : 'draft'
        )
      } catch (error: any) {
        toast({ title: 'Error', description: error?.message || 'Failed to load post', variant: 'destructive' })
      } finally {
        if (mounted) setLoadingPost(false)
      }
    }

    void loadPost()
    return () => {
      mounted = false
    }
  }, [mode, postId, toast])

  const currentAutosaveSnapshot = useMemo(
    () => buildAutosaveSnapshot(form),
    [form.title, form.excerpt, form.content]
  )

  useEffect(() => {
    if (mode !== 'edit') {
      setIsDirty(false)
      setAutosaveStatus('unsaved')
      return
    }

    const nextDirty = currentAutosaveSnapshot !== autosaveSnapshotRef.current
    setIsDirty(nextDirty)

    if (form.status !== 'draft') {
      setAutosaveStatus('saved')
      return
    }

    if (nextDirty && autosaveStatus !== 'saving') {
      setAutosaveStatus('unsaved')
      setAutosaveError('')
    } else if (!nextDirty && autosaveStatus === 'unsaved') {
      setAutosaveStatus('saved')
    }
  }, [autosaveStatus, currentAutosaveSnapshot, form.status, mode])

  const markAutosaveSaved = useCallback((savedAtIso?: string | null) => {
    const resolvedSavedAt = savedAtIso ? new Date(savedAtIso) : new Date()
    if (Number.isNaN(resolvedSavedAt.getTime())) {
      setLastSavedAt(new Date())
    } else {
      setLastSavedAt(resolvedSavedAt)
    }
    setAutosaveStatus('just-saved')
    setAutosaveError('')

    if (justSavedTimeoutRef.current) {
      window.clearTimeout(justSavedTimeoutRef.current)
    }
    justSavedTimeoutRef.current = window.setTimeout(() => {
      setAutosaveStatus('saved')
    }, 3000)
  }, [])

  const runAutosave = useCallback(async () => {
    if (mode !== 'edit' || !postId) return false
    const currentForm = formRef.current
    if (currentForm.status !== 'draft') return false

    const snapshot = buildAutosaveSnapshot(currentForm)
    if (snapshot === autosaveSnapshotRef.current) return false
    if (autosavePromiseRef.current) return autosavePromiseRef.current

    setAutosaveStatus('saving')
    setAutosaveError('')

    const requestPromise = (async () => {
      try {
        const response = await fetch(`/api/admin/blog/posts/${postId}/autosave`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: currentForm.title.trim(),
            excerpt: currentForm.excerpt.trim().slice(0, 300),
            content: currentForm.content,
            autosaved_at: new Date().toISOString(),
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || 'Autosave failed')
        }

        autosaveSnapshotRef.current = snapshot
        setIsDirty(false)
        markAutosaveSaved(data?.saved_at ? String(data.saved_at) : null)
        return true
      } catch (error: any) {
        setAutosaveStatus('error')
        setAutosaveError(error?.message || 'Autosave failed')
        return false
      } finally {
        autosavePromiseRef.current = null
      }
    })()

    autosavePromiseRef.current = requestPromise
    return requestPromise
  }, [markAutosaveSaved, mode, postId])

  const runBeforeUnloadAutosave = useCallback(() => {
    if (mode !== 'edit' || !postId) return
    const currentForm = formRef.current
    if (currentForm.status !== 'draft') return
    const snapshot = buildAutosaveSnapshot(currentForm)
    if (snapshot === autosaveSnapshotRef.current) return

    void fetch(`/api/admin/blog/posts/${postId}/autosave`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        title: currentForm.title.trim(),
        excerpt: currentForm.excerpt.trim().slice(0, 300),
        content: currentForm.content,
        autosaved_at: new Date().toISOString(),
      }),
    }).catch(() => undefined)
  }, [mode, postId])

  useEffect(() => {
    if (mode !== 'edit' || !postId) return
    const intervalId = window.setInterval(() => {
      if (!dirtyRef.current) return
      if (!editorFocusedRef.current) return
      void runAutosave()
    }, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [mode, postId, runAutosave])

  useEffect(() => {
    if (mode !== 'edit' || !postId) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      runBeforeUnloadAutosave()
      event.preventDefault()
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
    }

    const onVisibilityChange = () => {
      if (!document.hidden || !dirtyRef.current) return
      void runAutosave()
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [mode, postId, runAutosave, runBeforeUnloadAutosave])

  const loadRevisions = useCallback(async () => {
    if (mode !== 'edit' || !postId) return
    try {
      setHistoryLoading(true)
      const response = await fetch(`/api/admin/blog/posts/${postId}/revisions`, {
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load revisions')
      }
      const nextRevisions = Array.isArray(data?.revisions)
        ? data.revisions.map((item: any) => ({
            id: String(item.id),
            revisionNumber: Number(item.revisionNumber || 0),
            saveType: String(item.saveType || 'manual_save') as BlogRevisionSaveType,
            wordCount: Number(item.wordCount || 0),
            createdAt: String(item.createdAt),
            isCurrent: Boolean(item.isCurrent),
          }))
        : []
      setRevisions(nextRevisions)
      setHistoryCount(Number(data?.count || nextRevisions.length))
    } catch (error: any) {
      toast({
        title: 'Failed to load revisions',
        description: error?.message || 'Unable to load history right now.',
        variant: 'destructive',
      })
    } finally {
      setHistoryLoading(false)
    }
  }, [mode, postId, toast])

  useEffect(() => {
    if (mode !== 'edit' || !postId) {
      setRevisions([])
      setHistoryCount(0)
      return
    }
    void loadRevisions()
  }, [loadRevisions, mode, postId])

  const stats = useMemo(() => getWordStats(form.content), [form.content])
  const lastSavedLabel = useMemo(() => formatRelativeSavedAt(lastSavedAt, clockTick), [clockTick, lastSavedAt])

  useEffect(() => {
    if (publishMode !== 'schedule') {
      setScheduleError('')
    }
  }, [publishMode])

  const updateTitle = (title: string) => {
    setForm((prev) => {
      const nextTitle = title.slice(0, 180)
      return {
        ...prev,
        title: nextTitle,
        slug: manualSlug ? prev.slug : normalizeSlug(nextTitle),
        metaTitle: prev.metaTitle || nextTitle,
      }
    })
  }

  const addTag = (raw: string) => {
    const value = String(raw || '').trim().toLowerCase().replace(/\s+/g, '-')
    if (!value) return
    setForm((prev) => {
      if (prev.tags.includes(value) || prev.tags.length >= 10) return prev
      return { ...prev, tags: [...prev.tags, value] }
    })
    setTagInput('')
  }

  const removeTag = (value: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((tag) => tag !== value) }))
  }

  const refreshRelatedSubjectDetection = useCallback(() => {
    const detected = detectRelevantSubjects({
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      tags: form.tags,
    })
    setForm((prev) => ({ ...prev, relatedSubjects: detected }))
    toast({
      title: 'Detection refreshed',
      description: detected.length
        ? `Detected subjects: ${detected.join(', ')}`
        : 'No subject keywords detected. Generic CTA will be used.',
    })
  }, [form.content, form.excerpt, form.tags, form.title, toast])

  const toggleRelatedSubject = (code: string) => {
    setForm((prev) => {
      const exists = prev.relatedSubjects.includes(code)
      return {
        ...prev,
        relatedSubjects: exists
          ? prev.relatedSubjects.filter((item) => item !== code)
          : [...prev.relatedSubjects, code],
      }
    })
  }

  const uploadImage = async (file: File, cb: (url: string) => void) => {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch('/api/admin/blog/upload-image', { method: 'POST', body })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error || 'Upload failed')
    const url = String(data?.publicUrl || '')
    if (!url) throw new Error('Upload returned no URL')
    cb(url)
  }

  const handleCoverUpload = async (file: File) => {
    try {
      setUploadingCover(true)
      await uploadImage(file, (url) => {
        setForm((prev) => ({ ...prev, coverImageUrl: url }))
      })
      toast({ title: 'Cover updated' })
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error?.message || 'Could not upload cover', variant: 'destructive' })
    } finally {
      setUploadingCover(false)
    }
  }

  const handleEditorUpload = async (file: File) => {
    if (!editor) return
    try {
      await uploadImage(file, (url) => {
        editor.chain().focus().setImage({ src: url }).run()
      })
      toast({ title: 'Image inserted' })
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error?.message || 'Could not upload image', variant: 'destructive' })
    }
  }

  const handleDocxUpload = async (file: File) => {
    setUploadState('running')
    setUploadMessage('Processing your document...')
    setUploadWarnings([])
    setUploadSummary(null)
    setUploadSteps(makeSteps())

    const interval = window.setInterval(() => setUploadSteps((prev) => advanceSteps(prev)), 900)

    try {
      const body = new FormData()
      body.append('docx', file)
      const response = await fetch('/api/admin/blog/upload-docx', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to process file')

      const warnings = Array.isArray(data?.warnings)
        ? data.warnings.map((item: unknown) => String(item)).filter(Boolean)
        : []

      setForm((prev) => {
        const nextTitle = String(data?.title || prev.title || '').slice(0, 180)
        const nextExcerpt = String(data?.excerpt || prev.excerpt || '').slice(0, 300)
        const nextContent = String(data?.content || prev.content || '<p></p>')
        const nextTags = prev.tags
        const detected = detectRelevantSubjects({
          title: nextTitle,
          excerpt: nextExcerpt,
          content: nextContent,
          tags: nextTags,
        })
        return {
          ...prev,
          title: nextTitle,
          slug: String(data?.slug || prev.slug || ''),
          excerpt: nextExcerpt,
          content: nextContent,
          coverImageUrl: String(data?.coverImageUrl || prev.coverImageUrl || ''),
          relatedSubjects: detected,
        }
      })
      setManualSlug(true)

      const extracted = Number(data?.imagesExtracted || 0)
      const failed = Number(data?.imagesFailed || 0)
      const words = Number(data?.wordCount || 0)
      const readingTime = Number(data?.readingTime || 1)
      setUploadSummary({ words, images: extracted, readingTime })
      setUploadWarnings(warnings)

      setUploadSteps((prev) => prev.map((step) => ({ ...step, status: 'done' })))
      setUploadState(failed > 0 || warnings.length > 0 ? 'warning' : 'success')
      setUploadMessage(
        failed > 0 || warnings.length > 0
          ? 'Document imported with warnings. Review before publishing.'
          : 'Document imported successfully. Review and publish when ready.'
      )

      window.setTimeout(() => {
        document.getElementById('blog-editor-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 250)
    } catch (error: any) {
      setUploadState('error')
      setUploadMessage(error?.message || 'Could not process this file.')
      toast({ title: 'Upload failed', description: error?.message || 'Could not process file', variant: 'destructive' })
    } finally {
      window.clearInterval(interval)
    }
  }

  const savePost = async (forcedStatus?: BlogStatus) => {
    if (!form.title.trim()) {
      toast({ title: 'Missing title', description: 'Please enter a title.', variant: 'destructive' })
      return
    }
    if (!stripHtml(form.content).trim()) {
      toast({ title: 'Missing content', description: 'Please add article content.', variant: 'destructive' })
      return
    }
    if (!form.categoryId) {
      toast({ title: 'Missing category', description: 'Please select a category.', variant: 'destructive' })
      return
    }
    if (!form.authorId) {
      toast({ title: 'Missing author', description: 'Please select an author.', variant: 'destructive' })
      return
    }

    try {
      setSaving(true)
      const normalizedSlug = normalizeSlug(form.slug) || normalizeSlug(form.title)
      const requestedMode =
        forcedStatus === 'published'
          ? 'publish_now'
          : forcedStatus === 'draft'
            ? publishMode === 'schedule'
              ? 'schedule'
              : 'draft'
            : publishMode

      let finalStatus: BlogStatus = 'draft'
      let scheduledAtIso: string | null = null
      let publishedAtIso: string | null = fromDateTimeLocal(form.publishedAt)

      if (requestedMode === 'publish_now') {
        finalStatus = 'published'
        scheduledAtIso = null
      } else if (requestedMode === 'schedule') {
        const scheduleIso = pktDateTimeToUtcIso(form.scheduledAt)
        if (!scheduleIso || new Date(scheduleIso).getTime() <= Date.now()) {
          setScheduleError('Please select a future date and time')
          setSaving(false)
          return
        }
        finalStatus = 'draft'
        scheduledAtIso = scheduleIso
        publishedAtIso = null
      } else {
        finalStatus = 'draft'
        scheduledAtIso = null
        setScheduleError('')
      }

      const relatedSubjects = form.relatedSubjects
        .map((item) => String(item || '').toUpperCase())
        .filter(Boolean)

      const payload = {
        title: form.title.trim(),
        slug: normalizedSlug,
        excerpt: form.excerpt.trim().slice(0, 300),
        content: form.content,
        coverImageUrl: form.coverImageUrl || null,
        categoryId: form.categoryId,
        tags: form.tags,
        relatedSubjects,
        status: finalStatus,
        featured: form.featured,
        scheduledAt: scheduledAtIso,
        publishedAt: publishedAtIso,
        authorId: form.authorId,
        authorType: form.authorType,
        visibility: form.visibility,
        metaTitle: form.metaTitle.trim().slice(0, 120),
        metaDescription: form.metaDescription.trim().slice(0, 300),
      }

      const endpoint = mode === 'edit' && postId ? `/api/admin/blog/posts/${postId}` : '/api/admin/blog/posts'
      const method = mode === 'edit' ? 'PATCH' : 'POST'
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to save post')

      if (mode === 'new' && data?.post?.id) {
        router.replace(`/admin/blog/edit/${data.post.id}`)
      }
      if (data?.post?.slug) {
        setForm((prev) => ({
          ...prev,
          slug: String(data.post.slug),
          title: String(data?.post?.title || prev.title),
          excerpt: String(data?.post?.excerpt || prev.excerpt),
          content: String(data?.post?.content || prev.content),
          status: (data?.post?.status as BlogStatus) || prev.status,
          scheduledAt: utcToPktDateTimeLocalInput(data?.post?.scheduledAt),
          relatedSubjects: Array.isArray(data?.post?.relatedSubjects)
            ? data.post.relatedSubjects.map((item: unknown) => String(item || '').toUpperCase()).filter(Boolean)
            : prev.relatedSubjects,
          visibility:
            (data?.post?.visibility as BlogVisibility) === 'public' ? 'public' : 'beta',
        }))
      }
      if (data?.post) {
        const nextStatus = String(data.post.status || '')
        const nextScheduledAt = data.post.scheduledAt ? utcToPktDateTimeLocalInput(data.post.scheduledAt) : ''
        if (nextStatus === 'published') {
          setPublishMode('publish_now')
        } else if (nextScheduledAt) {
          setPublishMode('schedule')
        } else {
          setPublishMode('draft')
        }
      }

      const savedSnapshot = buildAutosaveSnapshot({
        title: String(data?.post?.title || payload.title),
        excerpt: String(data?.post?.excerpt || payload.excerpt),
        content: String(data?.post?.content || payload.content),
      })
      autosaveSnapshotRef.current = savedSnapshot
      setIsDirty(false)
      markAutosaveSaved(data?.post?.updatedAt || new Date().toISOString())
      if (mode === 'edit') {
        void loadRevisions()
      }

      toast({
        title: 'Saved',
        description:
          requestedMode === 'schedule'
            ? 'Post scheduled successfully.'
            : payload.status === 'published'
            ? 'Post is published.'
            : payload.status === 'archived'
              ? 'Post moved to archive.'
              : 'Draft saved successfully.',
      })
    } catch (error: any) {
      toast({ title: 'Save failed', description: error?.message || 'Could not save post', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const createCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({ title: 'Category name required', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch('/api/admin/blog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to create category')

      const category = {
        id: String(data.category.id),
        name: String(data.category.name),
        slug: String(data.category.slug),
        color: String(data.category.color || '#16a34a'),
      }
      setCategories((prev) => [...prev, category])
      setForm((prev) => ({ ...prev, categoryId: category.id }))
      setCategoryModalOpen(false)
      setNewCategory({ name: '', slug: '', color: COLOR_PRESETS[0], description: '' })
      toast({ title: 'Category created' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Could not create category', variant: 'destructive' })
    }
  }

  const createAuthor = async () => {
    if (!newAuthor.name.trim()) {
      toast({ title: 'Author name required', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch('/api/admin/blog/authors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAuthor),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to create author')

      const author = {
        id: String(data.author.id),
        name: String(data.author.name),
        designation: data.author.designation ? String(data.author.designation) : null,
      }
      setAuthors((prev) => [author, ...prev])
      setForm((prev) => ({ ...prev, authorId: author.id }))
      setAuthorModalOpen(false)
      setNewAuthor({ name: '', designation: '', bio: '', avatarUrl: '' })
      toast({ title: 'Author created' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Could not create author', variant: 'destructive' })
    }
  }

  const getRevisionSaveTypeMeta = (saveType: BlogRevisionSaveType) => {
    if (saveType === 'publish') {
      return { label: 'Published', className: 'bg-emerald-100 text-emerald-700' }
    }
    if (saveType === 'status_change') {
      return { label: 'Status Change', className: 'bg-blue-100 text-blue-700' }
    }
    if (saveType === 'pre_restore_snapshot') {
      return { label: 'Pre-Restore Snapshot', className: 'bg-violet-100 text-violet-700' }
    }
    return { label: 'Manual Save', className: 'bg-slate-100 text-slate-600' }
  }

  const openRevisionPreview = async (revisionId: string) => {
    if (!postId) return
    try {
      setHistoryLoading(true)
      const response = await fetch(`/api/admin/blog/posts/${postId}/revisions/${revisionId}`, {
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load revision preview')
      }
      const revision = data?.revision
      setPreviewRevision({
        id: String(revision.id),
        revisionNumber: Number(revision.revisionNumber || 0),
        saveType: String(revision.saveType || 'manual_save') as BlogRevisionSaveType,
        wordCount: Number(revision.wordCount || 0),
        createdAt: String(revision.createdAt),
        isCurrent: false,
        title: String(revision.title || ''),
        content: String(revision.content || ''),
        excerpt: String(revision.excerpt || ''),
        coverImageUrl: revision.coverImageUrl ? String(revision.coverImageUrl) : null,
      })
      setPreviewOpen(true)
    } catch (error: any) {
      toast({
        title: 'Preview unavailable',
        description: error?.message || 'Could not load revision preview.',
        variant: 'destructive',
      })
    } finally {
      setHistoryLoading(false)
    }
  }

  const restoreRevision = async (revision: BlogRevisionMeta) => {
    if (!postId) return
    const confirmed = window.confirm(
      `Restore to version from ${formatRevisionDateTime(revision.createdAt)}?\n\n` +
        'Your current content will be saved as a new revision first. ' +
        'You still need to save/publish manually after restore.'
    )
    if (!confirmed) return

    try {
      setRestoreBusyRevisionId(revision.id)
      const currentForm = formRef.current
      const response = await fetch(
        `/api/admin/blog/posts/${postId}/revisions/restore/${revision.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: currentForm.title,
            excerpt: currentForm.excerpt,
            content: currentForm.content,
            coverImageUrl: currentForm.coverImageUrl || null,
          }),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to restore revision')
      }
      const restored = data?.restoredRevision
      if (!restored) {
        throw new Error('Revision payload missing')
      }

      setForm((prev) => ({
        ...prev,
        title: String(restored.title || prev.title),
        excerpt: String(restored.excerpt || prev.excerpt),
        content: String(restored.content || prev.content),
        coverImageUrl: restored.coverImageUrl ? String(restored.coverImageUrl) : prev.coverImageUrl,
      }))
      setAutosaveStatus('unsaved')
      setAutosaveError('')
      setHistoryOpen(false)
      setPreviewOpen(false)

      toast({
        title: 'Revision restored',
        description: `Restored to v${Number(restored.revisionNumber || revision.revisionNumber)} from ${formatRevisionDateTime(String(restored.createdAt || revision.createdAt))}. Save or publish when ready.`,
      })

      void loadRevisions()
    } catch (error: any) {
      toast({
        title: 'Restore failed',
        description: error?.message || 'Could not restore revision.',
        variant: 'destructive',
      })
    } finally {
      setRestoreBusyRevisionId(null)
    }
  }

  const retryAutosave = () => {
    if (mode !== 'edit' || !postId) return
    void runAutosave()
  }

  if (loadingPost) {
    return (
      <main className="min-h-screen bg-background-light">
        <AdminHeader />
        <div className="pt-[90px]">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading post...</div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pb-10 pt-[80px]">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href="/admin/blog" className="text-sm font-medium text-slate-500 hover:text-primary-green">Back to Blog Posts</Link>
              <h1 className="mt-1 font-heading text-3xl font-bold text-text-dark">{mode === 'new' ? 'Create Blog Post' : 'Edit Blog Post'}</h1>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              {mode === 'edit' ? (
                <div className="text-right text-xs">
                  {autosaveStatus === 'saving' ? (
                    <p className="inline-flex items-center gap-1 text-slate-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </p>
                  ) : autosaveStatus === 'error' ? (
                    <p className="inline-flex items-center gap-1 text-rose-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Autosave failed
                      <button type="button" onClick={retryAutosave} className="underline underline-offset-2">
                        Retry
                      </button>
                    </p>
                  ) : autosaveStatus === 'unsaved' ? (
                    <p className="inline-flex items-center gap-1 text-amber-600">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                      Unsaved changes
                    </p>
                  ) : autosaveStatus === 'just-saved' ? (
                    <p className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Saved just now
                    </p>
                  ) : (
                    <p className="inline-flex items-center gap-1 text-slate-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      All changes saved
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-500">{lastSavedLabel}</p>
                  {autosaveError ? <p className="mt-1 text-[11px] text-rose-600">{autosaveError}</p> : null}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {mode === 'edit' ? (
                  <Button variant="outline" onClick={() => { setHistoryOpen(true); void loadRevisions() }}>
                    <History className="mr-2 h-4 w-4" />
                    {`History (${historyCount})`}
                  </Button>
                ) : null}
                {form.slug ? (
                  <Link href={`/blog/${form.slug}?preview=admin`} target="_blank"><Button variant="outline">Preview</Button></Link>
                ) : null}
                <Button variant="outline" onClick={() => void savePost('draft')} disabled={saving}>{saving ? 'Saving...' : 'Save Draft'}</Button>
                <Button className="bg-primary-green hover:bg-green-700" onClick={() => void savePost('published')} disabled={saving}>{saving ? 'Saving...' : 'Publish Now'}</Button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div
                  onClick={() => docxInputRef.current?.click()}
                  onDrop={(event) => {
                    event.preventDefault()
                    const file = event.dataTransfer.files?.[0]
                    if (file) void handleDocxUpload(file)
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-[#86efac] bg-[#f0fdf4] px-6 py-10 text-center transition-colors hover:border-primary-green hover:bg-[#dcfce7]"
                >
                  <Upload className="mx-auto mb-3 h-8 w-8 text-primary-green" />
                  <p className="text-lg font-semibold text-[#166534]">Upload Word Document</p>
                  <p className="mt-1 text-sm text-[#166534]/80">Drag and drop a .docx file or click to browse</p>
                  <p className="mt-2 text-xs text-[#166534]/70">Supports .docx files up to 10MB</p>
                  <button type="button" onClick={(event) => { event.stopPropagation(); setShowGuide(true) }} className="mt-4 inline-flex text-sm font-semibold text-primary-green underline-offset-4 hover:underline">Formatting Guide</button>
                </div>
                <input
                  ref={docxInputRef}
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleDocxUpload(file)
                    event.target.value = ''
                  }}
                />

                {uploadState !== 'idle' ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="space-y-2">
                      {uploadSteps.map((step) => (
                        <div key={step.key} className="flex items-center gap-2 text-sm text-slate-600">
                          {step.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : step.status === 'active' ? <Loader2 className="h-4 w-4 animate-spin text-primary-green" /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}
                          <span>{step.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className={cn('mt-3 text-sm', uploadState === 'error' ? 'text-rose-600' : uploadState === 'warning' ? 'text-amber-700' : 'text-slate-600')}>{uploadMessage}</p>
                    {uploadSummary ? <p className="mt-2 text-xs text-slate-500">{uploadSummary.words} words - {uploadSummary.images} images - {uploadSummary.readingTime} min read</p> : null}
                    {uploadWarnings.length ? (
                      <ul className="mt-2 list-disc pl-5 text-xs text-amber-700">
                        {uploadWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-6 flex items-center gap-3 text-sm text-slate-400"><div className="h-px flex-1 bg-slate-200" /><span>OR</span><div className="h-px flex-1 bg-slate-200" /></div>
                <p className="mt-3 text-sm text-slate-500">Write your article from scratch below</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <Label htmlFor="post-title" className="text-xs uppercase tracking-wide text-slate-500">Title</Label>
                <Input id="post-title" value={form.title} onChange={(event) => updateTitle(event.target.value)} placeholder="Enter your article title..." className="mt-2 h-12 border-0 border-b border-slate-200 rounded-none px-0 text-2xl font-bold shadow-none focus-visible:ring-0" />

                <div className="mt-4">
                  <Label htmlFor="post-slug" className="text-xs uppercase tracking-wide text-slate-500">URL Slug</Label>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <span className="whitespace-nowrap">preptio.com/blog/</span>
                    <Input id="post-slug" value={form.slug} onChange={(event) => { setManualSlug(true); setForm((prev) => ({ ...prev, slug: normalizeSlug(event.target.value) })) }} placeholder="your-post-slug" />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="post-excerpt">Article Excerpt</Label>
                    <span className={cn('text-xs', form.excerpt.length > 280 ? 'text-rose-600' : 'text-slate-500')}>{form.excerpt.length}/300</span>
                  </div>
                  <Textarea id="post-excerpt" rows={4} maxLength={300} value={form.excerpt} onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value.slice(0, 300) }))} placeholder="Short summary shown on listing page" className="mt-2" />
                </div>
              </div>

              <div id="blog-editor-content" className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <ToolbarButton editor={editor} icon={<Heading1 size={14} />} label="Heading 1" active={Boolean(editor?.isActive('heading', { level: 1 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} />
                  <ToolbarButton editor={editor} icon={<Heading2 size={14} />} label="Heading 2" active={Boolean(editor?.isActive('heading', { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} />
                  <ToolbarButton editor={editor} icon={<Heading3 size={14} />} label="Heading 3" active={Boolean(editor?.isActive('heading', { level: 3 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} />
                  <ToolbarButton editor={editor} icon={<Heading4 size={14} />} label="Heading 4" active={Boolean(editor?.isActive('heading', { level: 4 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()} />
                  <div className="h-6 w-px bg-slate-200" />
                  <ToolbarButton editor={editor} icon={<Bold size={14} />} label="Bold" active={Boolean(editor?.isActive('bold'))} onClick={() => editor?.chain().focus().toggleBold().run()} />
                  <ToolbarButton editor={editor} icon={<Italic size={14} />} label="Italic" active={Boolean(editor?.isActive('italic'))} onClick={() => editor?.chain().focus().toggleItalic().run()} />
                  <ToolbarButton editor={editor} icon={<Underline size={14} />} label="Underline" active={Boolean(editor?.isActive('underline'))} onClick={() => editor?.chain().focus().toggleUnderline().run()} />
                  <ToolbarButton editor={editor} icon={<Strikethrough size={14} />} label="Strike" active={Boolean(editor?.isActive('strike'))} onClick={() => editor?.chain().focus().toggleStrike().run()} />
                  <div className="h-6 w-px bg-slate-200" />
                  <ToolbarButton editor={editor} icon={<List size={14} />} label="Bullet list" active={Boolean(editor?.isActive('bulletList'))} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
                  <ToolbarButton editor={editor} icon={<ListOrdered size={14} />} label="Ordered list" active={Boolean(editor?.isActive('orderedList'))} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
                  <ToolbarButton editor={editor} icon={<Quote size={14} />} label="Blockquote" active={Boolean(editor?.isActive('blockquote'))} onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
                  <ToolbarButton editor={editor} icon={<Code2 size={14} />} label="Code block" active={Boolean(editor?.isActive('codeBlock'))} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} />
                  <ToolbarButton editor={editor} icon={<Minus size={14} />} label="Horizontal rule" onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
                  <ToolbarButton editor={editor} icon={<Table2 size={14} />} label="Insert table" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
                  <div className="h-6 w-px bg-slate-200" />
                  <ToolbarButton editor={editor} icon={<Link2 size={14} />} label="Add link" onClick={() => {
                    if (!editor) return
                    const current = editor.getAttributes('link').href as string | undefined
                    const next = window.prompt('Enter URL', current || 'https://')
                    if (next === null) return
                    const trimmed = next.trim()
                    if (!trimmed) { editor.chain().focus().unsetLink().run(); return }
                    editor.chain().focus().setLink({ href: trimmed }).run()
                  }} />
                  <ToolbarButton editor={editor} icon={<Unlink2 size={14} />} label="Remove link" onClick={() => editor?.chain().focus().unsetLink().run()} />
                  <ToolbarButton editor={editor} icon={<ImagePlus size={14} />} label="Upload image" onClick={() => editorImageInputRef.current?.click()} />
                  <div className="h-6 w-px bg-slate-200" />
                  <ToolbarButton editor={editor} icon={<Undo2 size={14} />} label="Undo" onClick={() => editor?.chain().focus().undo().run()} />
                  <ToolbarButton editor={editor} icon={<Redo2 size={14} />} label="Redo" onClick={() => editor?.chain().focus().redo().run()} />
                </div>

                <input ref={editorImageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleEditorUpload(file)
                  event.target.value = ''
                }} />

                <EditorContent editor={editor} />
                <div className="mt-3 text-xs text-slate-500">{stats.words} words - {stats.readingTime} min read</div>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-800">Publish</h2>
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Publish Options</p>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3">
                      <input
                        type="radio"
                        name="publish-mode"
                        checked={publishMode === 'publish_now'}
                        onChange={() => setPublishMode('publish_now')}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">Publish Immediately</span>
                        <span className="text-xs text-slate-500">Go live now.</span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3">
                      <input
                        type="radio"
                        name="publish-mode"
                        checked={publishMode === 'schedule'}
                        onChange={() => setPublishMode('schedule')}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">Schedule for Later</span>
                        <span className="text-xs text-slate-500">Publish automatically at a future date/time.</span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3">
                      <input
                        type="radio"
                        name="publish-mode"
                        checked={publishMode === 'draft'}
                        onChange={() => setPublishMode('draft')}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">Save as Draft</span>
                        <span className="text-xs text-slate-500">Keep this post private.</span>
                      </span>
                    </label>
                  </div>
                  {publishMode === 'schedule' ? (
                    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                      <Label htmlFor="schedule-at">Schedule Date & Time (PKT)</Label>
                      <Input
                        id="schedule-at"
                        type="datetime-local"
                        min={utcToPktDateTimeLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000))}
                        max={utcToPktDateTimeLocalInput(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))}
                        step={900}
                        value={form.scheduledAt}
                        onChange={(event) => setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))}
                        className="mt-1"
                      />
                      <p className="text-[11px] text-slate-500">Pakistan Standard Time (PKT). Stored in UTC internally.</p>
                      {form.scheduledAt ? (
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
                          {(() => {
                            const scheduleIso = pktDateTimeToUtcIso(form.scheduledAt)
                            if (!scheduleIso) return 'Select a valid future date and time.'
                            return `Will publish on ${formatDateTimeInPKT(scheduleIso)} PKT`
                          })()}
                        </div>
                      ) : null}
                      {scheduleError ? (
                        <p className="text-xs font-medium text-amber-700">⚠️ {scheduleError}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div>
                    <Label>Audience</Label>
                    <Select
                      value={form.visibility}
                      onValueChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          visibility: value === 'public' ? 'public' : 'beta',
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beta">Beta Only (Ambassadors + Admin)</SelectItem>
                        <SelectItem value="public">Public (All Users)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-slate-500">
                      New posts default to beta. Set to public when ready for all users.
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Featured Post</p>
                      <p className="text-xs text-slate-500">Show prominently on /blog</p>
                    </div>
                    <Switch checked={form.featured} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, featured: checked }))} />
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  {publishMode === 'publish_now' ? (
                    <Button className="bg-primary-green hover:bg-green-700" onClick={() => void savePost('published')} disabled={saving}>
                      Publish Now
                    </Button>
                  ) : null}
                  {publishMode === 'schedule' ? (
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => void savePost('draft')} disabled={saving}>
                      Schedule Post
                    </Button>
                  ) : null}
                  {publishMode === 'draft' ? (
                    <Button variant="outline" onClick={() => void savePost('draft')} disabled={saving}>
                      Save Draft
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-800">Cover Image</h2>
                <div className="mt-3 cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center" onClick={() => coverInputRef.current?.click()}>
                  {form.coverImageUrl ? (
                    <img
                      src={buildCoverPreviewSrc(form.coverImageUrl)}
                      alt="Cover preview"
                      className="h-36 w-full rounded-lg bg-slate-100 object-contain object-center"
                      loading="lazy"
                      onError={() => {
                        console.error('Cover image failed to load:', form.coverImageUrl)
                      }}
                    />
                  ) : (
                    <div className="py-6 text-xs text-slate-500">Click to upload (JPG, PNG, WebP, max 2MB)</div>
                  )}
                </div>
                <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleCoverUpload(file)
                  event.target.value = ''
                }} />
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">{uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}<span>{uploadingCover ? 'Uploading...' : 'Click image to replace'}</span></div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-800">Organization</h2>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between"><Label>Category</Label><button type="button" onClick={() => setCategoryModalOpen(true)} className="text-xs font-semibold text-primary-green hover:underline">+ Add new category</button></div>
                  <Select value={form.categoryId} onValueChange={(value) => setForm((prev) => ({ ...prev, categoryId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="mt-4">
                  <Label htmlFor="post-tags">Tags</Label>
                  <Input id="post-tags" value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addTag(tagInput) }
                  }} placeholder="Type tag and press Enter" className="mt-1" />
                  <div className="mt-2 flex flex-wrap gap-1.5">{form.tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">#{tag}<button type="button" onClick={() => removeTag(tag)} className="text-slate-500 hover:text-rose-600">x</button></span>)}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-800">Author</h2>
                <div className="mt-3 flex flex-wrap gap-2">{AUTHOR_TYPE_OPTIONS.map((option) => <button key={option.value} type="button" onClick={() => setForm((prev) => ({ ...prev, authorType: option.value }))} className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition-colors', form.authorType === option.value ? 'border-primary-green bg-green-50 text-primary-green' : 'border-slate-200 text-slate-500 hover:border-primary-green')}>{option.label}</button>)}</div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between"><Label>Author</Label><button type="button" onClick={() => setAuthorModalOpen(true)} className="text-xs font-semibold text-primary-green hover:underline">+ Add new author</button></div>
                  <Select value={form.authorId} onValueChange={(value) => setForm((prev) => ({ ...prev, authorId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select author" /></SelectTrigger>
                    <SelectContent>{authors.map((author) => <SelectItem key={author.id} value={author.id}>{author.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">Related Practice Subjects</h2>
                  <button
                    type="button"
                    onClick={refreshRelatedSubjectDetection}
                    className="text-xs font-semibold text-primary-green hover:underline"
                  >
                    Refresh Detection
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Auto-detected from post content. Toggle to customize.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.values(BLOG_SUBJECT_META).map((subject) => {
                    const isActive = form.relatedSubjects.includes(subject.code)
                    return (
                      <button
                        key={subject.code}
                        type="button"
                        onClick={() => toggleRelatedSubject(subject.code)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                          isActive
                            ? 'border-primary-green bg-primary-green text-white'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-primary-green'
                        )}
                      >
                        {isActive ? '✓' : '○'} {subject.code}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <button type="button" onClick={() => setShowSeo((prev) => !prev)} className="flex w-full items-center justify-between text-left"><span className="text-sm font-semibold text-slate-800">SEO & Meta</span><ChevronDown className={cn('h-4 w-4 transition-transform', showSeo ? 'rotate-180' : '')} /></button>
                {showSeo ? (
                  <div className="mt-3 space-y-4">
                    <div>
                      <div className="mb-1 flex items-center justify-between"><Label htmlFor="meta-title">Meta Title</Label><span className={cn('text-xs', form.metaTitle.length > 60 ? 'text-rose-600' : form.metaTitle.length > 55 ? 'text-amber-600' : 'text-slate-500')}>{form.metaTitle.length}/60</span></div>
                      <Input id="meta-title" value={form.metaTitle} onChange={(event) => setForm((prev) => ({ ...prev, metaTitle: event.target.value.slice(0, 120) }))} placeholder="SEO title" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between"><Label htmlFor="meta-description">Meta Description</Label><span className={cn('text-xs', form.metaDescription.length > 160 ? 'text-rose-600' : form.metaDescription.length > 145 ? 'text-amber-600' : 'text-slate-500')}>{form.metaDescription.length}/160</span></div>
                      <Textarea id="meta-description" rows={4} value={form.metaDescription} onChange={(event) => setForm((prev) => ({ ...prev, metaDescription: event.target.value.slice(0, 300) }))} placeholder="SEO description" />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Preview in Google Search</p>
                      <p className="mt-1 text-xs text-[#15803d]">preptio.com/blog/{form.slug || 'your-post-slug'}</p>
                      <p className="mt-1 text-sm font-medium text-[#1d4ed8]">{form.metaTitle || form.title || 'Untitled article'}</p>
                      <p className="mt-1 text-xs text-slate-600">{form.metaDescription || form.excerpt || 'Description preview will appear here.'}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>How to Format Your Word Document</DialogTitle>
            <DialogDescription>Use these guidelines to maximize conversion quality.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-600">
            <div><p className="font-semibold text-slate-800">Recommended</p><ul className="mt-1 list-disc pl-5 space-y-1"><li>Use Heading 1 for the title.</li><li>Use Heading 2 and Heading 3 for section structure.</li><li>Embed images directly in the document.</li><li>Use .docx format only.</li></ul></div>
            <div><p className="font-semibold text-slate-800">Avoid</p><ul className="mt-1 list-disc pl-5 space-y-1"><li>Text boxes and complex shapes.</li><li>Headers and footers for article content.</li><li>Very large uncompressed images.</li><li>.doc or non-Word formats.</li></ul></div>
          </div>
          <DialogFooter><Button onClick={() => setShowGuide(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Category</DialogTitle><DialogDescription>Create a category for blog organization.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="new-category-name">Name</Label><Input id="new-category-name" value={newCategory.name} onChange={(event) => { const name = event.target.value; setNewCategory((prev) => ({ ...prev, name, slug: prev.slug || normalizeSlug(name) })) }} /></div>
            <div><Label htmlFor="new-category-slug">Slug</Label><Input id="new-category-slug" value={newCategory.slug} onChange={(event) => setNewCategory((prev) => ({ ...prev, slug: normalizeSlug(event.target.value) }))} /></div>
            <div><Label htmlFor="new-category-description">Description</Label><Textarea id="new-category-description" rows={3} value={newCategory.description} onChange={(event) => setNewCategory((prev) => ({ ...prev, description: event.target.value.slice(0, 240) }))} /></div>
            <div><Label>Color</Label><div className="mt-2 flex flex-wrap gap-2">{COLOR_PRESETS.map((color) => <button key={color} type="button" onClick={() => setNewCategory((prev) => ({ ...prev, color }))} className={cn('h-8 w-8 rounded-full border-2', newCategory.color === color ? 'border-slate-900' : 'border-white')} style={{ backgroundColor: color }} aria-label={`Select color ${color}`} />)}</div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCategoryModalOpen(false)}>Cancel</Button><Button className="bg-primary-green hover:bg-green-700" onClick={() => void createCategory()}>Save Category</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={authorModalOpen} onOpenChange={setAuthorModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Author</DialogTitle><DialogDescription>Create an author profile for attribution.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="new-author-name">Name</Label><Input id="new-author-name" value={newAuthor.name} onChange={(event) => setNewAuthor((prev) => ({ ...prev, name: event.target.value }))} /></div>
            <div><Label htmlFor="new-author-designation">Designation</Label><Input id="new-author-designation" value={newAuthor.designation} onChange={(event) => setNewAuthor((prev) => ({ ...prev, designation: event.target.value }))} /></div>
            <div><Label htmlFor="new-author-bio">Bio</Label><Textarea id="new-author-bio" rows={3} value={newAuthor.bio} onChange={(event) => setNewAuthor((prev) => ({ ...prev, bio: event.target.value.slice(0, 600) }))} /></div>
            <div><Label htmlFor="new-author-avatar">Avatar URL (optional)</Label><Input id="new-author-avatar" value={newAuthor.avatarUrl} onChange={(event) => setNewAuthor((prev) => ({ ...prev, avatarUrl: event.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAuthorModalOpen(false)}>Cancel</Button><Button className="bg-primary-green hover:bg-green-700" onClick={() => void createAuthor()}>Save Author</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{`Revision History (${historyCount})`}</DialogTitle>
            <DialogDescription>
              Review previous versions and restore safely. The latest version appears first.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {historyLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading revisions...
              </div>
            ) : revisions.length ? (
              revisions.map((revision) => {
                const meta = getRevisionSaveTypeMeta(revision.saveType)
                return (
                  <div key={revision.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">{`v${revision.revisionNumber}`}</p>
                          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', meta.className)}>
                            {meta.label}
                          </span>
                          {revision.isCurrent ? (
                            <span className="inline-flex rounded-full bg-primary-green/10 px-2 py-0.5 text-[11px] font-semibold text-primary-green">
                              Current Version
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{formatRevisionDateTime(revision.createdAt)}</p>
                        <p className="mt-1 text-xs text-slate-500">{`${revision.wordCount} words`}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void openRevisionPreview(revision.id)}
                          disabled={historyLoading}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void restoreRevision(revision)}
                          disabled={restoreBusyRevisionId === revision.id}
                        >
                          {restoreBusyRevisionId === revision.id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          )}
                          Restore
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No revisions yet. Save or publish to create the first revision.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {previewRevision
                ? `Revision v${previewRevision.revisionNumber}`
                : 'Revision Preview'}
            </DialogTitle>
            <DialogDescription>
              {previewRevision
                ? `This is revision v${previewRevision.revisionNumber} from ${formatRevisionDateTime(previewRevision.createdAt)}.`
                : 'Preview selected revision content.'}
            </DialogDescription>
          </DialogHeader>
          {previewRevision ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-lg font-semibold text-slate-900">{previewRevision.title}</p>
                <p className="mt-2 text-sm text-slate-600">{previewRevision.excerpt}</p>
              </div>
              {previewRevision.coverImageUrl ? (
                <img
                  src={buildCoverPreviewSrc(previewRevision.coverImageUrl)}
                  alt="Revision cover"
                  className="h-52 w-full rounded-xl border border-slate-200 bg-slate-100 object-contain object-center"
                  loading="lazy"
                  onError={() => {
                    console.error('Revision cover failed to load:', previewRevision.coverImageUrl)
                  }}
                />
              ) : null}
              <div
                className="prose prose-slate max-w-none rounded-xl border border-slate-200 bg-white p-4"
                dangerouslySetInnerHTML={{ __html: previewRevision.content }}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .ProseMirror h1 { font-size: 1.875rem; line-height: 1.2; font-weight: 800; color: #0f172a; margin: 1.25rem 0 0.75rem; }
        .ProseMirror h2 { font-size: 1.5rem; line-height: 1.3; font-weight: 700; color: #0f172a; margin: 1.1rem 0 0.65rem; }
        .ProseMirror h3 { font-size: 1.25rem; line-height: 1.35; font-weight: 700; color: #0f172a; margin: 1rem 0 0.6rem; }
        .ProseMirror h4 { font-size: 1.125rem; line-height: 1.4; font-weight: 600; color: #0f172a; margin: 0.9rem 0 0.5rem; }
        .ProseMirror p { margin: 0.65rem 0; }
        .ProseMirror ul, .ProseMirror ol { margin: 0.75rem 0; padding-left: 1.35rem; }
        .ProseMirror blockquote { border-left: 4px solid #16a34a; background: #f0fdf4; padding: 0.75rem 1rem; border-radius: 0 12px 12px 0; margin: 1rem 0; }
        .ProseMirror pre { background: #0f172a; color: #4ade80; border-radius: 12px; padding: 1rem; overflow-x: auto; margin: 1rem 0; }
        .ProseMirror table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        .ProseMirror table th, .ProseMirror table td { border: 1px solid #e2e8f0; padding: 0.5rem 0.65rem; text-align: left; }
        .ProseMirror table th { background: #f0fdf4; color: #166534; font-weight: 600; }
      `}</style>
    </main>
  )
}


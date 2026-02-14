'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, Search, Filter, AlertTriangle, Loader2, Pencil, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Question {
    id?: string
    _id?: string
    subject: string
    chapter?: string
    questionNumber: number
    question: string
    imageUrl?: string
    options: string[]
    correctAnswer?: number
    correctAnswers?: number[]
    allowMultiple?: boolean
    maxSelections?: number
    explanation: string
    difficulty: string
}

interface Subject {
    id?: string
    _id?: string
    name: string
    code: string
    chapters?: { name: string; code: string }[]
}

export default function QuestionsManagementPage() {
    const { toast } = useToast()
    const [questions, setQuestions] = useState<Question[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [subjectFilter, setSubjectFilter] = useState('all')
    const [chapterFilter, setChapterFilter] = useState('all')
    const [difficultyFilter, setDifficultyFilter] = useState('all')
    const [specialFilter, setSpecialFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(50)
    const [isDeleting, setIsDeleting] = useState(false)
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
    const [editForm, setEditForm] = useState({
        question: '',
        imageUrl: '',
        options: ['', '', '', ''],
        explanation: '',
        difficulty: 'medium',
        allowMultiple: false,
        correctAnswer: 0,
        correctAnswers: [] as number[],
        maxSelections: 2,
    })

    useEffect(() => {
        fetchSubjects()
    }, [])

    useEffect(() => {
        fetchQuestions()
    }, [subjectFilter, chapterFilter, difficultyFilter, specialFilter, page, searchQuery, pageSize])

    const fetchQuestions = async () => {
        try {
            setIsLoading(true)
            const params = new URLSearchParams()
            params.set('limit', String(pageSize))
            params.set('page', String(page))
            if (subjectFilter !== 'all') {
                params.set('subject', subjectFilter)
            }
            if (chapterFilter !== 'all') {
                params.set('chapter', chapterFilter)
            }
            if (searchQuery.trim()) {
                params.set('search', searchQuery.trim())
            }
            if (difficultyFilter !== 'all') {
                params.set('difficulty', difficultyFilter)
            }
            if (specialFilter === 'reported') {
                params.set('reported', '1')
            } else if (specialFilter === 'new') {
                params.set('new', '1')
            } else if (specialFilter === 'multiple') {
                params.set('multiple', '1')
            } else if (specialFilter === 'image') {
                params.set('hasImage', '1')
            }
            const url = `/api/questions?${params.toString()}`
            const response = await fetch(url)
            const data = await response.json()
            setQuestions(data.questions || [])
            setTotal(typeof data.total === 'number' ? data.total : (data.count || 0))
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load questions.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const fetchSubjects = async () => {
        try {
            setIsLoadingSubjects(true)
            const response = await fetch('/api/admin/subjects')
            const data = await response.json()
            if (response.ok) {
                setSubjects(data.subjects || [])
            }
        } catch (error) {
            console.error('Failed to load subjects:', error)
        } finally {
            setIsLoadingSubjects(false)
        }
    }

    useEffect(() => {
        setChapterFilter('all')
    }, [subjectFilter])

    const getQuestionId = (q: Question) => String(q.id ?? q._id ?? '')

    const clearFilters = () => {
        setSearchQuery('')
        setSubjectFilter('all')
        setChapterFilter('all')
        setDifficultyFilter('all')
        setSpecialFilter('all')
        setPage(1)
    }

    const handleBulkDelete = async () => {
        try {
            setIsDeleting(true)
            const response = await fetch('/api/admin/questions/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: subjectFilter,
                    deleteAll: true
                })
            })

            if (response.ok) {
                toast({
                    title: "Success",
                    description: `All questions in ${subjectFilter === 'all' ? 'entire database' : subjectFilter} deleted.`,
                })
                fetchQuestions()
            } else {
                throw new Error('Failed to delete')
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Bulk deletion failed.",
                variant: "destructive"
            })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleDeleteQuestion = async (id: string) => {

        try {
            const response = await fetch(`/api/admin/questions/${id}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Question deleted successfully.",
                })
                setQuestions(prev => prev.filter(q => (q.id ?? q._id) !== id))
            } else {
                const data = await response.json()
                throw new Error(data.error || 'Failed to delete')
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Deletion failed.",
                variant: "destructive"
            })
        }
    }

    const openEdit = (q: Question) => {
        const hasMultiple = Boolean(q.allowMultiple || (q.correctAnswers && q.correctAnswers.length > 1))
        setEditingQuestion(q)
        setEditForm({
            question: q.question || '',
            imageUrl: q.imageUrl || '',
            options: q.options && q.options.length === 4 ? q.options : ['', '', '', ''],
            explanation: q.explanation || '',
            difficulty: q.difficulty || 'medium',
            allowMultiple: hasMultiple,
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
            correctAnswers: q.correctAnswers || [],
            maxSelections: q.maxSelections || 2,
        })
        setIsEditing(true)
    }

    const handleEditSave = async () => {
        if (!editingQuestion) return
        if (editForm.options.some((opt) => !opt.trim())) {
            toast({
                title: "Error",
                description: "All 4 options are required.",
                variant: "destructive"
            })
            return
        }

        if (editForm.allowMultiple && editForm.correctAnswers.length === 0) {
            toast({
                title: "Error",
                description: "Select at least one correct answer.",
                variant: "destructive"
            })
            return
        }

        try {
            const questionId = editingQuestion.id ?? editingQuestion._id
                const response = await fetch(`/api/admin/questions/${questionId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: editForm.question,
                        imageUrl: editForm.imageUrl?.trim() || null,
                        options: editForm.options,
                        explanation: editForm.explanation,
                        difficulty: editForm.difficulty,
                        allowMultiple: editForm.allowMultiple,
                    correctAnswer: editForm.allowMultiple ? undefined : editForm.correctAnswer,
                    correctAnswers: editForm.allowMultiple ? editForm.correctAnswers : undefined,
                    maxSelections: editForm.allowMultiple ? editForm.maxSelections : 1,
                    subject: editingQuestion.subject,
                    chapter: editingQuestion.chapter,
                    questionNumber: editingQuestion.questionNumber,
                }),
            })

            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update question')
            }

            toast({
                title: "Updated",
                description: "Question updated successfully.",
            })

            setQuestions((prev) => prev.map((q) => ((q.id ?? q._id) === questionId ? data.question : q)))
            setIsEditing(false)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Update failed.",
                variant: "destructive"
            })
        }
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const activeFilters = useMemo(() => {
        const chips: { label: string; onClear: () => void }[] = []
        if (searchQuery.trim()) chips.push({ label: `Search: ${searchQuery.trim()}`, onClear: () => setSearchQuery('') })
        if (subjectFilter !== 'all') chips.push({ label: `Subject: ${subjectFilter}`, onClear: () => setSubjectFilter('all') })
        if (chapterFilter !== 'all') chips.push({ label: `Chapter: ${chapterFilter}`, onClear: () => setChapterFilter('all') })
        if (difficultyFilter !== 'all') chips.push({ label: `Difficulty: ${difficultyFilter}`, onClear: () => setDifficultyFilter('all') })
        if (specialFilter !== 'all') {
            const label = specialFilter === 'reported'
                ? 'Reported by users'
                : specialFilter === 'new'
                    ? 'Newly added'
                    : specialFilter === 'multiple'
                        ? 'Multiple answers'
                        : 'Has image'
            chips.push({ label, onClear: () => setSpecialFilter('all') })
        }
        return chips
    }, [searchQuery, subjectFilter, chapterFilter, difficultyFilter, specialFilter])

    return (
        <main className="min-h-screen bg-background-light">
            <AdminHeader />

            <div className="pt-[80px] pb-12">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="font-heading text-3xl font-bold text-text-dark">Question Management</h1>
                            <p className="text-text-light">Total questions found: {total.toLocaleString()}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="gap-2">
                                        <Trash2 size={16} />
                                        Bulk Delete {subjectFilter === 'all' ? 'All' : subjectFilter}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-white">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2 text-error-red">
                                            <AlertTriangle />
                                            Critical Warning!
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action will permanently delete <strong>{subjectFilter === 'all' ? 'ALL questions in the database' : `all questions for subject "${subjectFilter}"`}</strong>. This cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleBulkDelete}
                                            className="bg-red-600 hover:bg-red-700 text-white"
                                            disabled={isDeleting}
                                        >
                                            {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Link href="/admin/questions/duplicates">
                                <Button variant="outline" className="gap-2">
                                    <AlertTriangle size={16} />
                                    Duplicate Questions
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <Card className="border border-border mb-8">
                        <CardHeader className="pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_250px] gap-4 items-center">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" size={18} />
                                    <Input
                                        placeholder="Search questions..."
                                        className="pl-10 border-border"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value)
                                            setPage(1)
                                        }}
                                    />
                                </div>
                                <div className="w-full">
                                    <Select value={subjectFilter} onValueChange={(value) => {
                                        setSubjectFilter(value)
                                        setPage(1)
                                    }}>
                                        <SelectTrigger className="border-border">
                                            <Filter className="mr-2" size={16} />
                                            <SelectValue placeholder="All Subjects" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Subjects</SelectItem>
                                            {subjects.map((sub, idx) => (
                                                <SelectItem key={sub.id ?? sub._id ?? `${sub.code ?? 'subject'}-${idx}`} value={sub.code}>
                                                    {sub.name} ({sub.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="mt-4">
                                <Select
                                    value={chapterFilter}
                                    onValueChange={(value) => {
                                        setChapterFilter(value)
                                        setPage(1)
                                    }}
                                    disabled={subjectFilter === 'all'}
                                >
                                    <SelectTrigger className="border-border">
                                        <Filter className="mr-2" size={16} />
                                        <SelectValue placeholder={subjectFilter === 'all' ? 'Select subject first' : 'All Chapters'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Chapters</SelectItem>
                                        {(subjects.find((s) => s.code === subjectFilter)?.chapters || []).map((ch, idx) => (
                                            <SelectItem key={`${ch.code}-${idx}`} value={ch.code}>
                                                {ch.name} ({ch.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <Select
                                        value={difficultyFilter}
                                        onValueChange={(value) => {
                                            setDifficultyFilter(value)
                                            setPage(1)
                                        }}
                                    >
                                        <SelectTrigger className="border-border">
                                            <Filter className="mr-2" size={16} />
                                            <SelectValue placeholder="All Difficulty Levels" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Difficulty Levels</SelectItem>
                                            <SelectItem value="easy">Easy</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="hard">Hard</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Select
                                        value={specialFilter}
                                        onValueChange={(value) => {
                                            setSpecialFilter(value)
                                            setPage(1)
                                        }}
                                    >
                                        <SelectTrigger className="border-border">
                                            <Filter className="mr-2" size={16} />
                                            <SelectValue placeholder="All Question Types" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Question Types</SelectItem>
                                            <SelectItem value="reported">Reported by users</SelectItem>
                                            <SelectItem value="new">Newly added</SelectItem>
                                            <SelectItem value="multiple">Multiple answers</SelectItem>
                                            <SelectItem value="image">Has image</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                {activeFilters.length > 0 ? (
                                    <>
                                        {activeFilters.map((chip) => (
                                            <Badge key={chip.label} variant="outline" className="gap-1">
                                                {chip.label}
                                                <button
                                                    type="button"
                                                    onClick={chip.onClear}
                                                    className="ml-1 text-text-light hover:text-text-dark"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </Badge>
                                        ))}
                                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-text-light">
                                            Clear Filters
                                        </Button>
                                    </>
                                ) : (
                                    <span className="text-xs text-text-light">No active filters</span>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center p-12">
                                    <Loader2 className="animate-spin text-primary-green" size={32} />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-border sticky top-0 bg-white z-10">
                                                <TableHead className="w-[90px]">#</TableHead>
                                                <TableHead>Question</TableHead>
                                                <TableHead>Subject</TableHead>
                                                <TableHead>Chapter</TableHead>
                                                <TableHead>Difficulty</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {questions.length > 0 ? (
                                                questions.map((q, idx) => (
                                                    <TableRow key={q.id ?? q._id ?? `${q.questionNumber ?? 'q'}-${idx}`} className="border-border hover:bg-background-light/50">
                                                        <TableCell className="font-mono text-xs">{q.questionNumber}</TableCell>
                                                        <TableCell className="max-w-md">
                                                            <div className="font-medium text-text-dark line-clamp-2">{q.question}</div>
                                                            {q.imageUrl ? (
                                                                <div className="mt-2">
                                                                    <img
                                                                        src={q.imageUrl}
                                                                        alt="Question diagram"
                                                                        className="h-16 w-auto rounded border border-border bg-white object-contain"
                                                                        loading="lazy"
                                                                    />
                                                                </div>
                                                            ) : null}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="bg-primary-green/5 text-primary-green border-primary-green/20">
                                                                {q.subject}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-text-light text-xs">
                                                            {q.chapter || '--'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={
                                                                q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' :
                                                                    q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-rose-100 text-rose-700'
                                                            }>
                                                                {q.difficulty}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-primary-green hover:text-primary-green hover:bg-primary-green/10"
                                                                onClick={() => openEdit(q)}
                                                            >
                                                                <Pencil size={16} />
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-100"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent className="bg-white">
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle className="text-error-red">Delete Question?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This will permanently delete this question. This action cannot be undone.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDeleteQuestion(q.id ?? q._id)}
                                                                            className="bg-red-600 hover:bg-red-700 text-white"
                                                                        >
                                                                            Delete
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center p-12 text-text-light">
                                                        No questions found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                </div>
                            )}
                        </CardContent>
                        {!isLoading && totalPages > 1 && (
                            <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-6 pb-6">
                                <div className="text-sm text-text-light">
                                    Page {page} of {totalPages}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page <= 1}
                                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                    >
                                        Previous
                                    </Button>
                                    <div className="flex items-center gap-2 text-sm text-text-light">
                                        <span>Jump to</span>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={totalPages}
                                            defaultValue={page}
                                            onKeyDown={(e) => {
                                                if (e.key !== 'Enter') return
                                                const value = Number((e.target as HTMLInputElement).value)
                                                if (!Number.isNaN(value)) {
                                                    setPage(Math.min(Math.max(1, value), totalPages))
                                                }
                                            }}
                                            className="w-20"
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="bg-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Question</DialogTitle>
                        <DialogDescription>Update the question text, options, and correct answer.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Question</label>
                            <Textarea
                                value={editForm.question}
                                onChange={(e) => setEditForm(prev => ({ ...prev, question: e.target.value }))}
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Question Image URL (optional)</label>
                            <Input
                                placeholder="https://..."
                                value={editForm.imageUrl}
                                onChange={(e) => setEditForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                            />
                            {editForm.imageUrl ? (
                                <div className="mt-2">
                                    <img
                                        src={editForm.imageUrl}
                                        alt="Question diagram preview"
                                        className="h-40 w-auto rounded border border-border bg-white object-contain"
                                        loading="lazy"
                                    />
                                </div>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {editForm.options.map((opt, idx) => (
                                <div key={idx} className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-600">Option {String.fromCharCode(65 + idx)}</label>
                                    <Input
                                        value={opt}
                                        onChange={(e) => {
                                            const next = [...editForm.options]
                                            next[idx] = e.target.value
                                            setEditForm(prev => ({ ...prev, options: next }))
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Explanation</label>
                            <Textarea
                                value={editForm.explanation}
                                onChange={(e) => setEditForm(prev => ({ ...prev, explanation: e.target.value }))}
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Difficulty</label>
                                <Select
                                    value={editForm.difficulty}
                                    onValueChange={(value) => setEditForm(prev => ({ ...prev, difficulty: value }))}
                                >
                                    <SelectTrigger className="border-border">
                                        <SelectValue placeholder="Difficulty" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="easy">Easy</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="hard">Hard</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Multiple Correct Answers</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={editForm.allowMultiple}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, allowMultiple: e.target.checked }))}
                                    />
                                    <span className="text-sm text-gray-600">Allow multiple answers</span>
                                </div>
                                {editForm.allowMultiple && (
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-gray-500">Max selections</label>
                                        <Input
                                            type="number"
                                            min="2"
                                            max="4"
                                            value={editForm.maxSelections}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, maxSelections: Number(e.target.value) || 2 }))}
                                            className="w-20"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {editForm.allowMultiple ? (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Correct Answers</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {editForm.options.map((_, idx) => {
                                        const checked = editForm.correctAnswers.includes(idx)
                                        return (
                                            <label key={idx} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(e) => {
                                                        const next = new Set(editForm.correctAnswers)
                                                        if (e.target.checked) {
                                                            next.add(idx)
                                                        } else {
                                                            next.delete(idx)
                                                        }
                                                        setEditForm(prev => ({ ...prev, correctAnswers: Array.from(next).sort() }))
                                                    }}
                                                />
                                                Option {String.fromCharCode(65 + idx)}
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Correct Answer</label>
                                <Select
                                    value={String(editForm.correctAnswer)}
                                    onValueChange={(value) => setEditForm(prev => ({ ...prev, correctAnswer: Number(value) }))}
                                >
                                    <SelectTrigger className="border-border">
                                        <SelectValue placeholder="Correct answer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {editForm.options.map((_, idx) => (
                                            <SelectItem key={idx} value={String(idx)}>
                                                Option {String.fromCharCode(65 + idx)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditSave}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    )
}

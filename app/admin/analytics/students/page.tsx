'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'
import { Button } from '@/components/ui/button'
import { Search, Loader2, ChevronRight, Filter } from 'lucide-react'

type StudentRow = {
    id: string
    name: string
    email: string
    city: string | null
    totalMCQAttempts: number
    avgAccuracy: number
    lastActiveAt: string | null
    streak: number
    riskLevel: 'at-risk' | 'normal' | 'high-performer'
    tags: string[]
}

export default function AdminStudentListPage() {
    const router = useRouter()
    const [students, setStudents] = useState<StudentRow[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [riskFilter, setRiskFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 400)
        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true)
            try {
                const url = new URL('/api/admin/students', window.location.origin)
                if (debouncedSearch) url.searchParams.set('search', debouncedSearch)
                if (riskFilter !== 'all') url.searchParams.set('riskLevel', riskFilter)
                url.searchParams.set('page', page.toString())
                url.searchParams.set('limit', '15')

                const res = await fetch(url.toString())
                if (!res.ok) throw new Error('API Error')
                const data = await res.json()
                setStudents(data.students || [])
                setTotalPages(data.pages || 1)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        void fetchStudents()
    }, [debouncedSearch, riskFilter, page])

    const formatDate = (d: string | null) => {
        if (!d) return 'Never'
        const diffDays = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        return `${diffDays} days ago`
    }

    const getRiskBadge = (level: string) => {
        switch (level) {
            case 'at-risk':
                return <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider">At Risk</span>
            case 'high-performer':
                return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Top Tier</span>
            default:
                return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">Normal</span>
        }
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <AdminHeader />

            <div className="pt-[56px] lg:pt-[60px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Student Profiles</h1>
                        <p className="text-slate-500 text-sm mt-1">Track individual performance, weak areas, and engagement.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search name or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <select
                            title="Risk Level Filter"
                            value={riskFilter}
                            onChange={(e) => {
                                setRiskFilter(e.target.value)
                                setPage(1)
                            }}
                            className="border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-medium text-slate-700"
                        >
                            <option value="all">All Risk Levels</option>
                            <option value="high-performer">High Performers</option>
                            <option value="at-risk">At Risk</option>
                            <option value="normal">Normal</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Student</th>
                                    <th className="px-6 py-4 font-medium">Status / Tags</th>
                                    <th className="px-6 py-4 font-medium">MCQs Done</th>
                                    <th className="px-6 py-4 font-medium">Accuracy</th>
                                    <th className="px-6 py-4 font-medium">Streak</th>
                                    <th className="px-6 py-4 font-medium">Last Active</th>
                                    <th className="px-6 py-4 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && students.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center">
                                            <Loader2 className="animate-spin text-green-600 h-8 w-8 mx-auto" />
                                        </td>
                                    </tr>
                                ) : students.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center text-slate-500">
                                            No students found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    students.map((student) => (
                                        <tr
                                            key={student.id}
                                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                                            onClick={() => router.push(`/admin/analytics/students/${student.id}`)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-900">{student.name}</div>
                                                <div className="text-slate-500 text-xs mt-0.5">{student.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {getRiskBadge(student.riskLevel)}
                                                    {student.tags?.map(t => (
                                                        <span key={t} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] rounded-full uppercase font-bold tracking-wide">
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-700">
                                                {student.totalMCQAttempts.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold ${student.avgAccuracy >= 65 ? 'text-emerald-600' : student.avgAccuracy < 40 ? 'text-rose-600' : 'text-amber-600'}`}>
                                                        {student.avgAccuracy.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {student.streak > 0 ? (
                                                    <span className="flex items-center gap-1 font-semibold text-orange-500">
                                                        🔥 {student.streak}
                                                    </span>
                                                ) : '0'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                                                {formatDate(student.lastActiveAt)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <ChevronRight className="h-4 w-4 text-slate-400 inline" />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                Page <span className="font-bold">{page}</span> of <span className="font-bold">{totalPages}</span>
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || loading}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || loading}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}

'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminHeader } from '@/components/admin-header'
import { Button } from '@/components/ui/button'
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line
} from 'recharts'
import { ArrowLeft, Loader2, Save, X } from 'lucide-react'

// Define explicit types according to JSON format
type OverviewData = {
    profile: {
        name: string
        email: string
        city: string | null
        registeredAt: string
        lastActiveAt: string | null
        streak: number
        totalStudyMinutes: number
    }
    performance: {
        overallAccuracy: number
        accuracyBySubject: Array<{ subject: string, accuracy: number }>
        weeklyAccuracyTrend?: any[]
    }
    weakAreas: {
        byChapter: any[]
        mostMissedQuestions: any[]
    }
    engagement: {
        dailyActiveMinutes: Array<{ date: string, minutes: number }>
        sessionsLast30Days: number
        avgSessionDuration: number
        peakHour: number
        currentStreak: number
        longestStreak: number
    }
    mockTests: {
        attempts: Array<{
            id: string
            date: string
            score: number
            passed: boolean
            duration: number
        }>
        passRate: number
        avgScore: number
        scoreProgression: Array<{ date: string, score: number, passed: boolean }>
    }
}

export default function StudentProfilePage() {
    const { studentId } = useParams()
    const router = useRouter()

    const [data, setData] = useState<OverviewData | null>(null)
    const [loading, setLoading] = useState(true)
    const [notes, setNotes] = useState<any[]>([])
    const [newNote, setNewNote] = useState('')
    const [activeTab, setActiveTab] = useState('performance')

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                const [res, notesRes] = await Promise.all([
                    fetch(`/api/admin/students/${studentId}/overview`),
                    fetch(`/api/admin/students/${studentId}/notes`)
                ])

                if (res.ok) setData(await res.json())
                if (notesRes.ok) setNotes(await notesRes.json())
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }

        if (studentId) fetchOverview()
    }, [studentId])

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newNote.trim()) return
        try {
            const res = await fetch(`/api/admin/students/${studentId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: newNote })
            })
            if (res.ok) {
                const added = await res.json()
                setNotes([added, ...notes])
                setNewNote('')
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    if (loading || !data) {
        return (
            <main className="min-h-screen bg-slate-50">
                <AdminHeader />
                <div className="pt-24 flex justify-center"><Loader2 className="animate-spin text-green-600 h-10 w-10" /></div>
            </main>
        )
    }

    const { profile, performance, weakAreas, engagement, mockTests } = data

    const initial = profile.name.charAt(0).toUpperCase()

    return (
        <main className="min-h-screen bg-slate-50 pb-20">
            <AdminHeader />

            <div className="pt-[56px] lg:pt-[60px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <button
                    onClick={() => router.back()}
                    className="text-slate-500 font-medium text-sm flex items-center hover:text-slate-800 mb-6 transition"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Students
                </button>

                {/* Header Profile Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 shadow-sm mb-6">
                    <div className="flex items-center gap-5 w-full md:w-auto">
                        <div className="h-20 w-20 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-3xl shrink-0">
                            {initial}
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 leading-tight">{profile.name}</h1>
                            <p className="text-slate-500 text-sm">{profile.email} • {profile.city || 'Unknown City'}</p>
                            <div className="flex gap-2 mt-3">
                                <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold uppercase rounded-md border border-green-200">
                                    {engagement.currentStreak > 0 ? `🔥 ${engagement.currentStreak} Day Streak` : 'No Active Streak'}
                                </span>
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase rounded-md border border-blue-200">
                                    Total mins: {profile.totalStudyMinutes}
                                </span>
                            </div>
                        </div>
                    </div>
                    <Button onClick={handlePrint} variant="outline" className="border-slate-300 w-full md:w-auto">
                        Print Report
                    </Button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 overflow-x-auto mb-6 hide-scrollbar">
                    {['performance', 'weak-areas', 'engagement', 'mock-tests'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === tab ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                                }`}
                        >
                            {tab.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* PERFORMANCE TAB */}
                        {activeTab === 'performance' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <p className="text-sm font-semibold text-slate-500 mb-1">Overall Accuracy</p>
                                        <p className={`text-3xl font-black ${performance.overallAccuracy >= 65 ? 'text-emerald-600' : performance.overallAccuracy < 40 ? 'text-rose-600' : 'text-amber-500'}`}>
                                            {performance.overallAccuracy.toFixed(1)}%
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-4 border-l-4 border-green-500 pl-3">Accuracy by Subject (Lifetime)</h3>
                                    <div className="h-64">
                                        {performance.accuracyBySubject.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={performance.accuracyBySubject} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                    <XAxis dataKey="subject" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                                                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                                    <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                                                        {performance.accuracyBySubject.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.accuracy >= 65 ? '#16A34A' : '#F59E0B'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-400">No subject data found.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* WEAK AREAS TAB */}
                        {activeTab === 'weak-areas' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <h3 className="font-bold text-slate-800 mb-4 border-l-4 border-rose-500 pl-3">Most Missed Questions (Future implementation based on Mock history)</h3>
                                    <div className="h-40 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-slate-400">
                                        Sufficient question-level correlation data is not yet available for this user.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ENGAGEMENT TAB */}
                        {activeTab === 'engagement' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-4 justify-center flex flex-col items-center rounded-xl border border-slate-200 shadow-sm">
                                        <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">Sessions (30d)</p>
                                        <p className="text-2xl font-black text-slate-900 mt-2">{engagement.sessionsLast30Days}</p>
                                    </div>
                                    <div className="bg-white p-4 justify-center flex flex-col items-center rounded-xl border border-slate-200 shadow-sm">
                                        <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">Avg Mins/Session</p>
                                        <p className="text-2xl font-black text-slate-900 mt-2">{Math.round(engagement.avgSessionDuration)}</p>
                                    </div>
                                    <div className="bg-white p-4 justify-center flex flex-col items-center rounded-xl border border-slate-200 shadow-sm">
                                        <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">Best Streak</p>
                                        <p className="text-2xl font-black text-orange-500 mt-2">{engagement.longestStreak}</p>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-4 border-l-4 border-blue-500 pl-3">Daily Active Minutes (Last 30 Days)</h3>
                                    <div className="h-64">
                                        {engagement.dailyActiveMinutes.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={engagement.dailyActiveMinutes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                                                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                                                    <Tooltip />
                                                    <Line type="stepAfter" dataKey="minutes" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-400">No recent activity found.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MOCK TESTS TAB */}
                        {activeTab === 'mock-tests' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <p className="text-sm font-semibold text-slate-500 mb-1">Pass Rate</p>
                                        <p className="text-3xl font-black text-slate-900">{mockTests.passRate.toFixed(1)}%</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <p className="text-sm font-semibold text-slate-500 mb-1">Avg Score</p>
                                        <p className="text-3xl font-black text-slate-900">{mockTests.avgScore.toFixed(1)}%</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-xs">
                                            <tr>
                                                <th className="px-6 py-4">Date</th>
                                                <th className="px-6 py-4">Score</th>
                                                <th className="px-6 py-4">Time Taken</th>
                                                <th className="px-6 py-4">Result</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {mockTests.attempts.length > 0 ? mockTests.attempts.map((attempt) => (
                                                <tr key={attempt.id}>
                                                    <td className="px-6 py-4 text-slate-600 font-medium">{new Date(attempt.date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-900">{Math.round(attempt.score)}%</td>
                                                    <td className="px-6 py-4 text-slate-500">{Math.round(attempt.duration / 60)} mins</td>
                                                    <td className="px-6 py-4">
                                                        {attempt.passed ? <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wide">Pass</span> : <span className="bg-rose-100 text-rose-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wide">Fail</span>}
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={4} className="text-center py-10 text-slate-400">No mock tests attempted yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Sidebar Area: Notes */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md border border-slate-800">
                            <h3 className="font-bold mb-4 flex items-center">Admin Notes</h3>

                            <form onSubmit={handleAddNote} className="mb-6">
                                <textarea
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-green-500 placeholder:text-slate-500"
                                    rows={3}
                                    placeholder="Record observation..."
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                />
                                <Button type="submit" size="sm" className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold">
                                    <Save className="h-4 w-4 mr-2" /> Add Note
                                </Button>
                            </form>

                            <div className="space-y-3">
                                {notes.map(note => (
                                    <div key={note.id} className="bg-slate-800 border-l-2 border-green-500 rounded p-3 text-sm shadow-sm relative group">
                                        <p className="text-slate-200 mb-1">{note.note}</p>
                                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-medium">
                                            <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                            <span>{note.adminId === 'system' ? 'System' : 'Admin'}</span>
                                        </div>
                                    </div>
                                ))}
                                {notes.length === 0 && (
                                    <p className="text-slate-500 text-sm text-center py-2">No notes recorded.</p>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    )
}

'use client'

import React, { useState, useEffect } from 'react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, BookOpen, GraduationCap, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Subject {
    _id: string
    name: string
    code: string
    description: string
    totalQuestions: number
}

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchSubjects()
    }, [])

    const fetchSubjects = async () => {
        try {
            const response = await fetch('/api/admin/subjects')
            const data = await response.json()
            setSubjects(data.subjects || [])
        } catch (error) {
            console.error('Failed to fetch subjects:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-background-light">
            <Navigation />

            <div className="pt-20 md:pt-28 pb-16 md:pb-20">
                <div className="max-w-7xl mx-auto px-6">
                    {/* Header */}
                    <div className="text-center mb-12 md:mb-20 space-y-4">
                        <div className="inline-flex items-center gap-2 bg-primary-green/10 text-primary-green px-4 py-2 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 md:mb-4">
                            <GraduationCap size={16} />
                            CA Examination Subjects
                        </div>
                        <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-black text-text-dark leading-tight">
                            Explore Your <span className="text-primary-green">Curriculum</span>
                        </h1>
                        <p className="text-text-light text-base md:text-lg max-w-2xl mx-auto">
                            Comprehensive preparation materials for every major CA subject.
                            Start practicing today and track your progress.
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-primary-green" size={48} />
                            <p className="text-text-light font-medium">Loading subjects...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {subjects.map((subject, idx) => (
                                <Link
                                    href={`/subjects/${encodeURIComponent(subject.code)}`}
                                    key={subject._id ?? subject.code ?? `${subject.name ?? 'subject'}-${idx}`}
                                    className="group"
                                >
                                    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full overflow-hidden bg-white">
                                        <div className="h-2 bg-primary-green/20 group-hover:bg-primary-green transition-colors" />
                                        <CardContent className="p-8">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="p-4 bg-slate-50 text-slate-800 rounded-2xl group-hover:bg-primary-green group-hover:text-white transition-all duration-300">
                                                    <BookOpen size={28} />
                                                </div>
                                                <span className="text-xs font-black text-slate-300 uppercase letter-spacing-2 tracking-widest group-hover:text-primary-green transition-colors">
                                                    {subject.code}
                                                </span>
                                            </div>

                                            <h3 className="text-2xl font-bold text-text-dark mb-4 group-hover:text-primary-green transition-colors">
                                                {subject.name}
                                            </h3>

                                            <p className="text-slate-500 text-sm leading-relaxed mb-8 line-clamp-3">
                                                {subject.description || `Comprehensive MCQ bank for ${subject.name}. Build confidence with real-style examination questions.`}
                                            </p>

                                            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Questions</span>
                                                    <span className="text-xl font-black text-slate-800">{subject.totalQuestions.toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-primary-green font-bold text-sm">
                                                    Try Now
                                                    <ArrowRight size={18} className="translate-x-0 group-hover:translate-x-2 transition-transform" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && subjects.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-dashed border-slate-200">
                            <GraduationCap size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-xl font-bold text-text-dark mb-2">No Subjects Found</h3>
                            <p className="text-text-light mb-8">Administrative staff are currently updating the curriculum.</p>
                            <Link href="/">
                                <Button className="bg-slate-800 px-8">Back to Home</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </main>
    )
}

'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Script from 'next/script'

type Question = {
    id: string
    question: string
    options: string[]
    subject: string
    correct_answer: number
}

const SUBJECT_NAMES: Record<string, string> = {
    ALL: 'All',
    BAEIVII: 'Business & Commercial Knowledge',
    BAEIV2E: 'Business Economics & Commercial Knowledge vol.2',
    FOA: 'Fundamentals of Accounting',
    QAFB: 'Quantitative Aptitude & Business Economics',
}

const SUBJECT_COLORS: Record<string, string> = {
    BAEIVII: 'bg-blue-100 text-blue-800 border-blue-200',
    BAEIV2E: 'bg-purple-100 text-purple-800 border-purple-200',
    FOA: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    QAFB: 'bg-orange-100 text-orange-800 border-orange-200',
}

function AdSenseSlot() {
    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                ; ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
            }
        } catch (e) {
            console.error(e)
        }
    }, [])

    return (
        <div className="w-full my-10 flex justify-center overflow-hidden min-h-[90px] bg-slate-50 border border-slate-200 rounded-xl items-center text-slate-400 text-sm shadow-inner relative">
            <span className="absolute z-0 opacity-50 text-xs tracking-widest font-semibold uppercase">Advertisement</span>
            <ins
                className="adsbygoogle relative z-10"
                style={{ display: 'block', width: '100%' }}
                data-ad-client="ca-pub-5583540622875378"
                data-ad-slot="XXXXXXXXXX"
                data-ad-format="auto"
                data-full-width-responsive="true"
            ></ins>
        </div>
    )
}

export function PracticeClient({ initialQuestions }: { initialQuestions: Question[] }) {
    const [activeTab, setActiveTab] = useState('ALL')
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({})

    const filteredQuestions = useMemo(() => {
        if (activeTab === 'ALL') return initialQuestions
        return initialQuestions.filter((q) => q.subject === activeTab)
    }, [initialQuestions, activeTab])

    const tabs = ['ALL', 'BAEIVII', 'BAEIV2E', 'FOA', 'QAFB']

    return (
        <div>
            <Script
                id="adsbygoogle-script"
                async
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5583540622875378"
                crossOrigin="anonymous"
            />

            {/* Subject Filter Tabs */}
            <div className="sticky top-20 z-40 bg-slate-50/90 backdrop-blur-md py-4 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex flex-wrap gap-2 justify-center">
                    {tabs.map((tab) => {
                        const count = tab === 'ALL' ? initialQuestions.length : initialQuestions.filter((q) => q.subject === tab).length
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 border shadow-sm ${activeTab === tab
                                    ? 'bg-green-600 text-white border-green-700 hover:bg-green-700'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                            >
                                {SUBJECT_NAMES[tab] || tab}
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] leading-tight font-bold ${activeTab === tab ? 'bg-black/20 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}
                                >
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Top Ad */}
            <AdSenseSlot />

            {/* MCQ Card List */}
            <div className="space-y-8">
                {filteredQuestions.map((q: Question, index: number) => {
                    const isAnswered = selectedAnswers[q.id] !== undefined
                    const selectedOption = selectedAnswers[q.id]

                    return (
                        <div key={q.id}>
                            {index > 0 && index % 25 === 0 && <AdSenseSlot />}

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 hover:shadow-md transition-shadow">
                                <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                                    <span className="font-extrabold text-gray-300 text-2xl drop-shadow-sm">Q{index + 1}</span>
                                    <span
                                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wide border shadow-sm ${SUBJECT_COLORS[q.subject] || 'bg-gray-100 text-gray-800 border-gray-200'
                                            }`}
                                    >
                                        {SUBJECT_NAMES[q.subject] || q.subject}
                                    </span>
                                </div>

                                <h3 className="text-lg md:text-xl font-semibold text-slate-800 mb-8 leading-snug">
                                    {q.question}
                                </h3>

                                <div className="space-y-4">
                                    {q.options.map((opt: string, optIdx: number) => {
                                        const isCorrect = q.correct_answer === optIdx
                                        const isSelected = selectedOption === optIdx

                                        let btnClass =
                                            'w-full text-left p-5 rounded-xl border-2 transition-all flex items-start group '
                                        let btnContentClass = 'text-slate-700 font-medium leading-relaxed'
                                        let letterClass =
                                            'w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 font-bold mr-4 shrink-0 transition-colors group-hover:bg-slate-200 group-hover:text-slate-700'

                                        if (isAnswered) {
                                            if (isCorrect) {
                                                btnClass += 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                                                letterClass =
                                                    'w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500 text-white font-bold mr-4 shrink-0 shadow-sm'
                                                btnContentClass = 'text-emerald-900 font-semibold'
                                            } else if (isSelected) {
                                                btnClass += 'border-rose-400 bg-rose-50/50'
                                                letterClass =
                                                    'w-8 h-8 flex items-center justify-center rounded-lg bg-rose-400 text-white font-bold mr-4 shrink-0'
                                                btnContentClass = 'text-rose-900 line-through opacity-80'
                                            } else {
                                                btnClass += 'border-slate-100 bg-slate-50/30 opacity-60'
                                                letterClass =
                                                    'w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 font-bold mr-4 shrink-0'
                                                btnContentClass = 'text-slate-500'
                                            }
                                        } else {
                                            btnClass +=
                                                'border-slate-200 hover:border-green-500 hover:bg-green-50/20 bg-white cursor-pointer shadow-sm hover:shadow-md'
                                        }

                                        return (
                                            <button
                                                key={optIdx}
                                                disabled={isAnswered}
                                                onClick={() => setSelectedAnswers((prev: Record<string, number>) => ({ ...prev, [q.id]: optIdx }))}
                                                className={btnClass}
                                            >
                                                <span className={letterClass}>{String.fromCharCode(65 + optIdx)}</span>
                                                <span className={`${btnContentClass} pt-0.5`}>{opt}</span>
                                            </button>
                                        )
                                    })}
                                </div>

                                {isAnswered && (
                                    <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 -mx-6 md:-mx-8 -mb-6 md:-mb-8 px-6 md:px-8 py-4 rounded-b-2xl">
                                        <p
                                            className={`text-sm font-bold flex items-center gap-2 ${selectedOption === q.correct_answer ? 'text-emerald-600' : 'text-rose-600'
                                                }`}
                                        >
                                            {selectedOption === q.correct_answer ? (
                                                <>
                                                    <span className="text-lg">✅</span> Correct! Great job.
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-lg">❌</span> Incorrect. The correct answer is Highlighted above.
                                                </>
                                            )}
                                        </p>
                                        <Link
                                            href="/signup"
                                            className="text-sm font-bold text-slate-700 bg-white border border-slate-200 shadow-sm hover:bg-green-50 hover:text-green-700 hover:border-green-200 px-4 py-2 rounded-full flex items-center transition-all group w-fit"
                                        >
                                            Attempt this on Preptio
                                            <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>


        </div>
    )
}

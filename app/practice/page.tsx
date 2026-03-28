import Link from 'next/link'
import { PracticeClient } from './practice-client'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
    title: 'Free CA Foundation MCQ Practice | Preptio',
    description: 'Practice 200+ free MCQs for CA Foundation — Business & Commercial Knowledge, Fundamentals of Accounting, Quantitative Aptitude, and Business Economics. No signup required.',
}

async function getMcqs() {
    const [baeivii, baeiv2e, foa, qafb] = await Promise.all([
        prisma.$queryRawUnsafe(`SELECT id, question, options, subject, "correctAnswer" as correct_answer FROM "Question" WHERE subject = 'BAEIVII' ORDER BY RANDOM() LIMIT 60`),
        prisma.$queryRawUnsafe(`SELECT id, question, options, subject, "correctAnswer" as correct_answer FROM "Question" WHERE subject = 'BAEIV2E' ORDER BY RANDOM() LIMIT 55`),
        prisma.$queryRawUnsafe(`SELECT id, question, options, subject, "correctAnswer" as correct_answer FROM "Question" WHERE subject = 'FOA' ORDER BY RANDOM() LIMIT 50`),
        prisma.$queryRawUnsafe(`SELECT id, question, options, subject, "correctAnswer" as correct_answer FROM "Question" WHERE subject = 'QAFB' ORDER BY RANDOM() LIMIT 40`)
    ])

    const questions = [
        ...(baeivii as any[]),
        ...(baeiv2e as any[]),
        ...(foa as any[]),
        ...(qafb as any[])
    ]

    return questions.sort(() => 0.5 - Math.random())
}

export const dynamic = 'force-dynamic'

export default async function PracticePage() {
    const mcqs = await getMcqs()

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="font-bold text-xl text-green-700 flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                        Preptio
                    </Link>
                    <Link
                        href="/signup"
                        className="text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-5 py-2 rounded-full transition-colors shadow-sm"
                    >
                        Sign Up Free
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <section className="bg-white border-b border-gray-100 py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
                        Free CA Foundation MCQ Practice
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                        200+ questions across all 4 subjects. No account needed — just start practicing.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                        <Link
                            href="/signup"
                            className="inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-white bg-green-600 border border-transparent rounded-full shadow-lg hover:bg-green-700 hover:-translate-y-0.5 transition-all w-full sm:w-auto"
                        >
                            Practice 5,000+ Questions Free <span className="ml-2">→</span>
                        </Link>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-gray-600">
                        <div className="flex items-center bg-gray-50 border border-gray-100 px-4 py-2 rounded-full shadow-sm">
                            <span className="text-yellow-400 mr-1.5 text-base">★</span> 4.8 Rating
                        </div>
                        <div className="flex items-center bg-gray-50 border border-gray-100 px-4 py-2 rounded-full shadow-sm">
                            5,000+ Questions
                        </div>
                        <div className="flex items-center bg-gray-50 border border-gray-100 px-4 py-2 rounded-full shadow-sm">
                            4 Subjects
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto px-4 py-10">
                <PracticeClient initialQuestions={mcqs} />
            </main>

            {/* Bottom CTA Banner */}
            <section className="border-t border-gray-200">
                <div className="bg-gradient-to-b from-white to-green-50 py-20 px-4">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">
                            You've seen 200 questions. There are 5,000+ more waiting.
                        </h2>
                        <p className="text-lg text-gray-600 mb-10 max-w-xl mx-auto">
                            Track your progress, build streaks, and master every topic — completely free.
                        </p>
                        <div className="flex flex-col items-center gap-5">
                            <Link
                                href="/signup"
                                className="inline-flex items-center justify-center px-10 py-4 text-lg font-bold text-white bg-green-600 border border-transparent rounded-full shadow-xl hover:bg-green-700 hover:scale-105 transition-all"
                            >
                                Create Free Account <span className="ml-2">→</span>
                            </Link>
                            <Link href="/login" className="text-green-700 font-medium hover:underline flex items-center gap-1 group">
                                Already have an account? Sign in <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-8 px-4 text-center text-sm text-gray-500 border-t border-gray-200">
                <div className="mb-6 space-x-6 flex items-center justify-center flex-wrap gap-y-2">
                    <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
                    <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
                    <Link href="/contact" className="hover:text-gray-900 transition-colors">Contact</Link>
                </div>
                <p>© {new Date().getFullYear()} Preptio. Free CA Foundation Exam Preparation.</p>
                <div className="flex justify-center mt-6">
                    <Link href="/practice" className="text-[10px] text-white opacity-0 pointer-events-none select-none">
                        Free Practice MCQs
                    </Link>
                </div>
            </footer>
        </div>
    )
}

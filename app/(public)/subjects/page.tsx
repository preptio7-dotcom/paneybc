'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  Calculator,
  Globe,
  GraduationCap,
  Search,
  TrendingUp,
} from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'

type Subject = {
  _id: string
  name: string
  code: string
  description: string
  totalQuestions: number
  difficultyCounts?: {
    easy: number
    medium: number
    hard: number
  }
}

type AccentPalette = {
  hex: string
  rgb: string
}

const ACCENT_PALETTE: AccentPalette[] = [
  { hex: '#16a34a', rgb: '22,163,74' }, // green
  { hex: '#2563eb', rgb: '37,99,235' }, // blue
  { hex: '#7c3aed', rgb: '124,58,237' }, // purple
  { hex: '#ea580c', rgb: '234,88,12' }, // orange
]

const SUBJECT_ACCENTS: Record<string, AccentPalette> = {
  BAEIVI: ACCENT_PALETTE[0],
  BAEIV2E: ACCENT_PALETTE[1],
  FOA: ACCENT_PALETTE[2],
  QAFB: ACCENT_PALETTE[3],
}

const SUBJECT_TITLES: Record<string, string> = {
  BAEIVI: 'Business & Economic Insights Vol I - ITB',
  BAEIV2E: 'Business & Economic Insights Vol 2 - ECO',
  FOA: 'Fundamentals of Accounting',
  QAFB: 'Quantitative Analysis for Business',
}

const SUBJECT_DESCRIPTIONS: Record<string, string> = {
  BAEIVI:
    'Master business fundamentals and economic concepts with 2,000+ carefully curated practice questions.',
  BAEIV2E:
    'Strengthen your economic understanding and business environment knowledge for CA examinations.',
  FOA:
    'Build rock-solid accounting foundations with comprehensive MCQ practice covering all key topics.',
  QAFB:
    'Develop the quantitative and analytical skills essential for your CA qualification.',
}

const SUBJECT_ICONS = {
  BAEIVI: TrendingUp,
  BAEIV2E: Globe,
  FOA: Calculator,
  QAFB: BarChart2,
} as const

type SortOption = 'most' | 'least' | 'alpha'

function normalizeCode(code: string) {
  return String(code || '').trim().toUpperCase()
}

function toTitleCase(value: string) {
  return String(value || '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getAccentByCode(code: string, index: number) {
  const normalized = normalizeCode(code)
  return SUBJECT_ACCENTS[normalized] || ACCENT_PALETTE[index % ACCENT_PALETTE.length]
}

function SubjectCardSkeleton({ index }: { index: number }) {
  return (
    <article
      className="relative h-full overflow-hidden rounded-[20px] border border-[#e2e8f0] bg-white p-5 md:p-[22px] xl:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] animate-pulse"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="absolute left-0 right-0 top-0 h-[3px] rounded-t-[20px] bg-slate-200" />

      <div className="flex items-start justify-between gap-4">
        <div className="h-12 w-12 md:h-14 md:w-14 rounded-[14px] bg-slate-200" />
        <div className="h-6 w-20 rounded-[8px] bg-slate-200" />
      </div>

      <div className="mt-4 h-5 w-3/4 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-full rounded bg-slate-200" />
      <div className="mt-2 h-3 w-11/12 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-8/12 rounded bg-slate-200" />

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="h-6 w-20 rounded-full bg-slate-200" />
        <div className="h-6 w-20 rounded-full bg-slate-200" />
        <div className="h-6 w-20 rounded-full bg-slate-200" />
      </div>

      <div className="mt-5 border-t border-[#f1f5f9] pt-4 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <div className="h-7 w-20 rounded bg-slate-200" />
          <div className="mt-1 h-3 w-14 rounded bg-slate-200" />
        </div>
        <div className="h-10 w-28 rounded-[10px] bg-slate-200" />
      </div>
    </article>
  )
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('most')

  useEffect(() => {
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

    void fetchSubjects()
  }, [])

  const totalQuestions = useMemo(
    () => subjects.reduce((sum, subject) => sum + (Number(subject.totalQuestions) || 0), 0),
    [subjects]
  )

  const filteredSubjects = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    const bySearch = subjects.filter((subject) => {
      if (!normalizedSearch) return true
      const code = normalizeCode(subject.code)
      const displayName =
        SUBJECT_TITLES[code] || toTitleCase(subject.name || code)
      return (
        displayName.toLowerCase().includes(normalizedSearch) ||
        code.toLowerCase().includes(normalizedSearch)
      )
    })

    return [...bySearch].sort((a, b) => {
      if (sortBy === 'least') {
        return (a.totalQuestions || 0) - (b.totalQuestions || 0)
      }
      if (sortBy === 'alpha') {
        const nameA = (SUBJECT_TITLES[normalizeCode(a.code)] || a.name || '').toLowerCase()
        const nameB = (SUBJECT_TITLES[normalizeCode(b.code)] || b.name || '').toLowerCase()
        return nameA.localeCompare(nameB)
      }
      return (b.totalQuestions || 0) - (a.totalQuestions || 0)
    })
  }, [searchQuery, sortBy, subjects])

  return (
    <main className="min-h-screen bg-background-light">
      <Navigation />

      <div className="pt-20 md:pt-28 pb-16 md:pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="subjects-fade-up text-center mb-12 md:mb-16 space-y-4">
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
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[13px] text-[#64748b]">
              <span>{subjects.length} Subjects Available</span>
              <span>&middot;</span>
              <span>{totalQuestions.toLocaleString()}+ Total Questions</span>
              <span>&middot;</span>
              <span>100% Free to Practice</span>
            </div>
          </div>

          <div className="subjects-fade-up-delay mt-8 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative w-full md:w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search subjects..."
                className="h-10 w-full rounded-[10px] border border-[#e2e8f0] bg-white pl-9 pr-3 text-[13px] text-slate-700 outline-none transition-all focus:border-[#16a34a] focus:shadow-[0_0_0_3px_rgba(22,163,74,0.1)]"
              />
            </div>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="h-10 w-full md:w-[220px] rounded-[10px] border border-[#e2e8f0] bg-white px-3 text-[13px] text-slate-700 outline-none transition-all focus:border-[#16a34a] focus:shadow-[0_0_0_3px_rgba(22,163,74,0.1)]"
            >
              <option value="most">Most Questions First</option>
              <option value="least">Least Questions First</option>
              <option value="alpha">Alphabetical A-Z</option>
            </select>
          </div>

          {isLoading ? (
            <div className="mt-8">
              <p className="sr-only">Loading subjects...</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <SubjectCardSkeleton key={index} index={index} />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredSubjects.map((subject, idx) => {
                const code = normalizeCode(subject.code)
                const accent = getAccentByCode(code, idx)
                const Icon = SUBJECT_ICONS[code as keyof typeof SUBJECT_ICONS] || BookOpen
                const title = SUBJECT_TITLES[code] || toTitleCase(subject.name || code)
                const description =
                  SUBJECT_DESCRIPTIONS[code] ||
                  subject.description ||
                  `Comprehensive MCQ bank for ${title}. Build confidence with real-style examination questions.`
                const easyCount = Number(subject.difficultyCounts?.easy) || 0
                const mediumCount = Number(subject.difficultyCounts?.medium) || 0
                const hardCount = Number(subject.difficultyCounts?.hard) || 0

                return (
                  <Link
                    href={`/subjects/${encodeURIComponent(subject.code)}`}
                    key={subject._id ?? subject.code ?? `${subject.name ?? 'subject'}-${idx}`}
                    className="group subjects-card-fade"
                    style={{ animationDelay: `${150 + idx * 100}ms` }}
                  >
                    <article
                      className="relative h-full overflow-hidden rounded-[20px] border border-[#e2e8f0] bg-white p-5 md:p-[22px] xl:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-250 ease-out group-hover:-translate-y-1.5 group-hover:border-[#86efac] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.08),0_20px_48px_rgba(0,0,0,0.1)]"
                    >
                      <div
                        className="absolute left-0 right-0 top-0 h-[3px] rounded-t-[20px]"
                        style={{ backgroundColor: accent.hex }}
                      />

                      <div className="flex items-start justify-between gap-4">
                        <div
                          className="h-12 w-12 md:h-14 md:w-14 rounded-[14px] flex items-center justify-center"
                          style={{ backgroundColor: `rgba(${accent.rgb}, 0.12)` }}
                        >
                          <Icon size={26} style={{ color: accent.hex }} />
                        </div>

                        <span className="inline-flex items-center rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] px-[10px] py-1 text-[11px] font-bold tracking-[0.05em] text-[#64748b] uppercase">
                          {code}
                        </span>
                      </div>

                      <h3 className="mt-4 text-base md:text-[17px] font-bold leading-[1.35] text-[#0f172a]">
                        {title}
                      </h3>

                      <p className="mt-2 text-[13px] leading-[1.65] text-[#64748b]">
                        {description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-[10px] py-[3px] text-[11px] font-semibold text-[#166534]">
                          &bull; {easyCount} Easy
                        </span>
                        <span className="inline-flex items-center rounded-full bg-[#fef9c3] px-[10px] py-[3px] text-[11px] font-semibold text-[#854d0e]">
                          &bull; {mediumCount} Med
                        </span>
                        <span className="inline-flex items-center rounded-full bg-[#fee2e2] px-[10px] py-[3px] text-[11px] font-semibold text-[#991b1b]">
                          &bull; {hardCount} Hard
                        </span>
                      </div>

                      <div className="mt-5 border-t border-[#f1f5f9] pt-4 flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="text-[22px] leading-none font-extrabold" style={{ color: accent.hex }}>
                            {(subject.totalQuestions || 0).toLocaleString()}
                          </span>
                          <span className="mt-1 text-[11px] text-[#94a3b8]">Questions</span>
                        </div>

                        <span
                          className="inline-flex items-center gap-1 rounded-[10px] px-4 py-2.5 text-[13px] font-semibold text-white transition-all duration-200 ease-out group-hover:-translate-y-[1px] group-hover:brightness-90"
                          style={{ backgroundColor: accent.hex }}
                        >
                          Try Now <ArrowRight size={14} />
                        </span>
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>
          )}

          {!isLoading && filteredSubjects.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-dashed border-slate-200">
              <GraduationCap size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-text-dark mb-2">No Subjects Found</h3>
              <p className="text-text-light mb-8">
                Administrative staff are currently updating the curriculum.
              </p>
              <Link href="/" className="inline-flex items-center justify-center rounded-md bg-slate-800 px-8 py-2.5 text-sm font-medium text-white">
                Back to Home
              </Link>
            </div>
          )}
        </div>
      </div>

      <Footer />
      <style jsx>{`
        .subjects-fade-up {
          animation: fadeInUp 0.5s ease both;
        }
        .subjects-fade-up-delay {
          animation: fadeInUp 0.4s ease 0.1s both;
        }
        .subjects-card-fade {
          animation: fadeInUp 0.4s ease both;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .subjects-fade-up,
          .subjects-fade-up-delay,
          .subjects-card-fade {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  )
}

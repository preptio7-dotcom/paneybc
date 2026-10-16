'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, X } from 'lucide-react'

const STORAGE_KEY = 'preptio_community_banner_dismissed_v1'

export function CommunityAnnouncementBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') {
        setVisible(true)
      }
    } catch {
      setVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
  }

  if (!visible) return null

  return (
    <div className="relative z-[1001] bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white text-xs sm:text-sm py-2 px-4 shadow-xs">
      <div className="max-w-[96rem] mx-auto flex items-center justify-between gap-3">
        <Link
          href="/community"
          className="flex-1 flex items-center justify-center gap-2 group text-center hover:opacity-95 transition-opacity"
        >
          <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
            <Sparkles size={12} className="text-amber-300 animate-pulse" />
            New
          </span>
          <span className="font-medium text-white/95">
            <strong>Preptio Community is Live!</strong> Discuss ICAP MCQs, share notes, and solve doubts together with fellow CA students.
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-100 font-semibold underline underline-offset-2 shrink-0 group-hover:translate-x-0.5 transition-transform">
            <span>Join Discussion</span>
            <ArrowRight size={13} />
          </span>
        </Link>
        <button
          onClick={handleDismiss}
          type="button"
          aria-label="Dismiss community announcement"
          className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}

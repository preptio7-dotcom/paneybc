'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { shouldLoadAdsForContext } from '@/lib/ad-access'
import { Sparkles, ArrowRight, ExternalLink } from 'lucide-react'

export interface AdSlotProps {
  placement: 'dashboard' | 'results' | 'community' | 'notes' | 'blog' | 'general' | string
  headline: string
  body: string
  cta: string
  href: string
  variant?: 'banner' | 'card' | 'sidebar'
  className?: string
}

export function AdSlot({
  placement,
  headline,
  body,
  cta,
  href,
  variant = 'banner',
  className = '',
}: AdSlotProps) {
  const pathname = usePathname() || '/'
  const { user, loading } = useAuth()

  // Do not render sponsored units for blocked roles/pages.
  if (loading || !shouldLoadAdsForContext(pathname, user)) {
    return null
  }

  // Sidebar or compact card layout
  if (variant === 'sidebar' || variant === 'card') {
    return (
      <div
        className={`relative overflow-hidden w-full rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-xl shadow-indigo-950/20 transition-all hover:border-indigo-400/60 ${className}`}
        data-ad-placement={placement}
        aria-label="Sponsored announcement"
      >
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/15 px-2.5 py-0.5 text-[10px] font-extrabold tracking-widest text-amber-300 uppercase shadow-sm">
              <Sparkles className="h-3 w-3 text-amber-400" />
              Featured
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Sponsored</span>
          </div>
          <h4 className="font-heading text-base font-bold text-white leading-snug">
            {headline}
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {body}
          </p>
          <div className="pt-1">
            <Link href={href || '#'} target="_blank" rel="noopener noreferrer" className="block w-full">
              <Button className="w-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold py-2 h-9 rounded-xl text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 group">
                <span>{cta || 'Explore Now'}</span>
                <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Full-width banner layout (dashboard, results, homepage, notes)
  return (
    <div
      className={`relative overflow-hidden w-full rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-7 text-white shadow-2xl shadow-indigo-950/25 transition-all hover:border-indigo-400/60 ${className}`}
      data-ad-placement={placement}
      aria-label="Sponsored announcement"
    >
      {/* Ambient glowing radial lights */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-500/25 to-purple-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-gradient-to-tr from-amber-500/15 to-transparent blur-3xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-0.5 text-[11px] font-extrabold tracking-widest text-amber-300 uppercase shadow-sm backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
              Featured Partner
            </span>
            <span className="text-xs text-slate-400 font-medium tracking-wide">Sponsored</span>
          </div>
          <h3 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-white">
            {headline}
          </h3>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            {body}
          </p>
        </div>

        <div className="shrink-0 flex items-center">
          <Link href={href || '#'} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:via-orange-400 hover:to-amber-400 text-slate-950 font-bold px-6 py-3 h-auto rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm md:text-base group">
              <span>{cta || 'Explore Resources'}</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}


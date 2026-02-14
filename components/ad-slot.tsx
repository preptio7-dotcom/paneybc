import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface AdSlotProps {
  placement: 'dashboard' | 'results'
  headline: string
  body: string
  cta: string
  href: string
}

export function AdSlot({ placement, headline, body, cta, href }: AdSlotProps) {
  const sizeClass = placement === 'dashboard'
    ? 'min-h-[90px]'
    : 'min-h-[140px]'

  return (
    <div className={`w-full ${sizeClass} rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 px-6 py-4 shadow-sm`}
      data-ad-placement={placement}
      aria-label="Sponsored content"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600 font-bold">Sponsored</p>
          <h3 className="text-lg font-bold text-slate-900">{headline}</h3>
          <p className="text-sm text-slate-600 max-w-2xl">{body}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={href} target="_blank" rel="noopener noreferrer">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-5">
              {cta}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

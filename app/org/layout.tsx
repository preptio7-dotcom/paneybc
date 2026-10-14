'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import {
  Building2,
  BarChart2,
  LayoutDashboard,
  Loader2,
  Users,
} from 'lucide-react'

const ORG_NAV = [
  { label: 'Overview', href: '/org', icon: LayoutDashboard },
  { label: 'Members', href: '/org/members', icon: Users },
  { label: 'Analytics', href: '/org/analytics', icon: BarChart2 },
]

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [hasOrg, setHasOrg] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/org/dashboard', { cache: 'no-store' })
      .then((r) => {
        setHasOrg(r.ok)
      })
      .catch(() => setHasOrg(false))
  }, [])

  if (hasOrg === null) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center bg-background-light pt-16">
          <Loader2 className="animate-spin text-primary-green" size={40} />
        </div>
      </>
    )
  }

  if (hasOrg === false) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center bg-background-light pt-16">
          <div className="text-center space-y-4 max-w-md px-6">
            <Building2 size={48} className="mx-auto text-slate-300" />
            <h2 className="text-2xl font-bold text-text-dark">No Organization</h2>
            <p className="text-text-light">
              You are not a member of any organization yet. If your institute has signed up,
              ask the administrator to add your account.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-green hover:underline"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background-light pt-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
          {/* Org sub-nav */}
          <div className="flex items-center gap-1 mb-6 border-b border-border-light overflow-x-auto">
            {ORG_NAV.map((item) => {
              const isActive =
                item.href === '/org'
                  ? pathname === '/org'
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-primary-green text-primary-green'
                      : 'border-transparent text-text-light hover:text-text-dark hover:border-slate-300'
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              )
            })}
          </div>

          {children}
        </div>
      </div>
    </>
  )
}

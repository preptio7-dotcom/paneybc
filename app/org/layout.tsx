'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import {
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

function OrgNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light pt-16 px-4">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-7xl font-black text-slate-200">404</p>
        <h1 className="text-2xl font-bold text-text-dark">Page not found</h1>
        <p className="text-text-light">
          The institute portal isn’t available for your account. If you believe this is a
          mistake, contact your institute administrator.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-green hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'admin' | 'forbidden'>('loading')

  // The invite landing page must stay public. If it were gated here, logged-out
  // invitees would be bounced to the login screen before the invite could load.
  const isInviteRoute = pathname?.startsWith('/org/invite/') ?? false

  useEffect(() => {
    if (isInviteRoute) return
    fetch('/api/org/dashboard', { cache: 'no-store' })
      .then((r) => {
        if (r.ok) {
          setStatus('admin')
          return
        }
        if (r.status === 401) {
          // Not signed in: go to login and come back to the portal afterwards.
          router.replace(`/auth/login?${new URLSearchParams({ returnTo: '/org' })}`)
          return
        }
        // Signed in but not an org/platform admin: hide the portal behind a 404.
        setStatus('forbidden')
      })
      .catch(() => setStatus('forbidden'))
  }, [router, isInviteRoute])

  if (isInviteRoute) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background-light pt-16">{children}</div>
      </>
    )
  }

  if (status === 'loading') {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center bg-background-light pt-16">
          <Loader2 className="animate-spin text-primary-green" size={40} />
        </div>
      </>
    )
  }

  if (status === 'forbidden') {
    return (
      <>
        <Navigation />
        <OrgNotFound />
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

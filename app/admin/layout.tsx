'use client'

import { useAuth } from '@/lib/auth-context'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const hasAdminAccess = user?.role === 'admin' || user?.role === 'super_admin'

    useEffect(() => {
        if (pathname === '/admin/login' || pathname === '/admin/forgot-password') return
        if (!loading && !hasAdminAccess) {
            if (user) {
                router.push('/dashboard?error=403')
            } else {
                router.push('/admin/login')
            }
        }
    }, [hasAdminAccess, loading, pathname, router, user])

    if (pathname === '/admin/login' || pathname === '/admin/forgot-password') {
        return <>{children}</>
    }

    if (loading || !hasAdminAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-primary-green" size={48} />
                    <p className="text-text-light font-medium">Verifying admin access...</p>
                </div>
            </div>
        )
    }

    return <div className="md:pl-16 xl:pl-60">{children}</div>
}

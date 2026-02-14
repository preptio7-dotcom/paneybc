'use client'

import { useAuth } from '@/lib/auth-context'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (pathname === '/admin/login' || pathname === '/admin/forgot-password') return
        if (!loading && (!user || user.role !== 'admin')) {
            router.push('/admin/login')
        }
    }, [user, loading, router, pathname])

    if (pathname === '/admin/login' || pathname === '/admin/forgot-password') {
        return <>{children}</>
    }

    if (loading || (!user || user.role !== 'admin')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-primary-green" size={48} />
                    <p className="text-text-light font-medium">Verifying admin access...</p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

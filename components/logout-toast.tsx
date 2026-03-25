'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

export function LogoutToast() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const loggedOut = searchParams.get('loggedOut')
    if (!loggedOut) return

    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully.',
    })

    router.replace('/')
  }, [router, searchParams, toast])

  return null
}

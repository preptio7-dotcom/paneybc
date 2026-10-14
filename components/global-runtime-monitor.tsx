'use client'

import { useEffect } from 'react'

export function GlobalRuntimeMonitor() {
  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason)
      event.preventDefault()
    }

    const onError = (event: ErrorEvent) => {
      console.error(
        'Global Error:',
        event.message,
        'at',
        event.filename,
        'line',
        event.lineno
      )
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection)
    window.addEventListener('error', onError)

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      window.removeEventListener('error', onError)
    }
  }, [])

  return null
}


'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
    __preptioGtagInitialized?: boolean
  }
}

const GTAG_ID = 'G-X801R2C3NS'
const GTAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`

export function DeferredGtag() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (window.__preptioGtagInitialized) return
      window.__preptioGtagInitialized = true

      window.dataLayer = window.dataLayer || []
      const gtag = (...args: unknown[]) => {
        window.dataLayer.push(args)
      }
      window.gtag = gtag
      gtag('js', new Date())
      gtag('config', GTAG_ID)

      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${GTAG_SRC}"]`
      )
      if (existing) return

      const script = document.createElement('script')
      script.async = true
      script.src = GTAG_SRC
      script.setAttribute('data-preptio-gtag', 'true')
      document.head.appendChild(script)
    }, 3000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  return null
}

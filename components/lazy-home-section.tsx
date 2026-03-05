'use client'

import React, { useEffect, useRef, useState } from 'react'

type LazyHomeSectionProps = {
  children: React.ReactNode
  minHeight?: number
  rootMargin?: string
  id?: string
  className?: string
}

export function LazyHomeSection({
  children,
  minHeight = 320,
  rootMargin = '300px 0px',
  id,
  className,
}: LazyHomeSectionProps) {
  const markerRef = useRef<HTMLDivElement | null>(null)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return

    if (typeof IntersectionObserver === 'undefined') {
      setShouldRender(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true)
          observer.disconnect()
        }
      },
      {
        rootMargin,
        threshold: 0.01,
      }
    )

    observer.observe(marker)
    return () => observer.disconnect()
  }, [rootMargin])

  return (
    <div
      id={id}
      className={className}
      ref={markerRef}
      style={{ minHeight: shouldRender ? undefined : minHeight }}
    >
      {shouldRender ? children : null}
    </div>
  )
}

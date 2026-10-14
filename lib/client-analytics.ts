'use client'

type SubjectActionType = 'quick_start' | 'mock_test' | 'chapter_wise'

interface TrackSubjectActionPayload {
  action: SubjectActionType
  subjectCode: string
  source: 'dashboard' | 'subjects_page' | 'subjects_grid' | 'other'
}

export function trackSubjectActionClick(payload: TrackSubjectActionPayload) {
  if (typeof window === 'undefined') return

  const safeSubjectCode = encodeURIComponent(String(payload.subjectCode || '').toUpperCase())
  const safeSource = encodeURIComponent(payload.source)
  const safeAction = encodeURIComponent(payload.action)

  const body = JSON.stringify({
    path: `/event/subject-action?action=${safeAction}&subject=${safeSubjectCode}&source=${safeSource}`,
    referrer: document.referrer || '',
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timestamp: new Date().toISOString(),
  })

  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/analytics', blob)
      return
    }

    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
  } catch {
    // Never break navigation for analytics failures.
  }
}

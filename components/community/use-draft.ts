'use client'
import { useEffect, useRef, useState } from 'react'

export function useDraft<T>(key: string, initial: T) {
  const defaults = useRef(initial)
  const [draft, setDraft] = useState<{ key: string; value: T }>({ key: '', value: initial })
  useEffect(() => {
    let value = defaults.current
    try {
      const saved = sessionStorage.getItem(key)
      if (saved) value = JSON.parse(saved)
    } catch { /* Storage can be disabled. In-memory drafts still work. */ }
    setDraft({ key, value })
  }, [key])
  useEffect(() => {
    if (draft.key !== key) return
    try { sessionStorage.setItem(key, JSON.stringify(draft.value)) } catch { /* Best effort */ }
  }, [key, draft])
  return [draft.key === key ? draft.value : defaults.current, (value: T) => setDraft({ key, value })] as const
}

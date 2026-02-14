'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2 } from 'lucide-react'
import { buildInlinePdfUrl } from '@/lib/utils'

interface PdfViewerProps {
  url: string
}

type PdfStatus = 'idle' | 'loading' | 'ready' | 'error'

const buildViewerUrl = (input: string) => {
  const inlineUrl = buildInlinePdfUrl(input)
  const [base, hash] = inlineUrl.split('#')
  const params = new URLSearchParams(hash || '')
  params.set('toolbar', '0')
  params.set('navpanes', '0')
  params.set('scrollbar', '0')
  return `${base}#${params.toString()}`
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [status, setStatus] = useState<PdfStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const mobileCanvasRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  if (!url) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        Trial balance PDF is not available.
      </div>
    )
  }

  const inlineUrl = buildInlinePdfUrl(url)
  const viewerUrl = buildViewerUrl(url)
  const mobilePdfUrl = `/api/pdf-proxy?url=${encodeURIComponent(inlineUrl)}`

  useEffect(() => {
    if (!isMobile) return
    let cancelled = false

    const render = async () => {
      setStatus('loading')
      setError(null)

      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf')
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

        const loadingTask = pdfjsLib.getDocument({ url: mobilePdfUrl })
        const pdf = await loadingTask.promise
        if (cancelled) return

        const container = mobileCanvasRef.current
        if (!container) return
        container.innerHTML = ''

        const containerWidth = container.clientWidth || window.innerWidth

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          const page = await pdf.getPage(pageNum)
          if (cancelled) return

          const unscaled = page.getViewport({ scale: 1 })
          const scale = containerWidth / unscaled.width
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          if (!context) continue

          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.className = 'w-full rounded-lg border border-slate-200 bg-white shadow-sm'
          container.appendChild(canvas)

          const renderTask = page.render({ canvasContext: context, viewport })
          await renderTask.promise
        }

        if (!cancelled) setStatus('ready')
      } catch (err: any) {
        if (cancelled) return
        setStatus('error')
        setError(err?.message || 'Unable to load PDF on mobile.')
      }
    }

    render()

    return () => {
      cancelled = true
    }
  }, [inlineUrl, isMobile])

  return (
    <div className="space-y-3">
      {isMobile ? (
        <div className="space-y-3">
          {status === 'loading' && (
            <div className="flex items-center justify-center h-[280px] rounded-xl border border-slate-200 bg-white shadow-sm">
              <Loader2 className="animate-spin text-primary-green" size={32} />
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error || 'Unable to render PDF on mobile.'}
            </div>
          )}
          <div ref={mobileCanvasRef} className="space-y-4" />
        </div>
      ) : (
        <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
          <iframe
            src={viewerUrl}
            className="w-full h-[460px] md:h-[620px] xl:h-[760px]"
            title="Trial Balance PDF"
          />
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(url, '_blank')}
        className="gap-2"
      >
        <ExternalLink size={14} />
        Open in new tab
      </Button>
    </div>
  )
}

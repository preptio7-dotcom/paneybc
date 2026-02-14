'use client'

import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import { buildInlinePdfUrl } from '@/lib/utils'

interface PdfViewerProps {
  url: string
}

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
  if (!url) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        Trial balance PDF is not available.
      </div>
    )
  }

  const viewerUrl = buildViewerUrl(url)

  return (
    <div className="space-y-3">
      <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        <iframe
          src={viewerUrl}
          className="w-full h-[460px] md:h-[620px] xl:h-[760px]"
          title="Trial Balance PDF"
        />
      </div>
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

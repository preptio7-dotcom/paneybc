'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaymentProofViewerProps {
  url: string
  userName: string
  plan: string
}

export function PaymentProofViewer({ url, userName, plan }: PaymentProofViewerProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    setImageError(false)
    setIsLoading(true)
  }, [url])

  const isPDF = url.endsWith('.pdf')

  const handleImageError = () => {
    console.error('[Payment Proof] Failed to load image:', url)
    setImageError(true)
    setIsLoading(false)
  }

  const handleImageLoad = () => {
    setImageError(false)
    setIsLoading(false)
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    setImageError(false)
    setIsLoading(true)
  }

  if (isPDF) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 flex items-center gap-2">
            📄 <span>PDF file uploaded</span>
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          <Button variant="default" className="gap-2">
            Open PDF in New Tab
          </Button>
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex items-center justify-center bg-gray-100 rounded-lg h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading image...</p>
          </div>
        </div>
      )}

      {imageError ? (
        <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Failed to load image</p>
              <p className="text-xs text-red-700 mt-1">
                The image could not be loaded. This might be a temporary issue or a server configuration problem.
              </p>
              <details className="mt-2 text-xs text-red-600">
                <summary className="cursor-pointer underline">Technical details</summary>
                <p className="mt-1 font-mono break-all">{url}</p>
              </details>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Loading
            </Button>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                Open in New Tab
              </Button>
            </a>
          </div>
        </div>
      ) : (
        <img
          src={url}
          key={retryCount}
          alt="Payment proof"
          className="max-w-full h-auto rounded-lg max-h-[70vh] object-contain"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
    </div>
  )
}

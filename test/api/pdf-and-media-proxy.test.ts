// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getProxyMediaUrl, getProxyPdfUrl, isPdfUrl } from '@/lib/media-url'
import { GET as getPdfProxy, HEAD as headPdfProxy, OPTIONS as optionsPdfProxy } from '@/app/api/pdf-proxy/route'
import { GET as getR2ImageProxy } from '@/app/api/proxy/r2-image/route'

describe('media-url routing', () => {
  it('correctly identifies PDF URLs', () => {
    expect(isPdfUrl('https://pub-e8a70e9b0b27455f951bbe7f348c8b35.r2.dev/financial-statements/1770981716643-home_appliances_data.pdf')).toBe(true)
    expect(isPdfUrl('https://example.com/doc.pdf#page=1')).toBe(true)
    expect(isPdfUrl('https://example.com/download?format=pdf')).toBe(true)
    expect(isPdfUrl('/api/pdf-proxy?url=https%3A%2F%2Fexample.com%2Fdoc.pdf')).toBe(true)
    expect(isPdfUrl('https://pub-e8a70e9b0b27455f951bbe7f348c8b35.r2.dev/images/payment.png')).toBe(false)
  })

  it('routes PDF URLs to pdf-proxy instead of r2-image even on R2 domains', () => {
    const pdfUrl = 'https://pub-e8a70e9b0b27455f951bbe7f348c8b35.r2.dev/financial-statements/1770981716643-home_appliances_data.pdf'
    const proxiedMedia = getProxyMediaUrl(pdfUrl)
    expect(proxiedMedia).toBe(`/api/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`)
    expect(proxiedMedia).not.toContain('/api/proxy/r2-image')

    const proxiedPdf = getProxyPdfUrl(pdfUrl)
    expect(proxiedPdf).toBe(`/api/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`)
  })

  it('routes image URLs on R2 domains to r2-image', () => {
    const imgUrl = 'https://pub-e8a70e9b0b27455f951bbe7f348c8b35.r2.dev/images/avatar.png'
    const proxiedMedia = getProxyMediaUrl(imgUrl)
    expect(proxiedMedia).toBe(`/api/proxy/r2-image?url=${encodeURIComponent(imgUrl)}`)
  })
})

describe('pdf-proxy route', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('allows R2 pub-*.r2.dev host and returns PDF content with CORS headers', async () => {
    const sampleBuffer = new TextEncoder().encode('%PDF-1.4 sample pdf content')
    global.fetch = vi.fn(async () => {
      return new Response(sampleBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(sampleBuffer.byteLength),
        },
      })
    })

    const targetUrl = 'https://pub-e8a70e9b0b27455f951bbe7f348c8b35.r2.dev/financial-statements/1770981716643-home_appliances_data.pdf'
    const req = new NextRequest(`http://localhost/api/pdf-proxy?url=${encodeURIComponent(targetUrl)}`)
    const res = await getPdfProxy(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toBe('inline')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('handles HEAD requests for pdf-proxy', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(null, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': '175512',
        },
      })
    })

    const targetUrl = 'https://pub-e8a70e9b0b27455f951bbe7f348c8b35.r2.dev/financial-statements/1770981716643-home_appliances_data.pdf'
    const req = new NextRequest(`http://localhost/api/pdf-proxy?url=${encodeURIComponent(targetUrl)}`, { method: 'HEAD' })
    const res = await headPdfProxy(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Length')).toBe('175512')
    expect(res.headers.get('Accept-Ranges')).toBe('bytes')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('handles OPTIONS requests for CORS preflight', async () => {
    const res = await optionsPdfProxy()
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

describe('r2-image route fallback for PDFs', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('redirects to pdf-proxy if upstream content is a PDF instead of throwing an error', async () => {
    const sampleBuffer = new TextEncoder().encode('%PDF-1.4 sample pdf content')
    global.fetch = vi.fn(async () => {
      return new Response(sampleBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(sampleBuffer.byteLength),
        },
      })
    })

    const targetUrl = 'https://pub-e8a70e9b0b27455f951bbe7f348c8b35.r2.dev/financial-statements/1770981716643-home_appliances_data.pdf'
    const req = new NextRequest(`http://localhost/api/proxy/r2-image?url=${encodeURIComponent(targetUrl)}`)
    const res = await getR2ImageProxy(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toContain('/api/pdf-proxy?url=')
  })
})

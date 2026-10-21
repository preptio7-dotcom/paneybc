'use client'

import React, { useEffect, useState, useRef } from 'react'
import { X, ExternalLink, Sparkles, Check, Download } from 'lucide-react'

// Official Microsoft Store product URLs provided by the user
const MS_STORE_PROTOCOL_URL = 'ms-windows-store://pdp/?productid=9NXTLW6G5FVT'
const MS_STORE_WEB_URL = 'https://apps.microsoft.com/detail/9NXTLW6G5FVT'

export function DesktopDownloadFloatingButton() {
  const [isMounted, setIsMounted] = useState(false)
  const [isInsideDesktopApp, setIsInsideDesktopApp] = useState(false)
  const [isWindowsPC, setIsWindowsPC] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setIsMounted(true)

    if (typeof window === 'undefined' || typeof navigator === 'undefined') return

    const ua = navigator.userAgent || ''

    // 1. Detect if user is on Windows PC/Laptop vs mobile device
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    const isWin = /Windows/i.test(ua) && !isMobile
    setIsWindowsPC(isWin)

    // 2. Smart Detection: Check if already inside the downloaded Windows desktop app
    // IMPORTANT: Mobile devices with PWA enabled MUST STILL show the badge so users can get the Windows app link for PC!
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isElectron = /Electron/i.test(ua) || (window as any).electron !== undefined
    const isWindowsAppWrapper = /PreptioApp|WWAHost/i.test(ua)

    // Only hide if the user is ALREADY running inside the Windows desktop app
    const isInsideWindowsDesktopApp = (isWin && isStandalone) || isElectron || isWindowsAppWrapper

    if (isInsideWindowsDesktopApp) {
      setIsInsideDesktopApp(true)
      return
    }

    // Check if dismissed previously during session
    const dismissedSession = sessionStorage.getItem('preptio_desktop_download_pill_dismissed')
    if (dismissedSession === 'true') {
      setIsDismissed(true)
    }
  }, [])

  if (!isMounted || isInsideDesktopApp || isDismissed) {
    return null
  }

  // Windows PC gets the native store protocol link with web fallback; Mobile gets web store link
  const primaryDownloadHref = isWindowsPC ? MS_STORE_PROTOCOL_URL : MS_STORE_WEB_URL

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 350)
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDismissed(true)
    sessionStorage.setItem('preptio_desktop_download_pill_dismissed', 'true')
  }

  const handleDownloadClick = () => {
    if (isWindowsPC) {
      // For Windows PC, attempt protocol link and provide smooth fallback if protocol handler prompt is cancelled
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = MS_STORE_PROTOCOL_URL
      document.body.appendChild(iframe)
      setTimeout(() => {
        try {
          document.body.removeChild(iframe)
        } catch {
          // ignore cleanup
        }
      }, 2000)

      // Also open or fallback to web store in new tab if user prefers
      window.open(MS_STORE_WEB_URL, '_blank', 'noopener,noreferrer')
    } else {
      window.open(MS_STORE_WEB_URL, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      className="fixed bottom-6 left-6 z-40 select-none font-sans"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Expanded Download Card (Hover / Click State) */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Download Preptio for Windows"
          className="absolute bottom-14 left-0 w-[310px] sm:w-[340px] bg-white rounded-2xl border border-emerald-200/90 shadow-2xl p-5 mb-2 text-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-[#0F7938] shrink-0 shadow-xs">
                {/* Windows 4-square icon */}
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.401H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.951-1.801" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 leading-tight">
                  Get Preptio on Windows
                </h4>
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Microsoft Store App</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Value Props */}
          <ul className="space-y-1.5 text-xs text-slate-600 mb-4 pl-0.5">
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-[#0F7938] shrink-0" />
              <span>Native Windows push notifications</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-[#0F7938] shrink-0" />
              <span>Dedicated offline & distraction-free practice</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-[#0F7938] shrink-0" />
              <span>Fast 1-click launch from Windows Taskbar</span>
            </li>
          </ul>

          {/* Action Button */}
          <div className="space-y-2">
            <button
              onClick={handleDownloadClick}
              className="w-full bg-[#0F7938] hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>
                {isWindowsPC ? 'Open in Microsoft Store' : 'View on Microsoft Store'}
              </span>
              <ExternalLink className="w-3 h-3 opacity-70 ml-0.5" />
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1 border-t border-slate-100">
              <span>Windows 10 / 11 (64-bit)</span>
              <button
                onClick={handleDismiss}
                className="hover:underline text-slate-400 hover:text-slate-600"
              >
                Don&apos;t show again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Pill Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group relative flex items-center gap-2 rounded-full px-3.5 py-2 transition-all duration-300 shadow-lg hover:shadow-xl border ${
          isOpen
            ? 'bg-[#0F7938] text-white border-emerald-600 ring-4 ring-emerald-500/20'
            : 'bg-white text-slate-800 border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-50/50 ring-4 ring-emerald-50'
        }`}
        aria-label="Download Desktop App"
      >
        {/* Pulsing indicator */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>

        {/* Windows Icon */}
        <svg
          className={`w-4 h-4 transition-colors ${
            isOpen ? 'fill-white' : 'fill-[#0F7938]'
          }`}
          viewBox="0 0 24 24"
        >
          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.401H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.951-1.801" />
        </svg>

        <span className="text-xs font-bold tracking-tight">
          {isOpen ? 'Close' : 'Download Windows App'}
        </span>

        {/* Dismiss 'x' button inside pill */}
        {!isOpen && (
          <span
            onClick={handleDismiss}
            title="Dismiss"
            className="ml-1 p-0.5 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>
    </div>
  )
}
